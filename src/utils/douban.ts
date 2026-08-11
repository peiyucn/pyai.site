import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import fs from 'node:fs';
import path from 'node:path';

/** 豆瓣影视标记状态 */

/** 影视.csv 的一行（原始 CSV 字段） */
export interface MovieCsvRow {
  title: string;
  url: string;
  date: string;
  rating: string; // ★★★ 或空
  status: string;
  comment: string;
}

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
 * 解析标准 CSV（支持引号包裹的字段、内嵌逗号/引号/换行）。
 * 不依赖第三方库，数据量小，够用即可。
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      field = '';
      // 跳过末尾可能残留的 \r
      if (row.length === 1 && row[0] === '') {
        row = [];
      } else if (row.some((c) => c !== '')) {
        rows.push(row);
      }
      row = [];
    } else if (ch === '\r') {
      // 忽略
    } else {
      field += ch;
    }
  }
  // 最后一行
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((c) => c !== '')) rows.push(row);
  }
  return rows;
}

/** 解析影视.csv → MovieCsvRow[]（跳过表头） */
export function parseMoviesCsv(text: string): MovieCsvRow[] {
  const rows = parseCsv(text);
  const movies: MovieCsvRow[] = [];
  for (const row of rows) {
    if (row.length < 6) continue;
    const [title, url, date, rating, status, comment] = row;
    if (!title || title === 'title') continue;
    movies.push({ title, url, date, rating, status, comment });
  }
  return movies;
}

/** ★★★ → 3；空 → 0 */
export function ratingToNumber(rating: string): number {
  if (!rating) return 0;
  return (rating.match(/★/g) ?? []).length;
}

/** 从豆瓣 subject URL 提取 ID，如 35801819 */
export function subjectIdFromUrl(url: string): string {
  const m = url.match(/subject\/(\d+)\//);
  return m ? m[1] : url;
}

/** 判断状态是否为「看过」（已看完的才进观影统计） */

/** 取全部观影记录，按标记日期倒序 */
export async function getMovies(): Promise<Movie[]> {
  const movies = await getCollection('movies');
  return movies.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 统计：按年份分布（只看过） */
export function statsByYear(movies: Movie[]): { year: number; count: number }[] {
  const map = new Map<number, number>();
  for (const m of movies) {
    if (m.data.status !== '看过') continue;
    const y = m.data.date.getFullYear();
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
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

/** 统计：按状态分布（已弃用，2026-08 起不再展示状态统计） */

/** 统计：按导演分布（只看过且导演非空的），取 Top N */
export function statsByDirector(movies: Movie[], limit = 15): { director: string; count: number }[] {
  const map = new Map<string, number>();
  for (const m of movies) {
    if (m.data.status !== '看过' || !m.data.director) continue;
    map.set(m.data.director, (map.get(m.data.director) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([director, count]) => ({ director, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** 统计：按上映年份分布（只看过且年份非空的） */
export function statsByReleaseYear(
  movies: Movie[],
): { year: number; count: number }[] {
  const map = new Map<number, number>();
  for (const m of movies) {
    if (m.data.status !== '看过' || !m.data.year) continue;
    const y = parseInt(m.data.year);
    if (isNaN(y)) continue;
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
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
