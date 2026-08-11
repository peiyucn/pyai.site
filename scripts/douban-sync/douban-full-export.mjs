#!/usr/bin/env node
/**
 * 豆瓣观影记录全量抓取（HTTP，无需登录）
 * 来源：movie.douban.com/people/{USER}/collect 列表页（公开可访问）
 * 输出：data/{USER}/影视.csv（兼容 douban-sync 格式）+ data/{USER}/movies.json（含导演/年份/类型）
 *
 * 用法：DOUBAN_USER=pei830 node scripts/douban-sync/douban-full-export.mjs
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

const BASE = `https://movie.douban.com/people/${USER}/collect`;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 从 HTML 提取单页列表项 */
export function parseListPage(html) {
  const items = [];
  // 每个 <li id="list..." class="item..."> 块（最后一条 class 含 last）
  const blocks = html.split(/<li id="list\d+" class="item[^"]*">/).slice(1);
  for (const block of blocks) {
    const titleMatch = block.match(/<div class="title">\s*<a href="([^"]+)">\s*([\s\S]*?)\s*<\/a>/);
    if (!titleMatch) continue;
    const url = titleMatch[1].trim();
    const rawTitle = titleMatch[2].replace(/<[^>]+>/g, '').trim();
    // 标题可能是 "中文名 / English Name" 或只有中文名
    const title = rawTitle.split(' / ')[0].trim();

    // 日期与评分
    const dateMatch = block.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : '';
    const ratingMatch = block.match(/<span class="rating(\d)-t"><\/span>/);
    const rating = ratingMatch ? ratingMatch[1] : '';

    // 短评（grid 区域）
    const commentMatch = block.match(/<span class="comment">([\s\S]*?)<\/span>/);
    const comment = commentMatch ? commentMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // intro：导演 / 年份 / 类型
    const introMatch = block.match(/<span class="intro">([\s\S]*?)<\/span>/);
    let intro = introMatch ? introMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    items.push({ title, url, date, rating, comment, intro });
  }
  return items;
}

/** 从 intro 提取导演（片长段前的最后一个名字段） */
export function extractDirector(intro) {
  const m = intro.match(/\/\s*([^\/]+?)\s*\/\s*\d+分钟/);
  return m ? m[1].trim() : '';
}

/** 从 intro 提取年份（上映年份，取第一个 4 位数字年份） */
export function extractYear(intro) {
  const m = intro.match(/\d{4}年/);
  if (m) return m[0].replace('年', '');
  // 兜底：取日期形式的年份 2022-09-03
  const m2 = intro.match(/(\d{4})-\d{2}-\d{2}/);
  return m2 ? m2[1] : '';
}

/** 从 intro 提取类型（片长后的段，中文类型） */
export function extractGenre(intro) {
  const m = intro.match(/\/\s*\d+分钟\s*\/\s*[^\/]+\s*\/\s*([^\/]+)/);
  return m ? m[1].trim() : '';
}

async function fetchPage(start) {
  const url = `${BASE}?start=${start}&sort=time&rating=all&filter=all&mode=list`;
  const resp = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} at start=${start}`);
  return await resp.text();
}

async function main() {
  console.log(`Full export for ${USER} ...`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const all = [];
  const perPage = 30;
  const maxPages = 80; // 安全上限
  let total = 0;
  let emptyStreak = 0;

  for (let page = 0; page < maxPages; page++) {
    const start = page * perPage;
    const html = await fetchPage(start);
    const items = parseListPage(html);

    // 页总数（从 <title> 提取：如 "pei看过的影视(2151)"）
    if (page === 0) {
      const tm = html.match(/<title>([\s\S]*?)<\/title>/);
      const numMatch = tm ? tm[1].match(/\((\d+)\)/) : null;
      if (numMatch) total = parseInt(numMatch[1]);
      console.log(`Total items: ${total}`);
    }

    console.log(`  page ${page + 1} start=${start}: ${items.length} items`);
    all.push(...items);

    // 连续两页无数据才停止（部分页可能因下架条目不足 30，不能作为结束信号）
    if (items.length === 0) {
      emptyStreak++;
      if (emptyStreak >= 2) break;
    } else {
      emptyStreak = 0;
    }
    // 已抓满总数即停止
    if (total > 0 && all.length >= total) break;

    await sleep(1500); // 限速保护
  }

  console.log(`\nFetched ${all.length} items.`);

  // 写入 CSV（兼容 douban-sync：title,url,date,rating,status,comment）
  const csvLines = ['title,url,date,rating,status,comment'];
  for (const it of all) {
    const stars = '★'.repeat(parseInt(it.rating) || 0);
    const line = [
      csvEscape(it.title),
      csvEscape(it.url),
      csvEscape(it.date),
      stars,
      '看过',
      csvEscape(it.comment),
    ].join(',');
    csvLines.push(line);
  }
  const csvPath = path.join(OUTPUT_DIR, '影视.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n') + '\n', 'utf8');
  console.log(`Written ${csvLines.length - 1} rows to ${csvPath}`);

  // 写入完整 JSON（含导演/年份/类型）
  const jsonPath = path.join(OUTPUT_DIR, 'movies.json');
  const enriched = all.map((it) => ({
    title: it.title,
    url: it.url,
    date: it.date,
    rating: parseInt(it.rating) || 0,
    status: '看过',
    comment: it.comment,
    director: extractDirector(it.intro),
    year: extractYear(it.intro),
    genre: extractGenre(it.intro),
  }));
  fs.writeFileSync(jsonPath, JSON.stringify(enriched, null, 2), 'utf8');
  console.log(`Written ${enriched.length} records to ${jsonPath}`);
}

function csvEscape(str) {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
