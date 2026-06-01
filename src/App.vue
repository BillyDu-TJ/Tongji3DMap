<template>
  <div class="app-layout">
    <Sidebar
      :buildings="buildings"
      :selected-building="selectedBuilding"
      @select-building="handleSelectBuilding"
      @search="handleSearch"
      @voice-search="handleVoiceSearch"
    />
    <main class="main-area">
      <CampusMap
        ref="campusMapRef"
        :buildings="buildings"
        :selected-building="selectedBuilding"
        :navigation-path="navigationPath"
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

const campusMapRef = ref(null)

const buildings = ref([
  {
    id: 'library',
    name: 'Siping Library',
    nameZh: '四平路校区图书馆',
    category: 'academic',
    icon: 'Reading',
    position: { x: 0.3, y: 0.45 },
    description: 'The main library of Tongji University Siping Campus, housing over 3 million volumes across 12 floors.',
    openTime: '07:30 - 22:30',
    floors: 12,
    area: '36,000 m²',
    crowdLevel: 'medium'
  },
  {
    id: 'zhonghe',
    name: 'Zhonghe Building',
    nameZh: '衷和楼',
    category: 'academic',
    icon: 'OfficeBuilding',
    position: { x: 0.55, y: 0.35 },
    description: 'The iconic comprehensive teaching building, featuring modern lecture halls and panoramic city views from the top floor.',
    openTime: '06:00 - 22:00',
    floors: 20,
    area: '45,000 m²',
    crowdLevel: 'high'
  },
  {
    id: 'auditorium',
    name: 'Grand Auditorium',
    nameZh: '大礼堂',
    category: 'culture',
    icon: 'Mic',
    position: { x: 0.4, y: 0.6 },
    description: 'The historic 1,200-seat auditorium hosting major university ceremonies and cultural performances since 1961.',
    openTime: '08:00 - 21:00',
    floors: 2,
    area: '8,000 m²',
    crowdLevel: 'low'
  },
  {
    id: 'south',
    name: 'South Teaching Building',
    nameZh: '南楼',
    category: 'academic',
    icon: 'School',
    position: { x: 0.25, y: 0.55 },
    description: 'Main teaching building for science and engineering courses with 80+ classrooms.',
    openTime: '06:30 - 22:00',
    floors: 6,
    area: '20,000 m²',
    crowdLevel: 'high'
  },
  {
    id: 'north',
    name: 'North Teaching Building',
    nameZh: '北楼',
    category: 'academic',
    icon: 'School',
    position: { x: 0.5, y: 0.55 },
    description: 'Teaching building primarily for humanities and social sciences departments.',
    openTime: '06:30 - 22:00',
    floors: 6,
    area: '18,000 m²',
    crowdLevel: 'medium'
  },
  {
    id: 'ruian',
    name: 'Ruian Building',
    nameZh: '瑞安楼',
    category: 'admin',
    icon: 'Stamp',
    position: { x: 0.6, y: 0.5 },
    description: 'Administration and research center, housing key university management offices and conference facilities.',
    openTime: '08:00 - 17:30',
    floors: 10,
    area: '15,000 m²',
    crowdLevel: 'medium'
  },
  {
    id: 'xueyuan',
    name: 'Xueyuan Canteen',
    nameZh: '学苑食堂',
    category: 'dining',
    icon: 'Food',
    position: { x: 0.35, y: 0.7 },
    description: 'The largest student canteen on campus, serving a wide variety of Chinese and international cuisine.',
    openTime: '06:30 - 09:00 / 11:00 - 13:00 / 17:00 - 19:00',
    floors: 3,
    area: '12,000 m²',
    crowdLevel: 'high'
  },
  {
    id: 'gym',
    name: 'Sports Complex',
    nameZh: '综合体育馆',
    category: 'sports',
    icon: 'TrophyBase',
    position: { x: 0.7, y: 0.65 },
    description: 'Modern indoor sports facility with basketball courts, swimming pool, and fitness center.',
    openTime: '08:00 - 22:00',
    floors: 4,
    area: '18,000 m²',
    crowdLevel: 'medium'
  }
])

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

function handleSelectBuilding(building) {
  selectedBuilding.value = building
  if (campusMapRef.value) {
    campusMapRef.value.flyToBuilding(building)
  }
  navigationPath.value = null
}

function handleSearch(query) {
  const found = buildings.value.find(
    b => b.name.toLowerCase().includes(query.toLowerCase()) ||
         b.nameZh.includes(query)
  )
  if (found) {
    handleSelectBuilding(found)
  }
}

function handleVoiceSearch(buildingName) {
  const found = buildings.value.find(
    b => b.name.toLowerCase().includes(buildingName.toLowerCase()) ||
         b.nameZh.includes(buildingName)
  )
  if (found) {
    handleSelectBuilding(found)
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
