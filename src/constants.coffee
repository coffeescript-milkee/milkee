path = require 'path'
pkg = require '../package.json'

CWD = process.cwd()
CONFIG_FILE = 'coffee.config.cjs'
CONFIG_PATH = path.join CWD, CONFIG_FILE

module.exports = {
  pkg
  CWD
  CONFIG_FILE
  CONFIG_PATH
}
