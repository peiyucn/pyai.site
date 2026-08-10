import { ui, languages, type Locale, type UIKey } from './ui';

// 默认语言（与 astro.config.mjs 的 i18n.defaultLocale 保持一致）
export const defaultLocale: Locale = 'zh';
export const locales: Locale[] = Object.keys(languages) as Locale[];

/** 判断一个字符串是否为受支持的语言 */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (languages as Record<string, string>)[value] !== undefined;
}

/** 从 URL pathname 中提取语言（pathname 以 /zh 或 /en 开头） */
export function getLocaleFromPath(pathname: string): Locale {
  const first = pathname.split('/')[1];
  return isLocale(first) ? first : defaultLocale;
}

/** 取指定语言的 UI 文案 */
export function t(locale: Locale, key: UIKey): string {
  return ui[locale][key];
}

/**
 * 将某个路径切换到另一语言。
 * 例：/zh/blog/hello → 切到 en → /en/blog/hello
 */
export function localizePath(pathname: string, target: Locale): string {
  const segments = pathname.split('/').filter(Boolean);
  // 去掉旧的语言前缀
  if (segments.length > 0 && isLocale(segments[0])) {
    segments.shift();
  }
  return `/${target}/${segments.join('/')}`;
}

/** 站点某一语言下的根路径 */
export function localeHome(locale: Locale): string {
  return `/${locale}/`;
}
