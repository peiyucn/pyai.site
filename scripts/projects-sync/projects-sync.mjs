

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


function parseFrontmatter(content) {
  const repo = content.match(/^repo:\s*(.+)$/m)?.[1]?.trim() || '';
  const status = content.match(/^status:\s*(.+)$/m)?.[1]?.trim() || '';
  return { repo, status };
}


function repoOwnerName(repoUrl) {
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
  return m ? { owner: m[1], name: m[2] } : null;
}


function repoKey(repoUrl) {
  const m = repoOwnerName(repoUrl);
  return m ? `${m.owner}/${m.name}`.toLowerCase() : '';
}


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

  const repoMap = new Map();

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


      if (repoInfo.description) {
        const quoted = JSON.stringify(repoInfo.description);
        const next = content.replace(/^description:\s*[^\r\n]*/m, `description: ${quoted}`);
        if (next !== content) {
          content = next;
          fileChanged = true;
          descChanged = true;
        }
      }


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
