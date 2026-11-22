import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import type { Locale } from '../i18n/ui';
import fs from 'node:fs';
import path from 'node:path';

export type Record = CollectionEntry<'records'>;
export type Project = CollectionEntry<'projects'>;


export async function getRecords(locale: Locale): Promise<Record[]> {
  const records = await getCollection('records', (record) => {
    return record.data.locale === locale && !record.data.draft;
  });
  return records.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}



const PROJECT_STATUS_ORDER: { [key: string]: number } = {
  active: 0,
  wip: 1,
  archived: 2,
};


export async function getProjects(locale: Locale): Promise<Project[]> {
  const projects = await getCollection('projects', (project) => {
    return project.data.locale === locale;
  });
  return projects.sort((a, b) => {
    const pa = PROJECT_STATUS_ORDER[a.data.status] ?? 1;
    const pb = PROJECT_STATUS_ORDER[b.data.status] ?? 1;
    if (pa !== pb) return pa - pb;

    return (b.data.updated?.valueOf() ?? 0) - (a.data.updated?.valueOf() ?? 0);
  });
}


export function getProjectsMeta(): { updatedAt?: string } {
  try {
    const file = path.resolve(process.cwd(), 'data', 'projects', 'meta.json');
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8')) as { updatedAt?: string };
  } catch {
    return {};
  }
}


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


export function stripLocale(id: string): string {
  const parts = id.split('/');
  if (parts.length > 1) {
    parts.shift();
  }
  return parts.join('/').replace(/\.mdx?$/, '');
}


export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
