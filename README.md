# MD3 Tonal Palette Generator

Material Design 3 のトーナルパレットをインタラクティブに生成するツールです。

## ディレクトリ構造

```
tonal_palette_generator/
├── index.html                    # メイン HTML
├── app.js                        # アプリケーションロジック
├── style.css                     # スタイル
├── lib/
│   └── material-color-utilities.js   # Material Color Utilities (ESM バンドル)
├── package.json
└── package-lock.json
```

## 機能

- **カラー入力**: RGB / HSV / HSL / HCT の 4 つのタブでスライダー操作
- **HEX 入力**: 直接 16 進カラーコードを入力可能
- **トーナルパレット**: 13 段階のトーン (0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100) を自動生成
- **エクスポート**: CSS Variables または JSON 形式でクリップボードにコピー

## 実行方法

`file://` プロトコルでは ES モジュールの読み込みが制限されるため、ローカルサーバーが必要です。

```bash
npx serve .
```

ブラウザで `http://localhost:3000` を開いてください（ポート番号は `serve` の出力を確認）。
