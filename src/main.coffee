yargs = require 'yargs'
{ hideBin } = require 'yargs/helpers'
consola = require 'consola'
fs = require 'fs'
path = require 'path'
{ exec, spawn } = require 'child_process'

pkg = require '../package.json'
CWD = process.cwd()
CONFIG_FILE = 'coffee.config.cjs'
CONFIG_PATH = path.join CWD, CONFIG_FILE

checkCoffee = () ->
  PKG_PATH = path.join CWD, 'package.json'
  if fs.existsSync PKG_PATH
    try
      pkgFile = fs.readFileSync PKG_PATH, 'utf-8'
      pkgData = JSON.parse pkgFile
      if pkgData.dependencies?.coffeescript or pkgData.devDependencies?.coffeescript
        return
    catch error
      consola.warn "Could not parse `package.json`: #{error.message}"

  exec 'coffee --version', (error) ->
    if error
      consola.warn 'CoffeeScript is not found in local dependencies (`dependencies`, `devDependencies`) or globally.'
      consola.info 'Please install it via `npm install --save-dev coffeescript` to continue.'

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
    TEMPLATE_PATH = path.join __dirname, '..', 'temp', CONFIG_FILE
    CONFIG_TEMPLATE = fs.readFileSync TEMPLATE_PATH, 'utf-8'
    fs.writeFileSync CONFIG_PATH, CONFIG_TEMPLATE
    consola.success "Successfully #{pstat} `#{CONFIG_FILE}`!"
  catch error
    consola.error "Failed to #{stat} `#{CONFIG_FILE}`:", error
    consola.info "Template file may be missing from the package installation at `#{TEMPLATE_PATH}`"

getCompiledFiles = (targetPath) ->
  filesList = []

  unless fs.existsSync targetPath
    consola.trace "Path does not exist, skipping scan #{targetPath}"
    return []

  try
    stat = fs.statSync targetPath

    if stat.isDirectory()
      consola.trace "Scanning directory: #{targetPath}"
      items = fs.readdirSync targetPath

      for item in items
        itemPath = path.join targetPath, item
        filesList = filesList.concat getCompiledFiles itemPath

    else if stat.isFile()
      if targetPath.endsWith '.js' or targetPath.endsWith '.js.map'
        consola.trace "Found file: #{targetPath}"
        filesList.push targetPath
  catch error
    consola.warn "Could not scan output path #{targetPath}: #{error.message}"

  return filesList

