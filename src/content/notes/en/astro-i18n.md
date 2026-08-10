---
title: Building a bilingual site with Astro
description: "Build notes for this site: i18n routing, content collections, deployment."
date: 2026-08-10
tags: [Astro, i18n, Static Site]
locale: en
translationOf: astro-i18n
---

Notes on how this site is built, for future maintenance.

## Stack

- **Astro 5**: content-first static site framework
- **i18n**: `locales: ['zh', 'en']` in `astro.config.mjs`, every language gets a prefix (`/zh/`, `/en/`)
- **Content collections**: bilingual folders `src/content/posts/{zh,en}/`, with a `locale` field in frontmatter

## Translation pairing

Translations share the same filename (slug) and point to each other via the `translationOf` field. The page automatically finds the counterpart and shows a language switcher link.

## Deployment

A GitHub Actions workflow builds and publishes to Pages (see `.github/workflows/deploy.yml`). The root path `/` redirects to `/zh/`.
