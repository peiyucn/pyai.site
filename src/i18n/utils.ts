import { ui, languages, type Locale, type UIKey } from './ui';

/** 判断一个字符串是否为受支持的语言 */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (languages as Record<string, string>)[value] !== undefined;
}

/** 取指定语言的 UI 文案，支持 {变量} 占位符替换 */
export function t(
  locale: Locale,
  key: UIKey,
  vars?: Record<string, string | number>,
): string {
  let text = ui[locale][key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/**
 * 将某个路径切换到另一语言，保留结尾斜杠（站点 trailingSlash: 'always'）。
 * 例：/zh/records/welcome → 切到 en → /en/records/welcome
 */
export function localizePath(pathname: string, target: Locale): string {
  const hasTrailingSlash = pathname.endsWith('/');
  const segments = pathname.split('/').filter(Boolean);
  // 去掉旧的语言前缀
  if (segments.length > 0 && isLocale(segments[0])) {
    segments.shift();
  }
  // 首页（无剩余路径段）→ 直接返回语言根路径，避免双斜杠
  if (segments.length === 0) {
    return `/${target}/`;
  }
  const base = `/${target}/${segments.join('/')}`;
  return hasTrailingSlash ? `${base}/` : base;
}
