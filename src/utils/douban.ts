import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import fs from 'node:fs';
import path from 'node:path';

export type Movie = CollectionEntry<'movies'>;

/**
 * 轻量读取豆瓣数据条数（直接读 JSON，不经过 getCollection）。
 * 用于 getStaticPaths 生成分页路径，避免在构建时递归加载集合。
 */
export function getMoviesCount(): number {
  try {
    const file = path.resolve(process.cwd(), 'data', 'pei830', 'movies.json');
    if (!fs.existsSync(file)) return 0;
    const raw = fs.readFileSync(file, 'utf8');
    return (JSON.parse(raw) as unknown[]).length;
  } catch {
    return 0;
  }
}

/**
 * 轻量统计影/剧条数（直接读 JSON，不经过 getCollection）。
 * 用于筛选路由（films/series）的 getStaticPaths 生成分页路径。
 */
export function getMoviesCountByType(type: 'films' | 'series'): number {
  try {
    const file = path.resolve(process.cwd(), 'data', 'pei830', 'movies.json');
    if (!fs.existsSync(file)) return 0;
    const raw = fs.readFileSync(file, 'utf8');
    const rows = JSON.parse(raw) as { isTv?: boolean }[];
    return rows.filter((m) => (type === 'series' ? m.isTv : !m.isTv)).length;
  } catch {
    return 0;
  }
}

/**
 * 轻量读取豆瓣同步快照的元信息（取分/更新时间）。
 * 由 scripts/douban-sync 在每次写入 movies.json 时顺带生成 meta.json。
 */
export function getMoviesMeta(): { updatedAt?: string } {
  try {
    const file = path.resolve(process.cwd(), 'data', 'pei830', 'meta.json');
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8')) as { updatedAt?: string };
  } catch {
    return {};
  }
}

/** 从豆瓣 subject URL 提取 ID，如 35801819 */
export function subjectIdFromUrl(url: string): string {
  const m = url.match(/subject\/(\d+)\//);
  return m ? m[1] : url;
}

/** 取全部观影记录，按标记日期倒序 */
export async function getMovies(): Promise<Movie[]> {
  const movies = await getCollection('movies');
  return movies.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 统计：按年份分布（只看过，倒序：最近年份在前） */
export function statsByYear(movies: Movie[]): { year: number; count: number }[] {
  const map = new Map<number, number>();
  for (const m of movies) {
    if (m.data.status !== '看过') continue;
    const y = m.data.date.getFullYear();
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);
}

/** 统计：按评分分布（只看过且评分的） */
export function statsByRating(movies: Movie[]): { rating: number; count: number }[] {
  const map = new Map<number, number>();
  for (const m of movies) {
    if (m.data.status !== '看过' || m.data.rating === 0) continue;
    map.set(m.data.rating, (map.get(m.data.rating) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([rating, count]) => ({ rating, count }))
    .sort((a, b) => b.rating - a.rating);
}

/** 统计：按类型分布（只看过且类型非空的），取 Top N */
export function statsByGenre(movies: Movie[], limit = 12): { genre: string; count: number }[] {
  const map = new Map<string, number>();
  for (const m of movies) {
    if (m.data.status !== '看过' || !m.data.genre) continue;
    // 一个条目可能有多个类型，取第一个
    map.set(m.data.genre, (map.get(m.data.genre) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * 统计：我的评分与豆瓣评分差距最大的电影 Top N（并不觉得好的电影）。
 * 只看电影（isTv === false），且我的评分与豆瓣评分都有。
 * 量纲统一：我的评分 0-5 星 ×2 → 0-10 分，与豆瓣 0-10 分对齐。
 */
export function statsByRatingGap(
  movies: Movie[],
  limit = 10,
): { title: string; url: string; myRating: number; doubanRating: number; gap: number }[] {
  return movies
    .filter(
      (m) =>
        m.data.status === '看过' &&
        !m.data.isTv &&
        m.data.rating > 0 &&
        m.data.doubanRating > 0,
    )
    .map((m) => {
      const my10 = m.data.rating * 2; // 0-5 星 → 0-10 分
      const gap = Math.abs(m.data.doubanRating - my10);
      return {
        title: m.data.title,
        url: m.data.url,
        myRating: m.data.rating,
        doubanRating: m.data.doubanRating,
        gap: Math.round(gap * 10) / 10,
      };
    })
    .sort((a, b) => b.gap - a.gap)
    .slice(0, limit);
}
