import * as THREE from 'three';

// Function to create and display an AR object (e.g., a Navitar avatar in AR)
export function createARObject(scene) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);
  return cube;
}

// Initialize AR with Three.js
export function initializeARScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Add AR button for device compatibility
  const arButton = ARButton.createButton(renderer);
  document.body.appendChild(arButton);

  const arObject = createARObject(scene);

  function animate() {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  animate();
}