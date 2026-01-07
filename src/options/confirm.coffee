consola = require 'consola'

# Confirm processing
confirmContinue = () ->
  toContinue = await consola.prompt "Do you want to continue?", type: "confirm"
  unless toContinue
    consola.info "Canceled."
    return false
  return true

module.exports = confirmContinue
