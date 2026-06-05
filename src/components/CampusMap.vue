<template>
  <div class="wrapper">
    <div ref="mapContainer" class="map-container"></div>

    <!-- 交互式建筑信息卡片 -->
    <Transition name="card">
      <div
        v-if="cardVisible && cardPosition"
        class="building-popup"
        :style="{ left: cardPosition.x + 'px', top: cardPosition.y + 'px' }"
      >
        <div class="popup-header">
          <span class="popup-dot" :class="cardData?.crowdLevel || 'low'"></span>
          <span class="popup-name">{{ cardData?.uiName || 'Unknown' }}</span>
          <button class="popup-close" @click="clearSelection">✕</button>
        </div>
        <div class="popup-subtitle">{{ cardData?.uiNameZh || '' }}</div>
        <div class="popup-body">
          <div class="popup-row">
            <el-icon class="popup-icon"><Clock /></el-icon>
            <span class="popup-label">Open Hours</span>
            <span class="popup-val">{{ cardData?.openTime || '-' }}</span>
          </div>
          <div class="popup-row">
            <el-icon class="popup-icon"><UserFilled /></el-icon>
            <span class="popup-label">Visitors</span>
            <span class="popup-val">{{ (cardData?.dailyVisitors || 0).toLocaleString() }}</span>
          </div>
          <div class="popup-row">
            <el-icon class="popup-icon"><OfficeBuilding /></el-icon>
            <span class="popup-label">Size</span>
            <span class="popup-val">{{ cardData?.area || '-' }} · {{ cardData?.floors || '-' }}F</span>
          </div>
          <div class="popup-row crowd-row">
            <span class="popup-label">Crowd</span>
            <div class="popup-crowd-bar">
              <div
                class="popup-crowd-fill"
                :class="cardData?.crowdLevel || 'low'"
                :style="{ width: (cardData?.crowdPercent || 0) + '%' }"
              ></div>
            </div>
            <span class="popup-percent">{{ cardData?.crowdPercent || 0 }}%</span>
          </div>
        </div>
        <div class="popup-desc" v-if="cardData?.description">
          {{ cardData.description }}
        </div>
      </div>
    </Transition>

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
import { Clock, UserFilled, OfficeBuilding } from '@element-plus/icons-vue';

const DEBUG_MAP = ref(false);

const props = defineProps({
  buildings: { type: Array, required: true },
  selectedBuilding: { type: Object, default: null },
  navigationPath: { default: null }
});

const emit = defineEmits(['building-click', 'clear-selection']);

const mapContainer = ref(null);

// ──── 交互式卡片 ────
const cardVisible = ref(false);
const cardData = ref(null);
const cardPosition = ref(null);

// ──── Three.js 变量 ────
let scene, camera, renderer, controls;
let animationFrameId;
let groundPlane;
let modelMinY = null;
let raycaster, mouse;
let imgAspectRatio = 1; // campus_map.png 宽高比
let targetWorldPos = null; // 当前选中建筑的世界坐标（用于卡片定位）
const BASE_WIDTH = 2368;

// 拖拽检测
let pointerMoved = false;
let pointerDownPos = { x: 0, y: 0 };

// 选中标记
let selectionMarker = null;
let currentHighlightedBuilding = null;

// ──── 坐标映射工具 ────
/** 将 buildings 的归一化坐标 (0-1) 转为 3D 世界坐标 */
function mapPosToWorld(normX, normY) {
  if (!groundPlane) return new THREE.Vector3(0, 0, 0);
  groundPlane.updateMatrixWorld();
  // 地图平面局部坐标：X 从左到右，Y 从上到下
  const localX = (normX - 0.5) * BASE_WIDTH * groundPlane.scale.x;
  const localY = (0.5 - normY) * (BASE_WIDTH / imgAspectRatio) * groundPlane.scale.y;
  const localPos = new THREE.Vector3(localX, localY, 0);
  return localPos.applyMatrix4(groundPlane.matrixWorld);
}

/** 将 3D 世界坐标转回归一化坐标 (0-1) */
function worldToMapPos(worldPos) {
  if (!groundPlane) return { x: 0.5, y: 0.5 };
  const invMatrix = new THREE.Matrix4().copy(groundPlane.matrixWorld).invert();
  const localPos = worldPos.clone().applyMatrix4(invMatrix);
  const normX = localPos.x / (BASE_WIDTH * groundPlane.scale.x) + 0.5;
  const normY = 0.5 - localPos.y / ((BASE_WIDTH / imgAspectRatio) * groundPlane.scale.y);
  return { x: Math.max(0, Math.min(1, normX)), y: Math.max(0, Math.min(1, normY)) };
}

