#!/usr/bin/env node
/**
 * 项目状态 + 简介同步（含新项目自动发现）：
 *   1. 发现：列出 GitHub 上 PROJECTS_GITHUB_OWNER（默认 peiyucn）的公开、非 fork 仓库，
 *      为 src/content/projects 里还没有条目的仓库自动生成 zh/en 两个骨架文件。
 *   2. 状态：读取每个项目的 repo 地址，查 GitHub 的 archived 状态，回写 frontmatter 的 status。
 *   3. 简介：读取 GitHub 的 description（仓库简介），中英同源不翻译，直接回写 zh/en frontmatter 的 description。
 *
 * status 映射规则：
 *   - GitHub archived=true                  → status: archived
 *   - GitHub archived=false 且当前是 archived → status: active（解除归档）
 *   - 其余（active / wip）保持不变（wip 是手动维护的状态，不被覆盖）
 *   - 新发现的项目：archived=true → archived，否则 active
 *
 * description 规则：
 *   - GitHub description 为单一来源，中英同源不翻译，直接回写 zh/*.md 与 en/*.md
 *   - GitHub description 为空时跳过，避免把已有简介清空（新条目则写空字符串占位）
 *
 * 已知限制：
 *   - 只自动发现公开仓库；私有仓库与 GitLab 等非 GitHub 仓库需手动添加条目
 *   - 仓库改名后旧条目不会自动删除，需手动清理
 *
 * 同时写 data/projects/meta.json（updatedAt），供项目页展示"最后更新时间"。
 * 用法：node scripts/projects-sync/projects-sync.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PROJECTS_DIR = path.join(ROOT, 'src', 'content', 'projects');
const META_PATH = path.join(ROOT, 'data', 'projects', 'meta.json');

const GH_API = 'https://api.github.com';
const GH_OWNER = process.env.PROJECTS_GITHUB_OWNER || 'peiyucn';
const GH_TOKEN = process.env.GITHUB_TOKEN || '';

function apiHeaders() {
  const headers = { 'User-Agent': 'pyai-site-projects-sync', Accept: 'application/vnd.github+json' };
  if (GH_TOKEN) headers.Authorization = `Bearer ${GH_TOKEN}`;
  return headers;
}

/** 从 frontmatter 里提取 repo / status */
function parseFrontmatter(content) {
  const repo = content.match(/^repo:\s*(.+)$/m)?.[1]?.trim() || '';
  const status = content.match(/^status:\s*(.+)$/m)?.[1]?.trim() || '';
  return { repo, status };
}

/** 从 repo URL 提取 owner/name */
function repoOwnerName(repoUrl) {
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
  return m ? { owner: m[1], name: m[2] } : null;
}

/** 归一化仓库标识（owner/name 小写），用于比对"站点已有条目 vs GitHub 仓库列表" */
function repoKey(repoUrl) {
  const m = repoOwnerName(repoUrl);
  return m ? `${m.owner}/${m.name}`.toLowerCase() : '';
}

/** 列出 GitHub 上 GH_OWNER 的公开仓库（按更新时间倒序，最多 5 页） */
async function listPublicRepos() {
  const repos = [];
  for (let page = 1; page <= 5; page += 1) {
    const url = `${GH_API}/users/${GH_OWNER}/repos?per_page=100&sort=updated&page=${page}`;
    const resp = await fetch(url, { headers: apiHeaders() });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} listing ${GH_OWNER} repos`);
    const batch = await resp.json();
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return repos.filter((repo) => !repo.fork);
}

/** 收集站点已有条目的仓库标识集合 */
function collectRepoKeys() {
  const keys = new Set();
  for (const lang of ['zh', 'en']) {
    const dir = path.join(PROJECTS_DIR, lang);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      const { repo } = parseFrontmatter(content);
      const key = repoKey(repo);
      if (key) keys.add(key);
    }
  }
  return keys;
}

/** 为新项目生成骨架 frontmatter（description 取 GitHub 单一来源，中英同源） */
function buildFrontmatter(repo, locale) {
  const lines = [
    '---',
    `title: ${repo.name}`,
    `description: ${JSON.stringify(repo.description || '')}`,
    `locale: ${locale}`,
    `repo: ${repo.html_url}`,
    `status: ${repo.archived ? 'archived' : 'active'}`,
  ];
  if (repo.pushed_at) lines.push(`updated: ${repo.pushed_at.slice(0, 10)}`);
  lines.push(`stars: ${repo.stargazers_count ?? 0}`);
  lines.push(`forks: ${repo.forks_count ?? 0}`);
  if (repo.language) lines.push(`language: ${repo.language}`);
  if (Array.isArray(repo.topics) && repo.topics.length > 0) {
    lines.push(`topics: ${JSON.stringify(repo.topics)}`);
  }
  if (repo.homepage) lines.push(`link: ${repo.homepage}`);
  lines.push('---', '');
  return lines.join('\n');
}

/** 发现新项目：GitHub 上有、站点还没有条目的仓库 → 生成 zh/en 骨架文件 */
async function discoverNewProjects() {
  const existing = collectRepoKeys();
  const created = [];
  for (const repo of await listPublicRepos()) {
    if (existing.has(`${repo.owner.login}/${repo.name}`.toLowerCase())) continue;
    for (const lang of ['zh', 'en']) {
      const dir = path.join(PROJECTS_DIR, lang);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${repo.name.toLowerCase()}.md`), buildFrontmatter(repo, lang), 'utf8');
    }
    created.push(repo.html_url);
  }
  return created;
}

