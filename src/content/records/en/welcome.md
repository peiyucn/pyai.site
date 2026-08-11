---
title: Welcome to pyai.site
description: The new site is up. Here is what you will find.
date: 2026-08-10
tags: [Diary, Site]
locale: en
translationOf: welcome
---

## Hello 👋

Welcome to my new site. It is built with [Astro](https://astro.build), bilingual (Chinese/English), and auto-deployed to GitHub Pages.

## What's here

- **Blog**: thoughts, experiences and lessons learned
- **Notes**: knowledge distilled from learning
- **Projects**: my open-source work

## How to write a post

Create a Markdown file under `src/content/posts/en/`. Example frontmatter:

```yaml
---
title: Post title
description: One-line summary
date: 2026-08-10
tags: [tag1, tag2]
locale: en
---
```

Want a Chinese translation? Drop a same-named file under `src/content/posts/zh/` with `translationOf: <slug>`, and a language switch link appears automatically. Let AI translate it for you — takes seconds.
