import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import type { Locale } from '../i18n/ui';

export type Record = CollectionEntry<'records'>;
export type Project = CollectionEntry<'projects'>;

/** 取指定语言的记录（博客+笔记统一），按日期倒序，不含草稿 */
export async function getRecords(locale: Locale): Promise<Record[]> {
  const records = await getCollection('records', (record) => {
    return record.data.locale === locale && !record.data.draft;
  });
  return records.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 取指定语言的项目，按 order 降序 */
export async function getProjects(locale: Locale): Promise<Project[]> {
  const projects = await getCollection('projects', (project) => {
    return project.data.locale === locale;
  });
  return projects.sort((a, b) => b.data.order - a.data.order);
}

/**
 * 查找某条内容的翻译版本（互为翻译的两条内容 translationOf 指向同一个 slug）。
 * slug 不含语言前缀，例如 zh/hello 与 en/hello 的 translationOf 均为 "hello"。
 */
export async function findTranslation<T extends Record>(
  entry: T,
  targetLocale: Locale,
): Promise<T | undefined> {
  const baseSlug = entry.data.translationOf ?? stripLocale(entry.id);
  const collection = entry.collection as 'records';
  const all = await getCollection(collection, (item) => {
    const itemBase = item.data.translationOf ?? stripLocale(item.id);
    return item.data.locale === targetLocale && itemBase === baseSlug;
  });
  return (all[0] as T | undefined);
}

/** 去掉 id 的语言前缀与扩展名，例如 "zh/hello.md" → "hello" */
export function stripLocale(id: string): string {
  const parts = id.split('/');
  if (parts.length > 1) {
    parts.shift();
  }
  return parts.join('/').replace(/\.mdx?$/, '');
}

/** 根据语言格式化日期 */
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
