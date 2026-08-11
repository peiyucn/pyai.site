#!/usr/bin/env node
/**
 * 豆瓣数据补充脚本（断点续跑）
 * 优先处理 incremental 写入的 pending-enrich.json（本次新增条目，仅几条）；
 * 手动运行时（无 pending）回退到处理所有缺 doubanRating/isTv/country 的条目。
 * 调用 movie.douban.com/j/subject_abstract 接口补充权威数据
 * （豆瓣评分 / 导演 / 制片地区 / isTv / 年份），写回。
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
// 增量待补列表（incremental 写入）；不存在时回退到全量 todo 模式
const PENDING_PATH = path.join(OUTPUT_DIR, 'pending-enrich.json');

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
  const byUrl = new Map(movies.map((m) => [m.url, m]));

  // 增量模式：优先处理 incremental 写入的 pending 列表（本次同步的新条目）
  let targets;
  if (fs.existsSync(PENDING_PATH)) {
    const pendingUrls = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf8'));
    targets = pendingUrls.map((u) => byUrl.get(u)).filter(Boolean);
    if (targets.length === 0) {
      fs.rmSync(PENDING_PATH, { force: true });
      console.log('No new items to enrich.');
      return;
    }
    console.log(`Enriching ${targets.length} newly synced items (from pending-enrich.json)`);
  } else {
    // 手动模式（断点续跑）：处理所有缺 isTv / 评分 / 地区的条目
    targets = movies.filter((m) => !m.isTv || !m.doubanRating || !m.country);
    const done = movies.length - targets.length;
    console.log(`Total ${movies.length} | already enriched ${done} | to enrich ${targets.length}`);
    if (targets.length === 0) {
      console.log('Nothing to do.');
      return;
    }
  }

  // 单次最多处理条数（用于分批补全，避免单次运行过长 / 限流）
  const MAX_PER_RUN = Number(process.env.MAX_PER_RUN || 0);
  if (MAX_PER_RUN > 0 && targets.length > MAX_PER_RUN) {
    console.log(`Limiting to ${MAX_PER_RUN} items this run (rest will continue next run).`);
  }

  const DELAY_MS = Number(process.env.DELAY_MS || 0);
  let ok = 0;
  let failed = 0;
  let rateLimited = 0;
  const failedUrls = [];

  const limit = MAX_PER_RUN > 0 ? Math.min(targets.length, MAX_PER_RUN) : targets.length;
  for (let i = 0; i < limit; i++) {
    const item = targets[i];
    const id = subjectId(item.url);

    // 失败重试：最多重试 2 次，等待 5s/15s
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        // 15s 超时：防止豆瓣接口对某些 IP 挂起连接导致无限等待
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        let resp;
        try {
          resp = await fetch(`https://movie.douban.com/j/subject_abstract?subject_id=${id}`, {
            headers: { 'User-Agent': UA, Referer: 'https://movie.douban.com/' },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }
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
          failedUrls.push(item.url);
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
        failedUrls.push(item.url);
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

  // 增量模式下：全部成功则清除 pending；有失败则保留失败条目，下次同步时重试
  if (fs.existsSync(PENDING_PATH)) {
    if (failedUrls.length > 0) {
      fs.writeFileSync(PENDING_PATH, JSON.stringify(failedUrls, null, 2), 'utf8');
      console.log(`Kept ${failedUrls.length} failed items in pending-enrich.json for next retry.`);
    } else {
      fs.rmSync(PENDING_PATH, { force: true });
      console.log('Cleared pending-enrich.json.');
    }
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});