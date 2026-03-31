#!/usr/bin/env node

const checkCmd = require('./src/check.command')
const updateCmd = require('./src/update.command')
const { findClosestPackage } = require('./src/cliHelpers')
const path = require('node:path')

function printHelp() {
  console.log(`Usage: dep-versions <command> [options]\n`)
  console.log(`Commands:`)
  console.log(`  check [rule]         Check all dependencies for updates`)
  console.log(`  update [rule]        Update dependencies in package.json`)
  console.log(`\nOptions:`)
  console.log(
    `  --packagePath <path> Path to package.json (default: closest found)`,
  )
  console.log(
    `  --rule <regex>       Regex to match dependency names (default: .*)`,
  )
  console.log(`  --hide-empty         Hide entries that are up to date`)
  console.log(
    `  --ignore-minor       Do not update minor versions (update only major)`,
  )
  console.log(
    `  --ignore-major       Do not update major versions (update only minor)`,
  )
  console.log(`  --ignore-dev         Do not update devDependencies`)
  console.log(`  --ignore-prod        Do not update prod dependencies`)
  console.log(`  --hide-ignored       Hide ignored dependencies`)
  console.log(`  --hide-unchanged     Hide unchanged dependencies`)
  console.log(`  --help               Show this help message`)
}

function parseArgs(argv) {
  const args = argv.slice(2)
  const opts = {}
  let command = null
  let rule = undefined
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i]
    if (!command && (arg === 'check' || arg === 'update')) {
      command = arg
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        rule = args[i + 1]
        i++
      }
    } else if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '')
      let value = true
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        value = args[i + 1]
        i++
      }
      opts[key] = value
    }
  }
  if (rule !== undefined) opts.rule = rule
  return { command, opts }
}

function main() {
  const { command, opts } = parseArgs(process.argv)
  if (opts.help || !command) {
    printHelp()
    process.exit(command ? 0 : 1)
  }

  // Find package.json if not provided
  if (!opts.packagePath) {
    opts.packagePath = findClosestPackage()
    if (!opts.packagePath) {
      console.error('Could not find package.json')
      process.exit(1)
    }
  }

  // Set defaults
  if (!opts.rule) opts.rule = '.*'

  // Call the appropriate handler
  if (command === 'check') {
    checkCmd.handler(opts)
  } else if (command === 'update') {
    updateCmd.handler(opts)
  } else {
    console.error('No or invalid command specified.\n')
    printHelp()
    process.exit(1)
  }
}

main()
