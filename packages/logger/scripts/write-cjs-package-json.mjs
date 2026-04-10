import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const cjsPackageJsonPath = resolve(scriptsDir, '../dist/cjs/package.json')

await mkdir(dirname(cjsPackageJsonPath), { recursive: true })
await writeFile(
  cjsPackageJsonPath,
  `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`,
  'utf8',
)