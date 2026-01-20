fs = require 'fs'
path = require 'path'
consola = require 'consola'

{ CWD } = require '../lib/constants'

executeCopy = (config) ->
  entryPath = if path.isAbsolute config.entry
    config.entry
  else
    path.join CWD, config.entry
  outputPath = if path.isAbsolute config.output
    config.output
  else
    path.join CWD, config.output

  unless fs.existsSync entryPath
    consola.warn "Entry path does not exist: #{config.entry}"
    return

  if config.options?.join
    consola.info 'Copy skipped (join option is enabled)'
    return

  unless fs.existsSync outputPath
    consola.warn "Output path does not exist: #{config.output}"
    return

  stat = fs.statSync entryPath
  unless stat.isDirectory()
    consola.info 'Copy skipped (entry is not a directory)'
    return

  consola.start 'Copying non-coffee files...'

  try
    copyNonCoffeeFiles = (srcDir, destDir) ->
      items = fs.readdirSync srcDir

      for item in items
        srcItemPath = path.join srcDir, item
        destItemPath = path.join destDir, item
        stat = fs.statSync srcItemPath

        if stat.isDirectory()
          unless fs.existsSync destItemPath
            fs.mkdirSync destItemPath, recursive: true
          copyNonCoffeeFiles srcItemPath, destItemPath
        else
          # Skip .coffee and .litcoffee files
          if /\.coffee$|\.litcoffee$/i.test item
            # Skip
            null
          else
            # Create parent directory if needed
            parentDir = path.dirname destItemPath
            unless fs.existsSync parentDir
              fs.mkdirSync parentDir, recursive: true
            # Copy file
            fs.copyFileSync srcItemPath, destItemPath

    copyNonCoffeeFiles entryPath, outputPath
    consola.success 'Non-coffee files copied successfully!'
  catch error
    consola.error 'Failed to copy non-coffee files:', error
    throw error

module.exports = executeCopy
