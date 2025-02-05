import React, { useEffect } from "react";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton";
import { ARObject } from "../services/ar";

function ARScene() {
  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const arButton = ARButton.createButton(renderer);
    document.body.appendChild(arButton);

    function animate() {
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();
  }, []);

  return (
    <div className="ar-scene">
      <h3>AR Battle Arena</h3>
      {/* This can be a 3D arena where users can interact with Navitars */}
    </div>
  );
}

export default ARScene;