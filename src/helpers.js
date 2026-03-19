const { spawn } = require('node:child_process')

function spawnMinions(command, logger) {
  logger.debug(`Running '${command}'.`)
  const childProcess = spawn(command, {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  })
  const stdoutPromise = new Promise((resolve, reject) => {
    let stdout = ''
    childProcess.stdout.setEncoding('utf8')
    childProcess.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    childProcess.stdout.on('end', () => {
      if (stdout) {
        logger.debug(`Standard output for ${command} is:\n ${stdout}`)
      }
      resolve(stdout)
    })
    childProcess.stdout.on('error', (err) => reject(err))
  })
  const stderrPromise = new Promise((resolve, reject) => {
    let stderr = ''
    childProcess.stderr.setEncoding('utf8')
    childProcess.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    childProcess.stderr.on('end', () => {
      if (stderr) {
        logger.debug(`Error output for ${command} is:\n ${stderr}`)
      }
      resolve(stderr)
    })
    childProcess.stderr.on('error', (err) => reject(err))
  })
  const exitPromise = new Promise((resolve, reject) => {
    childProcess.on('close', (exitCode) => {
      exitCode === 0 ? resolve() : reject(exitCode)
    })
    childProcess.on('error', (err) => reject(err))
  })
  return exitPromise.then(
    () => stdoutPromise,
    (exitCode) =>
      stderrPromise.then(
        (errorMessage) =>
          Promise.reject(
            `Child process failed with exit code ${exitCode}.\n${errorMessage}`,
          ),
        (errorMessage) =>
          Promise.reject(
            `Child process failed with exit code ${exitCode}.\n${errorMessage}`,
          ),
      ),
  )
}

// --- gitTags.js ---
function getGitUrl(dependency) {
  return dependency.version.replace(/#semver:[^\s]+$/, '')
}

function parseLsRemoteResponse(response) {
  return response
    .split('\n')
    .map(
      (line) =>
        line.includes('refs/tags/') && /refs\/tags\/v?(.+)/.exec(line)[1],
    )
    .filter((ver) => ver)
}

async function getGitTags(dependency, logger) {
  const gitUrl = getGitUrl(dependency)
  logger.debug(`"${dependency.name}" is on ${gitUrl}.`)
  const response = await spawnMinions(
    `git ls-remote --tags --refs --sort="-v:refname" ${gitUrl}`,
    logger,
  )
  return parseLsRemoteResponse(response)
}

// --- npmTags.js ---
async function getNpmTags(dependency, logger) {
  const command = `npm view ${dependency.name} versions --json`
  const result = await spawnMinions(command, logger)
  let strippedColors = result.replace(/\x1B\[[0-9;]*m/g, '').replace(/'/g, '"')
  if (!/\[/.test(strippedColors))
    strippedColors = `[ ${strippedColors.trim()} ]`
  try {
    return JSON.parse(strippedColors)
  } catch (e) {
    throw new Error(`Could not parse as JSON: ${strippedColors}`)
  }
}

const DEP_TYPE = {
  PROD: 'Prod',
  DEV: 'Dev',
  OPT: 'Opt',
}

module.exports = {
  spawn: spawnMinions,
  getGitTags,
  getNpmTags,
  DEP_TYPE,
}
