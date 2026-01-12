fs = require 'fs'
path = require 'path'
consola = require 'consola'

pkg = require '../package.json'
PREFIX = "[#{pkg.name}]"

# Create a custom logger with prefix
c = {}
for method in ['log', 'info', 'success', 'warn', 'error', 'debug', 'start', 'box']
  do (method) ->
    c[method] = (args...) ->
      if typeof args[0] is 'string'
        args[0] = "#{PREFIX} #{args[0]}"
      consola[method] args...

# Main plugin function
main = (compilationResult) ->
  { config, compiledFiles, stdout, stderr } = compilationResult
  
  c.info "Compiled #{compiledFiles.length} file(s)"
  for file in compiledFiles
    c.log "  - #{file}"

module.exports = main
