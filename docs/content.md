# 内容与数据

> 站点内容分两类：**作者维护的 Markdown**（records / projects）与**同步脚本生成的 JSON**（movies / meta）。

## 目录

| 路径 | 内容 |
|---|---|
| `src/content/records/{zh,en}/` | 记录（博客 + 笔记统一，用 `tags` 区分） |
| `src/content/projects/{zh,en}/` | 项目页 |
| `data/pei830/movies.json` | 豆瓣观影数据（同步生成，勿手改） |
| `data/pei830/meta.json` | 观影数据快照时间（页面「更新于」） |
| `data/projects/meta.json` | 项目同步快照时间 |
| `drafts/` | 手稿，永不删除 |

## 记录工作流

1. 在 `drafts/` 新建 Markdown（中文即可），让 AI「处理 `drafts/xxx.md`」。
2. 产出 `src/content/records/zh/xxx.md` 与 `src/content/records/en/xxx.md`，两份 `translationOf` 都写 `xxx`。
3. 中文原样发布不润色（除非明确要求）；英文完整翻译、保持结构；正文用标准 Markdown、不重复标题。
4. 未完成的加 `draft: true`，不进列表。
5. 收尾跑 `pnpm run verify`；`drafts/` 手稿不删除，已处理就在顶部加 `<!-- processed -->`。

`description` 避免未加引号的半角冒号（写成 `description: "a: b"`）。

**records 字段**（顺序 = `src/content.config.ts` 的 schema，`npm run lint:policy` 会校验本表）：

### records

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| title | string | 是 | 标题 |
| description | string | 否 | 一句话摘要，默认空 |
| date | date | 是 | 发布日期 |
| updated | date | 否 | 更新日期 |
| tags | string[] | 否 | 2~4 个，区分内容类型 |
| locale | zh \| en | 是 | 语言 |
| draft | boolean | 否 | 草稿不进列表，默认 false |
| translationOf | string | 否 | 另一语言的同名 slug |

### projects

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| title | string | 是 | 项目名 |
| description | string | 是 | 一句话说明（中英同源，不翻译） |
| locale | zh \| en | 是 | 语言 |
| repo | url | 否 | GitHub 仓库地址 |
| link | url | 否 | 在线演示 / 官网 |
| status | active \| wip \| archived | 否 | 默认 active；`wip` 手动 |
| updated | date | 否 | 仓库最近推送时间，用于排序 |
| stars | number | 否 | GitHub 星标数，默认 0 |
| forks | number | 否 | fork 数，默认 0 |
| language | string | 否 | 主语言 |
| topics | string[] | 否 | 主题标签，默认空 |

项目页由 `scripts/projects-sync/projects-sync.mjs` 为新仓库生成骨架，`status` 按仓库 `archived` 写入。

## 观影数据

- **增量**（`douban-incremental.mjs`）：抓列表页第 1 页（最近 30 条），按 URL 去重后追加。
- **评分补充**（`douban-enrich.mjs`）：只补缺评分的条目，`MAX_PER_RUN` 限批。
- **全量初始化**（手动）：`DOUBAN_USER=pei830 DOUBAN_OUTPUT_DIR=data node scripts/douban-sync/douban-full-export.mjs`。
- 评分 / 导演 / 地区是**同步时快照**；写 `movies.json` 时同步更新 `meta.json` 的 `updatedAt`。
- 只自动发现公开仓库——私有仓库与 GitLab（evo_time）需手动加条目。

## 校验

`npm run lint:policy` 的 QG 检查覆盖：

- QG002：本文件的 records / projects 字段表 = `src/content.config.ts` 的 schema 键名与顺序；
- QG004：records / projects 中英成对，`translationOf` 与文件名一致；
- QG005：`data/*/meta.json` 的 `updatedAt` 是合法 ISO 时间且不在未来，`movies.json` 每条有 title / url。
