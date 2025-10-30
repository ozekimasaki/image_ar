# WebAR平面検出＋画像配置カメラ（Android専用）実装プラン

## 目的

- Android Chrome: WebXR Hit Testで平面検出し、タップ位置に任意画像を貼り付け
- 「画像選択」「配置」「サイズ/回転」操作を提供（Windows手順で実行 [[memory:7860251]]）

## 技術選定

- Three.js（描画）
- WebXR Hit Test Module
- Vite7 + TypeScript（開発）

## MVP機能

- 画像ファイル選択（ローカル）
- レティクル表示→タップで画像プレーン生成・設置
- ピンチ/回転/削除の簡易操作

## 主な構成（新規）

- index.html（UI/DOM Overlay）
- src/main.ts（機能判定と起動）
- src/ar/webxr/session.ts（XRセッション/ヒットテスト）
- src/ar/webxr/reticle.ts（レティクル）
- src/ui/overlay.ts（画像選択/操作UI）

## 実装ステップ

1) プロジェクト作成（Vite, TS）と依存追加（three）

2) 機能判定

```ts
const isWebXRAR = !!navigator.xr && await navigator.xr.isSessionSupported('immersive-ar');
```

3) XRセッション開始（features: 'hit-test', 'dom-overlay'）→フレーム毎にヒットテスト→レティクル更新→タップ時にテクスチャ化した画像プレーンをアンカー配下へ

4) UI（画像選択、配置、リセット、スライダー/ジェスチャ）と状態管理

5) HTTPS開発サーバ設定（Viteのbasic-ssl等）とLAN端末実機確認

## 対応環境

- Android Chrome: WebXR AR Hit Test対応

## 開発・確認（Windows手順）

- Nodeを準備 → npmでVite起動（--host指定でLAN公開、HTTPS有効化）
```powershell
npm create vite@latest webar-image-placer -- --template vanilla-ts
cd webar-image-placer
npm i three
npm i -D vite-plugin-basic-ssl
```

- Android Chromeで https://PCのLAN_IP:5173/ にアクセス→カメラ許可→レティクル→タップ配置

## リスク/回避

- 画像の解像度過多によるパフォーマンス低下 → テクスチャ最大サイズを制限
- 証明書警告 → 自己署名を許容して開発、公開時は正式証明書