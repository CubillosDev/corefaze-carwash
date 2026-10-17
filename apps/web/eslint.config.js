import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,

      // Reglas de React Hooks.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // React 19 ya no valida propTypes en tiempo de ejecución: documentamos
      // las props con JSDoc.
      'react/prop-types': 'off',

      // Estándar de normalización del equipo.
      'react/no-danger': 'error',
      'react/jsx-no-target-blank': 'error',
      'no-console': 'error',
      'no-debugger': 'error',
      'no-alert': 'error',
      eqeqeq: ['error', 'smart'],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*'],
              message: 'Importa con el alias @/ en lugar de rutas relativas hacia arriba.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Ningún componente llama a fetch: usa httpCliente de @/lib/httpCliente.',
        },
      ],
    },
  },

  // El cliente HTTP es el único punto de la aplicación que puede usar fetch.
  {
    files: ['src/lib/httpCliente.js'],
    rules: { 'no-restricted-globals': 'off' },
  },

  // Pruebas y archivos de configuración corren fuera del navegador.
  {
    files: ['**/*.test.{js,jsx}', 'tests/**/*.js', 'vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
];
