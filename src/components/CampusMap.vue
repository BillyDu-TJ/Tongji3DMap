<template>
  <div class="wrapper">
    <div ref="mapContainer" class="map-container"></div>
    
    <div class="controls-hint" v-show="!DEBUG_MAP">
      <div class="hint-item">
        <span class="hint-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>
        <span class="hint-label">平移视野</span>
      </div>
      <div class="divider"></div>
      <div class="hint-item">
        <span class="hint-keys"><kbd class="mouse-kbd">左键拖拽</kbd></span>
        <span class="hint-label">环绕校园</span>
      </div>
      <div class="divider"></div>
      <div class="hint-item">
        <span class="hint-keys"><kbd class="mouse-kbd">鼠标滚轮</kbd></span>
        <span class="hint-label">缩放模型</span>
      </div>
    </div>

    <div class="debug-actions">
      <button class="save-map-btn" v-if="DEBUG_MAP" @click="saveMapTransform">
        Save Transform
      </button>
      <button class="debug-toggle-btn" @click="toggleDebug">
        {{ DEBUG_MAP ? 'Exit Debug' : 'Debug Map' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

const DEBUG_MAP = ref(false);

const emit = defineEmits(['building-click']);

const mapContainer = ref(null);

const saveMapTransform = () => {
  if (!groundPlane) return;
  const transform = {
    position: { x: groundPlane.position.x, y: groundPlane.position.y, z: groundPlane.position.z },
    scale: { x: groundPlane.scale.x, y: groundPlane.scale.y, z: groundPlane.scale.z },
    rotationZ: groundPlane.rotation.z
  };
  localStorage.setItem('campusMapTransform', JSON.stringify(transform));
  alert('Map transform saved to localStorage! It will be applied automatically on reload.');
  console.log('Saved Transform:', transform);
};

const toggleDebug = () => {
  DEBUG_MAP.value = !DEBUG_MAP.value;
  if (!controls) return;
  
  if (DEBUG_MAP.value) {
    controls.minPolarAngle = 0.01;
    controls.maxPolarAngle = Math.PI / 2.2;
    console.log('DEBUG MODE ENABLED: Pitch unlocked. WASD moves map.');
  } else {
    controls.minPolarAngle = Math.PI / 3;
    controls.maxPolarAngle = Math.PI / 3;
    console.log('DEBUG MODE DISABLED: Pitch locked. WASD pans camera.');
  }
};

const flyToBuilding = (buildingName) => {
  if (!scene || !camera || !controls) return;
  
  let targetMesh = null;
  scene.traverse((child) => {
    if (child.isMesh && child.name === buildingName) {
      targetMesh = child;
    }
  });

  if (!targetMesh) {
    scene.traverse((child) => {
      // Avoid picking the ground plane
      if (child.isMesh && !targetMesh && child.parent && child.parent.type !== 'Scene') {
        targetMesh = child;
      }
    });
  }

  if (targetMesh) {
    const box = new THREE.Box3().setFromObject(targetMesh);
    const center = box.getCenter(new THREE.Vector3());
    
    gsap.to(camera.position, {
      x: center.x + 300,
      y: center.y + 400,
      z: center.z + 300,
      duration: 1.5,
      ease: 'power2.inOut'
    });

    gsap.to(controls.target, {
      x: center.x,
      y: center.y,
      z: center.z,
      duration: 1.5,
      ease: 'power2.inOut'
    });
  }
};

defineExpose({
  flyToBuilding
});

let scene, camera, renderer, controls;
let animationFrameId;
let groundPlane;
let modelMinY = null;

let raycaster, mouse;
let selectedMesh = null;
let highlightMaterial = null;

const initThree = () => {
  if (!mapContainer.value) return;

  const width = mapContainer.value.clientWidth;
  const height = mapContainer.value.clientHeight;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  
  highlightMaterial = new THREE.MeshStandardMaterial({
    color: 0x005A9C, // Tongji Blue
    roughness: 0.5,
    metalness: 0.2,
    emissive: 0x002255,
    emissiveIntensity: 0.4
  });

  // 1. Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#eaf2f8');
  scene.fog = new THREE.Fog('#eaf2f8', 600, 2200);

  // 2. Camera
  camera = new THREE.PerspectiveCamera(75, width / height, 10, 100000);
  camera.position.set(0, 400, 600);
  camera.updateProjectionMatrix();

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  mapContainer.value.appendChild(renderer.domElement);

  // 4. OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  // Lock polar angle to create a consistent 2.5D isometric perspective
  controls.minPolarAngle = DEBUG_MAP.value ? 0.01 : Math.PI / 3;
  controls.maxPolarAngle = DEBUG_MAP.value ? (Math.PI / 2.2) : Math.PI / 3;

  // 5. Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(100, 150, 50);
  scene.add(directionalLight);

  // Add dark ground plane
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('/campus_map.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;

    // Create radial gradient alpha map to fade edges
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 1)'); // Opaque center
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');   // Transparent edges
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    const alphaTexture = new THREE.CanvasTexture(canvas);

    // Normalize map size: always set base width to 2368 so our default scale remains consistent.
    const baseWidth = 2368;
    const imgAspect = texture.image.width / texture.image.height;
    const planeGeometry = new THREE.PlaneGeometry(baseWidth, baseWidth / imgAspect);
    
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      map: texture, 
      alphaMap: alphaTexture,
      transparent: true,
      depthWrite: false 
    });
    
    groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    
    // Restore saved transform from localStorage or use default
    const savedStr = localStorage.getItem('campusMapTransform');
    if (savedStr) {
      try {
        const saved = JSON.parse(savedStr);
        groundPlane.position.set(saved.position.x, saved.position.y, saved.position.z);
        groundPlane.scale.set(saved.scale.x, saved.scale.y, saved.scale.z);
        groundPlane.rotation.z = saved.rotationZ;
      } catch (e) {
        groundPlane.position.set(190, -1, -50);
        groundPlane.scale.set(1.45, 1.45, 1.45);
      }
    } else {
      groundPlane.position.set(190, -1, -50);
      groundPlane.scale.set(1.45, 1.45, 1.45);
    }
    
    // Automatically align to model's lowest point if it loaded first
    if (modelMinY !== null) {
      groundPlane.position.y = modelMinY;
    }
    
    scene.add(groundPlane);
  });

  // 5.5 Load Model
  const loader = new GLTFLoader();
  loader.load(
    '/tongji_campus.glb',
    (gltf) => {
      const model = gltf.scene;

      // Set a clean digital sandbox material
      const defaultMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        side: THREE.DoubleSide
      });

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = defaultMaterial;
          child.userData.originalMaterial = defaultMaterial;

          // Add tech-style white edges
          const edges = new THREE.EdgesGeometry(child.geometry);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true })
          );
          child.add(line);
        }
      });

      scene.add(model);

      // Automatically align groundPlane Y to the bottom of the building models
      const box = new THREE.Box3().setFromObject(model);
      modelMinY = box.min.y - 0.1; // Tiny offset to prevent z-fighting
      
      if (groundPlane) {
        groundPlane.position.y = modelMinY;
      }

      controls.target.set(0, 0, 0);

      // Reset camera position to a God-eye isometric view
      camera.position.set(0, 800, 800);
      camera.lookAt(0, 0, 0);
      
      controls.minDistance = 100;  // Limit zoom in
      controls.maxDistance = 1200; // Limit zoom out
      controls.update();
    },
    undefined,
    (error) => {
      console.error('Error loading model:', error);
    }
  );

  // 6. Handle Resize and Click Interaction
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', onKeyDown);
  if (mapContainer.value) {
    mapContainer.value.addEventListener('click', onClick);
  }

  // 7. Start Animation Loop
  animate();
};

