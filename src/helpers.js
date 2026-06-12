const { spawn } = require('node:child_process')

function spawnMinions(command, args, logger) {
  logger.debug(`Running '${command} ${args.join(' ')}'.`)
  const childProcess = spawn(command, args, {
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
  return dependency.version.split('#semver:')[0]
}

function parseLsRemoteResponse(response) {
  return response
    .split('\n')
    .map((line) => {
      const match = /refs\/tags\/v?(.+)/.exec(line)
      return match && match[1]
    })
    .filter(Boolean)
}

async function getGitTags(dependency, logger) {
  const gitUrl = getGitUrl(dependency)
  logger.debug(`"${dependency.name}" is on ${gitUrl}.`)
  const response = await spawnMinions(
    'git',
    ['ls-remote', '--tags', '--refs', '--sort=-v:refname', '--', gitUrl],
    logger,
  )
  return parseLsRemoteResponse(response)
}

// --- npmTags.js ---
function npmExecutable() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function parseNpmResponse(result) {
  let stripped = result.replace(/\x1B\[[0-9;]*m/g, '').replace(/'/g, '"')
  if (!/\[/.test(stripped)) stripped = `[ ${stripped.trim()} ]`
  try {
    return JSON.parse(stripped)
  } catch (e) {
    throw new Error(`Could not parse as JSON: ${stripped}`)
  }
}

async function getNpmTags(dependency, logger) {
  const result = await spawnMinions(
    npmExecutable(),
    ['view', '--json', '--', dependency.name, 'versions'],
    logger,
  )
  return parseNpmResponse(result)
}

const DEP_TYPE = {
  PROD: 'Prod',
  DEV: 'Dev',
  OPT: 'Opt',
}

module.exports = {
  spawn: spawnMinions,
  getGitUrl,
  parseLsRemoteResponse,
  parseNpmResponse,
  getGitTags,
  getNpmTags,
  DEP_TYPE,
}
