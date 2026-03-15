<script setup>
import { ref, computed } from 'vue'
import MapView from './components/map/MapView.vue'
import SearchBox from './components/map/SearchBox.vue'
import LocationButton from './components/map/LocationButton.vue'
import DistanceTool from './components/map/DistanceTool.vue'
import RoutePanel from './components/map/RoutePanel.vue'

// 组件引用
const mapRef = ref(null)
const locationBtnRef = ref(null)
const distanceToolRef = ref(null)

// 状态
const searchResult = ref(null)
const measureMode = ref(false)
const distancePoints = ref([])
const routeData = ref(null)
const mapClickCoord = ref(null)
const currentLocation = ref(null)

// 计算属性
const currentLocationArray = computed(() => {
  return currentLocation.value
    ? [currentLocation.value.lat, currentLocation.value.lng]
    : null
})

// 搜索选择
const handleSearchSelect = (result) => {
  searchResult.value = result
}

// 清除搜索
const handleSearchClear = () => {
  searchResult.value = null
  mapRef.value?.clearSearchMarker()
}

// 定位
const handleLocate = async () => {
  locationBtnRef.value?.setLoading(true)
  try {
    await mapRef.value?.getCurrentLocation()
    locationBtnRef.value?.setSuccess()
  } catch (error) {
    locationBtnRef.value?.setError(
      error.code === 1 ? '定位被拒绝' : '定位失败'
    )
  }
}

// 位置找到
const handleLocationFound = (location) => {
  currentLocation.value = location
}

// 距离测量模式切换
const handleMeasureToggle = (active) => {
  measureMode.value = active
  if (active) {
    distancePoints.value = []
    mapRef.value?.clearDistance()
  }
}

// 距离测量完成
const handleDistanceMeasured = (data) => {
  distancePoints.value = data.points
  distanceToolRef.value?.setResult(data)
}

// 清除测量
const handleMeasureClear = () => {
  measureMode.value = false
  distancePoints.value = []
  mapRef.value?.clearDistance()
}

// 地图点击
const handleMapClick = (coord) => {
  mapClickCoord.value = { ...coord }
}

// 路线规划完成
const handleRoutePlanned = (data) => {
  routeData.value = data
}

// 清除路线
const handleClearRoute = () => {
  routeData.value = null
  mapRef.value?.clearRoute()
}
</script>

<template>
  <div class="app-container">
    <!-- 地图 -->
    <MapView ref="mapRef" :search-result="searchResult" :measure-mode="measureMode" :route-data="routeData"
      @location-found="handleLocationFound" @distance-measured="handleDistanceMeasured" @map-click="handleMapClick" />

    <!-- 顶部控制栏 -->
    <div class="top-controls">
      <SearchBox @select="handleSearchSelect" @clear="handleSearchClear" />
    </div>

    <!-- 右侧工具栏 -->
    <div class="side-controls">
      <LocationButton ref="locationBtnRef" @locate="handleLocate" />

      <DistanceTool ref="distanceToolRef" :points="distancePoints" @toggle="handleMeasureToggle"
        @clear="handleMeasureClear" />

      <RoutePanel :current-location="currentLocationArray" :map-click-coord="mapClickCoord"
        @route-planned="handleRoutePlanned" @clear-route="handleClearRoute" />
    </div>

    <!-- 底部信息 -->
    <div class="bottom-info">
      <span>🗺️ Vue 地图应用</span>
      <span class="separator">|</span>
      <span>数据来源: OpenStreetMap</span>
    </div>
  </div>
</template>

<style>
.app-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* 桌面端布局 - 默认样式 */
.top-controls {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
}

.top-controls :deep(.search-box) {
  width: 420px;
}

.top-controls :deep(.search-input-wrapper) {
  padding: 12px 20px;
}

.top-controls :deep(.search-input-wrapper input) {
  font-size: 16px;
}

.side-controls {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: row;
  gap: 12px;
}

.side-controls :deep(.location-btn),
.side-controls :deep(.measure-btn),
.side-controls :deep(.route-btn) {
  padding: 12px 20px;
  font-size: 15px;
}

.bottom-info {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 10px 24px;
  border-radius: 24px;
  font-size: 13px;
  color: #555;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.separator {
  margin: 0 12px;
  color: #ddd;
}

/* 平板端适配 */
@media (max-width: 1024px) {
  .top-controls {
    top: 20px;
    left: 20px;
  }

  .top-controls :deep(.search-box) {
    width: 360px;
  }

  .side-controls {
    top: 20px;
    right: 20px;
  }

  .side-controls :deep(.panel-content),
  .side-controls :deep(.measure-result),
  .side-controls :deep(.measure-tip) {
    top: 70px;
    right: 20px;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .top-controls {
    top: 12px;
    left: 12px;
    right: 12px;
  }

  .top-controls :deep(.search-box) {
    width: 100%;
    max-width: none;
  }

  .top-controls :deep(.search-input-wrapper) {
    padding: 10px 16px;
  }

  .top-controls :deep(.search-input-wrapper input) {
    font-size: 15px;
  }

  .side-controls {
    top: auto;
    bottom: 70px;
    right: 12px;
    flex-direction: column;
    gap: 10px;
  }

  .side-controls :deep(.location-btn),
  .side-controls :deep(.measure-btn),
  .side-controls :deep(.route-btn) {
    padding: 10px 14px;
    font-size: 13px;
  }

  .side-controls :deep(.btn-text) {
    display: none;
  }

  .side-controls :deep(.panel-content) {
    position: fixed;
    top: auto;
    bottom: 140px;
    right: 12px;
    left: 12px;
    width: auto;
  }

  .side-controls :deep(.measure-result) {
    position: fixed;
    top: auto;
    bottom: 140px;
    right: 12px;
    left: auto;
  }

  .side-controls :deep(.measure-tip) {
    position: fixed;
    top: auto;
    bottom: 140px;
    right: 12px;
    left: auto;
  }

  .bottom-info {
    bottom: 12px;
    font-size: 11px;
    padding: 8px 16px;
  }

  .separator {
    margin: 0 8px;
  }
}

/* 小屏手机适配 */
@media (max-width: 480px) {
  .top-controls {
    top: 10px;
    left: 10px;
    right: 10px;
  }

  .side-controls {
    bottom: 60px;
    right: 10px;
    gap: 8px;
  }

  .side-controls :deep(.location-btn),
  .side-controls :deep(.measure-btn),
  .side-controls :deep(.route-btn) {
    padding: 10px 12px;
    font-size: 12px;
  }

  .side-controls :deep(.panel-content) {
    right: 10px;
    left: 10px;
    bottom: 120px;
  }

  .bottom-info {
    bottom: 10px;
    font-size: 10px;
    padding: 6px 12px;
  }
}
</style>
