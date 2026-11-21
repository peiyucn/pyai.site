import astro from 'eslint-plugin-astro'
import { createEslintConfig } from './eslint-base.mjs'

const shared = createEslintConfig({
  ignores: ['dist/**', '.astro/**', 'public/vendor/**'],
})

export default [
  ...shared,
  ...astro.configs['flat/base'],
  {
    files: ['scripts/**/*.mjs', 'astro.config.ts'],
    languageOptions: {
      globals: {
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        clearTimeout: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
]
