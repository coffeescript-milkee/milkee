fs = require 'fs'
path = require 'path'
consola = require 'consola'

{ CONFIG_FILE, CONFIG_PATH } = require '../lib/constants'
{ checkCoffee } = require '../lib/checks'

# async
setup = () ->
  checkCoffee()
  pstat = "created"
  stat = "create"
  if fs.existsSync CONFIG_PATH
    consola.warn "`#{CONFIG_FILE}` already exists in this directory."
    check = await consola.prompt "Do you want to reset `#{CONFIG_FILE}`?", type: "confirm"
    unless check
      consola.info "Cancelled."
      return
    else
      fs.rmSync CONFIG_PATH, recursive: true, force: true
      pstat = "reset"
      stat = "reset"

  try
    TEMPLATE_PATH = path.join __dirname, '..', '..', 'temp', CONFIG_FILE
    CONFIG_TEMPLATE = fs.readFileSync TEMPLATE_PATH, 'utf-8'
    fs.writeFileSync CONFIG_PATH, CONFIG_TEMPLATE
    consola.success "Successfully #{pstat} `#{CONFIG_FILE}`!"
  catch error
    consola.error "Failed to #{stat} `#{CONFIG_FILE}`:", error
    consola.info "Template file may be missing from the package installation at `#{TEMPLATE_PATH}`"

module.exports = setup
