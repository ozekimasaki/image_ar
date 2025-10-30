import { ARSession } from './ar/webxr/session.js';
import { UIOverlay } from './ui/overlay.js';

class WebARImagePlacer {
  private arSession: ARSession | null = null;
  private uiOverlay: UIOverlay | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      this.showStatus('WebXR対応を確認中...');
      
      // WebXRがサポートされているか確認
      if (!navigator.xr) {
        throw new Error('WebXRがサポートされていません');
      }

      // ARセッションがサポートされているか確認
      const isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!isARSupported) {
        throw new Error('ARセッションがサポートされていません');
      }

      this.showStatus('ARセッションを開始中...');
      
      // UIオーバーレイを初期化
      this.uiOverlay = new UIOverlay();
      
      // ARセッションを開始
      this.arSession = new ARSession();
      await this.arSession.start();

      // UIを表示
      this.showControls();
      this.hideStatus();

    } catch (error) {
      console.error('初期化エラー:', error);
      this.showStatus(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  private showStatus(message: string): void {
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    
    if (statusElement && statusText) {
      statusText.textContent = message;
      statusElement.classList.remove('hidden');
    }
  }

  private hideStatus(): void {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.classList.add('hidden');
    }
  }

  private showControls(): void {
    const controlsElement = document.getElementById('controls');
    if (controlsElement) {
      controlsElement.classList.remove('hidden');
    }
  }
}

// アプリケーションを開始
document.addEventListener('DOMContentLoaded', () => {
  new WebARImagePlacer();
});
