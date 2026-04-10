import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const generatedDistFiles = [
  resolve('dist/generated/client.js'),
  resolve('dist/generated/types.js'),
]

const addJsExtension = (source) =>
  source
    .replace(/(from\s+['"])(\.{1,2}\/[^'"]+?)(['"])/g, (match, prefix, specifier, suffix) =>
      specifier.endsWith('.js') ? match : `${prefix}${specifier}.js${suffix}`,
    )
    .replace(/(import\s+['"])(\.{1,2}\/[^'"]+?)(['"])/g, (match, prefix, specifier, suffix) =>
      specifier.endsWith('.js') ? match : `${prefix}${specifier}.js${suffix}`,
    )

for (const filePath of generatedDistFiles) {
  const content = await readFile(filePath, 'utf8')
  const updated = addJsExtension(content)

  if (updated !== content) {
    await writeFile(filePath, updated, 'utf8')
  }
}