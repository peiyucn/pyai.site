import { ui, languages, type Locale, type UIKey } from './ui';


export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (languages as Record<string, string>)[value] !== undefined;
}


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


export function localizePath(pathname: string, target: Locale): string {
  const hasTrailingSlash = pathname.endsWith('/');
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length > 0 && isLocale(segments[0])) {
    segments.shift();
  }

  if (segments.length === 0) {
    return `/${target}/`;
  }
  const base = `/${target}/${segments.join('/')}`;
  return hasTrailingSlash ? `${base}/` : base;
}