const onKeyDown = (event) => {
  if (!groundPlane || !camera || !controls) return;
  
  const key = event.key.toLowerCase();

  if (DEBUG_MAP.value) {
    // Hold shift for ultra-fine adjustments
    const isFine = event.shiftKey;
    const step = isFine ? 0.5 : 2;
    const scaleStep = isFine ? 0.001 : 0.005;
    const rotStep = isFine ? 0.0005 : 0.002;
    
    switch (key) {
      case 'w': groundPlane.position.z -= step; break;
      case 's': groundPlane.position.z += step; break;
      case 'a': groundPlane.position.x -= step; break;
      case 'd': groundPlane.position.x += step; break;
      case '=':
      case '+': {
        const s = groundPlane.scale.x + scaleStep;
        groundPlane.scale.set(s, s, s);
        break;
      }
      case '-':
      case '_': {
        const s = groundPlane.scale.x - scaleStep;
        groundPlane.scale.set(s, s, s);
        break;
      }
      case 't': groundPlane.rotation.z += rotStep; break;
      case 'y': groundPlane.rotation.z -= rotStep; break;
      case 'r':
        console.log('Ground position:', groundPlane.position);
        console.log('Ground scale:', groundPlane.scale);
        console.log('Ground rotation Z:', groundPlane.rotation.z);
        break;
    }
  } else {
    // Regular mode: WASD to pan camera
    const panStep = 30;
    const angle = controls.getAzimuthalAngle();
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    
    switch (key) {
      case 'w':
        camera.position.addScaledVector(forward, panStep);
        controls.target.addScaledVector(forward, panStep);
        break;
      case 's':
        camera.position.addScaledVector(forward, -panStep);
        controls.target.addScaledVector(forward, -panStep);
        break;
      case 'a':
        camera.position.addScaledVector(right, -panStep);
        controls.target.addScaledVector(right, -panStep);
        break;
      case 'd':
        camera.position.addScaledVector(right, panStep);
        controls.target.addScaledVector(right, panStep);
        break;
    }
  }
};

