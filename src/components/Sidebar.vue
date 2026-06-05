<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <div class="logo-icon">
          <svg viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill="var(--accent)" opacity="0.15"/>
            <path d="M20 8L32 14V26L20 32L8 26V14L20 8Z" stroke="var(--accent)" stroke-width="2" fill="none"/>
            <circle cx="20" cy="20" r="5" fill="var(--accent)" opacity="0.6"/>
          </svg>
        </div>
        <div class="logo-text">
          <span class="logo-title">Tongji 3D</span>
          <span class="logo-sub">Campus Navigator</span>
        </div>
      </div>
    </div>

    <div class="search-section">
      <el-input
        v-model="searchQuery"
        placeholder="Search buildings..."
        :prefix-icon="Search"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleClear"
        size="large"
      >
        <template #suffix>
          <el-button
            class="mic-btn"
            :type="isListening ? 'danger' : 'default'"
            :icon="isListening ? Microphone : Mic"
            circle
            size="small"
            @click="toggleVoice"
            :class="{ listening: isListening }"
          />
        </template>
      </el-input>
    </div>

    <div class="category-filters">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="filter-chip"
        :class="{ active: activeCategory === cat.key }"
        @click="activeCategory = cat.key"
      >
        <el-icon><component :is="cat.icon" /></el-icon>
        <span>{{ cat.label }}</span>
      </button>
    </div>

    <div class="building-list">
      <TransitionGroup name="list">
        <div
          v-for="building in filteredBuildings"
          :key="building.id"
          class="building-card"
          :class="{ active: selectedBuilding?.id === building.id }"
          @click="$emit('select-building', building)"
        >
          <div class="card-indicator" :class="building.category"></div>
          <div class="card-body">
            <div class="card-title-row">
              <el-icon class="card-icon"><component :is="building.icon" /></el-icon>
              <div class="card-info">
                <span class="card-name">{{ building.uiName }}</span>
                <span class="card-name-zh">{{ building.uiNameZh }}</span>
              </div>
            </div>
            <div class="card-meta">
              <span class="meta-item">
                <el-icon><Clock /></el-icon>
                {{ building.openTime.split(' / ')[0] }}
              </span>
            </div>
          </div>
        </div>
      </TransitionGroup>

      <div v-if="filteredBuildings.length === 0" class="empty-state">
        <el-icon :size="32"><Search /></el-icon>
        <p>No buildings found</p>
      </div>
    </div>

    <div class="sidebar-footer">
      <span class="footer-text">Tongji University</span>
      <span class="footer-text">Siping Campus</span>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search, Mic, Microphone, Clock,
  Reading, OfficeBuilding, School, Food, Mic as MicIcon, Stamp, TrophyBase
} from '@element-plus/icons-vue'

const props = defineProps({
  buildings: { type: Array, required: true },
  selectedBuilding: { type: Object, default: null }
})

const emit = defineEmits(['select-building', 'search', 'voice-search'])

const searchQuery = ref('')
const isListening = ref(false)
const activeCategory = ref('all')

const categories = [
  { key: 'all', label: 'All', icon: 'Menu' },
  { key: 'academic', label: 'Academic', icon: 'School' },
  { key: 'culture', label: 'Culture', icon: 'Mic' },
  { key: 'dining', label: 'Dining', icon: 'Food' },
  { key: 'sports', label: 'Sports', icon: 'TrophyBase' },
  { key: 'admin', label: 'Admin', icon: 'Stamp' }
]

const filteredBuildings = computed(() => {
  let result = props.buildings
  if (activeCategory.value !== 'all') {
    result = result.filter(b => b.category === activeCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(
      b => (b.uiName && b.uiName.toLowerCase().includes(q)) || (b.uiNameZh && b.uiNameZh.includes(q))
    )
  }
  return result
})

function handleSearch() {
  if (searchQuery.value.trim()) {
    emit('search', searchQuery.value)
  }
}

function handleClear() {
  emit('select-building', null)
}

function toggleVoice() {
  if (isListening.value) {
    stopListening()
  } else {
    startListening()
  }
}

function startListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    ElMessage.warning('Speech recognition is not supported in this browser.')
    return
  }
  isListening.value = true
  const recognition = new SpeechRecognition()
  recognition.lang = 'en-US'
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    searchQuery.value = transcript
    emit('voice-search', transcript)
    stopListening()
  }
  recognition.onerror = () => {
    isListening.value = false
  }
  recognition.onend = () => {
    isListening.value = false
  }
  recognition.start()
}

function stopListening() {
  isListening.value = false
}
</script>

<style scoped>
.sidebar {
  width: 340px;
  height: 100vh;
  background: var(--bg-glass);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-right: 1px solid var(--border-glass);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  z-index: 10;
  box-shadow: var(--shadow-glass);
}

.sidebar-header {
  padding: 24px 20px 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon svg {
  width: 40px;
  height: 40px;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.logo-sub {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.search-section {
  padding: 0 20px 16px;
}

.mic-btn {
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid var(--border-glass) !important;
  color: var(--text-secondary) !important;
  transition: all var(--transition) !important;
}

.mic-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: var(--accent) !important;
}

.mic-btn.listening {
  background: rgba(224, 85, 106, 0.2) !important;
  border-color: var(--danger) !important;
  color: var(--danger) !important;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(224, 85, 106, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(224, 85, 106, 0); }
}

.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 20px 16px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--border-glass);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}

.filter-chip:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
}

.filter-chip.active {
  background: var(--accent-glow);
  border-color: var(--accent);
  color: var(--accent-light);
}

.building-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.building-card {
  display: flex;
  align-items: stretch;
  margin-bottom: 6px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition);
  overflow: hidden;
}

.building-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--border-glass);
  transform: translateX(4px);
}

.building-card.active {
  background: rgba(74, 144, 217, 0.1);
  border-color: rgba(74, 144, 217, 0.35);
}

.card-indicator {
  width: 3px;
  flex-shrink: 0;
  border-radius: 0 2px 2px 0;
  opacity: 0.4;
  transition: opacity var(--transition);
}

.building-card:hover .card-indicator,
.building-card.active .card-indicator {
  opacity: 1;
}

.card-indicator.academic { background: var(--accent); }
.card-indicator.culture { background: #b87fd9; }
.card-indicator.dining { background: var(--warning); }
.card-indicator.sports { background: var(--success); }
.card-indicator.admin { background: var(--text-muted); }

.card-body {
  flex: 1;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-title-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.card-icon {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 16px;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.card-name-zh {
  font-size: 11px;
  color: var(--text-muted);
}

.card-meta {
  display: flex;
  gap: 12px;
  padding-left: 26px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-muted);
  gap: 12px;
}

.empty-state p {
  font-size: 13px;
}

.sidebar-footer {
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--border-glass);
}

.footer-text {
  font-size: 11px;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
