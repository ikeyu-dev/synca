# Synca Forms登録 Chrome拡張機能

Microsoft FormsのリンクをSyncaに登録するためのChrome拡張機能です。

## 機能

- Formsリンクを右クリックして「Syncaに登録」
- Formsページで右クリックして「このFormsをSyncaに登録」
- 登録結果をトースト通知で表示

## インストール方法

1. Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をONにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このディレクトリ（`chrome-extension`）を選択

## アイコンの作成

拡張機能を読み込む前に、アイコンファイルを作成してください。

### 方法1: 画像編集ソフトで作成

`icons` ディレクトリに以下のPNGファイルを作成:
- icon16.png (16x16)
- icon48.png (48x48)
- icon128.png (128x128)

### 方法2: オンラインツールを使用

1. https://favicon.io/ などでアイコンを生成
2. 各サイズにリサイズして保存

### 方法3: シンプルな単色アイコン（推奨）

Node.jsが使える場合:
```bash
npm install -g sharp-cli
# SVGをPNGに変換
sharp -i icons/icon16.svg -o icons/icon16.png resize 16 16
sharp -i icons/icon48.svg -o icons/icon48.png resize 48 48
sharp -i icons/icon128.svg -o icons/icon128.png resize 128 128
```

または、アイコンなしで読み込む場合は `manifest.json` から `icons` セクションを削除してください。

## 使い方

1. Syncaを `localhost:3001` で起動
2. Teams等でFormsリンクを見つける
3. リンクを右クリック → 「Syncaに登録」を選択
4. 登録が完了すると緑のトースト通知が表示される
5. SyncaのMicrosoftページで登録したFormsを確認

## 注意事項

- Syncaが `http://localhost:3001` で起動している必要があります
- 同じURLのFormsは重複登録されません
