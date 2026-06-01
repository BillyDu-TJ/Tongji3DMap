<template>
  <section class="dashboard">
    <div class="dashboard-inner">
      <div class="stat-group">
        <div class="stat-item">
          <div class="stat-icon visitors">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.totalVisitors.toLocaleString() }}</span>
            <span class="stat-label">Daily Visitors</span>
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-icon active">
            <el-icon><Connection /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.activeUsers }}</span>
            <span class="stat-label">Active Now</span>
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-icon time">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <span class="stat-value">{{ formatTime(stats.currentTime) }}</span>
            <span class="stat-label">Current Time</span>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="hot-spots">
        <span class="hot-label">Trending</span>
        <div class="hot-tags">
          <span v-for="spot in stats.hotSpots" :key="spot" class="hot-tag">
            <el-icon><TrendCharts /></el-icon>
            {{ spot }}
          </span>
        </div>
      </div>

      <div class="divider"></div>

      <div class="selected-info" v-if="selectedBuilding">
        <div class="selected-header">
          <span class="selected-dot" :class="selectedBuilding.crowdLevel"></span>
          <span class="selected-name">{{ selectedBuilding.name }}</span>
        </div>
        <div class="selected-details">
          <span>{{ selectedBuilding.area }}</span>
          <span>{{ selectedBuilding.floors }} Floors</span>
          <span>Crowd: {{ selectedBuilding.crowdLevel }}</span>
        </div>
      </div>
      <div class="selected-info empty" v-else>
        <span class="hint-text">Select a building to view details</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { UserFilled, Connection, Clock, TrendCharts } from '@element-plus/icons-vue'

defineProps({
  selectedBuilding: { type: Object, default: null },
  buildings: { type: Array, required: true },
  stats: { type: Object, required: true }
})

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<style scoped>
.dashboard {
  height: 80px;
  border-top: 1px solid var(--border-glass);
  background: var(--bg-glass);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  flex-shrink: 0;
  z-index: 10;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.3);
}

.dashboard-inner {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 28px;
  gap: 24px;
}

.stat-group {
  display: flex;
  gap: 28px;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.stat-icon.visitors { background: rgba(74, 144, 217, 0.15); color: var(--accent); }
.stat-icon.active { background: rgba(76, 175, 136, 0.15); color: var(--success); }
.stat-icon.time { background: rgba(229, 168, 85, 0.15); color: var(--warning); }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.2px;
}

.stat-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.divider {
  width: 1px;
  height: 36px;
  background: var(--border-glass);
  flex-shrink: 0;
}

.hot-spots {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.hot-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hot-tags {
  display: flex;
  gap: 8px;
}

.hot-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(229, 168, 85, 0.1);
  color: var(--warning);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.selected-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}

.selected-info.empty {
  justify-content: flex-end;
}

.selected-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.selected-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.selected-dot.low { background: var(--success); box-shadow: 0 0 6px rgba(76, 175, 136, 0.4); }
.selected-dot.medium { background: var(--warning); box-shadow: 0 0 6px rgba(229, 168, 85, 0.4); }
.selected-dot.high { background: var(--danger); box-shadow: 0 0 6px rgba(224, 85, 106, 0.4); }

.selected-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.selected-details {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: var(--text-secondary);
}

.hint-text {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}
</style>
