import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        ReadableStream: 'readonly',
        URL: 'readonly',
      },
    },
  },
);
