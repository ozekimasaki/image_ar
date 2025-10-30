import { ARSession } from './ar/webxr/session.js';
import { UIOverlay } from './ui/overlay.js';
import * as THREE from 'three';

class WebARImagePlacer {
  private arSession: ARSession | null = null;
  private uiOverlay: UIOverlay | null = null;
  private selectedImageFile: File | null = null;
  private imageScale: number = 1.0;
  private imageRotation: number = 0.0;

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

      // UIオーバーレイを初期化
      this.uiOverlay = new UIOverlay();
      
      // スタート画面を表示
      this.showStartScreen();
      this.hideStatus();

    } catch (error) {
      console.error('初期化エラー:', error);
      this.showStatus(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  private showStartScreen(): void {
    const startScreen = document.getElementById('start-screen');
    const startButton = document.getElementById('start-ar-button');
    const startImageInput = document.getElementById('start-image-input') as HTMLInputElement;
    const startSizeSlider = document.getElementById('start-size-slider') as HTMLInputElement;
    const startRotationSlider = document.getElementById('start-rotation-slider') as HTMLInputElement;
    
    if (startScreen && startButton && startImageInput) {
      startScreen.classList.remove('hidden');
      
      // 画像選択イベント
      startImageInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          this.selectedImageFile = file;
          this.showImagePreview(file);
        }
      });
      
      // スライダーイベント
      if (startSizeSlider) {
        startSizeSlider.addEventListener('input', (e) => {
          this.imageScale = parseFloat((e.target as HTMLInputElement).value);
          document.getElementById('start-size-value')!.textContent = this.imageScale.toFixed(1);
        });
      }
      
      if (startRotationSlider) {
        startRotationSlider.addEventListener('input', (e) => {
          this.imageRotation = parseFloat((e.target as HTMLInputElement).value);
          document.getElementById('start-rotation-value')!.textContent = `${this.imageRotation}°`;
        });
      }
      
      // AR開始ボタンイベント
      startButton.addEventListener('click', async () => {
        try {
          this.showStatus('ARセッションを開始中...');
          startScreen.classList.add('hidden');
          
          // ARセッションを開始
          this.arSession = new ARSession();
          await this.arSession.start();

          // 画像が選択されている場合はテクスチャを設定
          if (this.selectedImageFile) {
            await this.loadImageToSession(this.selectedImageFile);
          }

          // UIを表示
          if (this.uiOverlay) {
            this.uiOverlay.showControls();
            // オーバーレイも表示
            const overlay = document.querySelector('.overlay');
            if (overlay) {
              overlay.classList.remove('hidden');
            }
          }
          this.hideStatus();

        } catch (error) {
          console.error('ARセッション開始エラー:', error);
          startScreen.classList.remove('hidden');
          this.showStatus(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
        }
      });
    }
  }

  private showImagePreview(file: File): void {
    const preview = document.getElementById('start-image-preview');
    const previewImg = document.getElementById('preview-img') as HTMLImageElement;
    
    if (preview && previewImg) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target?.result as string;
        preview.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  }

  private async loadImageToSession(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const textureLoader = new THREE.TextureLoader();
          textureLoader.load(
            result,
            (texture) => {
              if (this.arSession) {
                this.arSession.setSelectedImageTexture(texture, this.imageScale, this.imageRotation);
                
                // 画像コントロールを表示
                const imageControls = document.getElementById('image-controls');
                if (imageControls) {
                  imageControls.classList.remove('hidden');
                }
              }
              resolve();
            },
            undefined,
            (error) => {
              reject(error);
            }
          );
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
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
}

// アプリケーションを開始
document.addEventListener('DOMContentLoaded', () => {
  new WebARImagePlacer();
});
