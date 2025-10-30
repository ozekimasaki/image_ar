export class UIOverlay {
  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 必要に応じてUIのイベントリスナーを追加
    this.setupImageInput();
    this.setupControls();
  }

  private setupImageInput(): void {
    const imageInput = document.getElementById('image-input') as HTMLInputElement;
    const fileLabel = document.querySelector('.file-input-label') as HTMLElement;

    if (imageInput && fileLabel) {
      // ファイル選択時のフィードバック
      imageInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          fileLabel.textContent = `選択中: ${file.name}`;
          fileLabel.style.background = '#34C759';
        } else {
          fileLabel.textContent = '画像を選択';
          fileLabel.style.background = '#007AFF';
        }
      });
    }
  }

  private setupControls(): void {
    // スライダーの初期値表示
    const sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
    const rotationSlider = document.getElementById('rotation-slider') as HTMLInputElement;

    if (sizeSlider) {
      const sizeValue = document.getElementById('size-value');
      if (sizeValue) {
        sizeValue.textContent = sizeSlider.value;
      }
    }

    if (rotationSlider) {
      const rotationValue = document.getElementById('rotation-value');
      if (rotationValue) {
        rotationValue.textContent = `${rotationSlider.value}°`;
      }
    }
  }

  public showStatus(message: string, type: 'info' | 'error' | 'success' = 'info'): void {
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('status-text');

    if (statusElement && statusText) {
      statusText.textContent = message;
      statusElement.classList.remove('hidden');

      // タイプに応じて背景色を変更
      statusElement.style.background = type === 'error' ? 'rgba(255,0,0,0.8)' :
                                       type === 'success' ? 'rgba(52,199,89,0.8)' :
                                       'rgba(0,0,0,0.8)';

      // 3秒後に自動で非表示
      setTimeout(() => {
        statusElement.classList.add('hidden');
      }, 3000);
    }
  }

  public hideStatus(): void {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.classList.add('hidden');
    }
  }

  public showControls(): void {
    const controlsElement = document.getElementById('controls');
    if (controlsElement) {
      controlsElement.classList.remove('hidden');
    }
  }

  public hideControls(): void {
    const controlsElement = document.getElementById('controls');
    if (controlsElement) {
      controlsElement.classList.add('hidden');
    }
  }

  public resetImageInput(): void {
    const imageInput = document.getElementById('image-input') as HTMLInputElement;
    const fileLabel = document.querySelector('.file-input-label') as HTMLElement;
    const imageControls = document.getElementById('image-controls');

    if (imageInput) {
      imageInput.value = '';
    }
    
    if (fileLabel) {
      fileLabel.textContent = '画像を選択';
      fileLabel.style.background = '#007AFF';
    }

    if (imageControls) {
      imageControls.classList.add('hidden');
    }

    // スライダーをリセット
    const sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
    const rotationSlider = document.getElementById('rotation-slider') as HTMLInputElement;
    const sizeValue = document.getElementById('size-value');
    const rotationValue = document.getElementById('rotation-value');

    if (sizeSlider && sizeValue) {
      sizeSlider.value = '1';
      sizeValue.textContent = '1.0';
    }

    if (rotationSlider && rotationValue) {
      rotationSlider.value = '0';
      rotationValue.textContent = '0°';
    }
  }
}
