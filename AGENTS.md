# AGENTS.md — pyai.site 开发规范

> **首要原则：一切开发必须遵循 Astro 官方标准规范（docs.astro.build），禁止 hack、投机取巧或绕过框架正常机制的做法。**

## 项目概况

Astro 中英双语静态博客（GitHub Pages）。导航板块：首页 / 记录 / 项目 / 观影 / 关于。

* 站点内容中英双语（`/zh/` 与 `/en/`），改动后两种语言都要验证
* AI 开发需关注的路径：

  * `src/pages/[locale]/` — 双语页面（index / records / projects / movies / about）
  * `src/components/` — 组件（Header / Footer / MovieList / RecordCard / Pagination / ProjectCard / MiniBlackHole / GitHubLink 等）
  * `src/layouts/` — Base / ListLayout / PostLayout
  * `src/content.config.ts` — 内容集合 schema（records / projects / movies）
  * `src/content/records/` — 记录（zh/en 双语，用 tags 区分类型）
  * `src/data/hero-scene.json` — 首页黑洞 WebGL 场景数据（shader 内嵌，标题字体为 Fusion Pixel 像素字体）
  * `src/data/stars.ts` — 星空坐标数据（内页 SpaceBackdrop 与首页 Hero 共用，逐点 alpha 差异保留）
  * `src/i18n/` — UI 文案字典（新增文案先加 ui.ts 的 zh/en）
  * `src/utils/` — douban.ts（观影数据）/ content.ts（内容工具）
  * `public/vendor/` — 引擎（unicornstudio.js）与字体（fonts/fusion-pixel-…otf）
  * `data/pei830/` — 豆瓣数据（movies.json + meta.json）
  * `data/projects/meta.json` — 项目同步快照时间（projects-sync 写入）
  * `scripts/douban-sync/` — 豆瓣同步脚本
  * `scripts/projects-sync/` — 项目状态同步脚本

## 文档规范

> 三份文档各司其职、各有读者：AGENTS 给开发 agent、README 给用户、CHANGELOG 给用户——写错读者是文档事故。

* `AGENTS.md`：中文一份（面向开发 agent；唯一 agent 指令文件，不保留 CLAUDE.md 等其它厂商指令文件）
* `README.md`：单份英文——站点定位与本地开发说明；功能变更时更新
* 无 CHANGELOG（站点内容本身双语、发布无版本语义）、无 CONTRIBUTING
* 站点内容本身即用户文档：records 中英成对（`translationOf` 互指）；UI 文案先加 `src/i18n/ui.ts` 的 zh/en 两档

## 工程管线（本仓库自含）

* **开发**：日常改动直接在 main（无 dev 分支）
* **验证**：`pnpm run verify`（= check + build，exit=0）；push 前必须通过
* **提交**：逐项提交，中文描述 + 英文类型前缀（feat:/fix:/refactor:/chore:/docs:）；不确定的事直接说"不确定"，禁止编造事实性信息
* **推送与部署**：push main 即触发 publish.yml（build + Pages 部署）自动上线，无需打 tag；`git push/fetch` 需要代理 127.0.0.1:7897
* **运维**：依赖升级统一手动（security updates 与 dependabot.yml 关闭）；收到警报 → 判断影响面（运行时/产物依赖才影响用户）→ 手动升级
* 仓库专属：自定义域名 `pyai.site` 由根目录 `CNAME` 文件指定；首次配置时 GitHub 仓库 Pages Source 需手动设为 "GitHub Actions"；**默认分支改名后**要同步改 Pages 环境（`github-pages`）的部署分支策略（Settings → Environments → github-pages → Deployment branches，或 `gh api` 改 deployment-branch-policies），否则 deploy job 报 "Branch is not allowed to deploy" 直接失败（2026-09 曾因此停更）

## 代码审计（发布前 / 全面检查时）

* **文档对齐**：README 与站点实际导航板块/功能一致；本文件工程管线/CI 描述与 workflow 实际一致；records/projects 的 frontmatter 与 `src/content.config.ts` schema 一致
* **死代码**：组件/工具函数 grep 确认调用方；清未使用 import/样式/CSS 类；zh/en 内容成对无孤儿（`translationOf` 互指完整）
* **高危 BUG**：状态一致性（同步脚本写 `movies.json`/`meta.json` 时序一致，部分失败不写坏数据）；竞态（豆瓣增量/评分补充并发不互相覆盖）；路径与引号（`[locale]` 方括号路径操作必须 `-LiteralPath`）；部分失败（同步中途失败状态诚实、数据与 `meta.json` 一致）；环境边界（首次构建/清缓存/构建环境差异降级不挂死）
* **安全热点**：源码不写完整邮箱（charCode 混淆 + 运行时拼接）；公开仓库不提交私密数据（豆瓣凭据走环境变量 `DOUBAN_USER` 等）；同步脚本 fetch 带超时；外部数据（豆瓣/GitHub API）解析容错
* **代码异味**：组件单一职责；命名达意；zh/en 结构对称；无超长函数/重复逻辑/魔术字符串
* **魔法数字**：有语义数字（cron 时间/批次上限/每页条数）命名常量；注意 Astro 顶层 const 陷阱——`getStaticPaths` 用内联数字或模块级函数读取
* **鲁棒性**：豆瓣/GitHub API 异常有 best-effort 错误处理；解析对异常输入返回安全默认值；同步失败在 CI 记录可见
* **性能**：构建产物不随内容线性膨胀；列表分页不一次性渲染全部；首页 WebGL 移动端（≤768px）跳过 + 静态标题回退；图片资源体积合理
* **并发与防御**：同步脚本幂等（按 URL 去重、`MAX_PER_RUN` 限批），workflow_dispatch 重复触发无叠加副作用
* **测试与验证**：`pnpm run verify`（= check + build）通过且无新增错误；zh/en 双语都验证；`git diff --check` 干净

