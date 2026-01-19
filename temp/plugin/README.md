# {{name}}

This is a plugin for [milkee](https://www.npmjs.com/package/milkee) .

{{description}}

## Usage

### setup

#### coffee.config.cjs

```js
const plugin = require('{{name}}');

module.exports = {
  // ...
  milkee: {
    plugins: [
      plugin(),
      // ...
    ]
  }
}
```

### Run

```sh
milkee
# or
npx milkee
```
