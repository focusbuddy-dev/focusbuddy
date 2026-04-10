import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const distPackageJsonPath = resolve('dist/package.json')

await mkdir(dirname(distPackageJsonPath), { recursive: true })
await writeFile(
  distPackageJsonPath,
  `${JSON.stringify({ type: 'module' }, undefined, 2)}\n`,
  'utf8',
)