/** 根据归一化坐标找最近的建筑 */
function findNearestBuilding(normX, normY) {
  let best = null;
  let bestDist = Infinity;
  for (const b of props.buildings) {
    const dx = b.position.x - normX;
    const dy = b.position.y - normY;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = b;
    }
  }
  // 距离阈值：超过此距离认为没点到建筑
  const threshold = 0.12;
  return bestDist < threshold * threshold ? best : null;
}

// ──── 🔧 显示卡片 + 地面标记 ────
function showCard(buildingData, targetMesh = null) {
  cardData.value = buildingData;
  cardVisible.value = true;
  
  let mesh = targetMesh;
  if (!mesh && buildingData.modelName && scene) {
    mesh = scene.getObjectByName(buildingData.modelName);
  }

  if (mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    targetWorldPos = box.getCenter(new THREE.Vector3());
  } else if (buildingData.position) {
    targetWorldPos = mapPosToWorld(buildingData.position.x, buildingData.position.y);
  } else {
    targetWorldPos = new THREE.Vector3(0, 0, 0);
  }

  updateSelectionMarker(targetWorldPos);
}

// ──── 🔧 隐藏卡片 + 地面标记 + 建筑高亮 ────
function hideCard() {
  cardVisible.value = false;
  cardData.value = null;
  cardPosition.value = null;
  targetWorldPos = null;
  updateSelectionMarker(null);
}

// ──── 🔧 地面选中标记 ────
function createSelectionMarker() {
  if (!scene) return;
  const ringGeo = new THREE.RingGeometry(25, 32, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x005A9C,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    depthTest: false,
    depthWrite: false
  });
  selectionMarker = new THREE.Mesh(ringGeo, ringMat);
  selectionMarker.rotation.x = -Math.PI / 2;
  selectionMarker.renderOrder = 999;
  selectionMarker.visible = false;
  scene.add(selectionMarker);

  // 外圈发光环
  const outerGeo = new THREE.RingGeometry(33, 45, 64);
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0x4a90d9,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
    depthTest: false,
    depthWrite: false
  });
  const outerRing = new THREE.Mesh(outerGeo, outerMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.renderOrder = 998;
  outerRing.visible = false;
  selectionMarker.add(outerRing);
  selectionMarker.userData.outerRing = outerRing;
}

function updateSelectionMarker(worldPos) {
  if (!selectionMarker) createSelectionMarker();
  if (!selectionMarker) return;

  if (worldPos) {
    selectionMarker.position.copy(worldPos);
    selectionMarker.position.y += 0.5; // 略高于地面
    selectionMarker.visible = true;
    if (selectionMarker.userData.outerRing) {
      selectionMarker.userData.outerRing.visible = true;
    }
    // 脉冲动画
    gsap.killTweensOf(selectionMarker.scale);
    selectionMarker.scale.set(1, 1, 1);
    gsap.to(selectionMarker.scale, {
      x: 1.3, y: 1.3, z: 1.3,
      duration: 0.8,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });
  } else {
    gsap.killTweensOf(selectionMarker.scale);
    selectionMarker.visible = false;
    if (selectionMarker.userData.outerRing) {
      selectionMarker.userData.outerRing.visible = false;
    }
  }
}

// ──── 🔧 清除选中 ────
function clearSelection() {
  hideCard();
  emit('clear-selection');
}