## 安全基线（本仓库自含要点）

* 已开启：secret scanning + push protection、根 `SECURITY.md`；检查命令 `gh api repos/peiyucn/pyai.site --jq .security_and_analysis`
* 未开启（与统一安全基线有出入，2026-09 查证）：Dependabot alerts、CodeQL default setup、Dependabot 自动升级——依赖升级按手动口径执行
* 分支保护：main 无经典保护（owner 直推即部署）；活跃 ruleset「默认分支轻保护」= 禁删/禁强推/禁建（另有一条「protect master」遗留 ruleset，禁删/禁强推）；**CI 会跑但不设硬门禁**

## CI 与自动发布

* **ci.yml**（push/PR 到 main）：`typecheck`（astro check）——push main 即验证；build 不重复跑（在 publish.yml）
* **publish.yml**（push main）：`deploy`（build + Pages 部署）——push main 即上线，无 tag、无审批门禁
* **daily-sync.yml**（cron + workflow_dispatch）：`sync`（每日同步，见下）

### 每日同步（daily-sync.yml）

`.github/workflows/daily-sync.yml` 每日 08:30（UTC+8，cron `30 0 * * *`）自动执行，也可 `workflow_dispatch` 手动触发，包含「豆瓣」与「项目」两部分：

**豆瓣**（脚本在 `scripts/douban-sync/`，数据在 `data/pei830/` 的 `movies.json` + `meta.json`）：

1. **列表增量**（`douban-incremental.mjs`）：抓列表页第 1 页（最近 30 条），与现有数据按 URL 去重，只追加新条目（秒级）
2. **评分补充**（`douban-enrich.mjs`）：调用 `subject_abstract` 接口，只处理缺豆瓣评分的条目，`MAX_PER_RUN` 限批

首次初始化（全量 2000+ 条）手动执行 `douban-full-export.mjs`：

```bash
DOUBAN_USER=pei830 DOUBAN_OUTPUT_DIR=data node scripts/douban-sync/douban-full-export.mjs
```

注意：豆瓣评分/导演/地区为**同步时快照**，三个脚本写 `movies.json` 时都要顺带更新 `meta.json` 的 `updatedAt`。

**项目**（脚本在 `scripts/projects-sync/`）：

`projects-sync.mjs` 先列出 GitHub 上 `peiyucn` 的公开、非 fork 仓库，为站点还没有条目的仓库自动生成 `src/content/projects/{zh,en}/<name>.md` 骨架（title/description/topics 等取 GitHub 仓库数据，description 中英同源不翻译）；随后读取各条目的 GitHub 仓库 `archived` 状态，映射到项目 frontmatter 的 `status`（active/wip/archived），并总是写 `data/projects/meta.json`（`updatedAt` 决定项目页「最后更新于」）。注意：只自动发现公开仓库——私有仓库与 GitLab（evo_time）需手动添加条目；`wip` 是手动状态，新项目默认 `active`。

同步提交后若检测到变更（`git-auto-commit-action`），用 `gh workflow run publish.yml` 触发部署（GITHUB_TOKEN 的 push 不会自动触发其他 workflow）。

## GitHub 与网络

* GitHub 操作一律走 `gh` CLI（已登录 peiyucn）；`gh api` 直连、`git push/fetch` 需要代理 127.0.0.1:7897
* 仓库：https://github.com/peiyucn/pyai.site

## 项目专属章节

### 开发 / 构建

#### 官方规范铁律

* 所有页面、组件、集合、路由、i18n 实现，一律以 **Astro 官方文档**（<https://docs.astro.build>）为准
* 禁止以下"hack 式"做法：
  * 在 `getStaticPaths` 里依赖顶层 `const` 或"碰巧能跑"的变量作用域技巧
  * 用内联 `<script>` 绕过框架应有的服务端渲染能力（除非确实需要客户端交互）
  * 为规避编译错误而修改源码结构去"适配"编译器，而不是查明根因
  * 手写 HTML 字符串拼装替代 Astro 组件语法（`{Pagination()}` 这类在 frontmatter 返回 JSX 的方式已被证明会触发编译器崩溃，应使用独立 `.astro` 组件）
* 遇到编译错误、构建崩溃，先查根因（错误日志、官方文档、issue），**禁止用删除功能、绕过校验、改默认行为等方式"糊弄"过去**

#### 已知技术约束（历史踩坑，务必避开）

