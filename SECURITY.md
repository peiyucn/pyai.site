# 安全策略 / Security Policy

## 支持版本 / Supported Versions

仅支持最新站点内容。本仓库无版本号，线上只跑 `main` 的最新提交。

## 报告漏洞 / Reporting a Vulnerability

请通过 GitHub **Private vulnerability reporting** 私下报告漏洞，不要在公开 issue 中披露未修复的漏洞：

<https://github.com/peiyucn/pyai.site/security/advisories/new>

Please report vulnerabilities privately via GitHub Private vulnerability reporting — do not disclose unpatched vulnerabilities in public issues:

<https://github.com/peiyucn/pyai.site/security/advisories/new>

- 请附上：复现步骤、影响范围、建议修复；中文或英文均可
- 我们会在 90 天内响应；修复发布后如你愿意可获公开致谢（也可要求匿名）

## 依赖告警 / Dependency alerts

依赖漏洞由 Dependabot alerts 报警；升级一律手动执行（无自动升级 PR）。发布工作流在部署前 fail-closed 查询 Dependabot / Code scanning / Secret scanning 告警，存在未处理告警即中止部署。

Dependency vulnerabilities are reported by Dependabot alerts. Upgrades are manual (no automatic upgrade PRs). The publish workflow queries Dependabot, code scanning and secret scanning alerts before deploying and fails closed while any alert is open.
