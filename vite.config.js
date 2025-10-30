// vite.config.js - Vite configuration with Deepkit type compiler support

import { deepkitType } from '@deepkit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [deepkitType()],
});
