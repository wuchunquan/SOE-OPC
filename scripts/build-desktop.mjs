import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const args = process.argv.slice(2)
let target = process.platform
let mode = 'onefile'

for (const arg of args) {
  const normalized = String(arg).toLowerCase()
  if (normalized === 'onedir' || normalized === 'onefile') {
    mode = normalized
  } else {
    target = normalized
  }
}

const targets = {
  win32: {
    label: 'windows',
    command: process.env.ComSpec || 'cmd.exe',
    args:
      mode === 'onedir'
        ? ['/d', '/s', '/c', resolve(repoRoot, 'build/pywebview/scripts/build-win-onedir.bat')]
        : ['/d', '/s', '/c', resolve(repoRoot, 'build/pywebview/scripts/build-win.bat')],
  },
  windows: {
    label: 'windows',
    command: process.env.ComSpec || 'cmd.exe',
    args:
      mode === 'onedir'
        ? ['/d', '/s', '/c', resolve(repoRoot, 'build/pywebview/scripts/build-win-onedir.bat')]
        : ['/d', '/s', '/c', resolve(repoRoot, 'build/pywebview/scripts/build-win.bat')],
  },
  darwin: {
    label: 'macos',
    command: 'bash',
    args:
      mode === 'onedir'
        ? []
        : [resolve(repoRoot, 'build/pywebview/scripts/build-mac.sh')],
  },
  mac: {
    label: 'macos',
    command: 'bash',
    args:
      mode === 'onedir'
        ? []
        : [resolve(repoRoot, 'build/pywebview/scripts/build-mac.sh')],
  },
  macos: {
    label: 'macos',
    command: 'bash',
    args:
      mode === 'onedir'
        ? []
        : [resolve(repoRoot, 'build/pywebview/scripts/build-mac.sh')],
  },
}

if (mode === 'onedir' && ['darwin', 'mac', 'macos'].includes(String(target).toLowerCase())) {
  console.error('[build:desktop] onedir mode is currently only configured for windows')
  process.exit(1)
}

const selected = targets[target]

if (!selected) {
  console.error(`Unsupported desktop build target: ${target}`)
  console.error('Supported targets: win32/windows, darwin/mac/macos')
  process.exit(1)
}

console.log(`[build:desktop] target=${selected.label} mode=${mode}`)
const result = spawnSync(selected.command, selected.args, {
  cwd: repoRoot,
  stdio: 'inherit',
})

if (result.error) {
  console.error(`[build:desktop] failed to start: ${result.error.message}`)
  process.exit(1)
}

process.exit(result.status ?? 1)
