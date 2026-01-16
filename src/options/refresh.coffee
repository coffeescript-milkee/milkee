fs = require 'fs'
path = require 'path'
crypto = require 'crypto'
consola = require 'consola'

{ CWD } = require '../lib/constants'

# Execute refresh processing
executeRefresh = (config, backupFiles) ->
  targetDir = if path.isAbsolute(config.output) then config.output else path.join CWD, config.output
  if fs.existsSync targetDir
    stat = fs.statSync targetDir
    hash = crypto
      .randomBytes 4
      .toString 'hex'

    try
      if stat.isDirectory()
        consola.info "Executing: Refresh"
        items = fs.readdirSync targetDir
        consola.start "Backing up files..."
        for item in items
          originalPath = path.join targetDir, item
          backupName = "#{hash}.#{item}.bak"
          backupPath = path.join targetDir, backupName
          fs.renameSync originalPath, backupPath
          backupFiles.push original: originalPath, backup: backupPath
        consola.success "Files backed up with hash `#{hash}`"
      else
        consola.info "Executing: Refresh (Single File)"

        originalPath = targetDir
        fileName = path.basename originalPath
        dirName = path.dirname originalPath
        backupName = "#{hash}.#{fileName}.bak"
        backupPath = path.join dirName, backupName
        fs.renameSync originalPath, backupPath
        backupFiles.push original: originalPath, backup: backupPath
        consola.success "Existing file backed up as `#{backupName}`"
    catch error
      consola.error "Failed to create backups during refresh:", error
      throw error
  else
    consola.info "Refresh skipped."

# Restore backup files
restoreBackups = (backupFiles) ->
  consola.info "Restoring previous files..."
  if backupFiles.length > 0
    for backup in backupFiles
      try
        if fs.existsSync backup.original
          fs.rmSync backup.original, force: true

        if fs.existsSync backup.backup
          fs.renameSync backup.backup, backup.original
      catch e
        consola.warn "Failed to restore #{backup.original}"
    consola.success "Restored!"
  else
    consola.info "No files found to restore."

# Clear backup files
clearBackups = (backupFiles) ->
  if backupFiles.length > 0
    consola.start "Cleaning up backups..."
    for backup in backupFiles
      try
        if fs.existsSync backup.backup
          fs.rmSync backup.backup, force: true
      catch e
        null

module.exports = {
  executeRefresh
  restoreBackups
  clearBackups
}
