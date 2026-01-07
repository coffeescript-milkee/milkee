yargs = require 'yargs'
{ hideBin } = require 'yargs/helpers'

{ pkg } = require './constants'
setup = require './commands/setup'
compile = require './commands/compile'

argv = yargs hideBin process.argv
  .scriptName 'milkee'
  .usage '$0 [command]'
  .option 'setup', alias: 's', describe: "Generate a default config file", type: 'boolean'
  .option 'compile', alias: 'c', describe: "Compile CoffeeScript (default)", type: 'boolean'
  .version 'version', pkg.version
  .alias 'v', 'version'
  .help 'help'
  .alias 'h', 'help'
  .argv

if argv.setup
  setup()
else
  compile()
