import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import { existsSync, readdirSync } from 'node:fs';

/**
 * Bibliotecas que só funcionam no celular e as que só funcionam na web (ADR-034). Quem as importa
 * precisa ficar num arquivo de plataforma, para a outra plataforma não carregar o código.
 */
const SO_CELULAR = [
  'expo-notifications',
  'expo-text-extractor',
  'react-native-webview',
  'expo-secure-store',
  'expo-file-system',
  'expo-sharing',
];
const SO_WEB = ['react-dom', 'react-native-web'];
const APP = ['apps/mobile/src/**/*.{ts,tsx}', 'apps/mobile/app/**/*.{ts,tsx}'];
const TESTES = ['**/*.test.{ts,tsx}'];
const SO_WEB_ARQ = ['**/*.web.{ts,tsx}'];

const proibidas = (nomes, onde) =>
  nomes.map((name) => ({
    name,
    message: `${name} só funciona ${onde}: importe-a num arquivo de plataforma (ADR-034).`,
  }));

/**
 * Arquivos do app que têm um irmão `.web` (por exemplo `session-store.ts` e `session-store.web.ts`):
 * a web usa o `.web`, então o arquivo sem sufixo é só do celular e pode importar as bibliotecas dele.
 */
function arquivosComIrmaoWeb() {
  const achados = [];
  for (const pasta of ['apps/mobile/src', 'apps/mobile/app']) {
    if (!existsSync(pasta)) continue;
    for (const arquivo of readdirSync(pasta, { recursive: true })) {
      const caminho = `${pasta}/${arquivo}`.replaceAll('\\', '/');
      const m = /^(.*)\.(tsx?)$/.exec(caminho);
      if (!m || /\.(web|native|test)$/.test(m[1])) continue;
      if (existsSync(`${m[1]}.web.${m[2]}`)) achados.push(caminho);
    }
  }
  return achados;
}

const SO_NATIVO = ['**/*.native.{ts,tsx}', ...arquivosComIrmaoWeb()];

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
    files: ['scripts/**/*.mjs', 'apps/mobile/e2e/**/*.mjs'],
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
  // ADR-034: biblioteca só de celular não entra em código que a web também carrega, e vice-versa.
  // Três grupos que não se sobrepõem (duas regras iguais no mesmo arquivo se sobrescreveriam).
  {
    // Código compartilhado: não pode importar nenhuma das duas listas.
    files: APP,
    ignores: [...TESTES, ...SO_NATIVO, ...SO_WEB_ARQ],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [...proibidas(SO_CELULAR, 'no celular'), ...proibidas(SO_WEB, 'na web')] },
      ],
    },
  },
  {
    // Código só do celular (`.native` ou com irmão `.web`): pode usar as bibliotecas do celular.
    files: SO_NATIVO,
    ignores: TESTES,
    rules: { 'no-restricted-imports': ['error', { paths: proibidas(SO_WEB, 'na web') }] },
  },
  {
    // Código só da web (`.web`): pode usar as bibliotecas da web.
    files: SO_WEB_ARQ,
    ignores: TESTES,
    rules: { 'no-restricted-imports': ['error', { paths: proibidas(SO_CELULAR, 'no celular') }] },
  },
  prettier,
);
