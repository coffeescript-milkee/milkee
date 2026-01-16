fs = require 'fs'
path = require 'path'
consola = require 'consola'

sleep = (time) ->
  new Promise (resolve) ->
    setTimeout resolve, time

getCompiledFiles = (targetPath) ->
  filesList = []

  unless fs.existsSync targetPath
    consola.warn "Path does not exist, skipping scan #{targetPath}"
    return []

  try
    stat = fs.statSync targetPath

    if stat.isDirectory()
      consola.start "Scanning directory: #{targetPath}"
      items = fs.readdirSync targetPath

      for item in items
        itemPath = path.join targetPath, item
        filesList = filesList.concat getCompiledFiles itemPath

    else if stat.isFile()
      if targetPath.endsWith '.js' or targetPath.endsWith '.js.map'
        if fs.existsSync targetPath then consola.info "Found file: `#{targetPath}`"
        filesList.push targetPath
  catch error
    consola.warn "Could not scan output path #{targetPath}: #{error.message}"

  return filesList

module.exports = {
  sleep
  getCompiledFiles
}