// ──── 🎯 flyToBuilding：根据建筑 ID 找到坐标，镜头飞过去 ────
const flyToBuilding = (buildingName) => {
  if (!scene || !camera || !controls) return;

  const targetBuilding = scene.getObjectByName(buildingName);
  if (!targetBuilding) {
    console.warn('[CampusMap] flyToBuilding: building not found for', buildingName);
    return;
  }

  const buildingInfo = props.buildings.find(b => b.modelName === buildingName);
  if (buildingInfo) {
    showCard(buildingInfo, targetBuilding);
  }

  const box = new THREE.Box3().setFromObject(targetBuilding);
  const center = box.getCenter(new THREE.Vector3());

  if (currentHighlightedBuilding) {
    currentHighlightedBuilding.material.color.setHex(0xffffff);
  }

  targetBuilding.material.color.setHex(0x005bac);
  currentHighlightedBuilding = targetBuilding;

  const offset = new THREE.Vector3(150, 200, 150);

  gsap.to(controls.target, {
    x: center.x,
    y: center.y,
    z: center.z,
    duration: 1.5,
    ease: 'power2.inOut',
    onUpdate: () => controls.update()
  });

  gsap.to(camera.position, {
    x: center.x + offset.x,
    y: center.y + offset.y,
    z: center.z + offset.z,
    duration: 1.5,
    ease: 'power2.inOut'
  });
};

// ──── 更新卡片屏幕坐标 ────
function updateCardScreenPosition() {
  if (!cardVisible.value || !targetWorldPos || !camera || !mapContainer.value) {
    cardPosition.value = null;
    return;
  }

  const screenPos = targetWorldPos.clone().project(camera);
  const rect = mapContainer.value.getBoundingClientRect();

  // 检查是否在屏幕后方
  if (screenPos.z > 1) {
    cardPosition.value = null;
    return;
  }

  cardPosition.value = {
    x: (screenPos.x * 0.5 + 0.5) * rect.width,
    y: (-screenPos.y * 0.5 + 0.5) * rect.height
  };
}

defineExpose({
  flyToBuilding,
  clearSelection
});

// ──── 保存变换 ────
const saveMapTransform = () => {
  if (!groundPlane) return;
  const transform = {
    position: { x: groundPlane.position.x, y: groundPlane.position.y, z: groundPlane.position.z },
    scale: { x: groundPlane.scale.x, y: groundPlane.scale.y, z: groundPlane.scale.z },
    rotationZ: groundPlane.rotation.z
  };
  localStorage.setItem('campusMapTransform', JSON.stringify(transform));
  alert('Map transform saved!');
};

const toggleDebug = () => {
  DEBUG_MAP.value = !DEBUG_MAP.value;
  if (!controls) return;
  if (DEBUG_MAP.value) {
    controls.minPolarAngle = 0.01;
    controls.maxPolarAngle = Math.PI / 2.2;
  } else {
    controls.minPolarAngle = Math.PI / 3;
    controls.maxPolarAngle = Math.PI / 3;
  }
};

// ──── Three.js 初始化 ────
const initThree = () => {
  if (!mapContainer.value) return;

  const width = mapContainer.value.clientWidth;
  const height = mapContainer.value.clientHeight;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  scene = new THREE.Scene();
  scene.background = new THREE.Color('#eaf2f8');
  scene.fog = new THREE.Fog('#eaf2f8', 600, 2200);

  camera = new THREE.PerspectiveCamera(75, width / height, 10, 100000);
  camera.position.set(0, 400, 600);

  renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  mapContainer.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minPolarAngle = DEBUG_MAP.value ? 0.01 : Math.PI / 3;
  controls.maxPolarAngle = DEBUG_MAP.value ? (Math.PI / 2.2) : Math.PI / 3;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(100, 150, 50);
  scene.add(directionalLight);

  // 加载地图纹理 + 地面平面
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('/campus_map.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    imgAspectRatio = texture.image.width / texture.image.height;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    const alphaTexture = new THREE.CanvasTexture(canvas);

    const planeGeometry = new THREE.PlaneGeometry(BASE_WIDTH, BASE_WIDTH / imgAspectRatio);
    const planeMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      alphaMap: alphaTexture,
      transparent: true,
      depthWrite: false
    });

    groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    groundPlane.rotation.x = -Math.PI / 2;

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

    if (modelMinY !== null) groundPlane.position.y = modelMinY;

    scene.add(groundPlane);
  });

  // 加载 3D 模型
  const loader = new GLTFLoader();
  loader.load(
    '/tongji_campus.glb',
    (gltf) => {
      const model = gltf.scene;

      const defaultMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        side: THREE.DoubleSide
      });

      model.traverse((child) => {
        if (child.isMesh) {
          child.material = defaultMaterial.clone();
          child.userData.originalMaterial = child.material;

          const edges = new THREE.EdgesGeometry(child.geometry);
          const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true })
          );
          child.add(line);
        }
      });

      scene.add(model);

      const box = new THREE.Box3().setFromObject(model);
      modelMinY = box.min.y - 0.1;
      if (groundPlane) groundPlane.position.y = modelMinY;

      controls.target.set(0, 0, 0);
      camera.position.set(0, 800, 800);
      camera.lookAt(0, 0, 0);
      controls.minDistance = 100;
      controls.maxDistance = 1200;
      controls.update();
    },
    undefined,
    (error) => console.error('Error loading model:', error)
  );

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', onKeyDown);
  if (mapContainer.value) {
    mapContainer.value.addEventListener('pointerdown', onPointerDown);
    mapContainer.value.addEventListener('pointermove', onPointerMove);
    mapContainer.value.addEventListener('click', onClick);
  }

  animate();
};

