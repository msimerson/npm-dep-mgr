const logic = require('./logic')
const { selfCheck, drawTable, loggerInit } = require('./cliHelpers.js')
const helpers = require('./helpers.js')

module.exports = {
  command: 'check [rule]',
  describe: 'Check all dependencies for updates',
  builder: {
    'no-self-check': {
      type: 'boolean',
      description: 'Omits version check for this code',
    },
    'hide-empty': {
      type: 'boolean',
      description: 'Hide entries that are up to date',
    },
  },
  handler,
}

async function handler(yargs) {
  const logger = loggerInit(yargs)
  try {
    if (
      (yargs.ignoreMinor && yargs.ignoreMajor) ||
      (yargs.ignoreProd && yargs.ignoreDev)
    ) {
      logger.error(
        "Wait, what do you want from me?\nCheck --help for list of right arguments - you've provided excluding filters.",
      )
      return process.exit(-1)
    }

    logger.log(`Checking dependencies in: ${yargs.packagePath}.`)
    if (yargs.rule !== '.*') {
      logger.log(`\tmatching this regex: /${yargs.rule}/.\n`)
    }

    const dependencies = await logic.findPackagesToUpdate(
      yargs.packagePath,
      yargs.rule,
      yargs,
    )

    let filtered = dependencies

    if (yargs.hideErrors) {
      filtered = filtered.filter((dep) => !dep.error)
      logger.log(
        `${dependencies.length - filtered.length} error(s) were hidden.`,
      )
    }

    if (yargs.hideUnchanged) {
      const before = filtered.length
      filtered = filtered.filter((dep) => dep.updatedTo || dep.error)
      logger.log(
        `${before - filtered.length} unchanged dependenct(-ies) were hidden.`,
      )
    }

    if (yargs.hideIgnored) {
      const before = filtered.length
      filtered = filtered.filter((dep) => !dep.ignored)
      logger.log(
        `${before - filtered.length} ignored dependency(-ies) were hidden.`,
      )
    }

    drawTable({
      headers: {
        name: 'Dependency',
        type: 'Type',
        currentVersion: 'Current Version',
        latestMinor: 'Latest Minor',
        latestMajor: 'Latest Major',
        updatedTo: 'Changed to',
      },
      customEntry: {
        fromColumn: 2,
        getter: (entry) => entry.error,
      },
      data: filtered,
    })
  } catch (err) {
    logger.error(err)
  }
}
