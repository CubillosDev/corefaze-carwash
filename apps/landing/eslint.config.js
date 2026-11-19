import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },

  js.configs.recommended,

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-console': 'error',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      eqeqeq: ['error', 'smart'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['../*'], message: 'Importa con el alias @/ en lugar de rutas relativas hacia arriba.' }] },
      ],
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Construye el DOM con createElement y textContent.' },
        { property: 'outerHTML', message: 'Construye el DOM con createElement y textContent.' },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Solo src/api/ habla con servicios externos.' },
      ],
    },
  },

  {
    files: ['src/api/**/*.js'],
    rules: { 'no-restricted-globals': 'off' },
  },

  {
    files: ['**/*.test.js', 'vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
];
