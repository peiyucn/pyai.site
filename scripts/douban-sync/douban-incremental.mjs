#!/usr/bin/env node
/**
 * 豆瓣列表增量同步
 * 抓取列表页第 1 页（最近 30 条标记），与现有 movies.json 按 URL 对比，
 * 只追加新条目（用户新标记的电影必然在最近 30 条内）。
 *
 * 相比全量导出：秒级完成，每天执行不消耗 Actions 额度，不触发限流。
 *
 * 用法：DOUBAN_USER=pei830 node scripts/douban-sync/douban-incremental.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const USER = process.env.DOUBAN_USER;
if (!USER) {
  console.error('Error: DOUBAN_USER env var is required');
  process.exit(1);
}

const BASE_DIR = process.env.DOUBAN_OUTPUT_DIR || path.join(os.homedir(), 'douban-sync');
const OUTPUT_DIR = path.join(BASE_DIR, USER);
const JSON_PATH = path.join(OUTPUT_DIR, 'movies.json');
const META_PATH = path.join(OUTPUT_DIR, 'meta.json');
// 增量待补列表：本次新增条目的 URL，enrich 脚本只处理这些
const PENDING_PATH = path.join(OUTPUT_DIR, 'pending-enrich.json');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function subjectId(url) {
  const m = url.match(/subject\/(\d+)\//);
  return m ? m[1] : '';
}

/** 解析列表页条目（与 douban-full-export 相同逻辑） */
function parseListPage(html) {
  const items = [];
  const blocks = html.split(/<li id="list\d+" class="item[^"]*">/).slice(1);
  for (const block of blocks) {
    const titleMatch = block.match(/<div class="title">\s*<a href="([^"]+)">\s*([\s\S]*?)\s*<\/a>/);
    if (!titleMatch) continue;
    const url = titleMatch[1].trim();
    const rawTitle = titleMatch[2].replace(/<[^>]+>/g, '').trim();
    const title = rawTitle.split(' / ')[0].trim();
    const dateMatch = block.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : '';
    const ratingMatch = block.match(/<span class="rating(\d)-t"><\/span>/);
    const rating = ratingMatch ? ratingMatch[1] : '';
    items.push({ title, url, date, rating });
  }
  return items;
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`Error: ${JSON_PATH} not found. Run douban-full-export.mjs first.`);
    process.exit(1);
  }

  const movies = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const existingUrls = new Set(movies.map((m) => m.url));
  console.log(`Existing: ${movies.length} movies`);

  // 抓列表页第 1 页（最近 30 条）；403/失败时重试，仍失败则容忍跳过（不 fail）
  // GitHub Actions 机房 IP 访问豆瓣不稳定（时好时坏），跳过等下次 cron 即可
  const url = `https://movie.douban.com/people/${USER}/collect?start=0&sort=time&rating=all&filter=all&mode=list`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let html = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch(url, { headers: { 'User-Agent': UA } });
      if (resp.ok) {
        html = await resp.text();
        break;
      }
      console.error(`Failed to fetch list page: HTTP ${resp.status} (attempt ${attempt + 1}/3)`);
    } catch (e) {
      console.error(`Fetch error: ${e.message} (attempt ${attempt + 1}/3)`);
    }
    if (attempt < 2) await sleep(30000);
  }
  if (!html) {
    console.error('Douban list page unavailable after 3 attempts. Skipping this run (will retry next cron).');
    return; // 容忍失败：不 exit(1)，避免 CI 告警
  }
  const items = parseListPage(html);
  console.log(`Fetched ${items.length} recent items`);

  // 找出新条目
  const fresh = items.filter((it) => !existingUrls.has(it.url));
  if (fresh.length === 0) {
    console.log('No new items. Nothing to do.');
    // 无增量也刷新 meta.json 的 updatedAt，让观影页"最后更新于"每日更新
    fs.writeFileSync(
      META_PATH,
      JSON.stringify({ updatedAt: new Date().toISOString(), type: 'douban-sync' }, null, 2),
      'utf8',
    );
    // 输出计数 0：工作流据此跳过 enrich（无增量不跑豆瓣补充）
    writeOutput('new_count', 0);
    return;
  }

  console.log(`Adding ${fresh.length} new items:`);
  for (const it of fresh) {
    console.log(`  + ${it.title} (${it.date})`);
    movies.push({
      title: it.title,
      url: it.url,
      date: it.date,
      rating: parseInt(it.rating) || 0,
      status: '看过',
      comment: '',
      director: '',
      country: '',
      year: '',
      genre: '',
      doubanRating: 0,
      isTv: false, // 占位，后续 enrich 脚本补全真实值
      subtype: '',
    });
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(movies, null, 2), 'utf8');
  fs.writeFileSync(META_PATH, JSON.stringify({ updatedAt: new Date().toISOString(), type: 'douban-sync' }, null, 2), 'utf8');
  // 待补列表：本次新增条目的 URL（enrich 只处理这些）
  fs.writeFileSync(PENDING_PATH, JSON.stringify(fresh.map((it) => it.url), null, 2), 'utf8');
  writeOutput('new_count', fresh.length);
  console.log(`Saved. Total now: ${movies.length}`);
}

/** 向 GITHUB_OUTPUT 写步骤输出（供工作流 if 条件判断） */
function writeOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
