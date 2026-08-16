import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import type { Locale } from '../../i18n/ui';
import { t } from '../../i18n/utils';
import { stripLocale } from '../../utils/content';

// 生成 /zh/rss.xml 与 /en/rss.xml
export function getStaticPaths() {
  return [{ params: { locale: 'zh' } }, { params: { locale: 'en' } }];
}

export async function GET(context: APIContext) {
  const { locale } = context.params as { locale: Locale };
  const records = await getCollection('records', (record) => {
    return record.data.locale === locale && !record.data.draft;
  });
  const sorted = records.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: `pyai.site · ${t(locale, 'records.title')}`,
    description: t(locale, 'records.description'),
    site: context.site,
    items: sorted.map((record) => ({
      title: record.data.title,
      description: record.data.description,
      pubDate: record.data.date,
      link: `/${locale}/records/${stripLocale(record.id)}/`,
    })),
    customData: `<language>${locale}</language>`,
  });
}
