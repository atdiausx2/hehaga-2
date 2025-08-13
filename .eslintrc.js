module.exports = {
    root: true,
    env: {
      node: true,
    },

    globals: {
      google: 'readonly',
    },
    extends: [
      'eslint:recommended',
      'plugin:vue/vue3-recommended', // Vue 3 support
    ],
    parser: 'vue-eslint-parser',
    parserOptions: {
      parser: '@babel/eslint-parser',
      requireConfigFile: false,
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    plugins: ['vue'],
    rules: {
      // General JS rules
      'no-unused-vars': 'warn',
      'no-console': 'off',
  
      // Vue-specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/no-template-shadow': 'off',
    },
  };
  