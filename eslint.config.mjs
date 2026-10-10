import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.venv/**',
      '**/__pycache__/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.expo/**',
      '**/web-build/**',
      'docs/api/**',
      'docs/04-design-system/figma-plugin/**',
      'apps/mobile/babel.config.js',
      'apps/mobile/metro.config.js',
      '**/*.config.js',
      '**/*.config.cjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': 'allow-with-description', minimumDescriptionLength: 10 },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Scripts de linha de comando rodam no Node: têm `process` e `console`, e imprimem no terminal.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        performance: 'readonly',
      },
    },
    rules: { 'no-console': 'off' },
  },
  prettier,
);
