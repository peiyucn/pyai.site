# AGENTS.md — pyai.site 开发规范

> **首要原则**：一切开发遵循 Astro 官方规范（<https://docs.astro.build>），禁止 hack、禁止绕过框架机制。

## 项目概况

Astro 中英双语静态博客（GitHub Pages）。导航板块：首页 / 记录 / 项目 / 观影 / 关于。站点内容中英双语（`/zh/` 与 `/en/`），改动后两种语言都要验证。

* `src/pages/[locale]/` — 双语页面（index / records / projects / movies / about）
* `src/components/` — 组件（Header / Footer / MovieList / RecordCard / Pagination / ProjectCard / MiniBlackHole / GitHubLink 等）
* `src/layouts/` — Base / ListLayout / PostLayout
* `src/content.config.ts` — 内容集合 schema（records / projects / movies）
* `src/content/records/` — 记录（zh/en 双语，用 tags 区分类型）
* `src/data/hero-scene.json` — 首页黑洞 WebGL 场景数据（shader 内嵌，标题用 Fusion Pixel 像素字体）
* `src/data/stars.ts` — 星空坐标（内页 SpaceBackdrop 与首页 Hero 共用）
* `src/i18n/` — UI 文案字典（新增文案先加 ui.ts 的 zh/en）
* `src/utils/` — douban.ts（观影数据）/ content.ts（内容工具）
* `public/vendor/` — 引擎（unicornstudio.js）与字体
* `data/pei830/` — 豆瓣数据（movies.json + meta.json）
* `data/projects/meta.json` — 项目同步快照时间（projects-sync 写入）
* `scripts/douban-sync/`、`scripts/projects-sync/` — 同步脚本

## 文档规范

> AGENTS 给开发 agent、README 给用户——写错读者是文档事故。

* `AGENTS.md`：中文一份；唯一 agent 指令文件（不留 CLAUDE.md 等其它厂商指令文件）
* `README.md`：单份英文——站点定位与本地开发说明；**面向用户**——只写用法与行为，不写实现细节、私有 seam、开发历史
* 无 CHANGELOG、无 CONTRIBUTING（站点内容本身双语、发布无版本语义）
* 站点内容即用户文档：records 中英成对（`translationOf` 互指）

## 工程管线（本仓库自含）

* **开发**：日常改动直接在 main（无 dev 分支）
* **验证**：`pnpm run verify`（= check + build，exit=0）；push 前必须通过
* **提交**：逐项提交，中文描述 + 英文类型前缀（feat:/fix:/refactor:/chore:/docs:）
* **推送与部署**：push main 即触发 publish.yml（build + Pages 部署）上线，无 tag
* **发布确认（硬门禁，owner 当次点头）**：push `main` 属**不可逆的对外发布动作**，执行前必须由 owner **当次明确确认**——「之前批准了整条发布流程」「按你建议走」「继续」**不构成**发布许可；agent 停在发布动作之前，一句话报出「要发什么、目标通道、影响范围」，未回话即视为未批准（根规范《发布（定版）》step5）
* **运维**：依赖升级统一手动（security updates 与 dependabot.yml 关闭）；收到警报 → 手动升级 → 提交并推 main

## 代码审计（发布前 / 全面检查时）

