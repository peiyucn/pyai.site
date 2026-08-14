#!/usr/bin/env node
/**
 * 项目状态同步：读取每个项目的 repo 地址，查 GitHub 的 archived 状态，回写 frontmatter 的 status。
 *
 * 映射规则：
 *   - GitHub archived=true          → status: archived
 *   - GitHub archived=false 且当前是 archived → status: active（解除归档）
 *   - 其余（active / wip）保持不变（wip 是手动维护的状态，不被覆盖）
 *
 * 同时写 data/projects/meta.json（updatedAt），供项目页展示"最后更新时间"。
 * 用法：node scripts/projects-sync/projects-sync.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PROJECTS_DIR = path.join(ROOT, 'src', 'content', 'projects');
const META_PATH = path.join(ROOT, 'data', 'projects', 'meta.json');

const GH_TOKEN = process.env.GITHUB_TOKEN || '';

/** 从 frontmatter 里提取 repo 与 status */
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

/** 查 GitHub API 的 archived 状态 */
async function fetchArchived(owner, name) {
  const url = `https://api.github.com/repos/${owner}/${name}`;
  const headers = { 'User-Agent': 'pyai-site-projects-sync', Accept: 'application/vnd.github+json' };
  if (GH_TOKEN) headers.Authorization = `Bearer ${GH_TOKEN}`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${owner}/${name}`);
  const data = await resp.json();
  return !!data.archived;
}

async function main() {
  const repoMap = new Map(); // repoUrl -> { files: string[], status: string }

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
      repoMap.get(repo).files.push(filePath);
    }
  }

  const changed = [];
  for (const [repo, info] of repoMap) {
    const { owner, name } = repoOwnerName(repo);
    let archived;
    try {
      archived = await fetchArchived(owner, name);
    } catch (err) {
      console.error(`Failed to fetch ${repo}: ${err.message}. Skipping.`);
      continue;
    }

    // archived=false 且当前是 archived → 解除归档回 active；其余不动（保留 wip/active）
    const newStatus = archived
      ? 'archived'
      : info.status === 'archived'
        ? 'active'
        : info.status;

    if (newStatus !== info.status) {
      for (const filePath of info.files) {
        const content = fs.readFileSync(filePath, 'utf8');
        const updated = content.replace(/^status:\s*\S+/m, `status: ${newStatus}`);
        fs.writeFileSync(filePath, updated, 'utf8');
      }
      changed.push(`${repo}: ${info.status} -> ${newStatus}`);
    }
  }

  fs.mkdirSync(path.dirname(META_PATH), { recursive: true });
  fs.writeFileSync(
    META_PATH,
    JSON.stringify({ updatedAt: new Date().toISOString(), type: 'projects-sync' }, null, 2),
    'utf8',
  );

  if (changed.length) {
    console.log(`Updated ${changed.length} repo(s):\n  ${changed.join('\n  ')}`);
  } else {
    console.log('No status changes.');
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
