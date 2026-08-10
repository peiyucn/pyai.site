// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://pyai.site',
  trailingSlash: 'always',
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: {
      // 所有语言都带前缀：/zh/ 与 /en/
      prefixDefaultLocale: true,
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