* **文档对齐**：README 与站点实际板块一致；本文件的管线 / CI 描述与 workflow 一致；records / projects 的 frontmatter 与 `src/content.config.ts` schema 一致
* **死代码**：组件 / 工具函数 grep 确认调用方；清未使用 import / 样式 / CSS 类；zh / en 内容成对无孤儿（`translationOf` 互指完整）
* **高危 BUG**：状态一致性（同步脚本写 `movies.json` / `meta.json` 时序一致，部分失败不写坏数据）；竞态（豆瓣增量 / 评分补充并发不互相覆盖）；路径与引号（`[locale]` 路径操作必须 `-LiteralPath`）；环境边界（首次构建 / 清缓存 / 构建环境差异降级不挂死）
* **安全热点**：源码不写完整邮箱（charCode 混淆 + 运行时拼接）；不提交私密数据（豆瓣凭据走环境变量 `DOUBAN_USER` 等）；同步脚本 fetch 带超时；外部数据（豆瓣 / GitHub API）解析容错
* **代码异味**：组件单一职责；命名达意；zh / en 结构对称；无超长函数 / 重复逻辑 / 魔术字符串
* **魔法数字**：语义数字（cron 时间 / 批次上限 / 每页条数）命名常量
* **鲁棒性**：豆瓣 / GitHub API 异常 best-effort 处理；解析对异常输入返回安全默认值；同步失败在 CI 记录可见
* **性能**：列表分页不一次性渲染全部；首页 WebGL 移动端（≤768px）跳过 + 静态标题回退；图片体积合理
* **并发与防御**：同步脚本幂等（按 URL 去重、`MAX_PER_RUN` 限批）；`workflow_dispatch` 重复触发无叠加副作用
* **测试与验证**：`pnpm run verify` 通过且无新增错误；zh / en 双语都验证；`git diff --check` 干净

## 安全基线（本仓库自含要点）

* 已开启（2026-09 逐项核验）：Dependabot alerts（仅报警）、CodeQL default setup（weekly，JS/TS + actions）、secret scanning + push protection、Private vulnerability reporting、根 `SECURITY.md`
* 未开启：Dependabot 自动升级（无 `dependabot.yml`）；非提供商模式 / validity checks 保持关
* 分支保护三层（2026-09 逐项核验）：经典保护 **未设**——与基线的出入：main 无「要求对话解决 / 不允许绕过」；ruleset 轻保护 ✓（「默认分支轻保护」，另有「protect master」遗留）；合并设置 **Squash-only** ✓；**CI 会跑但不设硬门禁**
* 核验按根规范《统一安全基线 · 逐项检查命令》逐项跑

## CI 与自动发布

| Workflow | 触发 | 作用 |
| :--- | :--- | :--- |
| `ci.yml` | push / PR 到 main | `typecheck`（astro check）；build 在 publish.yml |
| `publish.yml` | push main | `deploy`（build + Pages 部署） |
| `daily-sync.yml` | cron 每日 08:30（UTC+8）+ workflow_dispatch | `sync`（豆瓣 + 项目，见下） |

### 每日同步

* **豆瓣列表增量**（`douban-incremental.mjs`）：抓列表页第 1 页（最近 30 条），按 URL 去重后追加
* **豆瓣评分补充**（`douban-enrich.mjs`）：调 `subject_abstract`，只补缺评分的条目，`MAX_PER_RUN` 限批
* **全量初始化**（手动）：`DOUBAN_USER=pei830 DOUBAN_OUTPUT_DIR=data node scripts/douban-sync/douban-full-export.mjs`
* **项目**（`projects-sync.mjs`）：列 peiyucn 公开、非 fork 仓库 → 为新仓库生成 `src/content/projects/{zh,en}/<name>.md` 骨架（title / description / topics 取仓库数据，description 中英同源不翻译）→ 按仓库 `archived` 写 frontmatter `status`（active / wip / archived；`wip` 手动）→ 总是写 `data/projects/meta.json`
* 豆瓣评分 / 导演 / 地区是**同步时快照**；三个脚本写 `movies.json` 时都要顺带更新 `meta.json` 的 `updatedAt`
* 只自动发现公开仓库——私有仓库与 GitLab（evo_time）需手动加条目
* 同步提交后若检测到变更，用 `gh workflow run publish.yml` 触发部署（GITHUB_TOKEN 的 push 不触发其它 workflow）

## GitHub 与网络

* 一律 `gh` CLI（已登录 peiyucn）；仓库 <https://github.com/peiyucn/pyai.site>

## 项目专属章节

### 开发 / 构建

