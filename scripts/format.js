#!/usr/bin/env node

const fmt = require('coffee-fmt')
const fs = require('fs')
const path = require('path')

const options = {
  tab: '  ',
  newLine: '\n'
}

function walkDir(dir, cb) {
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const p = path.join(dir, item)
    const stat = fs.statSync(p)
    if (stat.isDirectory()) {
      walkDir(p, cb)
    } else if (stat.isFile() && p.endsWith('.coffee')) {
      cb(p)
    }
  }
}

function formatFile(filePath, opts = options) {
  const src = fs.readFileSync(filePath, 'utf8')
  try {
    const formatted = fmt.format(src, opts)
    if (formatted != null && formatted !== src) {
      fs.writeFileSync(filePath, formatted, 'utf8')
      console.log(`Formatted: ${filePath}`)
      return true
    }
    return false
  } catch (err) {
    console.error(`Failed to format ${filePath}: ${err.message}`)
    return false
  }
}

function main() {
  const cwd = process.cwd()
  const target = path.join(cwd, 'src')
  if (!fs.existsSync(target)) {
    console.error('No src directory found.')
    process.exit(1)
  }

  let count = 0
  walkDir(target, (file) => {
    const ok = formatFile(file)
    if (ok) count++
  })

  console.log(`Completed. Files formatted: ${count}`)
}

if (require.main === module) main()

module.exports = { walkDir, formatFile }
