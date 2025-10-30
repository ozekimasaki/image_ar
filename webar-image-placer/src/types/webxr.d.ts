interface Navigator {
  xr?: XRSystem;
}

interface XRSystem {
  isSessionSupported(mode: XRSessionMode): Promise<boolean>;
  requestSession(mode: XRSessionMode, options?: XRSessionInit): Promise<XRSession>;
}

interface XRSession extends EventTarget {
  requestReferenceSpace(type: XRReferenceSpaceType): Promise<XRReferenceSpace>;
  requestHitTestSource(options: XRHitTestOptionsInit): Promise<XRHitTestSource>;
  requestAnimationFrame(callback: XRFrameRequestCallback): number;
  cancelAnimationFrame(handle: number): void;
  addEventListener(type: string, listener: EventListener): void;
}

interface XRReferenceSpace extends EventTarget {
  getTransformToSpace(other: XRSpace): XRRigidTransform;
}

interface XRSpace {}

interface XRFrame {
  getHitTestResults(hitTestSource: XRHitTestSource): XRHitTestResult[];
  getViewerPose(referenceSpace: XRReferenceSpace): XRViewerPose | null;
}

interface XRHitTestSource {}

interface XRHitTestResult {
  getPose(baseSpace: XRSpace): XRHitPose | null;
}

interface XRHitPose {
  transform: XRRigidTransform;
}

interface XRRigidTransform {
  position: DOMPointReadOnly;
  orientation: DOMPointReadOnly;
  matrix: Float32Array;
}

interface XRViewerPose {
  transform: XRRigidTransform;
  views: XRView[];
}

interface XRView {
  transform: XRRigidTransform;
}

type XRSessionMode = 'immersive-ar' | 'immersive-vr' | 'inline';
type XRReferenceSpaceType = 'viewer' | 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';

interface XRSessionInit {
  optionalFeatures?: string[];
  requiredFeatures?: string[];
  domOverlay?: XRDomOverlayInit;
}

interface XRDomOverlayInit {
  root: HTMLElement;
}

interface XRHitTestOptionsInit {
  space: XRSpace;
  entityTypes?: XRHitTestTrackableType[];
}

type XRHitTestTrackableType = 'plane' | 'point' | 'mesh';

type XRFrameRequestCallback = (time: DOMHighResTimeStamp, frame: XRFrame) => void;
