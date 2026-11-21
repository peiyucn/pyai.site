# 架构

> 站点是 Astro 静态站（`output: static`），构建产物只有 `dist/`，由 GitHub Pages 托管。`pyai.site` 为自定义域名（`CNAME`）。

## 目录与职责

| 路径 | 职责 |
|---|---|
| `src/pages/[locale]/` | 双语页面：index / records / projects / movies / about |
| `src/layouts/` | Base / ListLayout / PostLayout |
| `src/components/` | Header / Footer / MovieList / RecordCard / Pagination / ProjectCard / MiniBlackHole / MoonshotHero 等 |
| `src/content.config.ts` | 内容集合 schema（records / projects / movies） |
| `src/content/records|projects/{zh,en}/` | 作者维护的 Markdown |
| `src/data/hero-scene.json` | 首页黑洞场景数据（shader 内嵌） |
| `src/data/stars.ts` | 星空坐标（内页 SpaceBackdrop 与首页共用） |
| `src/i18n/` | UI 文案字典与语言工具 |
| `src/utils/` | 内容、观影、日期工具 |
| `public/vendor/` | 第三方引擎（unicornstudio.js）与字体 |
| `data/{pei830,projects}/` | 同步脚本生成的 JSON 快照 |
| `scripts/{douban-sync,projects-sync}/` | 同步脚本 |

## 路由与 i18n

- `prefixDefaultLocale: true`：`/zh/` 与 `/en/` 都带语言前缀；`/` 重定向到 `/zh/`。
- `redirectToDefaultLocale: true`：访问无前缀路径时由 Astro 落到默认语言。
- `fallback.en = 'zh'`：英文缺失的页面回退中文。
- UI 文案只从 `src/i18n/ui.ts` 取，新增文案先补 zh / en 两份，再由 `t(locale, key, vars?)` 渲染。
- 内容语言由 frontmatter `locale` 决定，语言切换按 `translationOf` 找对端页面。

## 内容层（Content Layer）

- records / projects 用 `glob` loader 读 `src/content/` 下的 Markdown；schema 与文档字段表的对应关系见 [content.md](content.md)。
- movies 用自定义函数式 loader 读 `data/pei830/movies.json`：函数式 loader 必须返回扁平结构（`id` 与 data 字段平级），否则集合类型与排序都会错位。
- `movies.json` 缺失或损坏时 loader 返回空数组，构建降级为空观影列表，不挂死。

## 首页 Hero 与 WebGL

**组成**：UnicornStudio 场景（`MoonshotHero.astro`）+ 星点层（`ParticleBackground` / `SpaceBackdrop`）+ 静态标题回退。

**硬约束（都有踩坑记录）**：

1. **不用 `transition:persist`**：实测该属性在导航时把元素移出 `body`，引擎初始化（rAF 驱动 `checkIfReady`）在元素离体期间被打断；返回首页后场景卡在 `initializing=true`，黑洞黑屏且不再出现。改为「每次导航后干净重建」：新元素 → 销毁旧场景 → 创建新场景。
2. **引擎只在会话内加载一次**：动态注入 `<script>` 并置全局标志。若用 `<script src>` 直挂 body，视图切换后脚本重跑会重新执行 UMD，`window.UnicornStudio` 被重置为新对象（scenes 清空、旧 WebGL context 泄漏），多次切换后 context 超限黑屏。
3. **移动端（≤768px）跳过 WebGL**，用 `index.astro` 的 `.hero-static-title` 像素字标题回退；桌面端才注入引擎。
4. **场景创建不走 `UnicornStudio.init()` 的 Promise**：它依赖 `requestIdleCallback`，视图切换后或后台标签下可能永不 resolve；场景创建走 `addScene`，由 `boot()` 轮询兜底。
5. **找场景要判活**：`scenes` 数组会残留元素已移除的旧 scene，取 `scenes[0]` 会拿到死场景；按 `element.isConnected` / `document.body.contains` 过滤。
6. **星点 mask**：星点层用 `mask-image` 径向挖洞让黑洞中心保持纯黑，挖洞中心跟随 `--bh-x` / `--bh-y`。
7. **星空数据单一真源**：`src/data/stars.ts` 同时供内页与首页使用；两处星点集合与 alpha 逐点差异（首页更亮更密）原样保留，改动必须两处都验证。

## 光标与视觉

- `CursorAtom.astro` 是自定义原子光标：中心核直接跟手，外圈轨道延迟拖尾；所有元素隐藏系统指针，交互元素只改形态。
- 像素字体「缝合像素」（Fusion Pixel，OFL）vendor 化，字号用 12 的整数倍最清晰。
- 根字号放大到 125%（16px → 20px），所有 rem 等比缩放；`scrollbar-gutter: stable` 常驻占位，避免内容长短变化导致标题栏跳动。

## 数据同步

- `scripts/douban-sync/` 与 `scripts/projects-sync/` 由 `daily-sync.yml` 定时触发（cron 每日 08:30 UTC+8）。
- 幂等：豆瓣按 URL 去重、每轮限批（`MAX_PER_RUN`）；项目按仓库名去重。
- 状态一致：写 `movies.json` 时同步更新 `meta.json` 的 `updatedAt`；解析失败一律返回安全默认值，不写坏数据。
- 外部请求带超时；外部数据解析容错；失败在 CI 日志可见。
- GITHUB_TOKEN 的 push 不触发其它 workflow，所以同步提交后由 workflow 内 `gh workflow run publish.yml` 触发部署。

## 构建与部署

- `pnpm build` → 静态 `dist/`；`pnpm run check`（`astro check`）做类型检查。
- Pages artifact 只能在同一 workflow run 内交接，所以 `publish.yml` 自含 `build` → `deploy`，两者串行。
- 部署环境是 GitHub 内置的 `github-pages`；发布细节见 [release.md](release.md)。
