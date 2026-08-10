// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://pyai.site',
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: {
      // 所有语言都带前缀：/zh/ 与 /en/
      prefixDefaultLocale: true,
      // 根路径自动重定向到默认语言（Astro v6+ 需显式开启）
      redirectToDefaultLocale: true,
    },
    fallback: {
      // en 缺失的页面/内容回退到 zh
      en: 'zh',
    },
  },
  redirects: {
    // 根路径 → 默认语言首页
    '/': '/zh/',
  },
});
