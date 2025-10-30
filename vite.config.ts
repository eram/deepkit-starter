import { defineConfig } from 'vite';
import { deepkitType } from '@deepkit/vite';

export default defineConfig({
    plugins: [
        deepkitType()
    ]
});
