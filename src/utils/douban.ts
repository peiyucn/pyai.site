import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import fs from 'node:fs';
import path from 'node:path';

export type Movie = CollectionEntry<'movies'>;


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


export function getMoviesMeta(): { updatedAt?: string } {
  try {
    const file = path.resolve(process.cwd(), 'data', 'pei830', 'meta.json');
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8')) as { updatedAt?: string };
  } catch {
    return {};
  }
}


export function subjectIdFromUrl(url: string): string {
  const m = url.match(/subject\/(\d+)\//);
  return m ? m[1] : url;
}


export async function getMovies(): Promise<Movie[]> {
  const movies = await getCollection('movies');
  return movies.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}


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


export function statsByGenre(movies: Movie[], limit = 12): { genre: string; count: number }[] {
  const map = new Map<string, number>();
  for (const m of movies) {
    if (m.data.status !== '看过' || !m.data.genre) continue;

    map.set(m.data.genre, (map.get(m.data.genre) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}


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
      const my10 = m.data.rating * 2;
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