const onWindowResize = () => {
  if (!mapContainer.value || !camera || !renderer) return;
  const width = mapContainer.value.clientWidth;
  const height = mapContainer.value.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
};

const onClick = (event) => {
  if (!mapContainer.value || !camera || !scene || !raycaster || !mouse) return;

  const rect = mapContainer.value.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const clickedMesh = intersects.find(intersect => intersect.object.isMesh && intersect.object !== groundPlane)?.object;

    if (clickedMesh) {
      if (selectedMesh && selectedMesh !== clickedMesh) {
        selectedMesh.material = selectedMesh.userData.originalMaterial;
      }
      
      selectedMesh = clickedMesh;
      selectedMesh.material = highlightMaterial;
      
      emit('building-click', selectedMesh.name || selectedMesh.uuid);
    }
  } else {
    if (selectedMesh) {
      selectedMesh.material = selectedMesh.userData.originalMaterial;
      selectedMesh = null;
    }
  }
};

const animate = () => {
  animationFrameId = requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
};

const cleanupThree = () => {
  // Remove event listener
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('keydown', onKeyDown);
  if (mapContainer.value) {
    mapContainer.value.removeEventListener('click', onClick);
  }
  
  if (highlightMaterial) {
    highlightMaterial.dispose();
    highlightMaterial = null;
  }
  selectedMesh = null;
  
  // Stop animation loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  // Dispose scene objects
  if (scene) {
    scene.traverse((object) => {
      if (!object.isMesh) return;
      
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    scene.clear();
  }

  // Dispose controls
  if (controls) {
    controls.dispose();
  }

  // Dispose renderer
  if (renderer) {
    renderer.dispose();
    if (mapContainer.value && renderer.domElement) {
      mapContainer.value.removeChild(renderer.domElement);
    }
  }

  // Clear references
  scene = null;
  camera = null;
  renderer = null;
  controls = null;
};

onMounted(() => {
  initThree();
});

onBeforeUnmount(() => {
  cleanupThree();
});
</script>

<style scoped>
.wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.controls-hint {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 10px 24px;
  border-radius: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.6);
  z-index: 100;
  pointer-events: none; /* Allows clicking through to the map */
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.hint-keys {
  display: flex;
  gap: 4px;
  align-items: center;
}

kbd {
  background: #ffffff;
  border: 1px solid #d0d0d0;
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 700;
  color: #333;
  font-family: Inter, -apple-system, monospace;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.mouse-kbd {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.hint-label {
  font-size: 13px;
  font-weight: 600;
  color: #444;
}

.divider {
  width: 1px;
  height: 16px;
  background: rgba(0, 0, 0, 0.15);
}

.debug-actions {
  position: absolute;
  bottom: 40px;
  right: 40px;
  display: flex;
  gap: 10px;
  z-index: 1000;
}

.debug-toggle-btn, .save-map-btn {
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.5);
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.debug-toggle-btn:hover, .save-map-btn:hover {
  background-color: rgba(0, 0, 0, 0.8);
}

.save-map-btn {
  background-color: rgba(0, 90, 156, 0.8); /* Tongji Blue */
}

.save-map-btn:hover {
  background-color: rgba(0, 90, 156, 1);
}

.map-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: block;
  background-color: #eaf2f8;
}
</style>
