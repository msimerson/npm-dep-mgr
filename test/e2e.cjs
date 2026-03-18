// Run with: node --test test/e2e-basic.test.js

const { exec } = require('node:child_process')
const assert = require('node:assert').strict
const path = require('node:path')
const fs = require('node:fs')
const { test, before, after } = require('node:test')

const CLI_PATH = path.join(__dirname, '../cli.js')
const TEST_TMP = path.join(__dirname, 'tmp')
const PKG_PATH = path.join(TEST_TMP, 'package.json')

function runCli(args = '', opts = {}) {
  return new Promise((resolve, reject) => {
    exec(
      `node ${CLI_PATH} ${args}`,
      { cwd: TEST_TMP, ...opts },
      (err, stdout, stderr) => {
        resolve({ err, stdout, stderr })
      },
    )
  })
}

before(() => {
  if (fs.existsSync(TEST_TMP)) fs.rmSync(TEST_TMP, { recursive: true })
  fs.mkdirSync(TEST_TMP)
  fs.writeFileSync(
    PKG_PATH,
    JSON.stringify(
      {
        name: 'test-pkg',
        version: '1.0.0',
        dependencies: { lodash: '^4.17.0' },
        devDependencies: { jest: '^29.0.0' },
      },
      null,
      2,
    ),
  )
})

after(() => {
  if (fs.existsSync(TEST_TMP)) fs.rmSync(TEST_TMP, { recursive: true })
})

test('CLI runs and shows help', async () => {
  const { stdout, stderr } = await runCli('--help')
  assert.match(stdout, /Usage|Commands|Options/i)
  assert.equal(stderr, '')
})

test('CLI checks dependencies', { timeout: 4000 }, async () => {
  const { stdout, stderr } = await runCli('check')
  assert.match(stdout, /lodash/)
  assert.equal(stderr, '')
})
