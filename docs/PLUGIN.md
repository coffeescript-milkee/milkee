# Creating a Milkee Plugin

Extend Milkee's functionality with custom plugins.  

## Quick Start

Run `-p` (`--plugin`) command to set up your plugin project:  

```bash
# global
milkee -p

# or local
npx milkee -p
```

This will:
1. Initialize `package.json` (if needed)
2. Install dependencies (`consola`, `coffeescript`, `milkee`)
3. Create template files
4. Update `package.json` (`main`, `scripts`, `keywords`)

## Project Structure

```
your-plugin/
  src/
    main.coffee    # Your plugin source
  dist/
    main.js        # Compiled output
  .github/
    workflows/
      publish.yml  # npm publish workflow
  coffee.config.cjs
  package.json
```

## Writing Your Plugin

### Basic Template

```coffee
fs = require 'fs'
path = require 'path'
consola = require 'consola'

pkg = require '../package.json'
PREFIX = "[#{pkg.name}]"

# Custom logger with prefix
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
```

### Compilation Result

Milkee passes this object to your plugin after compilation:  

| Property | Type | Description |
| :--- | :--- | :--- |
| `config` | `object` | Full config from `coffee.config.cjs` |
| `compiledFiles` | `string[]` | Paths to compiled `.js` and `.js.map` files |
| `stdout` | `string` | Compiler standard output |
| `stderr` | `string` | Compiler standard error |

### Using in coffee.config.cjs

```js
const myPlugin = require('your-plugin-name');

module.exports = {
  entry: 'src',
  output: 'dist',
  milkee: {
    plugins: [
      myPlugin({ customOption: 'value' }),
    ]
  }
};
```

## Build & Test

```bash
# Build your plugin
npm run build

# Link for local testing
npm link

# In another project
npm link your-plugin-name
```

## Publishing

### Using GitHub Actions

The included workflow publishes to npm manually:  

1. Add `NPM_TOKEN` secret to your repository
2. Go to **Actions** → **Manual Publish to npm**
3. Click **Run workflow**

### Manual

```bash
npm run build
npm publish --access public
```

## Best Practices

### Naming & Keywords

- Name: `milkee-plugin-xxx` or `@yourname/milkee-plugin-xxx`
- Keywords (auto-added): `milkee`, `coffeescript`, `coffee`, `ext`, `plugin`, `milkee-plugin`

### Error Handling

```coffee
main = (compilationResult) ->
  try
    # Your logic
  catch error
    c.error "Failed:", error.message
    throw error
```
