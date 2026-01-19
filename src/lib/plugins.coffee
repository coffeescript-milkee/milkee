path = require 'path'
fs = require 'fs'
consola = require 'consola'

{ CWD } = require './constants'
{ getCompiledFiles } = require './utils'

executePlugins = (config, compilationResult) ->
  plugins = config.milkee?.plugins or []

  unless plugins.length > 0
    return

  consola.start "Running #{plugins.length} plugin(s)..."

  # async
  (->
    try
      for pluginFn in plugins
        if typeof pluginFn is 'function'
          await Promise.resolve pluginFn compilationResult
        else
          consola.warn(
            "Invalid plugin definition skipped (expected a function, got #{typeof pluginFn})."
          )
      consola.success 'Plugins executed successfully.'
    catch error
      consola.error 'An error occurred during plugin execution:', error
  )()

runPlugins = (config, options, stdout = '', stderr = '') ->
  outputPath = path.join CWD, config.output
  compiledFiles = getCompiledFiles outputPath

  if options.join and options.map and not options.inlineMap
    mapPath = "#{outputPath}.map"

    if fs.existsSync mapPath and not compiledFiles.includes mapPath
      compiledFiles = compiledFiles.concat getCompiledFiles mapPath

  compilationResult =
    config: config
    compiledFiles: compiledFiles
    stdout: stdout
    stderr: stderr

  executePlugins config, compilationResult

module.exports = {
  runPlugins
}
