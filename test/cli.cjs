const assert = require('node:assert/strict')
const { test, describe } = require('node:test')

const { parseArgs } = require('../cli.js')

const argv = (...args) => ['node', 'cli.js', ...args]

describe('parseArgs', () => {
  test('parses a command with no options', () => {
    const { command, opts } = parseArgs(argv('check'))
    assert.equal(command, 'check')
    assert.deepEqual(opts, {})
  })

  test('captures a positional rule after the command', () => {
    const { command, opts } = parseArgs(argv('check', 'lodash'))
    assert.equal(command, 'check')
    assert.equal(opts.rule, 'lodash')
  })

  test('does not treat a following flag as the rule', () => {
    const { opts } = parseArgs(argv('check', '--ignore-dev'))
    assert.equal(opts.rule, undefined)
    assert.equal(opts.ignoreDev, true)
  })

  test('converts kebab-case flags to camelCase', () => {
    const { opts } = parseArgs(
      argv('update', '--ignore-minor', '--hide-unchanged', '--hide-ignored'),
    )
    assert.equal(opts.ignoreMinor, true)
    assert.equal(opts.hideUnchanged, true)
    assert.equal(opts.hideIgnored, true)
  })

  test('parses flags that take a value', () => {
    const { opts } = parseArgs(
      argv('check', '--packagePath', './some/package.json'),
    )
    assert.equal(opts.packagePath, './some/package.json')
  })

  test('returns a null command when none is given', () => {
    const { command } = parseArgs(argv('--help'))
    assert.equal(command, null)
  })
})
