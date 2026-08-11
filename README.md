# pyai.site

个人博客 · 知识库 · 项目 — 基于 [Astro](https://astro.build) 构建的中英双语静态站点，自动部署到 GitHub Pages。

## 快速开始

```bash
pnpm install
pnpm dev       # 本地开发 http://localhost:4322
pnpm build     # 构建到 dist/
pnpm preview   # 预览构建产物
```

## 项目结构

```
├── astro.config.mjs        # Astro 配置（站点、i18n、重定向）
├── pnpm-workspace.yaml     # pnpm 配置（允许 esbuild/sharp 构建脚本）
├── CNAME                   # 自定义域名 pyai.site
├── .github/workflows/deploy.yml   # push 到 master 自动部署
├── .github/workflows/douban-sync.yml  # 每日同步豆瓣观影记录
├── data/pei830/            # 豆瓣观影数据（自动同步生成）
│   ├── movies.json         # 全量记录（含导演/年份/类型）
│   └── 影视.csv            # 兼容 douban-sync 格式
└── src/
    ├── content.config.ts   # 内容集合 schema（posts/notes/projects/movies）
    ├── i18n/
    │   ├── ui.ts           # UI 文案字典（zh/en）
    │   └── utils.ts        # 语言工具（t / localizePath 等）
    ├── layouts/            # Base / ListLayout / PostLayout
    ├── components/         # Header / Footer / 卡片 / 语言切换 / 背景动效
    │   ├── ParticleBackground.astro  # 粒子连线网络
    │   └── AuroraFlow.astro          # 极光光幕
    ├── pages/
    │   └── [locale]/       # zh 与 en 两套路由
    │       ├── index.astro         # 主页
    │       ├── blog/               # 博客列表 + 文章页
    │       ├── notes/              # 笔记列表 + 笔记页
    │       ├── movies/             # 观影明细 + 统计
    │       ├── projects/           # 项目
    │       ├── about.astro         # 关于
    │       └── rss.xml.ts          # RSS
    ├── styles/global.css   # 全局样式（灰白极简，无深色模式）
    └── content/
        ├── posts/{zh,en}/          # 博客文章
        ├── notes/{zh,en}/          # 知识库笔记
        └── projects/{zh,en}/       # 项目
```

## 观影记录

豆瓣观影记录通过 `scripts/douban-sync/douban-full-export.mjs` 全量抓取，数据存在 `data/pei830/`：

- **movies.json** — 站点数据源（标题/链接/日期/评分/导演/上映年份/类型）
- **影视.csv** — 兼容 douban-sync 格式

`movies` collection 的自定义 loader 读取 `movies.json`，生成 `/zh/movies/` 和 `/en/movies/` 页面（明细 + 统计）。

GitHub Actions 每日 08:30（UTC+8）自动重新抓取并提交更新，触发重新部署。手动同步：

```bash
DOUBAN_USER=pei830 DOUBAN_OUTPUT_DIR=data node scripts/douban-sync/douban-full-export.mjs
```

## 如何写内容

### 博客文章

在 `src/content/posts/zh/` 下新建 Markdown 文件：

```yaml
---
title: 文章标题
description: 一句话摘要
date: 2026-08-10
tags: [标签1, 标签2]
locale: zh
---
```

### 中英翻译

同名的 `zh` / `en` 文件互为翻译，通过 `translationOf` 关联（值相同，即去掉语言前缀的文件名）：

```yaml
# src/content/posts/en/welcome.md
title: Welcome
locale: en
translationOf: welcome   # 与 zh 版关联
```

没有翻译版本时，文章页不会显示翻译链接。让 AI 帮你翻译，几秒钟搞定。

### 写作约定

- 描述里避免未加引号的半角冒号（YAML 解析问题），如 `description: "a: b"`。
- 草稿文章加 `draft: true`，不会出现在列表里。

## 部署

push 到 `master` 分支后，GitHub Actions 自动构建并部署。

首次配置：

1. GitHub 仓库 Settings → Pages → **Source 选择 "GitHub Actions"**。
2. DNS：为 `pyai.site` 添加 CNAME 记录指向 `peiyucn.github.io`。
3. `CNAME` 文件已包含 `pyai.site`，会自动生效。

## 技术栈

Astro 7 · Tailwind CSS 4 · TypeScript · GitHub Pages · pnpm
