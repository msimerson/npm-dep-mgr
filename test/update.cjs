const assert = require('node:assert/strict')
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const { test, describe, beforeEach, afterEach, mock } = require('node:test')

const logic = require('../src/logic.js')
const updateCmd = require('../src/update.command.js')

let tmpDir
let pkgPath
let restoreLog
let logLines

function writePackage() {
  fs.writeFileSync(
    pkgPath,
    JSON.stringify(
      {
        name: 'fixture',
        version: '1.0.0',
        dependencies: { lodash: '^3.0.0' },
        devDependencies: { jest: '^29.0.0' },
      },
      null,
      2,
    ),
  )
}

function freshResults() {
  return [
    {
      name: 'lodash',
      type: 'Prod',
      currentVersion: '3.0.0',
      latestMinor: '3.5.1',
      latestMajor: '4.5.1',
    },
    {
      name: 'jest',
      type: 'Dev',
      currentVersion: '29.0.0',
      latestMinor: '29.7.0',
      latestMajor: null,
    },
  ]
}

function readPackage() {
  return JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
}

async function runUpdate(extraOpts = {}) {
  await updateCmd.handler({
    packagePath: pkgPath,
    rule: '.*',
    silent: true,
    ...extraOpts,
  })
  return readPackage()
}

describe('update handler', () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upd-'))
    pkgPath = path.join(tmpDir, 'package.json')
    writePackage()
    mock.method(logic, 'findPackagesToUpdate', async () => freshResults())
    logLines = []
    const log = console.log
    restoreLog = () => (console.log = log)
    console.log = (...args) => logLines.push(args.join(' '))
  })

  afterEach(() => {
    mock.restoreAll()
    restoreLog()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  test('updates to the latest major by default', async () => {
    const pkg = await runUpdate()
    assert.equal(pkg.dependencies.lodash, '^4.5.1')
    assert.equal(pkg.devDependencies.jest, '^29.7.0')
  })

  test('--ignore-major updates only to the latest minor', async () => {
    const pkg = await runUpdate({ ignoreMajor: true })
    assert.equal(pkg.dependencies.lodash, '^3.5.1')
    assert.equal(pkg.devDependencies.jest, '^29.7.0')
  })

  test('--ignore-minor leaves deps with no major available unchanged', async () => {
    const pkg = await runUpdate({ ignoreMinor: true })
    assert.equal(pkg.dependencies.lodash, '^4.5.1')
    assert.equal(pkg.devDependencies.jest, '^29.0.0')
  })

  test('--ignore-dev leaves devDependencies untouched', async () => {
    const pkg = await runUpdate({ ignoreDev: true })
    assert.equal(pkg.dependencies.lodash, '^4.5.1')
    assert.equal(pkg.devDependencies.jest, '^29.0.0')
  })

  test('--ignore-opt leaves optionalDependencies untouched', async () => {
    fs.writeFileSync(
      pkgPath,
      JSON.stringify({
        name: 'fixture',
        version: '1.0.0',
        optionalDependencies: { fsevents: '^2.0.0' },
      }),
    )
    mock.method(logic, 'findPackagesToUpdate', async () => [
      {
        name: 'fsevents',
        type: 'Opt',
        currentVersion: '2.0.0',
        latestMinor: '2.3.0',
        latestMajor: null,
      },
    ])
    const pkg = await runUpdate({ ignoreOpt: true })
    assert.equal(pkg.optionalDependencies.fsevents, '^2.0.0')
  })

  test('writes the file with a trailing newline', async () => {
    await runUpdate()
    assert.ok(fs.readFileSync(pkgPath, 'utf8').endsWith('}\n'))
  })

  test('--hide-errors reports and removes error rows', async () => {
    mock.method(logic, 'findPackagesToUpdate', async () => [
      ...freshResults(),
      { name: 'broken', type: 'Prod', error: 'Error caught: nope' },
    ])
    await runUpdate({ silent: false, hideErrors: true })
    assert.ok(logLines.some((l) => /1 error\(s\) were hidden/.test(l)))
    assert.ok(!logLines.some((l) => /broken/.test(l)))
  })

  test('--hide-unchanged reports and removes unchanged rows', async () => {
    mock.method(logic, 'findPackagesToUpdate', async () => [
      ...freshResults(),
      {
        name: 'uptodate',
        type: 'Prod',
        currentVersion: '2.0.0',
        latestMinor: null,
        latestMajor: null,
      },
    ])
    await runUpdate({ silent: false, hideUnchanged: true })
    assert.ok(logLines.some((l) => /unchanged/.test(l)))
    assert.ok(!logLines.some((l) => /uptodate/.test(l)))
  })

  test('mutually exclusive ignore flags exit with an error', async () => {
    const exit = mock.method(process, 'exit', () => {})
    await updateCmd.handler({
      packagePath: pkgPath,
      rule: '.*',
      silent: true,
      ignoreMinor: true,
      ignoreMajor: true,
    })
    assert.deepEqual(exit.mock.calls[0].arguments, [-1])
  })
})
