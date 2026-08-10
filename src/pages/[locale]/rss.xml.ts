import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { Locale } from '../../i18n/ui';
import { t } from '../../i18n/utils';

// 生成 /zh/rss.xml 与 /en/rss.xml
export function getStaticPaths() {
  return [{ params: { locale: 'zh' } }, { params: { locale: 'en' } }];
}

export async function GET(context: { site: any; params: any }) {
  const { locale } = context.params as { locale: Locale };
  const posts = await getCollection('posts', (post) => {
    return post.data.locale === locale && !post.data.draft;
  });
  const sorted = posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: `pyai.site · ${t(locale, 'blog.title')}`,
    description: t(locale, 'blog.description'),
    site: context.site,
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/${locale}/blog/${post.id.split('/')[1]}/`,
    })),
    customData: `<language>${locale}</language>`,
  });
}
