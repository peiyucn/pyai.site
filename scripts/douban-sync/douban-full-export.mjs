

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


export function parseListPage(html) {
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


    const commentMatch = block.match(/<span class="comment">([\s\S]*?)<\/span>/);
    const comment = commentMatch ? stripTags(commentMatch[1]) : '';


    const introMatch = block.match(/<span class="intro">([\s\S]*?)<\/span>/);
    let intro = introMatch ? stripTags(introMatch[1]) : '';

    items.push({ title, url, date, rating, comment, intro });
  }
  return items;
}


export function extractDirector(intro) {
  const m = intro.match(/\/\s*([^/]+?)\s*\/\s*\d+分钟/);
  return m ? m[1].trim() : '';
}


export function extractYear(intro) {
  const m = intro.match(/\d{4}年/);
  if (m) return m[0].replace('年', '');

  const m2 = intro.match(/(\d{4})-\d{2}-\d{2}/);
  return m2 ? m2[1] : '';
}


export function extractGenre(intro) {
  const m = intro.match(/\/\s*\d+分钟\s*\/\s*[^/]+\s*\/\s*([^/]+)/);
  return m ? m[1].trim() : '';
}


function subjectId(url) {
  const m = url.match(/subject\/(\d+)\//);
  return m ? m[1] : '';
}


export async function enrichWithRexxar(items) {
  const results = new Array(items.length);
  const DELAY_MS = 500;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.doubanRating && item.country) {
      results[i] = item;
      continue;
    }
    const id = subjectId(item.url);
    try {
      const resp = await fetch(`https://m.douban.com/rexxar/api/v2/movie/${id}?ck=`, {
        headers: { 'User-Agent': UA, Referer: 'https://m.douban.com/' },
      });
      if (resp.ok) {
        const j = await resp.json();
        results[i] = {
          ...item,

          director: (j.directors || []).map((d) => d.name).join(' / '),
          country: (j.countries || []).join(' / '),
          genre: (j.genres || []).join(' / '),
          year: j.year ? String(j.year) : extractYear(item.intro),
          doubanRating: typeof j.rating?.value === 'number' ? j.rating.value : 0,

          isTv: j.type === 'tv',
          subtype: typeof j.subtype === 'string' ? j.subtype.toLowerCase() : '',
        };
      } else {

        results[i] = {
          ...item,
          director: extractDirector(item.intro),
          country: '',
          genre: extractGenre(item.intro),
          year: extractYear(item.intro),
          doubanRating: 0,
          isTv: false,
          subtype: '',
        };
      }
    } catch {
      results[i] = {
        ...item,
        director: extractDirector(item.intro),
        country: '',
        genre: extractGenre(item.intro),
        year: extractYear(item.intro),
        doubanRating: 0,
        isTv: false,
        subtype: '',
      };
    }
    await sleep(DELAY_MS);
  }

  return results;
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
  const maxPages = 80;
  let total = 0;
  let emptyStreak = 0;

  for (let page = 0; page < maxPages; page++) {
    const start = page * perPage;
    const html = await fetchPage(start);
    const items = parseListPage(html);


    if (page === 0) {
      const tm = html.match(/<title>([\s\S]*?)<\/title>/);
      const numMatch = tm ? tm[1].match(/\((\d+)\)/) : null;
      if (numMatch) total = parseInt(numMatch[1]);
      console.log(`Total items: ${total}`);
    }

    console.log(`  page ${page + 1} start=${start}: ${items.length} items`);
    all.push(...items);


    if (items.length === 0) {
      emptyStreak++;
      if (emptyStreak >= 2) break;
    } else {
      emptyStreak = 0;
    }

    if (total > 0 && all.length >= total) break;

    await sleep(1500);
  }

  console.log(`\nFetched ${all.length} items.`);


  console.log('Enriching with rexxar API ...');
  const enriched = await enrichWithRexxar(all);
  const withData = enriched.filter(Boolean);
  const withRating = withData.filter((m) => m.doubanRating > 0).length;
  const withDirector = withData.filter((m) => m.director).length;
  const withCountry = withData.filter((m) => m.country).length;
  console.log(
    `Enriched: ${withData.length} items | rating ${withRating} | director ${withDirector} | country ${withCountry}`,
  );


  const jsonPath = path.join(OUTPUT_DIR, 'movies.json');
  const output = withData.map((it) => ({
    title: it.title,
    url: it.url,
    date: it.date,
    rating: parseInt(it.rating) || 0,
    status: '看过',
    comment: it.comment,
    director: it.director ?? '',
    country: it.country ?? '',
    year: it.year ?? '',
    genre: it.genre ?? '',
    doubanRating: it.doubanRating ?? 0,
  }));
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'meta.json'), JSON.stringify({ updatedAt: new Date().toISOString(), type: 'douban-sync' }, null, 2), 'utf8');
  console.log(`Written ${output.length} records to ${jsonPath}`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
