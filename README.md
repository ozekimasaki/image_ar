# image_ar — WebAR 画像配置カメラ

Android Chrome の WebXR（Immersive AR + Hit Test）を使って、カメラ越しに検出した平面へ任意の画像を配置できる Web アプリです。画像を選択し、平面検出で表示されるレティクル位置にボタン操作で画像プレーンを設置、サイズ・回転を調整して OS のスクリーンショットで撮影できます。

アプリ本体は [`webar-image-placer/`](webar-image-placer/) にあります。設計時の検討メモは [`plan.md`](plan.md) を参照してください。

## 主な機能

- WebXR 対応判定（`navigator.xr` と `immersive-ar` セッションの可否をチェック）
- スタート画面での画像選択・プレビュー・サイズ/回転の事前調整
- WebXR Hit Test による平面検出とレティクル表示（`Reticle`, `RingGeometry`）
- 「画像を設置」ボタンでレティクル位置に画像プレーンを配置（Three.js の `PlaneGeometry` + `TextureLoader`）
- 設置後のサイズスライダー（0.1〜2.0）と回転スライダー（0〜360°）
- 全画像削除（`clear-button`）
- スクショガイド：カウントダウン後に UI を一時非表示にして OS スクリーンショット撮影を補助
- カメラ（AR セッション）再起動ボタン、およびセッション消失時の自動再起動（最大 3 回）
- Cloudflare Workers 用の簡易 fetch ハンドラ（`/api/*` で JSON を返し、それ以外は静的アセットを配信）

## 要件

- WebXR AR（Hit Test）に対応した端末・ブラウザ（Android Chrome を想定）
- Node.js 20.19+ もしくは 22.12+（Vite 7 の要件。それ未満だと `vite` が警告を出します）
- 実機確認には HTTPS が必要です（WebXR は安全なコンテキストでのみ動作。`mkcert` が devDependencies に含まれます）
- デプロイには Cloudflare アカウントと `wrangler` の認証

## セットアップ

```bash
cd webar-image-placer
npm install
```

## 使い方（開発）

```bash
cd webar-image-placer
npm run dev
```

Vite 開発サーバは `server.host: true`（`vite.config.ts`）で LAN に公開されるため、同一ネットワークの Android 端末から `https://<PCのLAN_IP>:<port>/` にアクセスできます。WebXR には HTTPS が必要な点に注意してください。端末で「画像を選択 → AR を開始 → 平面を検出してレティクル表示 → 画像を設置」の順に操作します。

## 開発コマンド

`webar-image-placer/package.json` の `scripts`（実行はすべて `webar-image-placer/` ディレクトリ内）:

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | Vite 開発サーバを起動（`vite dev`、LAN 公開） |
| `npm run build` | 型チェック後に本番ビルド（`tsc && vite build`） |
| `npm run preview` | ビルドしてからプレビュー（`npm run build && vite preview`） |
| `npm run deploy` | ビルドして Cloudflare Workers へデプロイ（`npm run build && wrangler deploy`） |

型チェックのみを行いたい場合は `tsc`（`tsconfig.json` は `noEmit: true`）を利用できます。専用の lint・test スクリプトは定義されていません。

## 構成

```
image_ar/
├── plan.md                     # 実装プラン（設計メモ）
└── webar-image-placer/
    ├── index.html              # UI/DOM Overlay とスタイル（DOM Overlay 用の要素定義）
    ├── vite.config.ts          # Vite 設定（@cloudflare/vite-plugin, host: true）
    ├── wrangler.jsonc          # Cloudflare Workers 設定（worker + SPA アセット配信）
    ├── tsconfig.json           # TypeScript 設定（strict, bundler resolution, noEmit）
    ├── package.json
    ├── public/                 # 静的アセット
    └── src/
        ├── main.ts             # エントリポイント。対応判定・スタート画面・画像読み込み
        ├── worker.ts           # Cloudflare Workers の fetch ハンドラ
        ├── ar/webxr/session.ts # ARSession：XR セッション/ヒットテスト/設置/スクショ/再起動
        ├── ar/webxr/reticle.ts # Reticle：平面ヒット位置に表示するリング
        ├── ui/overlay.ts       # UIOverlay：コントロール表示やステータス表示のヘルパ
        ├── types/webxr.d.ts    # WebXR 型定義の補完
        └── style.css
```

`src/counter.ts` と `src/typescript.svg`、`test.html` は Vite テンプレート由来のファイルで、アプリ本体からは使用されていません。

## ライセンス

このリポジトリにはライセンスファイルが含まれていません（未指定）。
