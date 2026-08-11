import { ui, languages, type Locale, type UIKey } from './ui';

/** 判断一个字符串是否为受支持的语言 */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (languages as Record<string, string>)[value] !== undefined;
}

/** 取指定语言的 UI 文案 */
export function t(locale: Locale, key: UIKey): string {
  return ui[locale][key];
}

/**
 * 将某个路径切换到另一语言。
 * 例：/zh/records/welcome → 切到 en → /en/records/welcome
 */
export function localizePath(pathname: string, target: Locale): string {
  const segments = pathname.split('/').filter(Boolean);
  // 去掉旧的语言前缀
  if (segments.length > 0 && isLocale(segments[0])) {
    segments.shift();
  }
  return `/${target}/${segments.join('/')}`;
}
