import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import type { Locale } from '../i18n/ui';
import fs from 'node:fs';
import path from 'node:path';

export type Record = CollectionEntry<'records'>;
export type Project = CollectionEntry<'projects'>;

/** 取指定语言的记录（博客+笔记统一），按日期倒序，不含草稿 */
export async function getRecords(locale: Locale): Promise<Record[]> {
  const records = await getCollection('records', (record) => {
    return record.data.locale === locale && !record.data.draft;
  });
  return records.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 项目状态排序优先级：维护中 > 开发中 > 已归档 */
const PROJECT_STATUS_ORDER: Record<string, number> = {
  active: 0,
  wip: 1,
  archived: 2,
};

/** 取指定语言的项目：先按状态分组（维护中→开发中→已归档），组内按最近推送时间倒序（最近更新在前） */
export async function getProjects(locale: Locale): Promise<Project[]> {
  const projects = await getCollection('projects', (project) => {
    return project.data.locale === locale;
  });
  return projects.sort((a, b) => {
    const pa = PROJECT_STATUS_ORDER[a.data.status] ?? 1;
    const pb = PROJECT_STATUS_ORDER[b.data.status] ?? 1;
    if (pa !== pb) return pa - pb;
    // 同状态下按最近推送时间倒序（最近更新在前）
    return (b.data.updated?.valueOf() ?? 0) - (a.data.updated?.valueOf() ?? 0);
  });
}

/** 读取项目同步快照的元信息（更新时间），由 projects-sync workflow 写入 meta.json */
export function getProjectsMeta(): { updatedAt?: string } {
  try {
    const file = path.resolve(process.cwd(), 'data', 'projects', 'meta.json');
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8')) as { updatedAt?: string };
  } catch {
    return {};
  }
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
