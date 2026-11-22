# 发布

> 本仓库的「发布」是**部署上线**：push `main` 触发 `publish.yml`（build → deploy），GitHub Pages 对外可见。没有版本号、没有 tag、没有 CHANGELOG（站点无版本语义，E5 豁免见 AGENTS `## 4`）。

## 通道

| 项 | 值 |
|---|---|
| 触发 | push `main`（`workflow_dispatch` 也可手动派发） |
| 工作流 | `.github/workflows/publish.yml` |
| 环节 | `build`（`pnpm build` + 上传 Pages artifact）→ `deploy`（`actions/deploy-pages`） |
| 环境 | `github-pages`（GitHub 内置环境，不需手动创建） |
| 站点 | <https://pyai.site> |

## 发布前置条件（硬门禁）

1. **`pnpm run verify` 全绿**，工作区无未提交改动（E8）。
2. **用户可见改动有验收证据**：本机 `pnpm build` + `pnpm preview` 的页面截图 / DOM / 控制台，或 owner 实测记录（G8）。
3. **未处理告警为零**：Dependabot / Code scanning / Secret scanning（E18）。
4. **owner 当次明确确认**：push `main` 属不可逆的对外发布动作；此前批准不适用于本次；agent 停在 push 之前，一句话报出「要发什么、目标通道、影响范围」，未回话视为未批准（C8 / release.md step5）。

## 安全门禁（fail-closed）

`deploy` 作业在部署前依次执行：

1. `Verify commit is on main`：`git merge-base --is-ancestor "$GITHUB_SHA" origin/main`，不在 `main` 上即中止（手动派发到分支时生效）。
2. `Security gate`：`node scripts/security-gate.mjs` 查询三类未处理告警；任一非零、查询失败或凭据缺失都中止部署。

凭据：环境级 secret `SECURITY_ALERTS_TOKEN`，fine-grained token 需具备 Dependabot alerts / Code scanning alerts / Secret scanning alerts 的只读权限。三类查询统一走该 token：`GITHUB_TOKEN` 读不到 Dependabot 与 secret scanning 告警，混用会假失败或 fail-open。该 secret 由 owner 在 `github-pages` 环境配置，agent 不代建。

## 发布后

- 到 Actions 看 `publish` 的 `deploy` 作业结论，并在页面确认线上内容（C7：`已上线验证` 由 owner 确认）。
- 部署失败不覆盖「已发布」状态：Pages 保留上一次成功部署；修复后重新合并即重新部署。
- 回滚用 `git revert` 新提交再部署，不改写历史、不移动已发布内容。
- 每日数据同步不走 PR：`daily-sync.yml` 用部署密钥 `SYNC_DEPLOY_KEY` 直推 `main`（严格 ruleset 的 DeployKey bypass），推送即触发 `publish.yml`。

## 与策略的关系

- 日常改动走分支 + PR；合并即部署，所以 PR 合并本身就是发布动作，owner 审核 PR 时同时确认了发布（严格 PR 门禁 ruleset 配置后）。
- 依赖升级按 E22 手动执行；有告警先清零再合并。
