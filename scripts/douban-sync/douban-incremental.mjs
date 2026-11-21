

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

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const stripTags = (s) => {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '<') {
      const end = s.indexOf('>', i);
      i = end === -1 ? i + 1 : end + 1;
    } else if (s[i] === '>') {
      i++;
    } else {
      out += s[i++];
    }
  }
  return out.trim();
};


function parseListPage(html) {
  const items = [];
  const blocks = html.split(/<li id="list\d+" class="item[^"]*">/).slice(1);
  for (const block of blocks) {
    const titleMatch = block.match(/<div class="title">\s*<a href="([^"]+)">\s*([\s\S]*?)\s*<\/a>/);
    if (!titleMatch) continue;
    const url = titleMatch[1].trim();
    const rawTitle = stripTags(titleMatch[2]);
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
    return;
  }
  const items = parseListPage(html);
  console.log(`Fetched ${items.length} recent items`);


  const fresh = items.filter((it) => !existingUrls.has(it.url));
  if (fresh.length === 0) {
    console.log('No new items. Nothing to do.');

    fs.writeFileSync(
      META_PATH,
      JSON.stringify({ updatedAt: new Date().toISOString(), type: 'douban-sync' }, null, 2),
      'utf8',
    );

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
      isTv: false,
      subtype: '',
    });
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(movies, null, 2), 'utf8');
  fs.writeFileSync(META_PATH, JSON.stringify({ updatedAt: new Date().toISOString(), type: 'douban-sync' }, null, 2), 'utf8');

  fs.writeFileSync(PENDING_PATH, JSON.stringify(fresh.map((it) => it.url), null, 2), 'utf8');
  writeOutput('new_count', fresh.length);
  console.log(`Saved. Total now: ${movies.length}`);
}


function writeOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