// ──── 键盘 ────
const onKeyDown = (event) => {
  if (!groundPlane || !camera || !controls) return;
  const key = event.key.toLowerCase();

  if (DEBUG_MAP.value) {
    const isFine = event.shiftKey;
    const step = isFine ? 0.5 : 2;
    const scaleStep = isFine ? 0.001 : 0.005;
    const rotStep = isFine ? 0.0005 : 0.002;
    switch (key) {
      case 'w': groundPlane.position.z -= step; break;
      case 's': groundPlane.position.z += step; break;
      case 'a': groundPlane.position.x -= step; break;
      case 'd': groundPlane.position.x += step; break;
      case '=': case '+': { const s = groundPlane.scale.x + scaleStep; groundPlane.scale.set(s, s, s); break; }
      case '-': case '_': { const s = groundPlane.scale.x - scaleStep; groundPlane.scale.set(s, s, s); break; }
      case 't': groundPlane.rotation.z += rotStep; break;
      case 'y': groundPlane.rotation.z -= rotStep; break;
      case 'r': console.log('Ground:', groundPlane.position, groundPlane.scale, groundPlane.rotation.z); break;
    }
  } else {
    const panStep = 30;
    const angle = controls.getAzimuthalAngle();
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    switch (key) {
      case 'w': camera.position.addScaledVector(forward, panStep); controls.target.addScaledVector(forward, panStep); break;
      case 's': camera.position.addScaledVector(forward, -panStep); controls.target.addScaledVector(forward, -panStep); break;
      case 'a': camera.position.addScaledVector(right, -panStep); controls.target.addScaledVector(right, -panStep); break;
      case 'd': camera.position.addScaledVector(right, panStep); controls.target.addScaledVector(right, panStep); break;
    }
  }
};

const onWindowResize = () => {
  if (!mapContainer.value || !camera || !renderer) return;
  const w = mapContainer.value.clientWidth;
  const h = mapContainer.value.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
};

// ──── 🔧 拖拽检测 ────
const onPointerDown = (event) => {
  pointerMoved = false;
  pointerDownPos = { x: event.clientX, y: event.clientY };
};

const onPointerMove = (event) => {
  if (!pointerMoved) {
    const dx = event.clientX - pointerDownPos.x;
    const dy = event.clientY - pointerDownPos.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      pointerMoved = true;
    }
  }
};

// ──── 🔧 点击地图 → 坐标反查建筑 ────
const onClick = (event) => {
  // 拖拽操作不触发点击
  if (pointerMoved) return;

  if (!mapContainer.value || !camera || !scene || !raycaster || !mouse) return;

  const rect = mapContainer.value.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // 优先检测 3D 模型建筑
  const intersects = raycaster.intersectObjects(scene.children, true);
  let clickedMesh = null;
  for (const intersect of intersects) {
    const obj = intersect.object;
    // 忽略地面、标记、高亮框，以及辅助线段
    if (obj.isMesh && obj !== groundPlane && obj !== selectionMarker) {
      if (obj.type !== 'LineSegments' && !obj.name.includes("edge") && !obj.name.includes("Line")) {
        clickedMesh = obj;
        break;
      }
    }
  }

  if (clickedMesh) {
    emit('building-click', clickedMesh.name);
    const buildingInfo = props.buildings.find(b => b.modelName === clickedMesh.name);
    if (buildingInfo) {
      showCard(buildingInfo, clickedMesh);
    }
    return;
  }

  // 若没有点中 3D 建筑，点击了空白处/地面
  clearSelection();
};

