import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { checkNoComments } from '../meta/lint/check-comments.mjs'

const E24_JOBS = new Set(['typecheck', 'test', 'build', 'package', 'publish', 'deploy', 'sync'])

const REQUIRED_DOCS = [
  'AGENTS.md',
  'README.md',
  'SECURITY.md',
  'docs/architecture.md',
  'docs/content.md',
  'docs/release.md',
  'docs/dependency-notes.md',
]

const GITIGNORE_ENTRIES = ['dist/', '.astro/', 'node_modules/', 'test-report.xml']

const DEPLOY_ENVIRONMENT = 'github-pages'
const DEPLOY_WORKFLOW = '.github/workflows/publish.yml'
const SITE_WORKFLOWS = ['.github/workflows/ci.yml', DEPLOY_WORKFLOW, '.github/workflows/daily-sync.yml']

const CONTENT_DOC = 'docs/content.md'
const SCHEMA_FILE = 'src/content.config.ts'
const AUTHORED_COLLECTIONS = ['records', 'projects']

const DATA_DIRS = ['data/pei830', 'data/projects']
const MOVIES_JSON = 'data/pei830/movies.json'
const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000

const SCAN_DIRS = ['src']

function read(root, file) {
  return readFileSync(join(root, file), 'utf8').replace(/\r\n/g, '\n')
}

function exists(root, file) {
  return existsSync(join(root, file))
}

function parseJobs(workflow) {
  const jobsAt = workflow.search(/^jobs:\s*$/m)
  if (jobsAt === -1) return []
  const jobs = []
  for (const line of workflow.slice(jobsAt).split('\n').slice(1)) {
    if (/^\S/.test(line) && !line.startsWith('  ')) break
    const match = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line)
    if (match) jobs.push(match[1])
  }
  return jobs
}

