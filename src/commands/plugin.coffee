fs = require 'fs'
path = require 'path'
{ execSync } = require 'child_process'
consola = require 'consola'

{ CWD, CONFIG_FILE } = require '../constants'
confirmContinue = require '../options/confirm'

TEMPLATE_DIR = path.join __dirname, '..', '..', 'temp', 'plugin'

TEMPLATES = [
  { src: 'main.coffee', dest: 'src/main.coffee' }
  { src: 'coffee.config.cjs', dest: CONFIG_FILE }
  { src: 'publish.yml', dest: '.github/workflows/publish.yml' }
  { src: '.gitignore', dest: '.gitignore' }
  { src: '.gitattributes', dest: '.gitattributes' }
  { src: '.npmignore', dest: '.npmignore' }
]

# Create directory if not exists
ensureDir = (filePath) ->
  dir = path.dirname filePath
  unless fs.existsSync dir
    fs.mkdirSync dir, recursive: true

# Copy template file
copyTemplate = (src, dest) ->
  srcPath = path.join TEMPLATE_DIR, src
  destPath = path.join CWD, dest

  unless fs.existsSync srcPath
    consola.error "Template file not found: #{srcPath}"
    return false

  ensureDir destPath
  content = fs.readFileSync srcPath, 'utf-8'
  fs.writeFileSync destPath, content
  consola.success "Created `#{dest}`"
  return true

PLUGIN_KEYWORDS = [
  'milkee'
  'coffeescript'
  'coffee'
  'ext'
  'plugin'
  'milkee-plugin'
]

# Update package.json
updatePackageJson = () ->
  pkgPath = path.join CWD, 'package.json'

  try
    pkg = JSON.parse fs.readFileSync pkgPath, 'utf-8'

    # Update main
    pkg.main = 'dist/main.js'

    # Update scripts
    pkg.scripts ?= {}
    pkg.scripts.test ?= 'echo "Error: no test specified" && exit 0'
    pkg.scripts.build = 'milkee'

    # Update keywords
    pkg.keywords ?= []
    for keyword in PLUGIN_KEYWORDS
      unless keyword in pkg.keywords
        pkg.keywords.push keyword

    fs.writeFileSync pkgPath, JSON.stringify(pkg, null, 2) + '\n'
    consola.success "Updated `package.json`"
    return true
  catch error
    consola.error "Failed to update package.json:", error
    return false

# Initialize package.json if not exists
initPackageJson = () ->
  pkgPath = path.join CWD, 'package.json'

  unless fs.existsSync pkgPath
    consola.start "Initializing package.json..."
    try
      execSync 'npm init -y', cwd: CWD, stdio: 'inherit'
      consola.success "Created `package.json`"
    catch error
      consola.error "Failed to create package.json:", error
      return false
  return true

# Main plugin setup function
plugin = () ->
  consola.box "Milkee Plugin Setup"
  consola.info "This will set up your project as a Milkee plugin."
  consola.info ""
  consola.info "The following actions will be performed:"
  pkgPath = path.join CWD, 'package.json'
  unless fs.existsSync pkgPath
    consola.info "  0. Initialize package.json (npm init -y)"
  consola.info "  1. Install dependencies (consola, coffeescript, milkee)"
  consola.info "  2. Create template files:"
  for template in TEMPLATES
    consola.info "     - #{template.dest}"
  consola.info "  3. Update package.json (main, scripts, keywords)"
  consola.info ""

  # Confirm before proceeding
  confirmed = await confirmContinue()
  unless confirmed
    return

  consola.info ""

  # Initialize package.json if not exists
  unless initPackageJson()
    return

  # Install dependencies
  try
    consola.start "Installing dependencies..."
    execSync 'npm install consola', cwd: CWD, stdio: 'inherit'
    execSync 'npm install -D coffeescript milkee', cwd: CWD, stdio: 'inherit'
    consola.success "Dependencies installed!"
  catch error
    consola.error "Failed to install dependencies:", error
    return

  consola.info ""

  # Create template files
  consola.start "Creating template files..."
  for template in TEMPLATES
    destPath = path.join CWD, template.dest
    if fs.existsSync destPath
      overwrite = await consola.prompt "#{template.dest} already exists. Overwrite?", type: "confirm"
      unless overwrite
        consola.info "Skipped `#{template.dest}`"
        continue
    copyTemplate template.src, template.dest

  consola.info ""

  # Update package.json
  consola.start "Updating package.json..."
  updatePackageJson()

  consola.info ""
  consola.success "Milkee plugin setup complete!"
  consola.info ""
  consola.info "Next steps:"
  consola.info "  1. Edit `src/main.coffee` to implement your plugin"
  consola.info "  2. Run `npm run build` to compile"
  consola.info "  3. Test your plugin locally"

module.exports = plugin
