const logic = require('./logic')
const { drawTable, loggerInit } = require('./cliHelpers.js')
const fs = require('node:fs').promises
const { DEP_TYPE } = require('./helpers.js')

module.exports = {
  command: 'update [rule]',
  describe:
    'Check all dependencies versions and update package.json file with latest version of each file',
  builder: {
    'ignore-minor': {
      type: 'boolean',
      description:
        "Does not update dependencies with minor version. Can't be used with --ignore-major",
    },
    'ignore-major': {
      type: 'boolean',
      description:
        "Does not update dependencies with major version. Can't be used with --ignore-minor",
    },
    'ignore-dev': {
      type: 'boolean',
      description:
        "Does not update dev dependencies. Can't be used with --ignore-prod",
    },
    'ignore-prod': {
      type: 'boolean',
      description:
        "Does not update prod dependencies. Can't be used with --ignore-dev",
    },
    'hide-ignored': {
      type: 'boolean',
      description: 'Hide ignored dependencies',
    },
    'hide-unchanged': {
      type: 'boolean',
      description: 'Hide dependencies that were not changed',
    },
  },
  handler,
}

const depContainerNames = {
  [DEP_TYPE.PROD]: 'dependencies',
  [DEP_TYPE.DEV]: 'devDependencies',
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

    logger.log(`Updating dependencies in: ${yargs.packagePath}.`)
    if (yargs.rule !== '.*') {
      logger.log(`\tmatching this regex: /${yargs.rule}/.\n`)
    }

    const [packageJson, dependencies] = await Promise.all([
      fs.readFile(yargs.packagePath, 'utf8').then(JSON.parse),
      logic.findPackagesToUpdate(yargs.packagePath, yargs.rule, yargs),
    ])

    for (const dependency of dependencies) {
      if (
        (dependency.type === DEP_TYPE.DEV && yargs.ignoreDev) ||
        (dependency.type === DEP_TYPE.PROD && yargs.ignoreProd)
      ) {
        dependency.ignored = true
        dependency.updatedTo = 'Ignored by type'
        continue
      }

      if (!dependency.latestMajor && !dependency.latestMinor) {
        dependency.updatedTo = null
        continue
      }

      const nextVersion =
        (!yargs.ignoreMajor && dependency.latestMajor) ||
        (!yargs.ignoreMinor && dependency.latestMinor)

      if (!nextVersion) {
        dependency.ignored = true
        dependency.updatedTo = 'Ignored by version'
        continue
      }

      dependency.updatedTo = nextVersion

      const container = depContainerNames[dependency.type]
      packageJson[container][dependency.name] = packageJson[container][
        dependency.name
      ].replace(dependency.currentVersion, nextVersion)
    }

    await fs.writeFile(yargs.packagePath, JSON.stringify(packageJson, null, 2))

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

    logger.log()
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

    logger.log("\nRemember to run 'npm install' to install the dependencies.")
  } catch (err) {
    logger.error(err)
  }
}
