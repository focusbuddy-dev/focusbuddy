import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { createApiClient } from '@focusbuddy/api-contract/generated/client'
import * as generatedTypes from '@focusbuddy/api-contract/generated/types'

test('exports the built ESM client contract', () => {
  assert.equal(typeof createApiClient, 'function')

  const client = createApiClient('http://localhost:3000')

  assert.ok(client)
})

test('exports the built generated types module surface', () => {
  assert.ok(generatedTypes)
  assert.equal(typeof generatedTypes, 'object')
})

test('does not declare dedicated CommonJS runtime conditions for generated subpaths', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

  assert.equal(packageJson.type, 'module')
  assert.deepStrictEqual(packageJson.exports['./generated/client'], {
    types: './dist/generated/client.d.ts',
    default: './dist/generated/client.js',
  })
  assert.deepStrictEqual(packageJson.exports['./generated/types'], {
    types: './dist/generated/types.d.ts',
    default: './dist/generated/types.js',
  })
  assert.equal(packageJson.exports['./generated/client'].require, undefined)
  assert.equal(packageJson.exports['./generated/types'].require, undefined)
  assert.equal(packageJson.exports['./openapi-path'], undefined)
})