// ──── 动画循环 ────
const animate = () => {
  animationFrameId = requestAnimationFrame(animate);
  if (controls) controls.update();
  updateCardScreenPosition();
  if (renderer && scene && camera) renderer.render(scene, camera);
};

// ──── 清理 ────
const cleanupThree = () => {
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('keydown', onKeyDown);
  if (mapContainer.value) {
    mapContainer.value.removeEventListener('pointerdown', onPointerDown);
    mapContainer.value.removeEventListener('pointermove', onPointerMove);
    mapContainer.value.removeEventListener('click', onClick);
  }

  if (animationFrameId) cancelAnimationFrame(animationFrameId);

  if (selectionMarker) {
    gsap.killTweensOf(selectionMarker.scale);
    if (selectionMarker.userData.outerRing) selectionMarker.userData.outerRing = null;
    if (selectionMarker.geometry) selectionMarker.geometry.dispose();
    if (selectionMarker.material) selectionMarker.material.dispose();
    selectionMarker = null;
  }

  if (scene) {
    scene.traverse((object) => {
      if (!object.isMesh) return;
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
        else object.material.dispose();
      }
    });
    scene.clear();
  }
  if (controls) controls.dispose();
  if (renderer) {
    renderer.dispose();
    if (mapContainer.value && renderer.domElement) mapContainer.value.removeChild(renderer.domElement);
  }

  scene = null;
  camera = null;
  renderer = null;
  controls = null;
};

onMounted(() => { initThree(); });
onBeforeUnmount(() => { cleanupThree(); });
</script>

<style scoped>
.wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* ──── 交互卡片 ──── */
.building-popup {
  position: absolute;
  z-index: 200;
  width: 260px;
  background: rgba(20, 20, 28, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  transform: translate(-50%, -110%);
  pointer-events: auto;
  color: #e8e8ed;
}

.building-popup::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid rgba(20, 20, 28, 0.92);
}

.popup-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.popup-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.popup-dot.low    { background: #4caf88; box-shadow: 0 0 6px rgba(76, 175, 136, 0.5); }
.popup-dot.medium { background: #e5a855; box-shadow: 0 0 6px rgba(229, 168, 85, 0.5); }
.popup-dot.high   { background: #e0556a; box-shadow: 0 0 6px rgba(224, 85, 106, 0.5); }

.popup-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  flex: 1;
}

.popup-close {
  background: none;
  border: none;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
}
.popup-close:hover { color: #fff; background: rgba(255,255,255,0.1); }

.popup-subtitle {
  font-size: 12px;
  color: #999;
  margin-bottom: 10px;
  padding-left: 16px;
}

.popup-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.popup-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.popup-icon { color: #888; font-size: 13px; flex-shrink: 0; }

.popup-label { color: #999; min-width: 60px; font-size: 11px; }

.popup-val { color: #ddd; font-weight: 500; }

.crowd-row { gap: 6px; }

.popup-crowd-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,0.08);
  overflow: hidden;
  min-width: 60px;
}

.popup-crowd-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}
.popup-crowd-fill.low    { background: #4caf88; }
.popup-crowd-fill.medium { background: #e5a855; }
.popup-crowd-fill.high   { background: #e0556a; }

.popup-percent { color: #ccc; font-weight: 600; font-size: 11px; min-width: 28px; text-align: right; }

.popup-desc {
  font-size: 11px;
  color: #aaa;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 8px;
}

/* 卡片动画 */
.card-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.card-leave-active { transition: all 0.2s ease-in; }
.card-enter-from,
.card-leave-to { opacity: 0; transform: translate(-50%, -100%) scale(0.85); }

/* ──── 操作提示 ──── */
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
  pointer-events: none;
}

.hint-item { display: flex; align-items: center; gap: 8px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
.hint-keys { display: flex; gap: 4px; align-items: center; }

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

.mouse-kbd { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
.hint-label { font-size: 13px; font-weight: 600; color: #444; }

.debug-actions { position: absolute; bottom: 40px; right: 40px; display: flex; gap: 10px; z-index: 1000; }
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
.debug-toggle-btn:hover, .save-map-btn:hover { background-color: rgba(0, 0, 0, 0.8); }
.save-map-btn { background-color: rgba(0, 90, 156, 0.8); }
.save-map-btn:hover { background-color: rgba(0, 90, 156, 1); }

.map-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: block;
  background-color: #eaf2f8;
}
</style>
