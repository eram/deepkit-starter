# Dockerfile for dk-test based on Wolfi OS

# ---- Base image ----
FROM cgr.dev/chainguard/wolfi-base:latest AS base
WORKDIR /app
RUN apk add --no-cache nodejs npm \
  && adduser -D appuser \
  && mkdir -p /app/node_modules \
  && chown -R appuser:appuser /app


# ---- Test stage (fails build if tests fail) ----
ARG BUILD_TS
FROM base AS test
WORKDIR /app
COPY package.json package-lock.json* ./
COPY . /app
RUN mkdir -p /log && chown -R appuser:appuser /app /log
USER appuser
RUN npm ci
# Set NODE_OPTIONS to load localStorage mock before any modules
ENV NODE_OPTIONS="--require /app/scripts/mock-localstorage.cjs"
# Run CI tests, add build timestamp to log, and fail build if 'fail 0' is not present
RUN rm -f /log/npm-test.log && echo "Build timestamp: $BUILD_TS" > /log/npm-test.log && /bin/sh -c 'set -o pipefail && npm run ci | tee -a /log/npm-test.log'; grep -q "fail 0" /log/npm-test.log

# ---- Production stage (only builds if tests pass) ----
FROM base AS prod
WORKDIR /app
COPY --from=test /app /app
ENV NODE_ENV=production
# Set NODE_OPTIONS to load localStorage mock before any modules
ENV NODE_OPTIONS="--require /app/scripts/mock-localstorage.cjs"
RUN npm ci --only=production
# Remove unnecessary files to minimize image size
RUN rm -rf \
  /app/src/**/*.test.* \
  /app/ci/ \
  /app/scripts/*test* \
  /app/docs/ \
  /app/*.cpuprofile \
  /app/lcov.info \
  /app/.vscode
# Make /app readonly
RUN chmod -R a-w /app
USER appuser
WORKDIR /app
EXPOSE 80 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["npm", "run", "app"]


# ---- Vulnerability scan stage (does not produce final image) ----
ARG BUILD_TS
FROM cgr.dev/chainguard/wolfi-base:latest AS scan
RUN apk add --no-cache curl
# Install grype
RUN curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh | sh -s -- -b /usr/local/bin
# Copy the production image filesystem
COPY --from=prod / /
# Create /log and set permissions
RUN mkdir -p /log && chown -R root:root /log && chmod 777 /log
# Copy test log from test stage
COPY --from=test /log/npm-test.log /log/npm-test.log
# Run grype scan, add build timestamp to log, and fail on critical vulns
RUN echo "Build timestamp: $BUILD_TS" > /log/grype-scan.log && grype dir:/ --fail-on critical --only-fixed --scope all-layers --verbose | tee -a /log/grype-scan.log

# ---- Logs export stage (always export logs) ----
FROM scratch AS logs
COPY --from=scan /log/grype-scan.log /
COPY --from=scan /log/npm-test.log /

# Note: The final image is always the prod stage. The scan stage is for validation only and is not used for deployment.
