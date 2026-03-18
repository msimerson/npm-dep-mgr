const logic = require('../src/logic')
const helpers = require('../src/helpers.js')
const path = require('node:path')
const assert = require('node:assert/strict')
const { test, beforeEach, describe, mock } = require('node:test')

const testPackagePath = path.join(
  'test',
  'fixtures',
  'test-package',
  'package.json',
)

const tags = {
  lodash: ['3.5.1', '4.5.1'],
  underscore: ['1.9.1'],
  eslint: ['5.16.0'],
  immutable: ['3.8.2'],
  'backbone-redux-migrator': ['1.1.0-1', '1.1.0-2', '1.1.0-3'],
}

describe('logic', () => {
  beforeEach(() => {
    mock.method(helpers, 'getGitTags', (dep) => {
      if (!tags[dep.name]) throw new Error('nope')
      return tags[dep.name]
    })
    mock.method(helpers, 'getNpmTags', (dep) => {
      if (!tags[dep.name]) throw new Error('nope')
      return tags[dep.name]
    })
  })

  test('should return all dependencies with default rule provided', async () => {
    const dependencies = await logic.findPackagesToUpdate(
      testPackagePath,
      '.*',
      {},
    )
    assert.deepEqual(dependencies, [
      {
        name: 'lodash',
        type: 'Prod',
        currentVersion: '3.0.0',
        latestMinor: '3.5.1',
        latestMajor: '4.5.1',
      },
      {
        name: 'undercore',
        type: 'Prod',
        error: 'Error caught: nope',
      },
      {
        name: 'eslint',
        type: 'Prod',
        currentVersion: '5.16.0',
        latestMinor: null,
        latestMajor: null,
      },
      {
        name: 'immutable',
        type: 'Prod',
        currentVersion: '3.7.6',
        latestMinor: '3.8.2',
        latestMajor: null,
      },
      {
        name: 'backbone-redux-migrator',
        type: 'Prod',
        currentVersion: '1.1.0-1',
        latestMinor: '1.1.0-3',
        latestMajor: null,
      },
      {
        name: 'something-that-should-not-exist',
        type: 'Dev',
        error: 'Error caught: nope',
      },
    ])
  })

  test('should return single dependencies with specific rule provided', async () => {
    const dependencies = await logic.findPackagesToUpdate(
      testPackagePath,
      'lodash',
      {},
    )
    assert.deepEqual(dependencies, [
      {
        name: 'lodash',
        type: 'Prod',
        currentVersion: '3.0.0',
        latestMinor: '3.5.1',
        latestMajor: '4.5.1',
      },
    ])
  })
})
