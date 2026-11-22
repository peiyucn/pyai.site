import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { checkRepository } from '../scripts/check-policy.mjs'

const BASE_PACKAGE = {
  name: 'fixture',
  version: '0.1.0',
  private: true,
  engines: { node: '>=24.9.0' },
  scripts: {
    lint: 'npm run lint:code && npm run lint:policy',
    'lint:code': 'eslint .',
    'lint:policy': 'node scripts/check-policy.mjs',
    verify: 'npm run lint && npm test',
  },
  devDependencies: { '@types/node': '^24.19.2' },
}

const SCHEMA = [
  "import { defineCollection } from 'astro:content';",
  "import { z } from 'astro/zod';",
  '',
  'const records = defineCollection({',
  '  schema: z.object({',
  '    title: z.string(),',
  '    description: z.string(),',
  '    date: z.coerce.date(),',
  '  }),',
  '});',
  '',
  'const projects = defineCollection({',
  '  schema: z.object({',
  '    title: z.string(),',
  "    locale: z.enum(['zh', 'en']),",
  '  }),',
  '});',
  '',
  'export const collections = { records, projects };',
  '',
].join('\n')

const CONTENT_DOC = [
  '# 内容',
  '',
  '### records',
  '',
  '| 字段 | 类型 |',
  '|---|---|',
  '| title | string |',
  '| description | string |',
  '| date | date |',
  '',
  '### projects',
  '',
  '| 字段 | 类型 |',
  '|---|---|',
  '| title | string |',
  '| locale | string |',
  '',
].join('\n')

const CI_WORKFLOW = [
  'name: ci',
  'on:',
  '  push:',
  '    branches: [main]',
  'jobs:',
  '  typecheck:',
  '    runs-on: ubuntu-latest',
  '  test:',
  '    runs-on: ubuntu-latest',
  '',
].join('\n')

const PUBLISH_WORKFLOW = [
  'name: publish',
  'on:',
  '  push:',
  '    branches: [main]',
  'jobs:',
  '  build:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/upload-pages-artifact@v5',
  '        with:',
  '          path: ./dist',
  '  deploy:',
  '    runs-on: ubuntu-latest',
  '    environment:',
  '      name: github-pages',
  '    steps:',
  '      - run: git merge-base --is-ancestor "$GITHUB_SHA" origin/main',
  '      - run: node scripts/security-gate.mjs',
  '      - uses: actions/deploy-pages@v5',
  '',
].join('\n')

const ENGINEERING = [
  '# 工程管线',
  '',
  '| 项目 | 开发分支 | CI | 发布 | 部署 / 同步 |',
  '|---|---|---|---|---|',
  '| pyai.site | main | `typecheck` → `test` | `deploy`（build + Pages） | `sync`（daily-sync.yml） |',
  '',
].join('\n')

const BASE_FILES: Record<string, string> = {
  'AGENTS.md': '# fixture\n',
  'README.md': '# fixture\n',
  'SECURITY.md': '# fixture\n',
  'docs/architecture.md': '# architecture\n',
  'docs/content.md': CONTENT_DOC,
  'docs/release.md': '# release\n',
  'docs/dependency-notes.md': '# dependencies\n',
  'src/content.config.ts': SCHEMA,
  'meta/rules/engineering.md': ENGINEERING,
  '.github/workflows/ci.yml': CI_WORKFLOW,
  '.github/workflows/publish.yml': PUBLISH_WORKFLOW,
  '.github/workflows/daily-sync.yml': 'name: daily-sync\njobs:\n  sync:\n    runs-on: ubuntu-latest\n',
  '.gitignore': 'dist/\n.astro/\nnode_modules/\ntest-report.xml\n',
  'data/pei830/meta.json': JSON.stringify({ updatedAt: '2026-01-01T00:00:00.000Z' }),
  'data/projects/meta.json': JSON.stringify({ updatedAt: '2026-01-01T00:00:00.000Z' }),
  'data/pei830/movies.json': JSON.stringify([{ title: 'film', url: 'https://movie.douban.com/subject/1/', date: '2026-01-01' }]),
  'src/content/records/zh/demo.md': '---\ntitle: 示例\nlocale: zh\ntranslationOf: demo\n---\n正文\n',
  'src/content/records/en/demo.md': '---\ntitle: Demo\nlocale: en\ntranslationOf: demo\n---\nbody\n',
  'src/content/projects/zh/demo.md': '---\ntitle: 示例\nlocale: zh\n---\n正文\n',
  'src/content/projects/en/demo.md': '---\ntitle: Demo\nlocale: en\n---\nbody\n',
}

