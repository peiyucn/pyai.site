# pyai.site

[![github-pages deploy](https://img.shields.io/github/actions/workflow/status/peiyucn/pyai.site/publish.yml?branch=main&label=github-pages%20deploy)](https://github.com/peiyucn/pyai.site/actions/workflows/publish.yml) [![daily-sync](https://img.shields.io/github/actions/workflow/status/peiyucn/pyai.site/daily-sync.yml?branch=main&label=daily-sync)](https://github.com/peiyucn/pyai.site/actions/workflows/daily-sync.yml) [![website](https://img.shields.io/badge/website-pyai.site-blue)](https://pyai.site)

Personal blog and knowledge base — records, projects and movies, bilingual (zh / en).

Powered by [Astro](https://astro.build) and hosted on GitHub Pages at <https://pyai.site>.

## Local development

Requires Node 24 and pnpm 11.

```sh
pnpm install
pnpm dev
pnpm run verify
```

`pnpm run verify` runs ESLint, the repository policy checks, type checks, the policy regression tests and a production build. Pushing `main` deploys the site through `.github/workflows/publish.yml`, which checks open security alerts before deploying.

## Docs

- [docs/architecture.md](docs/architecture.md) — site structure, routing, the WebGL hero, data sync
- [docs/content.md](docs/content.md) — writing records / projects and the frontmatter fields
- [docs/release.md](docs/release.md) — deploy pipeline, gates and rollback
- [docs/dependency-notes.md](docs/dependency-notes.md) — runtime baseline and dependency overrides
