import * as THREE from 'three';

export class Reticle {
  private mesh: THREE.Mesh;
  private visible: boolean = false;

  constructor() {
    // レティクルのジオメトリを作成（円形）
    const geometry = new THREE.RingGeometry(0.1, 0.15, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.visible = false;
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.mesh.visible = visible;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
  }

  public setRotation(rotation: THREE.Quaternion): void {
    this.mesh.quaternion.copy(rotation);
  }

  public updateFromHitTest(hitTestResult: XRHitTestResult, referenceSpace: XRReferenceSpace): void {
    try {
      const pose = hitTestResult.getPose(referenceSpace);
      if (pose) {
        this.setPosition(new THREE.Vector3(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        ));
        this.setRotation(new THREE.Quaternion(
          pose.transform.orientation.x,
          pose.transform.orientation.y,
          pose.transform.orientation.z,
          pose.transform.orientation.w
        ));
        this.setVisible(true);
      } else {
        this.setVisible(false);
      }
    } catch (error) {
      console.error('レティクル更新エラー:', error);
      this.setVisible(false);
    }
  }
}