executePlugins = (config, compilationResult) ->
  plugins = config.milkee?.plugins or []

  unless plugins.length > 0
    return

  consola.start "Running #{plugins.length} plugin(s)..."

  (->
    try
      for pluginFn in plugins
        if typeof pluginFn is 'function'
          await Promise.resolve pluginFn(compilationResult)
        else
          consola.warn "Invalid plugin definition skipped (expected a function, got #{typeof pluginFn})."
      consola.success "Plugins executed successfully."
    catch error
      consola.error "An error occurred during plugin execution:", error
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

compile = () ->
  checkCoffee()
  unless fs.existsSync CONFIG_PATH
    consola.error "`#{CONFIG_FILE}` not found in this directory: #{CWD}"
    consola.info 'Please run `milkee --setup` to create a configuration file.'
    process.exit 1

  try
    config = require CONFIG_PATH

    unless config.entry and config.output
      consola.error '`entry` and `output` properties are required in your configuration.'
      process.exit 1

    options = config.options or {}
    milkee = config.milkee or {}
    milkeeOptions = config.milkee.options or {}

    execCommandParts = ['coffee']
    if options.join
      execCommandParts.push '--join'
      execCommandParts.push "\"#{config.output}\""
    else
      execCommandParts.push '--output'
      execCommandParts.push "\"#{config.output}\""

    execOtherOptionStrings = []
    if options.bare
      execOtherOptionStrings.push '--bare'
    if options.map
      execOtherOptionStrings.push '--map'
    if options.inlineMap
      execOtherOptionStrings.push '--inline-map'
    if options.noHeader
      execOtherOptionStrings.push '--no-header'
    if options.transpile
      execOtherOptionStrings.push '--transpile'
    if options.literate
      execOtherOptionStrings.push '--literate'

    if execOtherOptionStrings.length > 0
        execCommandParts.push execOtherOptionStrings.join ' '

    execCommandParts.push '--compile'
    execCommandParts.push "\"#{config.entry}\""

    execCommand = execCommandParts
      .filter Boolean
      .join ' '

    spawnArgs = []
    if options.join
      spawnArgs.push '--join'
      spawnArgs.push config.output
    else
      spawnArgs.push '--output'
      spawnArgs.push config.output

    if options.bare
      spawnArgs.push '--bare'
    if options.map
      spawnArgs.push '--map'
    if options.inlineMap
      spawnArgs.push '--inline-map'
    if options.noHeader
      spawnArgs.push '--no-header'
    if options.transpile
      spawnArgs.push '--transpile'
    if options.literate
      spawnArgs.push '--literate'
    if options.watch
      spawnArgs.push '--watch'

    spawnArgs.push '--compile'
    spawnArgs.push config.entry

    summary = []
    summary.push "Entry: `#{config.entry}`"
    summary.push "Output: `#{config.output}`"
    enabledOptions = Object
      .keys options
      .filter (key) -> options[key]
    if enabledOptions.length > 0
      enabledOptionsList = enabledOptions.join ','
      summary.push "Options: #{enabledOptionsList}"

    consola.box title: "Milkee Compilation Summary", message: summary.join '\n'

    if milkeeOptions.confirm
      toContinue = await consola.prompt "Do you want to continue?", type: "confirm"
      unless toContinue
        consola.info "Canceled."
        return

    optionsForPlugins = { ...options }
    delete options.join

    if milkeeOptions.refresh
      targetDir = path.join CWD, config.output
      unless fs.existsSync targetDir
        consola.info "Refresh skipped."
      else
        consola.info "Executing: Refresh"
        items = fs.readdirSync targetDir
        for item in items
          itemPath = path.join targetDir, item
          fs.rmSync itemPath, recursive: true, force: true
        consola.success "Refreshed!"

    if options.watch
      consola.start "Watching for changes in `#{config.entry}`..."
      consola.info "Executing: coffee #{spawnArgs.join ' '}"

      compilerProcess = spawn 'coffee', spawnArgs, { shell: true }

      debounceTimeout = null
      lastError = null

      compilerProcess.stderr.on 'data', (data) ->
        errorMsg = data.toString().trim()
        if errorMsg
          consola.error errorMsg
          lastError = errorMsg

      compilerProcess.stdout.on 'data', (data) ->
        stdoutMsg = data.toString().trim()
        if stdoutMsg
          consola.log stdoutMsg

        lastError = null

        if debounceTimeout
          clearTimeout debounceTimeout

        debounceTimeout = setTimeout ->
          if lastError
            consola.warn "Compilation failed, plugins skipped."
          else
            consola.success 'Compilation successful (watch mode).'
            runPlugins config, optionsForPlugins, '(watch mode)', ''

          lastError = null
        , 100

      compilerProcess.on 'close', (code) ->
        consola.info "Watch process exited with code #{code}."

      compilerProcess.on 'error', (err) ->
        consola.error 'Failed to start watch process:', err
        process.exit 1

    else
      consola.start "Compiling from `#{config.entry}` to `#{config.output}`..."
      consola.info "Executing: #{execCommand}"

      compilerProcess = exec execCommand, (error, stdout, stderr) ->
        if error
          consola.error 'Compilation failed:', error
          if stderr then consola.error stderr.toString().trim()
          process.exit 1
          return

        consola.success 'Compilation completed successfully!'
        if stdout then process.stdout.write stdout
        if stderr and not error then process.stderr.write stderr

        runPlugins config, optionsForPlugins, stdout, stderr

  catch error
    consola.error 'Failed to load or execute configuration:', error
    process.exit 1

argv = yargs hideBin process.argv
  .scriptName 'milkee'
  .usage '$0 [command]'
  .option 'setup', alias: 's', describe: "Generate a default #{CONFIG_FILE}", type: 'boolean'
  .option 'compile', alias: 'c', describe: "Compile CoffeeScript based on #{CONFIG_FILE} (default)", type: 'boolean'
  .version 'version', pkg.version
  .alias 'v', 'version'
  .help 'help'
  .alias 'h', 'help'
  .argv

if argv.setup
  setup()
else
  compile()
