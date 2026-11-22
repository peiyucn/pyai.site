

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

const PENDING_PATH = path.join(OUTPUT_DIR, 'pending-enrich.json');


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

    targets = movies.filter((m) => !m.isTv || !m.doubanRating || !m.country);
    const done = movies.length - targets.length;
    console.log(`Total ${movies.length} | already enriched ${done} | to enrich ${targets.length}`);
    if (targets.length === 0) {
      console.log('Nothing to do.');
      return;
    }
  }


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


    for (let attempt = 0; attempt <= 2; attempt++) {
      try {

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

          item.isTv = typeof s.is_tv === 'boolean' ? s.is_tv : String(s.subtype).toLowerCase() === 'tv';
          item.subtype = typeof s.subtype === 'string' ? s.subtype.toLowerCase() : '';

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

        break;
      } catch {
        failed++;
        if (attempt < 2) {
          await sleep(3000);
          continue;
        }
        failedUrls.push(item.url);
        break;
      }
    }


    if ((i + 1) % 50 === 0) {
      console.log(`  progress ${i + 1}/${limit} (ok=${ok} failed=${failed} rateLimited=${rateLimited})`);
    }


    if ((i + 1) % 100 === 0) {
      fs.writeFileSync(JSON_PATH, JSON.stringify(movies, null, 2), 'utf8');
      writeMeta();
      console.log(`  saved checkpoint at ${i + 1}`);
    }


    await sleep(DELAY_MS > 0 ? DELAY_MS : randomDelay());
  }


  fs.writeFileSync(JSON_PATH, JSON.stringify(movies, null, 2), 'utf8');
  writeMeta();
  console.log(
    `\nDone. enriched=${ok} failed=${failed} rateLimited=${rateLimited}. Final total with rating: ${movies.filter((m) => m.doubanRating > 0).length}`,
  );


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