# 依赖与版本约束

> 所有依赖升级手动执行（E22）：无 `dependabot.yml`、无 security updates 自动 PR。收到 Dependabot 告警后手动升级、跑 `pnpm run verify`、提交。

## 运行时基线

- Node `>=24.9.0`（`package.json` 的 `engines.node`）；CI / 部署工作流都跑 Node 24。
- `@types/node` 固定在 Node 24 线（`^24.19.2`）：类型包必须与运行时的 Node 大版本一致，否则会用到运行时没有的 API（E8 / QG003 校验三者一致）。
- 包管理器 pnpm 11（`pnpm-workspace.yaml` 声明根目录是唯一包）；不使用 npm / yarn 安装。

## 已知安全覆盖（overrides）

均为构建期依赖，不进站点运行时的用户可见行为，升级只为告警清零：

| 包 | 版本 | 原因 |
|---|---|---|
| `source-map-js` | `^1.2.2` | 修 GHSA-68fv-2mgg-jv7q（索引节偏移导致事件循环 DoS）。多个上游（@tailwindcss/node / css-tree / postcss）各自声明旧范围，统一 override |
| `postcss-selector-parser` | `^7.1.6` | 修 PostCSS 选择器解析的二次方复杂度（CPU 耗尽）。advisory 的 patched 版本即 7.1.6，6.x 全在风险范围；@tailwindcss/typography 声明 6.x，这里跨大版本，只用于选择器解析，7.x 的 API 对解析用途兼容，由 build 验证兜底 |
| `fast-uri` | `^3.1.7` | 修 GHSA-hrr3-gc8f-f4qj（百分号编码八位组导致主机名大小写归一不一致） |

## 2026-11-22 告警清零

Dependabot alert #41–#44（astro / zod / fast-xml-parser）：

| 包 | 处理 | 结果 |
|---|---|---|
| `astro` | `^7.4.1` → `^7.4.13` | 修 XSS via attribute injection、@astrojs/node 图片端点越界读 |
| `zod` | 传递依赖升到 `4.6.7` | 修 oversized constrained collections 内存耗尽 |
| `fast-xml-parser` | 传递依赖升到 `5.12.1` | 修未闭合 stop-node 的二次方扫描 |

传递依赖用 `pnpm update zod fast-xml-parser --depth 100` 在各自声明范围内升级，没有新增 override。

## 构建脚本

`pnpm-workspace.yaml` 的 `allowBuilds` 只放行 `esbuild` / `sharp`（Astro 构建所需），新增需要构建脚本的依赖必须显式加白名单并说明理由。
