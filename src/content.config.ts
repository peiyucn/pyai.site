import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import fs from 'node:fs';
import path from 'node:path';
import { subjectIdFromUrl } from './utils/douban';



type MovieJson = {
  title: string;
  url: string;
  date: string;
  rating: number;
  status: string;
  comment: string;
  director?: string;
  country?: string;
  year?: string;
  genre?: string;
  doubanRating?: number;
  isTv?: boolean;
  subtype?: string;
};

function loadMoviesJson(): MovieJson[] {
  const file = path.resolve(process.cwd(), 'data', 'pei830', 'movies.json');
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as MovieJson[];
  } catch {
    return [];
  }
}


const localeEnum = z.enum(['zh', 'en']);


const records = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/records' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),

    tags: z.array(z.string()).default([]),
    locale: localeEnum,
    draft: z.boolean().default(false),

    translationOf: z.string().optional(),
  }),
});


const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    locale: localeEnum,

    repo: z.url().optional(),

    link: z.url().optional(),
    status: z.enum(['active', 'wip', 'archived']).default('active'),

    updated: z.coerce.date().optional(),

    stars: z.number().default(0),
    forks: z.number().default(0),
    language: z.string().optional(),
    topics: z.array(z.string()).default([]),
  }),
});


const movies = defineCollection({
  loader: async () => {
    const data = loadMoviesJson();
    return data.map((row, index) => ({
      id: subjectIdFromUrl(row.url) || `movie-${index}`,

      title: row.title,
      url: row.url,
      date: new Date(row.date || '1970-01-01'),
      rating: row.rating ?? 0,
      status: row.status ?? '看过',
      comment: row.comment ?? '',
      director: row.director ?? '',
      country: row.country ?? '',
      year: row.year ?? '',
      genre: row.genre ?? '',
      doubanRating: row.doubanRating ?? 0,
      isTv: row.isTv ?? false,
    }));
  },
  schema: z.object({
    title: z.string(),
    url: z.string(),
    date: z.date(),

    rating: z.number().default(0),
    status: z.string(),
    comment: z.string().default(''),

    director: z.string().default(''),
    country: z.string().default(''),
    year: z.string().default(''),
    genre: z.string().default(''),

    doubanRating: z.number().default(0),

    isTv: z.boolean().default(false),
  }),
});

export const collections = { records, projects, movies };
