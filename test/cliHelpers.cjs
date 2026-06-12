const assert = require('node:assert/strict')
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const { test, describe, afterEach, mock } = require('node:test')

const logic = require('../src/logic.js')
const {
  drawTable,
  findClosestPackage,
  loggerInit,
  selfCheck,
} = require('../src/cliHelpers.js')

function captureConsole(method, fn) {
  const original = console[method]
  const lines = []
  console[method] = (...args) => lines.push(args.join(' '))
  try {
    fn()
  } finally {
    console[method] = original
  }
  return lines
}

describe('drawTable', () => {
  test('renders a header, separator and one row per entry', () => {
    const lines = captureConsole('log', () =>
      drawTable({
        headers: { name: 'Dependency', version: 'Version' },
        data: [
          { name: 'lodash', version: '4.0.0' },
          { name: 'semver', version: '7.0.0' },
        ],
      }),
    )
    assert.equal(lines.length, 4)
    assert.match(lines[0], /Dependency/)
    assert.match(lines[0], /Version/)
    assert.match(lines[1], /===/)
    assert.match(lines[2], /lodash/)
    assert.match(lines[3], /semver/)
  })

  test('renders null as "-" and missing values as blanks', () => {
    const lines = captureConsole('log', () =>
      drawTable({
        headers: { name: 'Dependency', latest: 'Latest' },
        data: [{ name: 'lodash', latest: null }],
      }),
    )
    assert.match(lines[2], /lodash/)
    assert.match(lines[2], /-/)
  })

  test('uses customEntry getter to span columns for matching rows', () => {
    const lines = captureConsole('log', () =>
      drawTable({
        headers: { name: 'Dependency', type: 'Type', latest: 'Latest' },
        customEntry: { fromColumn: 1, getter: (e) => e.error },
        data: [{ name: 'broken', type: 'Prod', error: 'boom' }],
      }),
    )
    assert.match(lines[2], /boom/)
  })
})

describe('findClosestPackage', () => {
  const startCwd = process.cwd()
  afterEach(() => process.chdir(startCwd))

  test('finds package.json in the current directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fcp-'))
    fs.writeFileSync(path.join(dir, 'package.json'), '{}')
    process.chdir(dir)
    assert.equal(
      findClosestPackage(),
      path.join(fs.realpathSync(dir), 'package.json'),
    )
  })

  test('walks up to find package.json in an ancestor directory', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fcp-'))
    fs.writeFileSync(path.join(dir, 'package.json'), '{}')
    const nested = path.join(dir, 'a', 'b')
    fs.mkdirSync(nested, { recursive: true })
    process.chdir(nested)
    assert.equal(
      findClosestPackage(),
      path.join(fs.realpathSync(dir), 'package.json'),
    )
  })
})

describe('loggerInit', () => {
  test('debug only logs when verbose and not silent', () => {
    const quiet = captureConsole('debug', () =>
      loggerInit({ verbose: false }).debug('x'),
    )
    assert.deepEqual(quiet, [])

    const loud = captureConsole('debug', () =>
      loggerInit({ verbose: true }).debug('x'),
    )
    assert.deepEqual(loud, ['x'])
  })

  test('silent suppresses log, error and debug', () => {
    const logs = captureConsole('log', () =>
      loggerInit({ silent: true }).log('x'),
    )
    const errors = captureConsole('error', () =>
      loggerInit({ silent: true, verbose: true }).error('x'),
    )
    assert.deepEqual(logs, [])
    assert.deepEqual(errors, [])
  })
})

describe('selfCheck', () => {
  afterEach(() => mock.restoreAll())

  test('is a no-op when selfCheck is disabled', () => {
    assert.equal(selfCheck({ selfCheck: false }), undefined)
    assert.equal(selfCheck({ silent: true }), undefined)
  })

  test('warns when a newer version is available', async () => {
    mock.method(logic, 'getListOfTags', async () => ['99.0.0'])
    mock.method(logic, 'findNextVersions', () => ({
      latestMajor: '99.0.0',
      latestMinor: null,
    }))
    const warnings = []
    const original = console.warn
    console.warn = (...args) => warnings.push(args.join(' '))
    try {
      await selfCheck({})
    } finally {
      console.warn = original
    }
    assert.ok(warnings.some((w) => /new major version \(99\.0\.0\)/.test(w)))
  })

  test('stays quiet when already up to date', async () => {
    mock.method(logic, 'getListOfTags', async () => [])
    mock.method(logic, 'findNextVersions', () => ({
      latestMajor: null,
      latestMinor: null,
    }))
    const warnings = []
    const original = console.warn
    console.warn = (...args) => warnings.push(args.join(' '))
    try {
      await selfCheck({})
    } finally {
      console.warn = original
    }
    assert.deepEqual(warnings, [])
  })
})
