#!/usr/bin/env node
/**
 * 项目状态 + 简介同步：
 *   1. 读取每个项目的 repo 地址，查 GitHub 的 archived 状态，回写 frontmatter 的 status。
 *   2. 读取 GitHub 的 description（仓库简介），回写英文版 frontmatter 的 description。
 *
 * status 映射规则：
 *   - GitHub archived=true          → status: archived
 *   - GitHub archived=false 且当前是 archived → status: active（解除归档）
 *   - 其余（active / wip）保持不变（wip 是手动维护的状态，不被覆盖）
 *
 * description 规则：
 *   - GitHub description 为英文单一来源，只回写 en/*.md；zh/*.md 为手动翻译，保持不动
 *   - GitHub description 为空时跳过，避免把简介清空
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

/** 查 GitHub API：archived 状态 + description（仓库简介） */
async function fetchRepo(owner, name) {
  const url = `https://api.github.com/repos/${owner}/${name}`;
  const headers = { 'User-Agent': 'pyai-site-projects-sync', Accept: 'application/vnd.github+json' };
  if (GH_TOKEN) headers.Authorization = `Bearer ${GH_TOKEN}`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${owner}/${name}`);
  const data = await resp.json();
  return { archived: !!data.archived, description: data.description || '' };
}

async function main() {
  const repoMap = new Map(); // repoUrl -> { files: {path, lang}[], status: string }

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
      repoMap.get(repo).files.push({ path: filePath, lang });
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
    for (const { path: filePath, lang } of info.files) {
      let content = fs.readFileSync(filePath, 'utf8');
      let fileChanged = false;

      if (newStatus !== info.status) {
        content = content.replace(/^status:\s*\S+/m, `status: ${newStatus}`);
        fileChanged = true;
      }

      // 简介：GitHub 英文描述回写 en；zh 保持手动翻译不动
      if (lang === 'en' && repoInfo.description) {
        const quoted = JSON.stringify(repoInfo.description);
        const next = content.replace(/^description:\s*[^\r\n]*/m, `description: ${quoted}`);
        if (next !== content) {
          content = next;
          fileChanged = true;
          descChanged = true;
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
  }

  fs.mkdirSync(path.dirname(META_PATH), { recursive: true });
  fs.writeFileSync(
    META_PATH,
    JSON.stringify({ updatedAt: new Date().toISOString(), type: 'projects-sync' }, null, 2),
    'utf8',
  );

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
