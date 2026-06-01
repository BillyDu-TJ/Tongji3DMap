<template>
  <section class="map-container" ref="containerRef">
    <div class="map-canvas" ref="canvasRef">
      <canvas ref="threeCanvas" class="three-placeholder"></canvas>

      <div class="map-overlay">
        <div class="map-title">Campus 3D View</div>
        <div class="map-controls">
          <button class="ctrl-btn" @click="resetView" title="Reset View">
            <el-icon><Aim /></el-icon>
          </button>
          <button class="ctrl-btn" @click="toggleViewMode" title="Toggle View">
            <el-icon><View /></el-icon>
            <span class="ctrl-label">{{ viewMode === 'orbit' ? 'Orbit' : 'FPV' }}</span>
          </button>
        </div>
      </div>

      <Transition name="fade">
        <div v-if="currentBuilding" class="building-popup" :style="popupStyle">
          <button class="popup-close" @click="closePopup">
            <el-icon><Close /></el-icon>
          </button>
          <div class="popup-image">
            <div class="popup-placeholder">
              <el-icon :size="28"><component :is="currentBuilding.icon" /></el-icon>
            </div>
          </div>
          <div class="popup-body">
            <h3>{{ currentBuilding.name }}</h3>
            <p class="popup-zh">{{ currentBuilding.nameZh }}</p>
            <p class="popup-desc">{{ currentBuilding.description }}</p>
            <div class="popup-tags">
              <span class="popup-tag">
                <el-icon><Clock /></el-icon> {{ currentBuilding.openTime }}
              </span>
              <span class="popup-tag">{{ currentBuilding.floors }}F</span>
              <span class="popup-tag">{{ currentBuilding.area }}</span>
            </div>
          </div>
        </div>
      </Transition>

      <div class="hint-bar" v-if="!currentBuilding">
        <span>Click a building from the sidebar or use search to explore the campus</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Aim, View, Close, Clock } from '@element-plus/icons-vue'

const props = defineProps({
  buildings: { type: Array, required: true },
  selectedBuilding: { type: Object, default: null },
  navigationPath: { type: Array, default: null }
})

const containerRef = ref(null)
const canvasRef = ref(null)
const threeCanvas = ref(null)
const currentBuilding = ref(null)
const viewMode = ref('orbit')
const popupPosition = reactive({ left: '60%', top: '30%' })

const popupStyle = computed(() => ({
  left: popupPosition.left,
  top: popupPosition.top
}))

let ctx = null
let animationId = null
let particles = []
let hoveredParticle = -1

onMounted(() => {
  initCanvas()
  startAnimation()
  window.addEventListener('resize', resizeCanvas)
})

onUnmounted(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', resizeCanvas)
})

function initCanvas() {
  const canvas = threeCanvas.value
  if (!canvas) return
  canvas.width = canvas.parentElement.clientWidth
  canvas.height = canvas.parentElement.clientHeight
  ctx = canvas.getContext('2d')

  particles = props.buildings.map((b, i) => ({
    x: b.position.x * canvas.width,
    y: b.position.y * canvas.height,
    radius: 18 + Math.random() * 10,
    color: getCategoryColor(b.category),
    opacity: 0.5 + Math.random() * 0.3,
    pulse: Math.random() * Math.PI * 2,
    building: b,
    orbitRadius: 0.5 + Math.random() * 1.2,
    orbitSpeed: 0.002 + Math.random() * 0.005,
    angle: Math.random() * Math.PI * 2
  }))

  drawGrid()
}

function getCategoryColor(category) {
  const colors = {
    academic: 'rgb(74, 144, 217)',
    culture: 'rgb(184, 127, 217)',
    dining: 'rgb(229, 168, 85)',
    sports: 'rgb(76, 175, 136)',
    admin: 'rgb(154, 160, 171)'
  }
  return colors[category] || 'rgb(74, 144, 217)'
}

function drawGrid() {
  if (!ctx || !threeCanvas.value) return
  const w = threeCanvas.value.width
  const h = threeCanvas.value.height
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'
  ctx.lineWidth = 1
  const spacing = 40
  for (let x = spacing; x < w; x += spacing) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let y = spacing; y < h; y += spacing) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
}

