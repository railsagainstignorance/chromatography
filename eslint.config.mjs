export default [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        CAWorld: 'readonly',
        CellAutoCell: 'readonly',
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        Date: 'readonly',
        Math: 'readonly',
        JSON: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        MediaRecorder: 'readonly',
        Event: 'readonly',
        location: 'readonly',
        globalThis: 'readonly',
        decodeURIComponent: 'readonly',
        parseFloat: 'readonly',
        isNaN: 'readonly',
        Array: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
