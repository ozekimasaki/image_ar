import * as THREE from 'three';
import { Reticle } from './reticle.js';

export class ARSession {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private session: XRSession | null = null;
  private reticle: Reticle;
  private placedImages: THREE.Mesh[] = [];
  private selectedImageTexture: THREE.Texture | null = null;
  private imageScale: number = 1.0;
  private imageRotation: number = 0.0;
  private hitTestSource: XRHitTestSource | null = null;
  private referenceSpace: XRReferenceSpace | null = null;
  private isRunning: boolean = false;
  private suppressReticle: boolean = false;
  private restartAttempts: number = 0;
  private maxRestartAttempts: number = 3;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    this.reticle = new Reticle();

    this.setupRenderer();
    this.setupLighting();
    this.setupEventListeners();
  }

  private setupRenderer(): void {
    // アルファチャネルを有効にして透明度をサポート
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true
    });
    
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local');
    
    // 背景を透明に設定（ARカメラのビデオフィードが見えるように）
    this.renderer.setClearColor(0x000000, 0);
    
    // カメラの背景をARビデオに設定
    this.camera.position.set(0, 0, 0);
    
    document.body.appendChild(this.renderer.domElement);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // タッチイベントリスナー
    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

    // UIイベントリスナー
    this.setupUIEventListeners();
  }

  private setupUIEventListeners(): void {
    const imageInput = document.getElementById('image-input') as HTMLInputElement;
    const sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
    const rotationSlider = document.getElementById('rotation-slider') as HTMLInputElement;
    const clearButton = document.getElementById('clear-button') as HTMLButtonElement;
    const placeButton = document.getElementById('place-button') as HTMLButtonElement;
    const screenshotButton = document.getElementById('screenshot-button') as HTMLButtonElement;
    const restartCameraButton = document.getElementById('restart-camera-button') as HTMLButtonElement;

    if (imageInput) {
      imageInput.addEventListener('change', this.onImageSelected.bind(this));
      
      // フォーカスが外れたときにセッションを再確認
      imageInput.addEventListener('blur', () => {
        setTimeout(() => {
          this.checkSessionState();
        }, 100);
      });
    }

    if (sizeSlider) {
      sizeSlider.addEventListener('input', (e) => {
        this.imageScale = parseFloat((e.target as HTMLInputElement).value);
        document.getElementById('size-value')!.textContent = this.imageScale.toFixed(1);
      });
    }

    if (rotationSlider) {
      rotationSlider.addEventListener('input', (e) => {
        this.imageRotation = parseFloat((e.target as HTMLInputElement).value);
        document.getElementById('rotation-value')!.textContent = `${this.imageRotation}°`;
      });
    }

    if (placeButton) {
      placeButton.addEventListener('click', () => {
        this.placeImage();
      });
    }

    if (screenshotButton) {
      screenshotButton.addEventListener('click', () => {
        this.takeScreenshot();
      });
    }

    if (restartCameraButton) {
      restartCameraButton.addEventListener('click', () => {
        this.manualRestartSession();
      });
    }

    if (clearButton) {
      clearButton.addEventListener('click', this.clearAllImages.bind(this));
    }
  }

  private checkSessionState(): void {
    if (!this.session || !this.isRunning) {
      console.warn('セッションが失われています');
      this.handleSessionLoss();
    }
  }

  public setSelectedImageTexture(texture: THREE.Texture, scale: number, rotation: number): void {
    this.selectedImageTexture = texture;
    this.imageScale = scale;
    this.imageRotation = rotation;
  }

  public async start(): Promise<void> {
    try {
      // レンダラーが正しく初期化されていることを確認
      if (!this.renderer) {
        throw new Error('レンダラーが初期化されていません');
      }

      this.session = await navigator.xr!.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        optionalFeatures: ['anchors'],
        domOverlay: { root: document.body }
      });

      // セッションイベントリスナーを設定
      this.setupSessionListeners();

      // セッション設定前にレンダラーを再設定
      this.renderer.xr.enabled = true;
      await this.renderer.xr.setSession(this.session);
      
      this.scene.add(this.reticle.getMesh());

      // ヒットテストソースを初期化
      this.hitTestSource = await this.session!.requestHitTestSource!({
        space: await this.session!.requestReferenceSpace('viewer'),
        entityTypes: ['plane']
      }) || null;

      // 参照空間を保存
      this.referenceSpace = await this.session!.requestReferenceSpace('local');

      // レンダーループを開始
      this.isRunning = true;
      this.restartAttempts = 0;
      this.renderer.setAnimationLoop((timestamp, frame) => {
        if (frame) {
          this.onRenderFrame(timestamp, frame, this.hitTestSource!, this.referenceSpace!);
        }
      });

    } catch (error) {
      console.error('ARセッション開始エラー:', error);
      this.isRunning = false;
      throw error;
    }
  }

  private setupSessionListeners(): void {
    if (!this.session) return;

    // セッション終了イベント
    this.session.addEventListener('end', () => {
      console.log('XRセッションが終了しました');
      this.session = null;
      this.isRunning = false;
      this.hitTestSource = null;
      this.referenceSpace = null;
    });

    // セッション可視性変更イベント
    this.session.addEventListener('visibilitychange', (event) => {
      console.log('セッション可視性が変更:', event);
      if (this.session?.visibilityState === 'visible') {
        console.log('セッションが可視状態になりました');
      } else {
        console.log('セッションが非可視状態になりました');
      }
    });

    // セッションが失われた場合の処理
    this.session.addEventListener('terminate', () => {
      console.log('セッションが強制終了されました');
      this.handleSessionLoss();
    });
  }

  private handleSessionLoss(): void {
    if (!this.isRunning) return;

    console.log('セッションの損失を検出しました');
    this.isRunning = false;
    this.session = null;
    this.hitTestSource = null;
    this.referenceSpace = null;

    // 再起動を試みる
    if (this.restartAttempts < this.maxRestartAttempts) {
      this.restartAttempts++;
      console.log(`セッションの再起動を試みます (${this.restartAttempts}/${this.maxRestartAttempts})`);
      
      setTimeout(async () => {
        try {
          await this.restartSession();
        } catch (error) {
          console.error('セッション再起動に失敗:', error);
          this.showRestartFailureMessage();
        }
      }, 1000);
    } else {
      console.error('最大再起動回数に達しました');
      this.showRestartFailureMessage();
    }
  }

  private async restartSession(): Promise<void> {
    try {
      await this.start();
      console.log('セッションの再起動に成功しました');
    } catch (error) {
      throw error;
    }
  }

  public async manualRestartSession(): Promise<void> {
    const restartButton = document.getElementById('restart-camera-button') as HTMLButtonElement;
    
    try {
      // ボタンを無効化して連続クリックを防止
      if (restartButton) {
        restartButton.disabled = true;
        restartButton.textContent = '再起動中...';
      }
      
      this.showTemporaryMessage('カメラを再起動中...');
      
      // 現在のセッションを終了
      this.end();
      
      // 少し待ってから再起動
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 新しいセッションを開始
      await this.start();
      
      this.showTemporaryMessage('カメラを再起動しました');
      
    } catch (error) {
      console.error('手動再起動エラー:', error);
      this.showTemporaryMessage('カメラの再起動に失敗しました');
    } finally {
      // ボタンを有効化
      if (restartButton) {
        restartButton.disabled = false;
        restartButton.textContent = 'カメラ再起動';
      }
    }
  }

  private showRestartFailureMessage(): void {
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    
    if (statusElement && statusText) {
      statusText.textContent = 'ARセッションが失われました。ページをリロードしてください。';
      statusElement.classList.remove('hidden');
    }
  }

  private onRenderFrame(_timestamp: number, frame: XRFrame, hitTestSource: XRHitTestSource, referenceSpace: XRReferenceSpace): void {
    if (!this.session) return;

    try {
      // ヒットテストを実行してレティクルを更新（抑制フラグ中は非表示）
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (this.suppressReticle) {
        this.reticle.setVisible(false);
      } else if (hitTestResults.length > 0) {
        this.reticle.updateFromHitTest(hitTestResults[0], referenceSpace);
      } else {
        this.reticle.setVisible(false);
      }
    } catch (error) {
      console.error('ヒットテストエラー:', error);
      this.reticle.setVisible(false);
    }

    this.renderer.render(this.scene, this.camera);
  }

  private onTouchStart(_event: TouchEvent): void {
    // タップでの設置は無効化（ボタン設置のみ）
  }

  private onClick(_event: MouseEvent): void {
    // クリックでの設置は無効化（ボタン設置のみ）
  }

  private placeImage(): void {
    if (!this.selectedImageTexture) {
      alert('画像が選択されていません');
      return;
    }

    // レティクルが表示されているか確認
    if (!this.reticle.getMesh().visible) {
      alert('平面を検出して設置位置を決めてください');
      return;
    }

    // 画像メッシュを作成
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: this.selectedImageTexture,
      transparent: true,
      side: THREE.DoubleSide
    });

    const imageMesh = new THREE.Mesh(geometry, material);
    
    // レティクルの位置と回転をコピー
    imageMesh.position.copy(this.reticle.getMesh().position);
    imageMesh.quaternion.copy(this.reticle.getMesh().quaternion);
    
    // スケールと回転を適用
    const scale = this.imageScale;
    imageMesh.scale.set(scale, scale, scale);
    imageMesh.rotateZ(THREE.MathUtils.degToRad(this.imageRotation));

    this.scene.add(imageMesh);
    this.placedImages.push(imageMesh);

    // 設置成功をフィードバック
    this.showTemporaryMessage('画像を設置しました');
  }

  private async takeScreenshot(): Promise<void> {
    await this.startScreenshotGuide();
  }

  private async startScreenshotGuide(): Promise<void> {
    const guide = document.getElementById('screenshot-guide') as HTMLElement | null;
    const countdownEl = document.getElementById('screenshot-countdown') as HTMLElement | null;
    const controls = document.getElementById('controls') as HTMLElement | null;
    const overlay = document.querySelector('.overlay') as HTMLElement | null;
    const status = document.getElementById('status') as HTMLElement | null;
    const statusText = document.getElementById('status-text') as HTMLElement | null;

    if (!guide || !countdownEl) {
      console.warn('スクショガイド用の要素が見つかりません');
      return;
    }

    // ガイド表示
    guide.classList.remove('hidden');
    let remaining = 3;
    countdownEl.textContent = String(remaining);

    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        remaining -= 1;
        countdownEl.textContent = String(Math.max(remaining, 0));
        if (remaining <= 0) {
          clearInterval(timer);
          resolve();
        }
      }, 1000);
    });

    // 振動で合図（対応端末のみ）
    try {
      (navigator as any).vibrate?.(100);
    } catch {}

    // 一時的にUIを非表示
    const originalControlsDisplay = controls?.style.display;
    const originalOverlayDisplay = overlay?.style.display;
    const originalStatusDisplay = status?.style.display;

    if (controls) controls.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    if (status) status.style.display = 'none';
    guide.classList.add('hidden');

    // レティクルを抑制
    this.suppressReticle = true;
    this.reticle.setVisible(false);

    // OSスクショ用の無UIウィンドウ（5秒）
    await new Promise((r) => setTimeout(r, 5000));

    // UI復帰
    if (controls) controls.style.display = originalControlsDisplay || '';
    if (overlay) overlay.style.display = originalOverlayDisplay || '';
    if (status) status.style.display = originalStatusDisplay || '';

    // レティクル抑制解除
    this.suppressReticle = false;

    if (status && statusText) {
      statusText.textContent = '撮影が終わったら操作を続けてください';
      status.classList.remove('hidden');
      setTimeout(() => status.classList.add('hidden'), 2000);
    }
  }

  

  private showTemporaryMessage(message: string): void {
    const statusElement = document.getElementById('status');
    const statusText = document.getElementById('status-text');
    
    if (statusElement && statusText) {
      statusText.textContent = message;
      statusElement.classList.remove('hidden');
      
      // 2秒後に自動で非表示
      setTimeout(() => {
        statusElement.classList.add('hidden');
      }, 2000);
    }
  }

  private onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        if (!result) {
          console.error('ファイル読み込み結果が空です');
          return;
        }

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
          result,
          (texture) => {
            // 色空間をsRGBに設定して正しい色味に
            texture.colorSpace = THREE.SRGBColorSpace;
            this.selectedImageTexture = texture;
            
            // 画像コントロールを表示
            const imageControls = document.getElementById('image-controls');
            if (imageControls) {
              imageControls.classList.remove('hidden');
            }
          },
          undefined,
          (error) => {
            console.error('テクスチャ読み込みエラー:', error);
            alert('画像の読み込みに失敗しました。別の画像を選択してください。');
          }
        );
      } catch (error) {
        console.error('画像処理エラー:', error);
        alert('画像の処理に失敗しました。');
      }
    };
    
    reader.onerror = (error) => {
      console.error('ファイル読み込みエラー:', error);
      alert('ファイルの読み込みに失敗しました。');
    };
    
    reader.readAsDataURL(file);
  }

  private clearAllImages(): void {
    this.placedImages.forEach(image => {
      this.scene.remove(image);
      image.geometry.dispose();
      if (image.material instanceof THREE.Material) {
        image.material.dispose();
      }
    });
    this.placedImages = [];
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public end(): void {
    this.isRunning = false;
    this.restartAttempts = 0;
    
    if (this.session) {
      this.session.end();
      this.session = null;
    }
    
    this.hitTestSource = null;
    this.referenceSpace = null;
    
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
    }
  }
}
