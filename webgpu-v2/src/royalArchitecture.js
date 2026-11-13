/**
 * The Royal Hall — architectural stage dressing, separate from gameplay.
 * Real high-resolution GLB actors remain unmodified.
 * Purpose: restore the old game's ceremonial depth without darkening the board
 * or reintroducing the legacy WebGL/GLSL postprocessing system.
 */
export function buildRoyalArchitecture(THREE, scene, material) {
  const marble = material(0xaeb6b7, 0.78, 0.06);
  const capitals = material(0xd3c2a3, 0.63, 0.12);
  const shadowMarble = material(0x526977, 0.75, 0.08);
  const bronze = material(0xc3a06a, 0.34, 0.58);
  const warmBrick = material(0x84939b, 0.86, 0.05);
  const root = new THREE.Group();
  root.name = 'RoyalColonnade';
  scene.add(root);

  const place = (geom, mat, x, y, z, cast = false) => {
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const block = (w, h, d, mat, x, y, z, cast = false) =>
    place(new THREE.BoxGeometry(w, h, d), mat, x, y, z, cast);

  const backZ = -9.7;
  // Two royal porticos framing the board, not one enormous floating shelf.
  // Footings visibly rest on the shared ground plane behind the last rank.
  const xs = [-10.7, -7.0, 7.0, 10.7];
  const shaftGeo = new THREE.CylinderGeometry(.48, .54, 5.0, 48);
  const collarGeo = new THREE.CylinderGeometry(.65, .65, .15, 48);
  const baseGeo = new THREE.CylinderGeometry(.72, .79, .45, 48);
  const capitalGeo = new THREE.CylinderGeometry(.79, .55, .45, 48);
  for(const x of xs){
    block(1.95,.34,1.95,bronze,x,.12,backZ,true);
    block(1.65,.55,1.67,marble,x,.54,backZ,true);
    place(baseGeo,capitals,x,.99,backZ,true);
    place(shaftGeo,marble,x,3.67,backZ,true);
    place(collarGeo,bronze,x,6.24,backZ,true);
    place(capitalGeo,capitals,x,6.50,backZ,true);
    block(1.68,.22,1.74,bronze,x,6.78,backZ,true);
    block(2.0,.26,1.95,capitals,x,7.06,backZ,true);
  }
  // A pair of separately framed royal portals: nothing spans the empty sky.
  for(const x of [-8.85,8.85]){
    block(6.05,.54,2.12,shadowMarble,x,7.42,backZ,true);
    block(6.25,.15,2.30,bronze,x,7.78,backZ);
    block(6.35,.19,2.34,capitals,x,8.04,backZ);
  }
  // Cloth emblems: texture-backed standards instead of flat coloured boxes.
  function bannerTexture(bg, border, symbol){
    const canvas = document.createElement('canvas');
    canvas.width=384;canvas.height=620;
    const c=canvas.getContext('2d');
    const gradient=c.createLinearGradient(0,0,384,620);
    gradient.addColorStop(0,bg);
    gradient.addColorStop(.53, bg);
    gradient.addColorStop(1,'#192d3c');
    c.fillStyle=gradient;c.fillRect(0,0,384,620);
    c.strokeStyle=border;c.lineWidth=9;c.strokeRect(16,14,352,590);
    c.strokeStyle='rgba(244,216,163,.44)';c.lineWidth=2;c.strokeRect(34,32,316,554);
    c.textAlign='center';c.textBaseline='middle';
    c.fillStyle=border;c.font='bold 260px Georgia,serif';c.fillText(symbol,192,290);
    c.fillStyle=border;c.font='32px Georgia,serif';c.fillText('PLAYMORU',192,499);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace=THREE.SRGBColorSpace;
    map.anisotropy=8;
    return map;
  }
  for(const [x,base,crest] of [
    [-8.85,'#6f4a36','♔'],
    [8.85,'#243f55','♚']
  ]){
    const map=bannerTexture(base,'#e6c68f',crest);
    const banner=new THREE.Mesh(
      new THREE.PlaneGeometry(2.15,3.48),
      new THREE.MeshStandardMaterial({map,transparent:false,roughness:.92,side:THREE.DoubleSide})
    );
    banner.position.set(x,4.91,backZ + 1.20);
    banner.castShadow=true;
    root.add(banner);
    block(2.35,.09,.15,bronze,x,6.78,backZ + 1.26);
  }
  // Two distant amber braziers create a warm ceremonial counterpoint
  // without brightening the sky or crushing shadows around the chess pieces.
  const ember = new THREE.MeshBasicMaterial({color:0xffc278,toneMapped:false});
  for(const x of [-5.6,5.6]){
    block(.27,1.85,.27,bronze,x,1.82,backZ+2.5);
    const flame = place(new THREE.SphereGeometry(.18,20,12),ember,x,2.89,backZ+2.5);
    flame.scale.y=1.7;
  }
  const glow = new THREE.PointLight(0xffc98c,7,9,1.6);
  glow.position.set(0,5.8,backZ+3.9);
  root.add(glow);
  return root;
}
