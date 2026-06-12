const assert = require('node:assert/strict')
const { test, describe, beforeEach, afterEach, mock } = require('node:test')

const logic = require('../src/logic.js')
const checkCmd = require('../src/check.command.js')

let logLines
let restoreLog

function results() {
  return [
    {
      name: 'lodash',
      type: 'Prod',
      currentVersion: '3.0.0',
      latestMinor: '3.5.1',
      latestMajor: '4.5.1',
    },
    { name: 'broken', type: 'Prod', error: 'Error caught: nope' },
  ]
}

async function runCheck(extraOpts = {}) {
  await checkCmd.handler({ packagePath: 'pkg', rule: '.*', ...extraOpts })
}

describe('check handler', () => {
  beforeEach(() => {
    mock.method(logic, 'findPackagesToUpdate', async () => results())
    logLines = []
    const log = console.log
    restoreLog = () => (console.log = log)
    console.log = (...args) => logLines.push(args.join(' '))
  })

  afterEach(() => {
    mock.restoreAll()
    restoreLog()
  })

  test('renders a row for each dependency', async () => {
    await runCheck()
    assert.ok(logLines.some((l) => /lodash/.test(l)))
    assert.ok(logLines.some((l) => /broken/.test(l)))
  })

  test('--hide-errors reports and removes error rows', async () => {
    await runCheck({ hideErrors: true })
    assert.ok(logLines.some((l) => /1 error\(s\) were hidden/.test(l)))
    assert.ok(!logLines.some((l) => /broken/.test(l)))
  })

  test('mutually exclusive ignore flags exit with an error', async () => {
    const exit = mock.method(process, 'exit', () => {})
    await runCheck({ silent: true, ignoreProd: true, ignoreDev: true })
    assert.deepEqual(exit.mock.calls[0].arguments, [-1])
  })
})