function makeRepo(overrides: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'pyai-site-policy-'))
  const files: Record<string, string> = { ...BASE_FILES, 'package.json': JSON.stringify(BASE_PACKAGE, null, 2), ...overrides }
  for (const [file, content] of Object.entries(files)) {
    const target = join(root, file)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content, 'utf8')
  }
  return root
}

function violations(overrides: Record<string, string> = {}): string[] {
  const root = makeRepo(overrides)
  try {
    return checkRepository(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function failsWith(overrides: Record<string, string>, id: string): boolean {
  return violations(overrides).some((line) => line.startsWith(id))
}

test('QG001 删除必读文档 应该 失败', () => {
  const root = makeRepo()
  try {
    rmSync(join(root, 'SECURITY.md'))
    assert.ok(checkRepository(root).some((line) => line.startsWith('QG001')))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('QG002 内容字段表顺序漂移 应该 失败', () => {
  const swapped = CONTENT_DOC.replace('| title | string |\n| description | string |', '| description | string |\n| title | string |')
  assert.ok(failsWith({ 'docs/content.md': swapped }, 'QG002'))
})

test('QG003 类型包与 Node 版本不一致 应该 失败', () => {
  const pkg = { ...BASE_PACKAGE, devDependencies: { '@types/node': '^26.4.0' } }
  assert.ok(failsWith({ 'package.json': JSON.stringify(pkg, null, 2) }, 'QG003'))
})

test('QG004 内容失去对端 应该 失败', () => {
  assert.ok(failsWith({ 'src/content/records/zh/orphan.md': '---\ntitle: 孤儿\nlocale: zh\n---\n正文\n' }, 'QG004'))
  assert.ok(failsWith({ 'src/content/records/en/demo.md': '---\ntitle: Demo\nlocale: en\ntranslationOf: other\n---\nbody\n' }, 'QG004'))
})

test('QG005 数据快照时间非法 应该 失败', () => {
  assert.ok(failsWith({ 'data/projects/meta.json': JSON.stringify({ updatedAt: 'yesterday' }) }, 'QG005'))
})

test('QG006 verify 去掉 lint 应该 失败', () => {
  const pkg = { ...BASE_PACKAGE, scripts: { ...BASE_PACKAGE.scripts, verify: 'npm test' } }
  assert.ok(failsWith({ 'package.json': JSON.stringify(pkg, null, 2) }, 'QG006'))
})

test('QG007 CI 作业改名 应该 失败', () => {
  assert.ok(failsWith({ '.github/workflows/ci.yml': CI_WORKFLOW.replace('  test:', '  checks:') }, 'QG007'))
})

test('QG008 安全门禁移到部署之后 应该 失败', () => {
  const reordered = [
    'name: publish',
    'on:',
    '  push:',
    '    branches: [main]',
    'jobs:',
    '  deploy:',
    '    runs-on: ubuntu-latest',
    '    environment:',
    '      name: github-pages',
    '    steps:',
    '      - uses: actions/deploy-pages@v5',
    '      - run: node scripts/security-gate.mjs',
    '      - run: git merge-base --is-ancestor "$GITHUB_SHA" origin/main',
    '',
  ].join('\n')
  assert.ok(failsWith({ '.github/workflows/publish.yml': reordered }, 'QG008'))
})

test('QG009 产物目录未忽略 应该 失败', () => {
  assert.ok(failsWith({ '.gitignore': '.astro/\nnode_modules/\ntest-report.xml\n' }, 'QG009'))
})

test('QG010 提交 focused test 应该 失败', () => {
  const focused = 'test' + '.only' + '('
  assert.ok(failsWith({ 'test/example.test.ts': "import { test } from 'node:test'\n" + focused + "'focused', () => {})\n" }, 'QG010'))
})

test('干净 fixture 应该 通过全部检查', () => {
  assert.deepEqual(violations(), [])
})

test('真实仓库 应该 通过全部检查', () => {
  assert.deepEqual(checkRepository(process.cwd()), [])
})