function startAnimation() {
  function animate() {
    if (!ctx || !threeCanvas.value) return
    const w = threeCanvas.value.width
    const h = threeCanvas.value.height

    ctx.clearRect(0, 0, w, h)
    drawGrid()

    particles.forEach((p, i) => {
      p.pulse += 0.02
      p.angle += p.orbitSpeed
      const pulseScale = 1 + Math.sin(p.pulse) * 0.12

      if (i === hoveredParticle) {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.5)
        glow.addColorStop(0, p.color.replace(')', ', 0.25)').replace('rgb', 'rgba'))
        glow.addColorStop(0.5, p.color.replace(')', ', 0.08)').replace('rgb', 'rgba'))
        glow.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = p.color.replace(')', `, ${p.opacity * 0.15})`).replace('rgb', 'rgba')
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * pulseScale, 0, Math.PI * 2)
      ctx.fill()

      const coreRadius = p.radius * 0.45 * pulseScale
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, coreRadius)
      gradient.addColorStop(0, p.color)
      gradient.addColorStop(1, p.color.replace(')', ', 0.3)').replace('rgb', 'rgba'))
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(p.x, p.y, coreRadius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = p.color.replace(')', `, ${p.opacity * 0.5})`).replace('rgb', 'rgba')
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * pulseScale, 0, Math.PI * 2)
      ctx.stroke()

      particles.forEach((p2, j) => {
        if (j <= i) return
        const dx = p.x - p2.x
        const dy = p.y - p2.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 180) {
          ctx.strokeStyle = `rgba(255,255,255,${0.03 * (1 - dist / 180)})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        }
      })
    })

    if (currentBuilding.value) {
      const b = particles.find(p => p.building.id === currentBuilding.value.id)
      if (b) {
        const r = b.radius * 2
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    animationId = requestAnimationFrame(animate)
  }
  animate()
}

function resizeCanvas() {
  if (!threeCanvas.value) return
  const parent = threeCanvas.value.parentElement
  threeCanvas.value.width = parent.clientWidth
  threeCanvas.value.height = parent.clientHeight
  particles.forEach(p => {
    const b = props.buildings.find(b => b.id === p.building.id)
    if (b) {
      p.x = b.position.x * threeCanvas.value.width
      p.y = b.position.y * threeCanvas.value.height
    }
  })
  drawGrid()
}

function flyToBuilding(building) {
  currentBuilding.value = building
  const b = particles.find(p => p.building.id === building.id)
  if (b) {
    popupPosition.left = `${(b.x / threeCanvas.value.width) * 100 + 5}%`
    popupPosition.top = `${Math.max(5, (b.y / threeCanvas.value.height) * 100 - 10)}%`
  }
}

function closePopup() {
  currentBuilding.value = null
}

function resetView() {
  currentBuilding.value = null
}

function toggleViewMode() {
  viewMode.value = viewMode.value === 'orbit' ? 'fpv' : 'orbit'
}

defineExpose({
  flyToBuilding,
  resetView
})
</script>

<style scoped>
.map-container {
  flex: 1;
  position: relative;
  min-height: 0;
}

.map-canvas {
  width: 100%;
  height: 100%;
  position: relative;
  background: radial-gradient(ellipse at center, #1a1f2e 0%, #0f1117 70%);
}

.three-placeholder {
  width: 100%;
  height: 100%;
  display: block;
}

.map-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
  z-index: 5;
}

.map-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  background: rgba(0, 0, 0, 0.5);
  padding: 6px 12px;
  border-radius: 6px;
  backdrop-filter: blur(8px);
}

.map-controls {
  display: flex;
  gap: 6px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all var(--transition);
  font-size: 12px;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: var(--text-primary);
}

.ctrl-label {
  font-size: 10px;
  font-weight: 600;
}

.building-popup {
  position: absolute;
  width: 280px;
  background: var(--bg-glass);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass);
  z-index: 20;
  overflow: hidden;
  animation: popupIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes popupIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.popup-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.4);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: all var(--transition);
}

.popup-close:hover {
  background: rgba(0, 0, 0, 0.7);
  color: var(--text-primary);
}

.popup-placeholder {
  height: 120px;
  background: linear-gradient(135deg, rgba(74, 144, 217, 0.15), rgba(74, 144, 217, 0.05));
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}

.popup-body {
  padding: 16px;
}

.popup-body h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.popup-zh {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.popup-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.popup-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.popup-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

.hint-bar {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-muted);
  border: 1px solid var(--border-glass);
  pointer-events: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
