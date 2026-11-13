/**
 * Royal cinematics for V2. The chess authority stays in GameController;
 * this module only moves the camera and creates temporary GPU-light effects.
 * No external video, legacy EffectComposer, GLSL patches, or black-screen SSAO.
 */
export class RoyalCameraDirector {
  constructor(THREE, camera, orbit, enqueue) {
    this.THREE = THREE;
    this.camera = camera;
    this.orbit = orbit;
    this.enqueue = enqueue;
    this.active = false;
    this.original = null;
  }
  get isActive() { return this.active; }
  cancel() {
    this.generation = (this.generation || 0) + 1;
    this.active = false;
    this.original = null;
    this.orbit.enabled = true;
  }
  async glideTo(position, target, duration, fov = null) {
    const fromPosition = this.camera.position.clone();
    const fromTarget = this.orbit.target.clone();
    const initialFov = this.camera.fov;
    const token = this.generation || 0;
    await this.enqueue(duration, t => {
      if(token !== (this.generation || 0))return;
      this.camera.position.lerpVectors(fromPosition, position, t);
      this.orbit.target.lerpVectors(fromTarget, target, t);
      if (fov !== null) {
        this.camera.fov = initialFov + (fov - initialFov) * t;
        this.camera.updateProjectionMatrix();
      }
      this.camera.lookAt(this.orbit.target);
    });
  }
  async enterCapture(attacker, victim) {
    if (this.active) return false;
    this.active = true;
    this.original = {
      position: this.camera.position.clone(),
      target: this.orbit.target.clone(),
      fov: this.camera.fov,
      enabled: this.orbit.enabled
    };
    this.orbit.enabled = false;
    // Frame the target square, not the midpoint of a long queen charge.
    // Otherwise the close-up ends up looking down an empty stretch of board.
    const mid = victim.clone();
    const toward = attacker.clone().sub(victim).setY(0);
    if (toward.lengthSq() < .03) toward.set(0,0,1);
    toward.normalize();
    const flank = new this.THREE.Vector3(toward.z,0,-toward.x);
    // Slightly raised three-quarter angle reveals both faces and silhouettes.
    const closePos = mid.clone()
      .addScaledVector(toward, 2.8)
      .addScaledVector(flank, 2.65)
      .add(new this.THREE.Vector3(0,3.1,0));
    const target = mid.clone().add(new this.THREE.Vector3(0,1.02,0));
    await this.glideTo(closePos,target,.43,36);
    return true;
  }
  async exitCapture() {
    if (!this.original) return;
    const restore = this.original;
    await this.glideTo(restore.position,restore.target,.56,restore.fov);
    if(!this.active)return;
    this.camera.position.copy(restore.position);
    this.orbit.target.copy(restore.target);
    this.camera.fov = restore.fov;
    this.camera.updateProjectionMatrix();
    this.orbit.enabled = restore.enabled;
    this.original = null;
    this.active = false;
  }
  async endgame(focus, kingFaction) {
    this.active = true;
    this.orbit.enabled = false;
    const direction = kingFaction === 'w' ? 1 : -1;
    const position = focus.clone().add(new this.THREE.Vector3(3.6,4.1,direction*5.4));
    const target = focus.clone().add(new this.THREE.Vector3(0,1.15,0));
    await this.glideTo(position,target,1.10,39);
    this.active = false;
  }
}

export function royalImpact(THREE,scene,at,enqueue,color=0xffd38b) {
  const ringMaterial = new THREE.MeshBasicMaterial({
    color,transparent:true,opacity:.88,
    blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,
    side:THREE.DoubleSide
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.28,.38,48),ringMaterial);
  ring.rotation.x = -Math.PI/2;
  ring.position.copy(at);
  ring.position.y = .55;
  scene.add(ring);
  const light = new THREE.PointLight(color,10,4.5,2);
  light.position.copy(at).add(new THREE.Vector3(0,1.45,0));
  scene.add(light);
  return enqueue(.43,t=>{
    ring.scale.setScalar(.45+t*5.3);
    ringMaterial.opacity = Math.max(0,.85*(1-t));
    light.intensity = 10*(1-t)*(1-t);
  }).finally(()=>{
    ring.removeFromParent();
    light.removeFromParent();
    ring.geometry.dispose();
    ringMaterial.dispose();
    light.dispose?.();
  });
}
