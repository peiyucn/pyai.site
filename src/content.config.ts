import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import fs from 'node:fs';
import path from 'node:path';
import { subjectIdFromUrl } from './utils/douban';

// 读取豆瓣全量数据（JSON 含导演/年份/类型）
// 由 scripts/douban-sync 定时同步生成
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

// 语言集合
const localeEnum = z.enum(['zh', 'en']);

// 记录（博客 + 笔记统一，用 tags 区分内容类型）
const records = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/records' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    // 标签区分内容类型（随笔 / 技术 / 读书 / 建站……无限扩展）
    tags: z.array(z.string()).default([]),
    locale: localeEnum,
    draft: z.boolean().default(false),
    // 关联的翻译版本 slug（不含 locale 前缀），用于语言切换
    translationOf: z.string().optional(),
  }),
});

// 项目
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    locale: localeEnum,
    // GitHub 仓库地址
    repo: z.url().optional(),
    // 在线演示 / 官网
    link: z.url().optional(),
    status: z.enum(['active', 'wip', 'archived']).default('active'),
    // 首页展示优先级（越大越靠前）
    order: z.number().default(0),
    featured: z.boolean().default(false),
  }),
});

// 豆瓣观影记录（数据来自 data/pei830/movies.json，由 douban-sync 定时同步）
const movies = defineCollection({
  loader: async () => {
    const data = loadMoviesJson();
    return data.map((row, index) => ({
      id: subjectIdFromUrl(row.url) || `movie-${index}`,
      // 函数式 loader 返回扁平结构：id 与其他 data 字段平级
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
    // 0-5 星（我的评分）
    rating: z.number().default(0),
    status: z.string(),
    comment: z.string().default(''),
    // 导演 / 制片地区 / 上映年份 / 类型（来自 rexxar 权威数据）
    director: z.string().default(''),
    country: z.string().default(''),
    year: z.string().default(''),
    genre: z.string().default(''),
    // 豆瓣当前评分（0-10 分）
    doubanRating: z.number().default(0),
    // 是否为剧集（豆瓣 type: 'tv'），用于影/剧区分
    isTv: z.boolean().default(false),
  }),
});

export const collections = { records, projects, movies };
