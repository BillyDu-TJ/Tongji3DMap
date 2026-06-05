<template>
  <section class="dashboard">
    <div class="dashboard-inner">
      <!-- Global Stats -->
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

      <!-- Trending / Hot Spots -->
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

      <!-- Selected Building Detail -->
      <div class="selected-info" v-if="selectedBuilding">
        <div class="selected-header">
          <span class="selected-dot" :class="selectedBuilding.crowdLevel"></span>
          <span class="selected-name">{{ selectedBuilding.uiName }}</span>
          <span class="selected-name-zh">{{ selectedBuilding.uiNameZh }}</span>
        </div>

        <div class="selected-divider"></div>

        <div class="selected-details">
          <!-- Open Time -->
          <div class="detail-item">
            <el-icon class="detail-icon"><Clock /></el-icon>
            <div class="detail-content">
              <span class="detail-label">Open Hours</span>
              <span class="detail-value">{{ selectedBuilding.openTime }}</span>
            </div>
          </div>

          <!-- Daily Visitors -->
          <div class="detail-item">
            <el-icon class="detail-icon"><UserFilled /></el-icon>
            <div class="detail-content">
              <span class="detail-label">Today's Visitors</span>
              <span class="detail-value">{{ (selectedBuilding.dailyVisitors || 0).toLocaleString() }}</span>
            </div>
          </div>

          <!-- Area & Floors -->
          <div class="detail-item">
            <el-icon class="detail-icon"><OfficeBuilding /></el-icon>
            <div class="detail-content">
              <span class="detail-label">Size</span>
              <span class="detail-value">{{ selectedBuilding.area }} · {{ selectedBuilding.floors }} Floors</span>
            </div>
          </div>

          <!-- Crowd Level Bar -->
          <div class="detail-item crowd-item">
            <el-icon class="detail-icon"><Connection /></el-icon>
            <div class="detail-content crowd-content">
              <div class="crowd-header">
                <span class="detail-label">Crowd Level</span>
                <span class="crowd-percent">{{ selectedBuilding.crowdPercent || 0 }}%</span>
              </div>
              <div class="crowd-bar-track">
                <div
                  class="crowd-bar-fill"
                  :class="selectedBuilding.crowdLevel"
                  :style="{ width: (selectedBuilding.crowdPercent || 0) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="selected-description" v-if="selectedBuilding.description">
          {{ selectedBuilding.description }}
        </div>
      </div>

      <!-- Empty state -->
      <div class="selected-info empty" v-else>
        <el-icon class="empty-icon"><InfoFilled /></el-icon>
        <span class="hint-text">Click a building on the map or sidebar to view details</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { UserFilled, Connection, Clock, TrendCharts, OfficeBuilding, InfoFilled } from '@element-plus/icons-vue'

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
  min-height: 88px;
  border-top: 1px solid var(--border-glass);
  background: var(--bg-glass);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  flex-shrink: 0;
  z-index: 10;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.dashboard-inner {
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 20px;
  height: 100%;
}

/* ============ Stats Group ============ */
.stat-group {
  display: flex;
  gap: 22px;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.stat-icon.visitors { background: rgba(74, 144, 217, 0.15); color: var(--accent); }
.stat-icon.active { background: rgba(76, 175, 136, 0.15); color: var(--success); }
.stat-icon.time { background: rgba(229, 168, 85, 0.15); color: var(--warning); }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 14px;
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

/* ============ Divider ============ */
.divider {
  width: 1px;
  height: 32px;
  background: var(--border-glass);
  flex-shrink: 0;
}

/* ============ Hot Spots ============ */
.hot-spots {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.hot-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hot-tags {
  display: flex;
  gap: 6px;
}

.hot-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(229, 168, 85, 0.1);
  color: var(--warning);
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
}

/* ============ Selected Building ============ */
.selected-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  overflow: hidden;
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
  flex-shrink: 0;
}

.selected-dot.low { background: var(--success); box-shadow: 0 0 6px rgba(76, 175, 136, 0.5); }
.selected-dot.medium { background: var(--warning); box-shadow: 0 0 6px rgba(229, 168, 85, 0.5); }
.selected-dot.high { background: var(--danger); box-shadow: 0 0 6px rgba(224, 85, 106, 0.5); }

.selected-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}

.selected-name-zh {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}

.selected-divider {
  width: 1px;
  height: 20px;
  background: var(--border-glass);
  flex-shrink: 0;
}

/* ============ Detail Items ============ */
.selected-details {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.detail-icon {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
  flex-shrink: 0;
}

.detail-content {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: 9px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.detail-value {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

/* ============ Crowd Bar ============ */
.crowd-item {
  min-width: 100px;
}

.crowd-content {
  flex: 1;
  gap: 3px;
}

.crowd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.crowd-percent {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.crowd-bar-track {
  width: 80px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.crowd-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.crowd-bar-fill.low { background: var(--success); }
.crowd-bar-fill.medium { background: var(--warning); }
.crowd-bar-fill.high { background: var(--danger); }

/* ============ Description ============ */
.selected-description {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  flex-shrink: 1;
}

/* ============ Empty State ============ */
.empty-icon {
  color: var(--text-muted);
  font-size: 18px;
}

.hint-text {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
}
</style>
