---
title: 欢迎来到 pyai.site
description: 新站点落成，介绍一下这里有什么。
date: 2026-08-10
tags: [随笔, 站点]
locale: zh
translationOf: welcome
---

## 你好 👋

欢迎来到我的新站点。这里由 [Astro](https://astro.build) 构建，中英双语，自动部署到 GitHub Pages。

## 这里有什么

- **博客**：记录想法、经验与踩坑
- **笔记**：学习过程中的知识沉淀
- **项目**：我的开源作品

## 如何写一篇文章

在 `src/content/posts/zh/` 下新建 Markdown 文件即可，frontmatter 示例如下：

```yaml
---
title: 文章标题
description: 一句话摘要
date: 2026-08-10
tags: [标签1, 标签2]
locale: zh
---
```

想提供英文翻译？在 `src/content/posts/en/` 下放同名文件，并加上 `translationOf: <slug>`，页面会自动出现语言切换链接。让 AI 帮你翻译一遍，几秒钟的事。
