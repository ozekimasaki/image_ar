import * as THREE from 'three';
import { Reticle } from './reticle.js';

export class ARSession {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private session: XRSession | null = null;
  private reticle: Reticle;
  private placedImages: THREE.Mesh[] = [];
  private selectedImageTexture: THREE.Texture | null = null;
  private imageScale: number = 1.0;
  private imageRotation: number = 0.0;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.reticle = new Reticle();

    this.setupRenderer();
    this.setupLighting();
    this.setupEventListeners();
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local');
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

    if (imageInput) {
      imageInput.addEventListener('change', this.onImageSelected.bind(this));
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

    if (clearButton) {
      clearButton.addEventListener('click', this.clearAllImages.bind(this));
    }
  }

  public async start(): Promise<void> {
    try {
      this.session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        optionalFeatures: ['anchors'],
        domOverlay: { root: document.body }
      });

      this.renderer.xr.setSession(this.session);
      this.scene.add(this.reticle.getMesh());

      // ヒットテストソースを初期化
      const hitTestSource = await this.session.requestHitTestSource({
        space: this.session.requestReferenceSpace('viewer') as Promise<XRReferenceSpace>,
        entityTypes: ['plane']
      });

      // レンダーループを開始
      this.renderer.setAnimationLoop((timestamp, frame) => {
        if (frame) {
          this.onRenderFrame(timestamp, frame, hitTestSource);
        }
      });

    } catch (error) {
      console.error('ARセッション開始エラー:', error);
      throw error;
    }
  }

  private onRenderFrame(timestamp: number, frame: XRFrame, hitTestSource: XRHitTestSource): void {
    if (!this.session) return;

    // ヒットテストを実行してレティクルを更新
    const hitTestResults = frame.getHitTestResults(hitTestSource);
    if (hitTestResults.length > 0) {
      this.reticle.updateFromHitTest(hitTestResults[0]);
    } else {
      this.reticle.setVisible(false);
    }

    this.renderer.render(this.scene, this.camera);
  }

  private onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1 && this.reticle.isVisible() && this.selectedImageTexture) {
      this.placeImage();
    }
  }

  private onClick(event: MouseEvent): void {
    if (this.reticle.isVisible() && this.selectedImageTexture) {
      this.placeImage();
    }
  }

  private placeImage(): void {
    if (!this.selectedImageTexture || !this.reticle.isVisible()) return;

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
  }

  private onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(e.target?.result as string, (texture) => {
        this.selectedImageTexture = texture;
        
        // 画像コントロールを表示
        const imageControls = document.getElementById('image-controls');
        if (imageControls) {
          imageControls.classList.remove('hidden');
        }
      });
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
    if (this.session) {
      this.session.end();
      this.session = null;
    }
  }
}
