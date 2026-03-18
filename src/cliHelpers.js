const path = require('node:path')
const exists = require('node:fs').existsSync

const logic = require('./logic')

function drawTable({ headers, customEntry, data }) {
  const columns = Object.entries(getColumns(data.concat(headers))).reduce(
    (result, [columnName, columnWidth]) => {
      if (headers[columnName]) {
        result[columnName] = columnWidth
      }
      return result
    },
    {},
  )
  console.log(getLine({ columns, entry: headers }))
  console.log(getLine({ columns, entry: {}, padding: '=' }))
  data.forEach((entry) => console.log(getLine({ columns, entry, customEntry })))
}

function getLine({
  columns,
  entry,
  customEntry: {
    getter: customEntryGetter,
    fromColumn: rawCustomEntryFromColumn,
  } = {},
  padding = ' ',
  delimiter = '  ',
}) {
  const isCustomEntryApplicable = customEntryGetter && customEntryGetter(entry)
  const customEntryFromColumn =
    rawCustomEntryFromColumn && rawCustomEntryFromColumn.call
      ? rawCustomEntryFromColumn(entry)
      : rawCustomEntryFromColumn
  return Object.entries(columns).reduce((result, [propName, length], idx) => {
    if (isCustomEntryApplicable) {
      if (idx > customEntryFromColumn) {
        return result
      }
      if (idx === customEntryFromColumn) {
        const propValue = getSafePropVal(customEntryGetter(entry))
        return `${result}${propValue.padEnd(length, padding)}${delimiter}`
      }
    }
    const propValue = getSafePropVal(entry[propName])
    return `${result}${propValue.padEnd(length, padding)}${delimiter}`
  }, '')
}

function getColumns(array) {
  return array.reduce((columns, nextEntry) => {
    Object.keys(nextEntry).forEach((propName) => {
      const propVal = getSafePropVal(nextEntry[propName])
      columns[propName] = Math.max(propVal.length, columns[propName] || 0)
    })
    return columns
  }, {})
}

function getSafePropVal(propVal) {
  if (propVal === undefined) {
    return ''
  }
  if (propVal === null) {
    return '-'
  }
  return propVal.toString()
}

function findClosestPackage() {
  let current = process.cwd()
  do {
    const potentialPackage = path.join(current, 'package.json')
    if (exists(potentialPackage)) {
      return potentialPackage
    }
  } while (current !== (current = path.join(current, '..')))
  return null
}

function loggerInit(options) {
  return {
    debug: (...args) =>
      !options.silent && options.verbose && console.debug(...args),
    log: (...args) => !options.silent && console.log(...args),
    error: (...args) => !options.silent && console.error(...args),
    childError: (...args) =>
      !options.silent && options.verbose && console.error(...args),
  }
}

function selfCheck(options) {
  if (options.selfCheck === false || options.silent) {
    return
  }
  const dvcPackageInfo = require('../package.json')
  const logger = loggerInit(options)
  return logic
    .getListOfTags(dvcPackageInfo, logger)
    .then((tags) =>
      logic.findNextVersions(
        Object.assign({ tags }, dvcPackageInfo),
        {},
        logger,
      ),
    )
    .then(({ latestMinor, latestMajor }) => {
      if (latestMinor || latestMajor) {
        const whatVersion = latestMajor ? 'major' : 'minor'
        console.warn(
          `There is new ${whatVersion} version (${latestMajor || latestMinor}) for ${
            dvcPackageInfo.name
          }. Run "npm i -g ${dvcPackageInfo.name}" to upgrade from v${
            dvcPackageInfo.version
          }.\n`,
        )
      }
    })
}

module.exports = {
  drawTable,
  findClosestPackage,
  loggerInit,
  selfCheck,
}
