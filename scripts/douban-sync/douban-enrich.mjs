#!/usr/bin/env node
/**
 * 豆瓣 rexxar 补充脚本（断点续跑）
 * 读取 data/{USER}/movies.json，只对缺 doubanRating/country 的条目
 * 单线程调用 rexxar API 补充权威数据（导演/国籍/类型/豆瓣评分/年份），写回。
 *
 * 用法：DOUBAN_USER=pei830 node scripts/douban-sync/douban-enrich.mjs
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

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 随机间隔（1000-1500ms），避免固定节奏被识别 */
function randomDelay() {
  const min = Number(process.env.DELAY_MIN || 1000);
  const max = Number(process.env.DELAY_MAX || 1500);
  return min + Math.floor(Math.random() * (max - min));
}

function subjectId(url) {
  const m = url.match(/subject\/(\d+)\//);
  return m ? m[1] : '';
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`Error: ${JSON_PATH} not found. Run douban-full-export.mjs first.`);
    process.exit(1);
  }

  const movies = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  const todo = movies.filter((m) => !m.doubanRating && !m.country);
  const done = movies.length - todo.length;
  console.log(`Total ${movies.length} | already enriched ${done} | to enrich ${todo.length}`);

  if (todo.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const DELAY_MS = Number(process.env.DELAY_MS || 0);
  let ok = 0;
  let failed = 0;
  let rateLimited = 0;

  for (let i = 0; i < todo.length; i++) {
    const item = todo[i];
    const id = subjectId(item.url);

    // 限流退避重试：最多重试 3 次，每次等待 30s/60s/120s
    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        const resp = await fetch(`https://m.douban.com/rexxar/api/v2/movie/${id}?ck=`, {
          headers: { 'User-Agent': UA, Referer: 'https://m.douban.com/' },
        });
        if (resp.ok) {
          const j = await resp.json();
          item.director = (j.directors || []).map((d) => d.name).join(' / ');
          item.country = (j.countries || []).join(' / ');
          item.genre = (j.genres || []).join(' / ');
          item.year = j.year ? String(j.year) : item.year;
          item.doubanRating = typeof j.rating?.value === 'number' ? j.rating.value : 0;
          ok++;
          break;
        } else if (resp.status === 400 || resp.status === 403 || resp.status === 429) {
          rateLimited++;
          if (attempt < 3) {
            const wait = 30000 * Math.pow(2, attempt); // 30s / 60s / 120s
            console.log(
              `Rate limited at ${id} (HTTP ${resp.status}), attempt ${attempt + 1}, waiting ${wait / 1000}s...`,
            );
            await sleep(wait);
            continue;
          }
          console.log(`Giving up on ${id} (HTTP ${resp.status}) after retries. Progress saved.`);
          break;
        }
        // 其他状态（条目下架等）：保留 fallback
        break;
      } catch (e) {
        failed++;
        if (attempt < 3) {
          await sleep(10000);
          continue;
        }
        break;
      }
    }

    // 每 50 条打印进度
    if ((i + 1) % 50 === 0) {
      console.log(`  progress ${i + 1}/${todo.length} (ok=${ok} failed=${failed})`);
    }

    // 定期保存进度（每 100 条写一次，避免丢失）
    if ((i + 1) % 100 === 0) {
      fs.writeFileSync(JSON_PATH, JSON.stringify(movies, null, 2), 'utf8');
      console.log(`  saved checkpoint at ${i + 1}`);
    }

    // 随机间隔 1000-1500ms，避免固定节奏被限流
    await sleep(DELAY_MS > 0 ? DELAY_MS : randomDelay());
  }

  // 最终保存
  fs.writeFileSync(JSON_PATH, JSON.stringify(movies, null, 2), 'utf8');
  console.log(
    `\nDone. enriched=${ok} failed=${failed} rateLimited=${rateLimited}. Final total with rating: ${
      movies.filter((m) => m.doubanRating > 0).length
    }`,
  );
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
