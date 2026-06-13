<template>
  <div class="app-layout">
    <Sidebar
      :buildings="buildings"
      :selected-building="selectedBuilding"
      @select-building="handleSelectBuilding"
      @search="handleSearch"
      @voice-search="handleVoiceSearch"
      @start-navigation="handleStartNavigation"
    />
    <main class="main-area">
      <CampusMap
        ref="campusMapRef"
        :buildings="buildings"
        :selected-building="selectedBuilding"
        :navigation-path="navigationPath"
        @building-click="handleBuildingClick"
        @clear-selection="handleClearSelection"
      />
      <Dashboard
        :selected-building="selectedBuilding"
        :buildings="buildings"
        :stats="stats"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import Sidebar from './components/Sidebar.vue'
import CampusMap from './components/CampusMap.vue'
import Dashboard from './components/Dashboard.vue'
import buildingsData from './assets/buildings.json'

const campusMapRef = ref(null)

const buildings = ref(buildingsData)

const selectedBuilding = ref(null)
const navigationPath = ref(null)

const stats = reactive({
  totalVisitors: 12847,
  activeUsers: 342,
  hotSpots: ['Zhonghe Building', 'Xueyuan Canteen', 'Library'],
  currentTime: new Date()
})

setInterval(() => {
  stats.currentTime = new Date()
  stats.totalVisitors += Math.floor(Math.random() * 5)
  stats.activeUsers = 300 + Math.floor(Math.random() * 100)
}, 3000)

function normalizeBuildingName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s_·.,，。!?！？、:：;；"'“”‘’()（）-]/g, '')
}

function getBuildingNameCandidates(building) {
  return [
    building.uiNameZh,
    building.uiName,
    building.modelName,
    building.modelName?.replace(/_/g, ' ')
  ].filter(Boolean)
}

function findBuildingByName(queryText) {
  const query = normalizeBuildingName(queryText)
  if (!query) return null

  const candidates = buildings.value.flatMap(building =>
    getBuildingNameCandidates(building).map(name => ({
      building,
      normalizedName: normalizeBuildingName(name)
    }))
  ).filter(item => item.normalizedName)

  const exact = candidates.find(item => item.normalizedName === query)
  if (exact) return exact.building

  const queryContainsName = candidates
    .filter(item => query.includes(item.normalizedName))
    .sort((a, b) => b.normalizedName.length - a.normalizedName.length)
  if (queryContainsName.length) return queryContainsName[0].building

  const partialMatches = candidates.filter(item => item.normalizedName.includes(query))
  const uniqueMatches = [...new Map(partialMatches.map(item => [item.building.id, item.building])).values()]
  return uniqueMatches.length === 1 ? uniqueMatches[0] : null
}

// Sidebar click → fly to building on map
function handleSelectBuilding(building) {
  selectedBuilding.value = building
  if (building && campusMapRef.value && building.modelName) {
    campusMapRef.value.flyToBuilding(building.modelName)
  } else if (!building && campusMapRef.value) {
    campusMapRef.value.clearSelection()
  }
  navigationPath.value = null
}

// Search by text query
function handleSearch(query) {
  const found = findBuildingByName(query)
  if (found) {
    handleSelectBuilding(found)
  }
}

// Voice search result
function handleVoiceSearch(buildingName) {
  const found = findBuildingByName(buildingName)
  if (found) {
    handleSelectBuilding(found)
  }
}

// Map click → update selected building in sidebar & dashboard
function handleBuildingClick(meshName) {
  // Use modelName to find the building
  const found = buildings.value.find(
    b => b.modelName === meshName
  )
  if (found) {
    selectedBuilding.value = found
    navigationPath.value = null
  }
}

// 地图卡片关闭 / 点击空白 → 清除选中
function handleClearSelection() {
  selectedBuilding.value = null
  navigationPath.value = null
}

function handleStartNavigation() {
  selectedBuilding.value = null
  navigationPath.value = null
  if (campusMapRef.value) {
    campusMapRef.value.startNavigation()
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  width: 100%;
  height: 100vh;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
}
</style>
