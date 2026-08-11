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

  // 抓列表页第 1 页（最近 30 条）
  const url = `https://movie.douban.com/people/${USER}/collect?start=0&sort=time&rating=all&filter=all&mode=list`;
  const resp = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resp.ok) {
    console.error(`Failed to fetch list page: HTTP ${resp.status}`);
    process.exit(1);
  }
  const html = await resp.text();
  const items = parseListPage(html);
  console.log(`Fetched ${items.length} recent items`);

  // 找出新条目
  const fresh = items.filter((it) => !existingUrls.has(it.url));
  if (fresh.length === 0) {
    console.log('No new items. Nothing to do.');
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
  console.log(`Saved. Total now: ${movies.length}`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
