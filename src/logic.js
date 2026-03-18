const helpers = require('./helpers.js')
const path = require('node:path')
const fs = require('node:fs').promises
const semver = require('semver')
const { DEP_TYPE } = require('./helpers.js')
const { loggerInit } = require('./cliHelpers.js')

const semverOptions = { loose: true, includePrerelease: true }

module.exports = {
  findPackagesToUpdate,
  getListOfTags,
  findNextVersions,
}

async function findPackagesToUpdate(pckPath, rule, options) {
  const logger = loggerInit(options)
  logger.debug(`Found package file: ${pckPath}. Rule set to ${rule}.`)

  const isOurDependency = getDependenciesChecker(rule)

  const fileContent = await fs.readFile(path.resolve(pckPath), 'utf8')
  const pck = JSON.parse(fileContent)
  const dependencies = [
    ...Object.entries(pck.dependencies || []).map(([name, version]) => ({
      name,
      type: DEP_TYPE.PROD,
      version,
    })),
    ...Object.entries(pck.devDependencies || []).map(([name, version]) => ({
      name,
      type: DEP_TYPE.DEV,
      version,
    })),
    ...Object.entries(pck.optionalDependencies || []).map(
      ([name, version]) => ({ name, type: DEP_TYPE.OPT, version }),
    ),
  ].filter(isOurDependency)
  logger.debug(
    `Dependencies found: ${dependencies
      .map(({ name, type }) => `${name} (${type})`)
      .join(', ')}`,
  )

  const results = await Promise.all(
    dependencies.map(async (dependency) => {
      try {
        const tags = await getListOfTags(dependency, logger)
        const depWithTags = Object.assign(dependency, { tags })
        return findNextVersions(depWithTags, options, logger)
      } catch (err) {
        logger.childError(err.message || err)
        return {
          name: dependency.name,
          type: dependency.type,
          error: `Error caught: ${err.message || '-unhandled-'}`,
        }
      }
    }),
  )
  return results
}

function getDependenciesChecker(rule) {
  const check = new RegExp(rule)
  return (dependency) => {
    return check.test(dependency.name)
  }
}

async function getListOfTags(dependency, logger) {
  if (dependency.version.includes('#semver:')) {
    return helpers.getGitTags(dependency, logger)
  } else {
    return helpers.getNpmTags(dependency, logger)
  }
}

function findNextVersions({ name, type, version, tags }, options, logger) {
  let currentVersion
  const safeTags = tags.map((tag) => {
    const safe = semver.parse(tag, semverOptions)

    if (!safe) {
      logger.debug(
        `Package ${name} has a strange tag (${tag}) - it couldn't be parsed by semver lib.`,
      )
    }

    return safe
  })

  if (version.includes('#semver:')) {
    //semver.coerce drops any loose or prerelease info, we do not want it - thus manual cleanup is required
    const regexped = /#semver:[~^]?(.+)/.exec(version)[1]
    currentVersion = semver.parse(regexped, semverOptions)
  } else {
    //semver.coerce drops any loose or prerelease info, we do not want it - thus manual cleanup is required
    const cleaned = version.replace(/[~^]/, '')
    currentVersion = semver.parse(cleaned, semverOptions)
  }

  logger.debug(
    `Current version for "${name}" is ${JSON.stringify(currentVersion)}`,
  )

  const latestMinor = semver.maxSatisfying(
    safeTags.filter((tag) => tag.major <= currentVersion.major), // to remove n+1.0.0-rc1 from >n.x.y searches when including prereleases
    `>${currentVersion.version} <${currentVersion.major + 1}`,
    {
      includePrerelease: options.includePrerelease,
    },
  )
  const latestMajor = semver.maxSatisfying(
    safeTags,
    `>${currentVersion.version}`,
    {
      includePrerelease: options.includePrerelease,
    },
  )

  return {
    name,
    type,
    currentVersion: currentVersion.version,
    latestMinor: latestMinor && latestMinor.raw,
    latestMajor:
      latestMajor !== latestMinor ? latestMajor && latestMajor.raw : null,
  }
}
