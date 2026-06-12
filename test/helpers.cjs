const assert = require('node:assert/strict')
const { test, describe } = require('node:test')

const helpers = require('../src/helpers.js')

const silentLogger = { debug() {} }

describe('spawn', () => {
  test('resolves with stdout for a successful command', async () => {
    const out = await helpers.spawn(
      process.execPath,
      ['-e', 'process.stdout.write("hello")'],
      silentLogger,
    )
    assert.match(out, /hello/)
  })

  test('rejects when the command exits non-zero', async () => {
    await assert.rejects(
      helpers.spawn(process.execPath, ['-e', 'process.exit(3)'], silentLogger),
    )
  })

  test('does not interpret shell metacharacters in arguments', async () => {
    const out = await helpers.spawn(
      process.execPath,
      ['-e', 'process.stdout.write(process.argv[1])', '; echo pwned'],
      silentLogger,
    )
    assert.equal(out, '; echo pwned')
  })
})

describe('getGitUrl', () => {
  test('strips the #semver: suffix from a git dependency', () => {
    assert.equal(
      helpers.getGitUrl({ version: 'github:user/repo#semver:^1.2.3' }),
      'github:user/repo',
    )
  })

  test('returns the url unchanged when there is no #semver: suffix', () => {
    assert.equal(
      helpers.getGitUrl({ version: 'git+https://example.com/repo.git' }),
      'git+https://example.com/repo.git',
    )
  })

  test('is not vulnerable to backtracking on long inputs', () => {
    const version = `#semver:${'a'.repeat(100000)}`
    const start = Date.now()
    assert.equal(helpers.getGitUrl({ version }), '')
    assert.ok(Date.now() - start < 1000)
  })
})

describe('parseLsRemoteResponse', () => {
  test('extracts versions from refs/tags lines, dropping the v prefix', () => {
    const response = [
      'abc123\trefs/tags/v1.0.0',
      'def456\trefs/tags/2.0.0',
      'ghi789\trefs/heads/main',
    ].join('\n')
    assert.deepEqual(helpers.parseLsRemoteResponse(response), [
      '1.0.0',
      '2.0.0',
    ])
  })

  test('returns an empty array when there are no tags', () => {
    assert.deepEqual(helpers.parseLsRemoteResponse('abc\trefs/heads/main'), [])
  })

  test('does not throw on a trailing refs/tags/ with no version', () => {
    assert.deepEqual(helpers.parseLsRemoteResponse('abc\trefs/tags/'), [])
  })
})

describe('parseNpmResponse', () => {
  test('parses a JSON array of versions', () => {
    assert.deepEqual(helpers.parseNpmResponse('["1.0.0","2.0.0"]'), [
      '1.0.0',
      '2.0.0',
    ])
  })

  test('wraps a bare single version in an array', () => {
    assert.deepEqual(helpers.parseNpmResponse('"1.0.0"'), ['1.0.0'])
  })

  test('strips ANSI color codes and normalizes single quotes', () => {
    const colored = "\x1B[32m[ '1.0.0', '2.0.0' ]\x1B[0m"
    assert.deepEqual(helpers.parseNpmResponse(colored), ['1.0.0', '2.0.0'])
  })

  test('throws a descriptive error on unparseable output', () => {
    assert.throws(() => helpers.parseNpmResponse('[not json'), {
      message: /Could not parse as JSON/,
    })
  })
})