* **官方规范铁律**：所有页面 / 组件 / 集合 / 路由 / i18n 一律以 Astro 官方文档为准；禁止这些做法——`getStaticPaths` 里依赖顶层 `const` 或「碰巧能跑」的作用域技巧；用内联 `<script>` 绕过框架的 SSR 能力（除非确需客户端交互）；为规避编译错误改源码结构去「适配」编译器；手写 HTML 字符串拼装替代 Astro 组件语法（`{Pagination()}` 这类在 frontmatter 返回 JSX 的写法会触发编译器崩溃，用独立 `.astro` 组件）
* **遇错先查根因**：编译错误 / 构建崩溃先看错误日志、官方文档、issue；禁止用删功能、绕过校验、改默认行为等方式糊弄
* **`[locale]` 方括号陷阱**：PowerShell 的 `Get-ChildItem` / `Set-Content` 等（非 `-LiteralPath`）会把方括号当通配符，写文件会跑到错误位置；涉及 `[locale]` 必须用 `-LiteralPath` 或绝对路径 + `[System.IO.File]::WriteAllText`
* **Astro 顶层 `const` 陷阱**：`[page].astro` 的 `getStaticPaths` 引用顶层 `const` 会导致构建静默崩溃；用内联数字或模块级函数（如 `getMoviesCount()`）
* **BOM 陷阱**：PowerShell `Set-Content -Encoding UTF8` 会写 BOM，node 脚本 shebang 后带 BOM 直接 SyntaxError；写脚本用 `[System.IO.File]::WriteAllText(path, content, [System.Text.UTF8Encoding]::new($false))`
* **Tailwind 4 的 `hover:*`** 被编译进 `@media (hover: hover)`，是官方行为（触屏保护），不要移除或绕过
* **dev server 缓存**：删过 `.astro` 缓存后 dev 可能显示「共 0」或启动失败，重启即可；构建崩溃先 `Remove-Item .astro, dist` 再试

### 技术配置要点

* **i18n**：`prefixDefaultLocale: true`（zh / en 都带前缀）、`redirectToDefaultLocale: true`
* **Content Layer**：movies 用自定义 loader 读 `data/pei830/movies.json`；函数式 loader 返回扁平结构（id 与 data 平级）
* **Tailwind 4**：主题在 `src/styles/global.css` 的 `@theme`，新增颜色 / 动画在此定义
* **构建**：`pnpm build`（静态输出 `dist/`）、`pnpm run check`（astro check）、`pnpm run verify`（check + build）；部署构建跑 Node 24
* **首页 Hero**：`MoonshotHero.astro` 用 UnicornStudio 渲染黑洞场景（`src/data/hero-scene.json`，shader 内嵌）；改 shader 直接改对应图层的 `compiledFragmentShaders`；**移动端（≤768px）跳过 WebGL**，用 `index.astro` 的 `.hero-static-title` 回退

### 内容发布工作流

* **手稿**：在 `drafts/` 下新建 Markdown（纯中文即可，文件名随意），然后让 AI「处理 `drafts/xxx.md`」
* **产出**：`src/content/records/zh/xxx.md` 与 `src/content/records/en/xxx.md`（只有一个 records 集合，用 tags 区分内容类型，不再分 blog / note）
* **frontmatter**：

  ```yaml
  ---
  title: 标题
  description: 一句话摘要
  date: 2026-08-11
  tags: [标签1, 标签2]   # 2~4 个
  locale: zh            # 或 en
  translationOf: xxx    # 中英相同（去掉语言前缀的文件名）
  ---
  ```

* **内容处理**：中文原样发布不润色（除非明确要求）；英文完整翻译、保持结构；正文用标准 Markdown、不重复标题
* **写作约定**：`description` 避免未加引号的半角冒号（如 `description: "a: b"`）；未完成的加 `draft: true`（不进列表）
* **收尾**：永不删 `drafts/` 手稿（避免重复处理就在顶部加 `<!-- processed -->`）；`pnpm build` 验证；汇报生成的文件与标签

### 其他约定

* **项目页**（`src/content/projects/`）：zh / en 各一个同名 `.md`，字段见 `src/content.config.ts`（status: active/wip/archived）
* **观影数据**：`data/pei830/movies.json` 由同步脚本生成，勿手改；`meta.json` 的 `updatedAt` 决定页面底部「更新于」
* **邮箱反爬**：关于页邮箱用 charCode 混淆 + 运行时拼接，源码不写完整邮箱
