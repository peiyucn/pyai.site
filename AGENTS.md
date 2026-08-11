# AGENTS.md — 站点维护指南

本文件为 AI 编码助手（Copilot / Claude Code 等）提供本站的维护约定。

## 内容发布工作流（写手稿 → AI 处理）

### 快速开始（给人类）

你只需要：

1. 在 `drafts/` 目录下新建一个 Markdown 文件，**纯中文、专注内容**，不要管任何格式：
   - `drafts/blog-xxx.md` — 想发到**博客**（正式文章）
   - `drafts/note-xxx.md` — 想发到**笔记**（知识沉淀）
   - 文件名随意，内容随意，格式随意（你甚至可以只写标题和正文）
2. 告诉 AI："处理 `drafts/xxx.md`"

### AI 处理步骤（给 AI）

收到处理请求后，按以下步骤执行：

1. **阅读手稿**，判断类型：
   - 文件名以 `note-` 开头 → 笔记；以 `blog-` 开头 → 博客
   - 文件名不清晰时，根据内容自行判断（经验知识 → 笔记；想法/长文 → 博客）

2. **生成目标文件**（写入 `src/content/` 下）：

   | 手稿 | 中文文件 | 英文文件 |
   |---|---|---|
   | `drafts/blog-xxx.md` | `src/content/posts/zh/xxx.md` | `src/content/posts/en/xxx.md` |
   | `drafts/note-xxx.md` | `src/content/notes/zh/xxx.md` | `src/content/notes/en/xxx.md` |

3. **frontmatter 要求**（中文 + 英文都要）：

   ```yaml
   ---
   title: 标题          # 中英各自对应
   description: 一句话摘要  # 中英各自对应
   date: 2026-08-11      # 当天日期
   tags: [标签1, 标签2]   # 2~4 个相关标签
   locale: zh            # 或 en
   translationOf: xxx    # 中英相同（去掉语言前缀的文件名）
   ---
   ```

4. **内容处理**：
   - **默认原样发布**：手稿内容原样写入中文文件，不做任何改写/润色/优化，除非用户明确要求（"优化一下/帮我改改"等）
   - 英文文件：由 AI **完整翻译**为英文，保持同样的结构
   - 正文用标准 Markdown（标题分级、列表、代码块），不要在正文里重复标题

5. **处理完成**后：
   - **永不删除手稿**：原手稿保留在 `drafts/` 下，任何时候都不要删除（如需避免重复处理，可在手稿顶部加一行 `<!-- processed -->` 标记，或告诉我你已经确认过）
   - 运行 `pnpm build` 验证构建通过
   - 汇报：生成了哪两个文件、标题、标签；如果原样发布，说明"内容未改动"

### 注意事项

- 手稿可能只有标题没有正文 → 生成最小可用内容（正文留标题即可）
- 手稿可能很长 → 保持完整，不要截断或总结替代
- 手稿中有代码 → 用代码块包裹，保留原样
- 中文手稿中如有英文专有名词（如 GitHub、VS Code），保留不译

## 其他约定

- **项目页**（`src/content/projects/`）：每个 GitHub 仓库一个目录下的 `zh`/`en` 两个文件，字段见 `src/content.config.ts`
- **构建命令**：`pnpm build`（Astro 7 + Tailwind 4）
- **部署**：push 到 `master` 自动部署 GitHub Pages
- **导航**：站点只有 Blog / Notes / Projects / About 四个板块
