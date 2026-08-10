import { defineCollection, z } from 'astro:content';

// 语言集合
const localeEnum = z.enum(['zh', 'en']);

// 文章（博客）
const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    locale: localeEnum,
    draft: z.boolean().default(false),
    // 关联的翻译版本 slug（不含 locale 前缀），用于语言切换
    translationOf: z.string().optional(),
  }),
});

// 知识库笔记
const notes = defineCollection({
  type: 'content',
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

// 项目
const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    locale: localeEnum,
    // GitHub 仓库地址
    repo: z.string().url().optional(),
    // 在线演示 / 官网
    link: z.string().url().optional(),
    status: z.enum(['active', 'wip', 'archived']).default('active'),
    // 首页展示优先级（越大越靠前）
    order: z.number().default(0),
    featured: z.boolean().default(false),
  }),
});

export const collections = { posts, notes, projects };
