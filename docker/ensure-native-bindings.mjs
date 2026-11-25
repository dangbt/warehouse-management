#!/usr/bin/env node
// Bổ sung native binding còn thiếu cho platform đang build (vd. linux-arm64-musl).
//
// package-lock.json được sinh trên một máy nên npm chỉ ghi optional binding của
// platform đó (npm bug https://github.com/npm/cli/issues/4828). `npm ci` trên
// arch khác (Apple Silicon, ARM VPS) sẽ thiếu binding → Vite/rolldown,
// lightningcss, tailwind oxide báo "Cannot find native binding".
//
// Script này tìm các package native đã cài, đọc optionalDependencies của chúng,
// và nếu binding cho platform hiện tại chưa có thì `npm pack` đúng version rồi
// giải nén vào node_modules cạnh package cha. Không đụng tới lockfile.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.argv[2] ?? process.cwd()
const PARENTS = ['rolldown', 'lightningcss', '@tailwindcss/oxide', 'oxlint']

const isMusl = !process.report?.getReport()?.header?.glibcVersionRuntime
const platformTag = `${process.platform}-${process.arch}`

function findInstalled(dir, name, out = []) {
  const nm = join(dir, 'node_modules')
  if (!existsSync(nm)) return out
  const pkgJson = join(nm, name, 'package.json')
  if (existsSync(pkgJson)) out.push(pkgJson)
  for (const entry of readdirSync(nm)) {
    if (entry.startsWith('.')) continue
    const entryPath = join(nm, entry)
    if (!statSync(entryPath).isDirectory()) continue
    const children = entry.startsWith('@')
      ? readdirSync(entryPath).map((c) => join(entryPath, c))
      : [entryPath]
    for (const child of children) findInstalled(child, name, out)
  }
  return out
}

function pickBinding(optionalDeps) {
  const candidates = Object.keys(optionalDeps).filter((n) => n.includes(platformTag))
  if (process.platform !== 'linux') return candidates[0]
  const libc = isMusl ? 'musl' : 'gnu'
  return candidates.find((n) => n.endsWith(`-${libc}`)) ?? candidates.find((n) => !/-(musl|gnu)$/.test(n))
}

function isResolvable(fromDir, name) {
  // Node resolution: đi ngược lên các thư mục node_modules cha.
  let dir = fromDir
  for (;;) {
    if (existsSync(join(dir, 'node_modules', name, 'package.json'))) return true
    const parent = dirname(dir)
    if (parent === dir) return false
    dir = parent
  }
}

const workspaces = [ROOT, ...['apps', 'packages'].flatMap((d) => {
  const p = join(ROOT, d)
  return existsSync(p) ? readdirSync(p).map((c) => join(p, c)) : []
})]

let added = 0
for (const parent of PARENTS) {
  const seen = new Set()
  for (const ws of workspaces) {
    for (const pkgJsonPath of findInstalled(ws, parent)) {
      if (seen.has(pkgJsonPath)) continue
      seen.add(pkgJsonPath)
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
      const binding = pickBinding(pkg.optionalDependencies ?? {})
      if (!binding) continue
      const pkgDir = dirname(pkgJsonPath)
      if (isResolvable(pkgDir, binding)) continue

      const version = pkg.optionalDependencies[binding]
      // node_modules chứa package cha (vd. /app/apps/web/node_modules)
      const nmDir = parent.startsWith('@') ? dirname(dirname(pkgDir)) : dirname(pkgDir)
      const target = join(nmDir, binding)
      const work = join(tmpdir(), `nb-${Date.now()}-${added}`)
      mkdirSync(work, { recursive: true })
      const tgz = execFileSync('npm', ['pack', `${binding}@${version}`, '--silent', '--pack-destination', work], {
        encoding: 'utf8',
      }).trim().split('\n').pop()
      mkdirSync(target, { recursive: true })
      execFileSync('tar', ['xzf', join(work, tgz), '-C', target, '--strip-components=1'])
      rmSync(work, { recursive: true, force: true })
      console.log(`+ ${binding}@${version} → ${target}`)
      added++
    }
  }
}
console.log(added ? `ensure-native-bindings: đã bổ sung ${added} binding.` : 'ensure-native-bindings: đủ binding, không cần bổ sung.')
