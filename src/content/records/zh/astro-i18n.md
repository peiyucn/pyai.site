---
title: 用 Astro 搭建中英双语站点
description: 本站的构建笔记：i18n 路由、内容集合与部署。
date: 2026-08-10
tags: [Astro, i18n, 建站]
locale: zh
translationOf: astro-i18n
---

这篇笔记记录本站的核心构建方案，方便之后维护。

## 技术选型

- **Astro 5**：内容驱动的静态站点框架
- **i18n 配置**：`astro.config.mjs` 中设置 `locales: ['zh', 'en']`，所有语言带前缀（`/zh/`、`/en/`）
- **内容集合**：`src/content/posts/{zh,en}/` 双语目录，frontmatter 用 `locale` 字段标记语言

## 翻译关联

互为翻译的两篇文章使用相同文件名（slug），并通过 `translationOf` 字段互相指向。页面会自动查找并展示语言切换链接。

## 部署

GitHub Actions 自动构建并发布到 Pages，见 `.github/workflows/deploy.yml`。根路径 `/` 重定向到 `/zh/`。