/** 查 GitHub API：archived / description / pushed_at / stars / forks / language / topics / homepage */
async function fetchRepo(owner, name) {
  const url = `${GH_API}/repos/${owner}/${name}`;
  const resp = await fetch(url, { headers: apiHeaders() });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${owner}/${name}`);
  const data = await resp.json();
  return {
    archived: !!data.archived,
    description: data.description || '',
    updatedAt: data.pushed_at || '',
    stars: data.stargazers_count ?? 0,
    forks: data.forks_count ?? 0,
    language: data.language || '',
    topics: data.topics || [],
    homepage: data.homepage || '',
  };
}

/** 把 frontmatter 字段 upsert（存在则更新值，不存在则在 repo 行后插入） */
function upsertField(content, key, value) {
  const line = `${key}: ${value}`;
  const re = new RegExp(`^${key}:\\s*[^\\r\\n]*`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return content.replace(/^repo:\s*[^\r\n]*/m, (m) => `${m}\n${line}`);
}

async function main() {
  let discovered = [];
  try {
    discovered = await discoverNewProjects();
  } catch (err) {
    console.error(`Project discovery failed: ${err.message}`);
  }

  const repoMap = new Map(); // repoUrl -> { files: {path}[], status: string }

  for (const lang of ['zh', 'en']) {
    const dir = path.join(PROJECTS_DIR, lang);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const { repo, status } = parseFrontmatter(content);
      if (!repo || !repoOwnerName(repo)) {
        console.warn(`Skip ${file}: no valid repo URL`);
        continue;
      }
      if (!repoMap.has(repo)) repoMap.set(repo, { files: [], status });
      repoMap.get(repo).files.push({ path: filePath });
    }
  }

  const changed = [];
  for (const [repo, info] of repoMap) {
    const { owner, name } = repoOwnerName(repo);
    let repoInfo;
    try {
      repoInfo = await fetchRepo(owner, name);
    } catch (err) {
      console.error(`Failed to fetch ${repo}: ${err.message}. Skipping.`);
      continue;
    }

    // archived=false 且当前是 archived → 解除归档回 active；其余不动（保留 wip/active）
    const newStatus = repoInfo.archived
      ? 'archived'
      : info.status === 'archived'
        ? 'active'
        : info.status;

    let descChanged = false;
    let metaChanged = false;
    for (const { path: filePath } of info.files) {
      let content = fs.readFileSync(filePath, 'utf8');
      let fileChanged = false;

      if (newStatus !== info.status) {
        content = content.replace(/^status:\s*\S+/m, `status: ${newStatus}`);
        fileChanged = true;
      }

      // 简介：GitHub 描述为准，中英同源不翻译
      if (repoInfo.description) {
        const quoted = JSON.stringify(repoInfo.description);
        const next = content.replace(/^description:\s*[^\r\n]*/m, `description: ${quoted}`);
        if (next !== content) {
          content = next;
          fileChanged = true;
          descChanged = true;
        }
      }

      // GitHub 元数据：created / stars / forks / language
      const metaFields = [
        ['updated', repoInfo.updatedAt ? repoInfo.updatedAt.slice(0, 10) : ''],
        ['stars', repoInfo.stars != null ? String(repoInfo.stars) : ''],
        ['forks', repoInfo.forks != null ? String(repoInfo.forks) : ''],
        ['language', repoInfo.language],
        ['topics', repoInfo.topics?.length ? JSON.stringify(repoInfo.topics) : ''],
        ['link', repoInfo.homepage],
      ];
      for (const [key, value] of metaFields) {
        if (!value) continue;
        const next = upsertField(content, key, value);
        if (next !== content) {
          content = next;
          fileChanged = true;
          metaChanged = true;
        }
      }

      if (fileChanged) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }

    if (newStatus !== info.status) {
      changed.push(`${repo}: status ${info.status} -> ${newStatus}`);
    }
    if (descChanged) {
      changed.push(`${repo}: description -> ${repoInfo.description}`);
    }
    if (metaChanged) {
      changed.push(`${repo}: stars ${repoInfo.stars} / forks ${repoInfo.forks} / lang ${repoInfo.language || '-'}`);
    }
  }

  fs.mkdirSync(path.dirname(META_PATH), { recursive: true });
  fs.writeFileSync(
    META_PATH,
    JSON.stringify({ updatedAt: new Date().toISOString(), type: 'projects-sync' }, null, 2),
    'utf8',
  );

  if (discovered.length) {
    console.log(`Added ${discovered.length} new project(s):\n  ${discovered.join('\n  ')}`);
  }
  if (changed.length) {
    console.log(`Updated ${changed.length} item(s):\n  ${changed.join('\n  ')}`);
  } else {
    console.log('No changes.');
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