* **`[locale]` 目录名的方括号是路径通配符陷阱**：
  * PowerShell 的 `Get-ChildItem` / `Set-Content` 等（非 `-LiteralPath`）会把方括号当通配符，**写文件会跑到错误位置甚至覆盖别的文件**——曾导致 8 个页面被 Base.astro 内容覆盖
  * 凡涉及 `[locale]` 路径的操作必须用 `-LiteralPath`，或用绝对路径 + `[System.IO.File]::WriteAllText`
* **Astro 顶层 `const` 陷阱**：`[page].astro` 的 `getStaticPaths` 若引用顶层 `const PER_PAGE` 会导致构建静默崩溃（编译器把顶层 const 移进组件作用域）。正确做法：`getStaticPaths` 内**内联数字**，或用模块级函数读取（如 `getMoviesCount()`）
* **BOM 陷阱**：PowerShell `Set-Content -Encoding UTF8` 会写 BOM，node 脚本 shebang 后带 BOM 直接 SyntaxError。写脚本用 `[System.IO.File]::WriteAllText(path, content, [System.Text.UTF8Encoding]::new($false))`
* **Tailwind 4 的 hover 变体**：`hover:*` 类被编译进 `@media (hover: hover)`，这是官方标准行为（触屏保护），不要移除或绕过
* **dev server 缓存**：删过 `.astro` 缓存目录后 dev 可能显示"共 0"数据或启动失败，重启 dev 即可；构建崩溃时先 `Remove-Item .astro, dist` 再试

#### 开发流程

1. 改动前先读懂相关文件（布局、组件、集合、i18n）
2. 遵循官方模式：页面用 `ListLayout`/`PostLayout`/`Base` 布局，组件用 `.astro` 单文件组件
3. 改动后必须 `pnpm run verify`（= check + build）验证通过（exit=0），且不出现新的错误
4. 中英双语都要验证（`/zh/` 与 `/en/`）

#### 技术配置要点

* **i18n**：`prefixDefaultLocale: true`（zh/en 都带前缀）、`redirectToDefaultLocale: true`
* **Content Layer**：movies 用自定义 loader 读 `data/pei830/movies.json`，注意函数式 loader 返回扁平结构（id 与 data 字段平级）
* **Tailwind 4**：主题在 `src/styles/global.css` 的 `@theme`，新增颜色/动画在此处定义
* **构建**：`pnpm build`（`astro build`，静态输出 `dist/`）；类型检查 = `pnpm run check`（`astro check`）；一键验证 = `pnpm run verify`（check + build）；部署构建跑 Node 24
* **首页 Hero（WebGL）**：`MoonshotHero.astro` 用 UnicornStudio 引擎渲染黑洞场景（`src/data/hero-scene.json`，shader 内嵌）。改 shader 直接改 `hero-scene.json` 里对应图层的 `compiledFragmentShaders` 字符串。**移动端（≤768px）跳过 WebGL**，用 `index.astro` 的 `.hero-static-title` 静态标题回退

### 内容发布工作流

#### 快速开始（给人类）

在 `drafts/` 下新建 Markdown 文件，纯中文、专注内容即可（文件名随意，建议用简短英文或拼音标识）：

* `drafts/xxx.md` — 任何想发的内容（文章、随笔、笔记、心得……）

然后告诉 AI："处理 `drafts/xxx.md`"

#### AI 处理步骤

1. 阅读手稿，判断适合的标签（如：随笔 / 技术 / 笔记 / 读书 / 生活……）
2. 生成目标文件：`src/content/records/zh/xxx.md` 与 `src/content/records/en/xxx.md`（**站点只有一个 records 集合，用 tags 区分内容类型，不再区分 blog / note**）
3. frontmatter 要求：

   ```yaml
   ---
   title: 标题
   description: 一句话摘要
   date: 2026-08-11
   tags: [标签1, 标签2]   # 2~4 个；用标签区分"随笔/技术/笔记"等类型
   locale: zh            # 或 en
   translationOf: xxx    # 中英相同（去掉语言前缀的文件名）
   ---
   ```

4. 内容处理：
   * 中文：默认原样发布，不润色（除非用户明确要求）
   * 英文：完整翻译为英文，保持结构
   * 正文用标准 Markdown，不在正文重复标题
5. 写作约定：
   * `description` 里避免未加引号的半角冒号（YAML 解析问题），如 `description: "a: b"`
   * 未完成的内容加 `draft: true`，不会出现在列表里
6. 完成后：永不删除 `drafts/` 手稿（如需避免重复处理，在手稿顶部加 `<!-- processed -->`）；`pnpm build` 验证；汇报生成的文件与标签

### 其他约定

* **项目页**（`src/content/projects/`）：与记录一致，`zh`/`en` 两个语言目录各放一个同名 `.md`，字段见 `src/content.config.ts`（status: active/wip/archived）
* **观影数据**：`data/pei830/movies.json` 由同步脚本生成，勿手改；`meta.json` 的 `updatedAt` 决定页面底部"更新于"时间
* **邮箱反爬**：关于页邮箱用 charCode 混淆 + 运行时 JS 拼接，不要在源码中写完整邮箱
