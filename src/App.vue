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
const routePanelRef = ref(null)

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

// 导航到搜索结果
const handleNavigateTo = () => {
  if (!searchResult.value) return
  handleMeasureClear()
  routePanelRef.value?.navigateTo(searchResult.value)
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
    // 关闭路线规划面板（不触发事件）
    routePanelRef.value?.closePanel()
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
  distanceToolRef.value?.resetState()
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
      <transition name="slide-in">
        <button
          v-if="searchResult"
          class="navigate-btn"
          @click="handleNavigateTo"
        >
          🚀 到这去
        </button>
      </transition>
    </div>

    <!-- 右侧工具栏 -->
    <div class="side-controls">
      <LocationButton ref="locationBtnRef" @locate="handleLocate" />

      <DistanceTool ref="distanceToolRef" :points="distancePoints" @toggle="handleMeasureToggle"
        @clear="handleMeasureClear" />

      <RoutePanel ref="routePanelRef" :current-location="currentLocationArray" :map-click-coord="mapClickCoord"
        @open="handleMeasureClear"
        @route-planned="handleRoutePlanned" @clear-route="handleClearRoute" />
    </div>

  </div>
</template>

<style>
.app-container {
  width: 100%;
  height: 100%;
  height: 100dvh;
  position: relative;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* ====== 桌面端布局（默认）====== */
.top-controls {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  gap: 10px;
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

.navigate-btn {
  padding: 12px 20px;
  background: #FF6B35;
  color: white;
  border: none;
  border-radius: 24px;
  box-shadow: 0 2px 10px rgba(255, 107, 53, 0.4);
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s;
}

.navigate-btn:hover {
  background: #e55a25;
  box-shadow: 0 4px 16px rgba(255, 107, 53, 0.5);
  transform: translateY(-1px);
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
  white-space: nowrap;
}

.separator {
  margin: 0 12px;
  color: #ddd;
}

/* 滑入动画 */
.slide-in-enter-active,
.slide-in-leave-active {
  transition: all 0.25s ease;
}
.slide-in-enter-from,
.slide-in-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* ====== 平板端（≤1024px）====== */
@media (max-width: 1024px) {
  .top-controls :deep(.search-box) { width: 320px; }
  .side-controls :deep(.location-btn),
  .side-controls :deep(.measure-btn),
  .side-controls :deep(.route-btn) { padding: 10px 16px; font-size: 14px; }
}

/* ====== 手机端（≤768px）====== */
@media (max-width: 768px) {
  /* 顶部搜索栏：全宽 + 安全区 */
  .top-controls {
    top: 12px;
    left: 12px;
    right: 12px;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .top-controls :deep(.search-box) {
    flex: 1;
    width: auto;
    min-width: 0;
    max-width: none;
  }

  .top-controls :deep(.search-input-wrapper) {
    padding: 10px 14px;
    border-radius: 20px;
  }

  .top-controls :deep(.search-input-wrapper input) {
    font-size: 15px;
  }

  .navigate-btn {
    padding: 10px 16px;
    font-size: 14px;
    border-radius: 20px;
  }

  /* 工具按钮：移到右下角缩放控件上方，垂直排列，圆形图标按钮 */
  .side-controls {
    top: auto;
    right: 12px;
    bottom: 100px; /* 留出缩放控件(~70px) + 间距 */
    flex-direction: column;
    gap: 10px;
    align-items: flex-end;
  }

  .side-controls :deep(.location-btn),
  .side-controls :deep(.measure-btn),
  .side-controls :deep(.route-btn) {
    width: 48px;
    height: 48px;
    padding: 0;
    border-radius: 50%;
    justify-content: center;
    font-size: 20px;
  }

  /* 手机上只显示图标，隐藏文字 */
  .side-controls :deep(.btn-text) {
    display: none;
  }

  .side-controls :deep(.btn-icon) {
    font-size: 22px;
    margin: 0;
  }

  /* 面板从底部弹出，全宽 */
  .side-controls :deep(.panel-content) {
    position: fixed !important;
    top: auto !important;
    bottom: 0 !important;
    right: 0 !important;
    left: 0 !important;
    width: 100% !important;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.18);
    max-height: 80vh;
    overflow-y: auto;
  }

  .side-controls :deep(.measure-result) {
    position: fixed !important;
    top: auto !important;
    bottom: 0 !important;
    right: 0 !important;
    left: 0 !important;
    width: 100% !important;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.18);
  }

  .side-controls :deep(.measure-tip) {
    position: fixed !important;
    top: auto !important;
    bottom: 80px !important;
    right: 70px !important;
    left: auto !important;
    font-size: 13px;
  }

  /* 缩放控件固定在右下角，与工具按钮不重叠 */
  :deep(.leaflet-bottom.leaflet-right) {
    bottom: 16px !important;
    right: 12px !important;
  }

  :deep(.leaflet-control-zoom) {
    margin: 0 !important;
  }

  /* 搜索结果下拉框宽度修正 */
  .top-controls :deep(.search-results) {
    position: fixed;
    top: 68px;
    left: 12px;
    right: 12px;
    max-height: 50vh;
  }

  /* 底部版权信息 */
  .bottom-info {
    bottom: 8px;
    font-size: 11px;
    padding: 6px 14px;
  }

  .separator { margin: 0 6px; }
}

/* ====== 小屏手机（≤480px）====== */
@media (max-width: 480px) {
  .top-controls {
    top: 10px;
    left: 10px;
    right: 10px;
  }

  .side-controls {
    right: 10px;
    bottom: 96px;
  }

  .side-controls :deep(.location-btn),
  .side-controls :deep(.measure-btn),
  .side-controls :deep(.route-btn) {
    width: 44px;
    height: 44px;
  }
}
</style>