function stagedJobs(cell) {
  return [...cell.matchAll(/`([^`]+)`/gu)].map((match) => match[1])
}

function registeredPipeline(root) {
  const file = 'meta/rules/engineering.md'
  if (!exists(root, file)) return null
  const line = read(root, file).split('\n').find((entry) => entry.startsWith('| pyai.site |'))
  if (!line) return null
  const columns = line.split('|').map((column) => column.trim())
  return { ci: columns[3], release: columns[4] }
}

function walkFiles(dir) {
  if (!existsSync(dir)) return []
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkFiles(full))
    else if (entry.isFile()) files.push(full)
  }
  return files
}

function schemaKeys(source, collection) {
  const start = source.indexOf('const ' + collection + ' = defineCollection({')
  if (start === -1) return []
  const schemaAt = source.indexOf('schema: z.object({', start)
  if (schemaAt === -1) return []
  const keys = []
  for (const line of source.slice(schemaAt).split('\n').slice(1)) {
    if (/^\s{2}\}\)/u.test(line)) break
    const match = /^\s{4}([A-Za-z_$][\w$]*):/u.exec(line)
    if (match) keys.push(match[1])
  }
  return keys
}

function documentedKeys(markdown, collection) {
  const lines = markdown.split('\n')
  const start = lines.findIndex((line) => line.trim() === '### ' + collection)
  if (start === -1) return null
  const keys = []
  let inTable = false
  for (const line of lines.slice(start + 1)) {
    if (/^#{2,3}\s/.test(line)) break
    if (/^\|\s*字段\s*\|/u.test(line)) {
      inTable = true
      continue
    }
    if (!inTable) continue
    const match = /^\|\s*([A-Za-z_$][\w$]*)\s*\|/u.exec(line)
    if (match) keys.push(match[1])
  }
  return keys
}

function frontmatter(source) {
  const parts = source.split('---')
  return parts.length > 1 ? parts[1] : ''
}

function frontmatterValue(source, key) {
  const match = new RegExp('^' + key + ':\\s*(.+)$', 'm').exec(frontmatter(source))
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : null
}

function translationPairs(root, dir, problems) {
  for (const file of walkFiles(join(root, dir)).filter((entry) => entry.endsWith('.md'))) {
    const locale = basename(dirname(file))
    if (locale !== 'zh' && locale !== 'en') continue
    const other = locale === 'zh' ? 'en' : 'zh'
    const counterpart = join(dirname(dirname(file)), other, basename(file))
    const relPath = relative(root, file).replaceAll('\\', '/')
    if (!existsSync(counterpart)) {
      problems.push(relPath + ' has no ' + other + ' counterpart')
      continue
    }
    const declared = frontmatterValue(readFileSync(file, 'utf8'), 'translationOf')
    if (declared !== null && declared !== basename(file, '.md')) {
      problems.push(relPath + ' translationOf must be ' + basename(file, '.md'))
    }
  }
}

function futureDate(date, now) {
  return date.getTime() - now > MAX_FUTURE_SKEW_MS
}

export function checkRepository(root) {
  const violations = []
  const fail = (id, message) => violations.push(id + ' ' + message)

  for (const file of REQUIRED_DOCS) {
    if (!exists(root, file)) fail('QG001', 'missing required document: ' + file)
  }
  if (!exists(root, 'package.json')) fail('QG001', 'missing package.json')

  if (!exists(root, SCHEMA_FILE)) {
    fail('QG002', SCHEMA_FILE + ' is missing')
  } else {
    const schema = read(root, SCHEMA_FILE)
    for (const collection of AUTHORED_COLLECTIONS) {
      const keys = schemaKeys(schema, collection)
      if (keys.length === 0) {
        fail('QG002', SCHEMA_FILE + ' has no schema keys for ' + collection)
        continue
      }
      const documented = exists(root, CONTENT_DOC) ? documentedKeys(read(root, CONTENT_DOC), collection) : null
      if (documented === null) {
        fail('QG002', CONTENT_DOC + ' has no ### ' + collection + ' field table')
        continue
      }
      if (documented.join(',') !== keys.join(',')) {
        fail('QG002', CONTENT_DOC + ' ### ' + collection + ' fields must be ' + keys.join(', ') + ' in schema order; found ' + (documented.join(', ') || '(none)'))
      }
    }
  }

  let packageJson = null
  if (exists(root, 'package.json')) {
    try {
      packageJson = JSON.parse(read(root, 'package.json'))
    } catch {
      fail('QG003', 'package.json is not valid JSON')
    }
  }

  if (packageJson !== null) {
    const engine = typeof packageJson.engines?.node === 'string' ? packageJson.engines.node : ''
    const engineMajor = /\d+/.exec(engine)
    const typesRange = packageJson.devDependencies?.['@types/node']
    const typesMajor = typeof typesRange === 'string' ? /\d+/.exec(typesRange) : null
    if (engineMajor === null) fail('QG003', 'package.json engines.node must declare a Node major')
    if (typesMajor === null) fail('QG003', 'package.json devDependencies must pin @types/node')
    if (engineMajor !== null && typesMajor !== null && engineMajor[0] !== typesMajor[0]) {
      fail('QG003', 'engines.node (' + engine + ') must match @types/node (' + typesRange + ') major')
    }
    if (engineMajor !== null) {
      const major = Number(engineMajor[0])
      for (const file of SITE_WORKFLOWS) {
        if (!exists(root, file)) continue
        for (const match of read(root, file).matchAll(/node-version:\s*['"]?(\d+)/gu)) {
          if (Number(match[1]) !== major) fail('QG003', file + ' node-version ' + match[1] + ' must equal Node ' + major)
        }
      }
    }
  }

  const pairingProblems = []
  translationPairs(root, 'src/content/records', pairingProblems)
  translationPairs(root, 'src/content/projects', pairingProblems)
  for (const problem of pairingProblems) fail('QG004', problem)

  const now = Date.now()
  for (const dir of DATA_DIRS) {
    const metaPath = dir + '/meta.json'
    if (!exists(root, metaPath)) {
      fail('QG005', 'missing data snapshot: ' + metaPath)
      continue
    }
    let meta
    try {
      meta = JSON.parse(read(root, metaPath))
    } catch {
      fail('QG005', metaPath + ' is not valid JSON')
      continue
    }
    const updatedAt = meta !== null && typeof meta.updatedAt === 'string' ? new Date(meta.updatedAt) : null
    if (updatedAt === null || Number.isNaN(updatedAt.getTime())) {
      fail('QG005', metaPath + ' updatedAt must be an ISO timestamp')
      continue
    }
    if (futureDate(updatedAt, now)) fail('QG005', metaPath + ' updatedAt is in the future')
  }

  if (!exists(root, MOVIES_JSON)) {
    fail('QG005', 'missing data snapshot: ' + MOVIES_JSON)
  } else {
    let rows = null
    try {
      rows = JSON.parse(read(root, MOVIES_JSON))
    } catch {
      fail('QG005', MOVIES_JSON + ' is not valid JSON')
    }
    if (rows !== null) {
      if (!Array.isArray(rows)) {
        fail('QG005', MOVIES_JSON + ' must be an array')
      } else {
        for (const [index, row] of rows.entries()) {
          if (typeof row?.title !== 'string' || row.title === '' || typeof row?.url !== 'string' || row.url === '') {
            fail('QG005', MOVIES_JSON + ' entry ' + index + ' needs title and url')
            break
          }
        }
      }
    }
  }

  if (packageJson !== null) {
    const scripts = packageJson.scripts ?? {}
    if (typeof scripts.verify !== 'string' || !/^npm run lint(?:\s|$)/u.test(scripts.verify.trim())) {
      fail('QG006', 'package.json scripts.verify must start with "npm run lint"')
    }
    const lint = typeof scripts.lint === 'string' ? scripts.lint : ''
    const codeAt = lint.indexOf('npm run lint:code')
    const policyAt = lint.indexOf('npm run lint:policy')
    if (codeAt === -1 || policyAt === -1 || codeAt > policyAt) {
      fail('QG006', 'package.json scripts.lint must run "npm run lint:code" before "npm run lint:policy"')
    }
  }

  const pipeline = registeredPipeline(root)
  if (pipeline === null) {
    fail('QG007', 'meta/rules/engineering.md has no pyai.site pipeline row')
  } else {
    const expected = stagedJobs(pipeline.ci)
    const ciPath = '.github/workflows/ci.yml'
    if (!exists(root, ciPath)) {
      fail('QG007', ciPath + ' is missing')
    } else {
      const jobs = parseJobs(read(root, ciPath))
      const unknown = jobs.filter((job) => !E24_JOBS.has(job))
      if (unknown.length > 0) fail('QG007', ciPath + ' has unknown CI job name(s): ' + unknown.join(', '))
      if (new Set(jobs).size !== jobs.length) fail('QG007', ciPath + ' has duplicate job names')
      if (jobs.join(',') !== expected.join(',')) {
        fail('QG007', ciPath + ' jobs must follow the registered pipeline (' + expected.join(' → ') + '); found ' + (jobs.join(' → ') || '(none)'))
      }
    }
    const releaseJobs = exists(root, DEPLOY_WORKFLOW) ? parseJobs(read(root, DEPLOY_WORKFLOW)) : []
    for (const stage of stagedJobs(pipeline.release)) {
      if (!releaseJobs.includes(stage)) fail('QG007', 'registered ' + stage + ' stage must exist in ' + DEPLOY_WORKFLOW)
    }
  }

  if (!exists(root, DEPLOY_WORKFLOW)) {
    fail('QG008', DEPLOY_WORKFLOW + ' is missing')
  } else {
    const deploy = read(root, DEPLOY_WORKFLOW)
    const environmentPattern = new RegExp('environment:\\s*\\n\\s*name:\\s*' + DEPLOY_ENVIRONMENT, 'u')
    if (!environmentPattern.test(deploy)) {
      fail('QG008', 'deploy must use the ' + DEPLOY_ENVIRONMENT + ' environment')
    }
    const gateAt = deploy.indexOf('scripts/security-gate.mjs')
    const deployAt = deploy.search(/actions\/deploy-pages/u)
    if (gateAt === -1 || deployAt === -1 || gateAt > deployAt) {
      fail('QG008', 'security-alert gate must run before the Pages deploy step')
    }
    if (!/git merge-base --is-ancestor[\s\S]*origin\/main/u.test(deploy)) {
      fail('QG008', 'deploy must fail closed when the commit is not on main')
    }
  }

  if (!exists(root, '.gitignore')) {
    fail('QG009', '.gitignore is missing')
  } else {
    const lines = read(root, '.gitignore').split('\n')
    for (const entry of GITIGNORE_ENTRIES) {
      if (!lines.includes(entry)) fail('QG009', '.gitignore must contain ' + entry)
    }
  }
  if (exists(root, DEPLOY_WORKFLOW) && !/path:\s*['"]?\.\/dist['"]?\s*$/mu.test(read(root, DEPLOY_WORKFLOW))) {
    fail('QG009', DEPLOY_WORKFLOW + ' must upload only ./dist')
  }

  for (const file of walkFiles(join(root, 'test'))) {
    if (!/\.test\.ts$/u.test(file)) continue
    const source = readFileSync(file, 'utf8')
    if (/\.only\s*\(/u.test(source)) {
      fail('QG010', relative(root, file).replaceAll('\\', '/') + ' contains .only(); focused tests must not be committed')
    }
  }

  for (const dir of SCAN_DIRS) {
    for (const file of walkFiles(join(root, dir))) {
      if (!/\.(astro|css)$/u.test(file)) continue
      const source = readFileSync(file, 'utf8')
      const relPath = relative(root, file).replaceAll('\\', '/')
      if (source.includes('<!--')) fail('L006', relPath + ' contains an HTML comment')
      if (source.includes('/*')) fail('L006', relPath + ' contains a CSS comment')
    }
  }

  violations.push(...checkNoComments(root))
  return violations
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  const root = process.cwd()
  const violations = checkRepository(root)
  if (violations.length > 0) {
    for (const violation of violations) console.error('✖ ' + violation)
    console.error('\n' + violations.length + ' policy violation(s) under ' + (relative(process.cwd(), root) || '.'))
    process.exit(1)
  }
  console.log('✓ repository policy checks passed')
}
