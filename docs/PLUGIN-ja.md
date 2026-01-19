# Milkee プラグインの作成

[English](./PLUGIN.md) | **日本語**  

カスタムプラグインで Milkee の機能を拡張できます。  

## クイックスタート

`-p` (`--plugin`) コマンドでプラグインプロジェクトをセットアップ：  

```bash
# グローバル
milkee -p

# ローカル
npx milkee -p
```

以下が実行されます：
1. `package.json` の初期化（必要な場合）
2. 依存関係のインストール (`consola`, `coffeescript`, `milkee`)
3. テンプレートファイルの作成
4. `package.json` の更新 (`main`, `scripts`, `keywords`)

## プロジェクト構造

```
your-plugin/
  src/
    main.coffee    # プラグインのソース
  dist/
    main.js        # コンパイル後の出力
  .github/
    workflows/
      publish.yml  # npm公開ワークフロー
  coffee.config.cjs
  package.json
```

## プラグインの書き方

### 基本テンプレート

```coffee
fs = require 'fs'
path = require 'path'
consola = require 'consola'

pkg = require '../package.json'
PREFIX = "[#{pkg.name}]"

# プレフィックス付きカスタムロガー
c = {}
for method in ['log', 'info', 'success', 'warn', 'error', 'debug', 'start', 'box']
  do (method) ->
    c[method] = (args...) ->
      if typeof args[0] is 'string'
        args[0] = "#{PREFIX} #{args[0]}"
      consola[method] args...

# メインプラグイン関数
main = (compilationResult) ->
  { config, compiledFiles, stdout, stderr } = compilationResult

  c.info "#{compiledFiles.length} ファイルをコンパイルしました"
  for file in compiledFiles
    c.log "  - #{file}"

module.exports = main
```

### コンパイル結果

Milkee はコンパイル後にこのオブジェクトをプラグインに渡します：  

| プロパティ | 型 | 説明 |
| :--- | :--- | :--- |
| `config` | `object` | `coffee.config.cjs` の設定オブジェクト |
| `compiledFiles` | `string[]` | コンパイルされた `.js` と `.js.map` のパス |
| `stdout` | `string` | コンパイラの標準出力 |
| `stderr` | `string` | コンパイラの標準エラー |

### coffee.config.cjs での使用

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

## ビルド & テスト

```bash
# プラグインをビルド
npm run build

# ローカルテスト用にリンク
npm link

# 別のプロジェクトで
npm link your-plugin-name
```

## 公開

### GitHub Actions を使用

同梱のワークフローで npm に手動公開：  

1. リポジトリに `NPM_TOKEN` シークレットを追加
2. **Actions** → **Manual Publish to npm** に移動
3. **Run workflow** をクリック

### 手動

```bash
npm run build
npm publish --access public
```

## ベストプラクティス

### 命名規則 & キーワード

- 名前: `milkee-plugin-xxx` または `@yourname/milkee-plugin-xxx`
- キーワード（自動追加）: `milkee`, `coffeescript`, `coffee`, `plugin`, `milkee-plugin`

### エラーハンドリング

```coffee
main = (compilationResult) ->
  try
    # ロジック
  catch error
    c.error "失敗:", error.message
    throw error
```
