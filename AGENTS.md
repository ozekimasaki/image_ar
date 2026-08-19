# AGENTS.md

このリポジトリで作業するコーディングエージェント向けのガイドです。

## プロジェクト概要

Android Chrome の WebXR（Immersive AR + Hit Test）で平面を検出し、任意画像を配置する Web アプリです。Three.js で描画し、Vite でビルド、Cloudflare Workers へデプロイします。

## ディレクトリ構成とエントリポイント

- リポジトリ直下の `plan.md` は設計メモ。**アプリ本体はサブディレクトリ `webar-image-placer/` にあります。**すべてのコマンドは `webar-image-placer/` 内で実行してください。
- `webar-image-placer/src/main.ts` — アプリのエントリポイント（`index.html` の `<script type="module" src="/src/main.ts">` から読み込まれる）。WebXR 対応判定、スタート画面、画像テクスチャの読み込みを担当。
- `webar-image-placer/src/ar/webxr/session.ts` — `ARSession` クラス。XR セッション開始、ヒットテスト、画像設置、スクショガイド、セッション再起動を担う中心的なファイル。
- `webar-image-placer/src/ar/webxr/reticle.ts` — `Reticle` クラス。平面ヒット位置に表示するリング。
- `webar-image-placer/src/ui/overlay.ts` — `UIOverlay` クラス。コントロール表示・ステータス表示のヘルパ。
- `webar-image-placer/src/worker.ts` — Cloudflare Workers の `fetch` ハンドラ（`/api/*` は JSON、その他は `ASSETS` から静的配信）。
- `webar-image-placer/src/types/webxr.d.ts` — WebXR の型定義補完。
- `webar-image-placer/index.html` — UI/DOM Overlay の DOM とスタイル。`main.ts` / `session.ts` は `getElementById` で ID を参照するため、要素の ID を変更する場合は両 TS ファイルを合わせて更新すること。
- `src/counter.ts`, `src/typescript.svg`, `test.html` は Vite テンプレート由来で未使用。安易に機能追加の起点にしないこと。

## セットアップ

```bash
cd webar-image-placer
npm install
```

- Node.js は **20.19+ または 22.12+**（Vite 7 の要件）。未満の場合ビルドは通ることがあるが警告が出る。

## ビルド / テスト / lint / typecheck

`webar-image-placer/package.json` に定義された実在スクリプトのみ:

- ビルド: `npm run build`（`tsc && vite build`。`tsc` が型チェックを兼ねる）
- 開発サーバ: `npm run dev`（`vite dev`、`server.host: true` で LAN 公開）
- プレビュー: `npm run preview`（`npm run build && vite preview`）
- デプロイ: `npm run deploy`（`npm run build && wrangler deploy`。Cloudflare 認証が必要）
- 型チェックのみ: `tsc`（`tsconfig.json` は `noEmit: true`）

**lint / test スクリプトは存在しません。**テストフレームワークやリンタは未導入なので、変更後は最低限 `npm run build`（= 型チェック + ビルド）が通ることを確認してください。存在しないコマンドを追加・実行しないこと。

## コーディング規約

- 言語は **TypeScript**、モジュールは ESM（`package.json` の `"type": "module"`）。
- `tsconfig.json` は `strict: true`、`noUnusedLocals`、`noUnusedParameters`、`noFallthroughCasesInSwitch`、`verbatimModuleSyntax` が有効。未使用の変数・引数はビルドエラーになるため、使わない引数は `_` プレフィックス（例: `onRenderFrame(_timestamp, ...)`）にする。
- `allowImportingTsExtensions` が有効なため、ローカルインポートは拡張子 `.js` 付きで記述する慣習に従う（例: `import { ARSession } from './ar/webxr/session.js'`。実ファイルは `.ts`）。
- 描画・3D は `three`（`import * as THREE from 'three'`）を使用。新規ライブラリの追加は既存の依存を確認してから。
- UI 文言・コメント・ログは日本語で書かれている。既存のトーンに合わせること。
- 2 スペースインデント、セミコロンありの既存スタイルに合わせる。

## 注意点

- WebXR は HTTPS（安全なコンテキスト）と対応端末（Android Chrome）が必須。デスクトップの通常ブラウザでは `immersive-ar` 非対応のため、UI ロジックの確認はできても AR セッションの実挙動はエミュレータ/実機が必要。
- 画像の設置はタップではなく「画像を設置」ボタンで行う設計（`onTouchStart` / `onClick` は無効化済み）。挙動を変える際はこの意図を踏まえること。
- `ARSession` はセッション消失時に最大 3 回まで自動再起動する（`maxRestartAttempts`）。
- Cloudflare 関連の設定は `wrangler.jsonc` と `vite.config.ts`（`@cloudflare/vite-plugin`）。ビルド成果物は `dist/` に出力され、`.wrangler/` はローカル状態のため手動編集しない。
- 変更は必要なファイルに限定し、テンプレート由来の未使用ファイルや無関係なファイルには手を加えない。
