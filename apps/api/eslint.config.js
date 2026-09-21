const js = require('@eslint/js');
const globals = require('globals');
const prettier = require('eslint-config-prettier');

module.exports = [
  { ignores: ['node_modules/', 'coverage/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Variables sin uso son error, salvo las que empiezan con _ (ej. parámetros _req)
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Siempre === y !==, evita bugs de coerción de tipos
      eqeqeq: ['error', 'always'],
      // const por defecto, let solo si se reasigna
      'prefer-const': 'error',
      'no-var': 'error',
      // console.log se usará solo en server.js con justificación
      'no-console': 'warn',
    },
  },
  {
    // En las pruebas están disponibles describe, it, expect, etc.
    files: ['tests/**/*.js'],
    languageOptions: { globals: { ...globals.jest } },
  },
  // Siempre al final: desactiva reglas de ESLint que chocan con Prettier
  prettier,
];
