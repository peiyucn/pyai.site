#!/usr/bin/env node
/**
 * 豆瓣数据补充脚本（断点续跑）
 * 读取 data/{USER}/movies.json，只对缺 doubanRating/country 的条目
 * 调用 movie.douban.com/j/subject_abstract 接口补充权威数据
 * （豆瓣评分 / 导演 / 制片地区 / 年份），写回。
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
const META_PATH = path.join(OUTPUT_DIR, 'meta.json');

/** 记录本次同步时间（取分快照时间，站点据此展示“评分更新于”） */
function writeMeta() {
  const meta = {
    updatedAt: new Date().toISOString(),
    type: 'douban-sync',
  };
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf8');
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 随机间隔（600-900ms），避免固定节奏被识别 */
function randomDelay() {
  const min = Number(process.env.DELAY_MIN || 600);
  const max = Number(process.env.DELAY_MAX || 900);
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
  // 待处理：缺 isTv（区分影/剧）或缺豆瓣评分的条目
  const todo = movies.filter((m) => !m.isTv || !m.doubanRating || !m.country);
  const done = movies.length - todo.length;
  console.log(`Total ${movies.length} | already enriched ${done} | to enrich ${todo.length}`);

  if (todo.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // 单次最多处理条数（用于分批补全，避免单次运行过长 / 限流）
  const MAX_PER_RUN = Number(process.env.MAX_PER_RUN || 0);
  if (MAX_PER_RUN > 0 && todo.length > MAX_PER_RUN) {
    console.log(`Limiting to ${MAX_PER_RUN} items this run (rest will continue next run).`);
  }

  const DELAY_MS = Number(process.env.DELAY_MS || 0);
  let ok = 0;
  let failed = 0;
  let rateLimited = 0;

  const limit = MAX_PER_RUN > 0 ? Math.min(todo.length, MAX_PER_RUN) : todo.length;
  for (let i = 0; i < limit; i++) {
    const item = todo[i];
    const id = subjectId(item.url);

    // 失败重试：最多重试 2 次，等待 5s/15s
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const resp = await fetch(`https://movie.douban.com/j/subject_abstract?subject_id=${id}`, {
          headers: { 'User-Agent': UA, Referer: 'https://movie.douban.com/' },
        });
        if (resp.ok) {
          const j = await resp.json();
          const s = j.subject || {};
          item.doubanRating = typeof s.rate === 'string' ? parseFloat(s.rate) || 0 : 0;
          item.director = (s.directors || []).join(' / ');
          item.country = (s.region || '').trim();
          // 影/剧区分：is_tv 布尔（优先），subtype 兜底（'TV'/'Movie'）
          item.isTv = typeof s.is_tv === 'boolean' ? s.is_tv : String(s.subtype).toLowerCase() === 'tv';
          item.subtype = typeof s.subtype === 'string' ? s.subtype.toLowerCase() : '';
          // 年份：从 title 里取（如 "珀尔 Pearl (2022)"）
          const ym = String(s.title || '').match(/\((\d{4})\)/);
          if (ym) item.year = ym[1];
          ok++;
          break;
        } else if (resp.status === 400 || resp.status === 403 || resp.status === 429) {
          rateLimited++;
          if (attempt < 2) {
            const wait = [5000, 15000][attempt];
            console.log(`Rate limited at ${id} (HTTP ${resp.status}), attempt ${attempt + 1}, waiting ${wait / 1000}s...`);
            await sleep(wait);
            continue;
          }
          console.log(`Giving up on ${id} (HTTP ${resp.status}). Progress saved.`);
          break;
        }
        // 其他状态（条目下架等）：保留 fallback
        break;
      } catch (e) {
        failed++;
        if (attempt < 2) {
          await sleep(3000);
          continue;
        }
        break;
      }
    }

    // 每 50 条打印进度
    if ((i + 1) % 50 === 0) {
      console.log(`  progress ${i + 1}/${limit} (ok=${ok} failed=${failed} rateLimited=${rateLimited})`);
    }

    // 定期保存进度（每 100 条写一次，避免丢失）
    if ((i + 1) % 100 === 0) {
      fs.writeFileSync(JSON_PATH, JSON.stringify(movies, null, 2), 'utf8');
      writeMeta();
      console.log(`  saved checkpoint at ${i + 1}`);
    }

    // 随机间隔，避免固定节奏被限流
    await sleep(DELAY_MS > 0 ? DELAY_MS : randomDelay());
  }

  // 最终保存
  fs.writeFileSync(JSON_PATH, JSON.stringify(movies, null, 2), 'utf8');
  writeMeta();
  console.log(
    `\nDone. enriched=${ok} failed=${failed} rateLimited=${rateLimited}. Final total with rating: ${movies.filter((m) => m.doubanRating > 0).length}`,
  );
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});