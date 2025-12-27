
import * as THREE from 'three';

export class Environment {
  constructor(scene: THREE.Scene) {
    // Soft Sky Background
    scene.background = new THREE.Color(0xdbe9f6);

    // Ambient Lighting
    const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambLight);

    // Directional Lighting (Sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 50, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    // Ground (Snow)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Helper Grid
    const grid = new THREE.GridHelper(100, 50, 0xccddee, 0xccddee);
    grid.position.y = 0.01;
    scene.add(grid);
  }
}
