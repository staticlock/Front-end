<template>
  <div class="map-container">
    <l-map ref="mapRef" v-model:zoom="zoom" v-model:center="center" :use-global-leaflet="false"
      :options="{ zoomControl: false }" style="width:100%;height:100%" @click="handleMapClick" @ready="onMapReady">
      <!-- 地图图层 -->
      <l-tile-layer :url="tileUrl" :attribution="attribution" layer-type="base" name="OpenStreetMap" />

      <!-- 缩放控件移到右下角，避免与搜索框重叠 -->
      <l-control-zoom position="bottomright" />

      <!-- 当前位置标记 -->
      <l-marker v-if="currentLocation" :lat-lng="currentLocation" :icon="currentLocationIcon">
        <l-popup>
          <div class="popup-content">
            <strong>📍 我的位置</strong>
            <p v-if="currentAddress">{{ currentAddress }}</p>
          </div>
        </l-popup>
      </l-marker>

      <!-- 搜索结果标记 -->
      <l-marker v-if="searchMarker" :lat-lng="searchMarker" :icon="searchIcon">
        <l-popup :options="{ autoClose: false, closeOnClick: false }">
          <div class="popup-content">
            <strong>🔍 {{ searchMarkerInfo?.shortName }}</strong>
            <p>{{ searchMarkerInfo?.name }}</p>
          </div>
        </l-popup>
      </l-marker>

      <!-- 距离测量标记 -->
      <l-marker v-for="(point, index) in distancePoints" :key="'distance-' + index" :lat-lng="point"
        :icon="distanceIcon">
        <l-popup>
          <div class="popup-content">
            <strong>📌 测量点 {{ index + 1 }}</strong>
          </div>
        </l-popup>
      </l-marker>

      <!-- 距离测量线 -->
      <l-polyline v-if="distancePoints.length === 2" :lat-lngs="distancePoints" color="#FF6B6B" :weight="3"
        :dash-array="'10, 10'" />

      <!-- 路线显示 -->
      <l-geo-json v-if="routeGeometry" :geojson="routeGeometry" :options="routeOptions" />

      <!-- 路线起点和终点 -->
      <l-marker v-if="routeStart" :lat-lng="routeStart" :icon="startIcon">
        <l-popup>
          <div class="popup-content"><strong>🚩 起点</strong></div>
        </l-popup>
      </l-marker>

      <l-marker v-if="routeEnd" :lat-lng="routeEnd" :icon="endIcon">
        <l-popup>
          <div class="popup-content"><strong>🏁 终点</strong></div>
        </l-popup>
      </l-marker>
    </l-map>

    <!-- 定位权限提示弹窗 -->
    <transition name="fade">
      <div v-if="permissionDenied" class="permission-overlay">
        <div class="permission-dialog">
          <div class="permission-icon">📍</div>
          <h3>需要位置权限</h3>
          <p>请在浏览器地址栏点击锁形图标，允许访问位置信息，然后刷新页面。</p>
          <div class="permission-steps">
            <div class="step">
              <span class="step-num">1</span>
              <span>点击地址栏左侧的 🔒 图标</span>
            </div>
            <div class="step">
              <span class="step-num">2</span>
              <span>将"位置"权限设置为"允许"</span>
            </div>
            <div class="step">
              <span class="step-num">3</span>
              <span>刷新页面重新定位</span>
            </div>
          </div>
          <div class="permission-actions">
            <button class="btn-retry" @click="retryLocate">重试定位</button>
            <button class="btn-dismiss" @click="permissionDenied = false">稍后再说</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 定位中加载遮罩 -->
    <transition name="fade">
      <div v-if="locating" class="locating-toast">
        <span class="locating-spinner"></span>
        正在获取位置...
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import {
  LMap,
  LTileLayer,
  LMarker,
  LPopup,
  LPolyline,
  LGeoJson,
  LControlZoom
} from '@vue-leaflet/vue-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Props
const props = defineProps({
  searchResult: Object,
  measureMode: Boolean,
  routeData: Object
})

// Emits
const emit = defineEmits(['location-found', 'distance-measured', 'map-click'])

// 地图状态
const mapRef = ref(null)
const zoom = ref(13)
const center = ref([39.9042, 116.4074]) // 默认北京

// 地图图层配置
const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

// 当前位置
const currentLocation = ref(null)
const currentAddress = ref('')

// 定位状态
const locating = ref(false)
const permissionDenied = ref(false)

// 搜索标记
const searchMarker = ref(null)
const searchMarkerInfo = ref(null)

// 距离测量
const distancePoints = ref([])

// 路线
const routeGeometry = ref(null)
const routeStart = ref(null)
const routeEnd = ref(null)

// 自定义图标
const createIcon = (color, size = 25) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size]
  })
}

const currentLocationIcon = computed(() => createIcon('#4285F4', 20))
const searchIcon = computed(() => createIcon('#EA4335', 30))
const distanceIcon = computed(() => createIcon('#FF6B6B', 20))
const startIcon = computed(() => createIcon('#34A853', 25))
const endIcon = computed(() => createIcon('#EA4335', 25))

// 路线样式
const routeOptions = {
  style: {
    color: '#4285F4',
    weight: 5,
    opacity: 0.8
  }
}

// 地图准备就绪后自动定位
const onMapReady = async () => {
  await nextTick()
  // 强制 Leaflet 重新计算容器尺寸（手机端关键）
  const leafletMap = mapRef.value?.leafletObject
  if (leafletMap) {
    leafletMap.invalidateSize()
  }
  getCurrentLocation().catch(() => { })
}

// 获取当前位置
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持定位'))
      return
    }

    locating.value = true
    permissionDenied.value = false

    navigator.geolocation.getCurrentPosition(
      (position) => {
        locating.value = false
        const { latitude, longitude } = position.coords
        currentLocation.value = [latitude, longitude]
        emit('location-found', { lat: latitude, lng: longitude })
        // 使用 Leaflet 实例跳转，确保地图正确移动
        const jump = async () => {
          await nextTick()
          const leafletMap = mapRef.value?.leafletObject
          if (leafletMap) {
            leafletMap.flyTo([latitude, longitude], 15, { duration: 1.2 })
          } else {
            center.value = [latitude, longitude]
            zoom.value = 15
          }
        }
        jump()
        resolve({ lat: latitude, lng: longitude })
      },
      (error) => {
        locating.value = false
        console.error('定位失败:', error)
        if (error.code === error.PERMISSION_DENIED) {
          permissionDenied.value = true
        }
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  })
}

// 重试定位
const retryLocate = () => {
  permissionDenied.value = false
  getCurrentLocation().catch(() => { })
}

// 地图点击处理
const handleMapClick = (event) => {
  const { lat, lng } = event.latlng
  emit('map-click', { lat, lng })

  // 距离测量模式
  if (props.measureMode) {
    if (distancePoints.value.length < 2) {
      distancePoints.value.push([lat, lng])

      if (distancePoints.value.length === 2) {
        emit('distance-measured', {
          points: distancePoints.value,
          start: distancePoints.value[0],
          end: distancePoints.value[1]
        })
      }
    }
  }
}

// 清除距离测量
const clearDistance = () => {
  distancePoints.value = []
}

// 跳转到指定位置
const flyTo = (lat, lng, zoomLevel = 16) => {
  // 优先使用 Leaflet 实例的 flyTo，动画更流畅且更可靠
  const leafletMap = mapRef.value?.leafletObject
  if (leafletMap) {
    leafletMap.flyTo([lat, lng], zoomLevel, { duration: 1.2 })
  } else {
    center.value = [lat, lng]
    zoom.value = zoomLevel
  }
}

// 监听搜索结果
watch(() => props.searchResult, (newVal) => {
  if (newVal) {
    searchMarker.value = [newVal.lat, newVal.lng]
    searchMarkerInfo.value = newVal
    flyTo(newVal.lat, newVal.lng)
  }
})

// 监听路线数据
watch(() => props.routeData, (newVal) => {
  if (newVal) {
    routeGeometry.value = newVal.geometry
    routeStart.value = newVal.start
    routeEnd.value = newVal.end

    // 用 Leaflet 实例 fitBounds 展示完整路线
    const leafletMap = mapRef.value?.leafletObject
    if (leafletMap && newVal.geometry?.coordinates?.length) {
      try {
        // GeoJSON coordinates 是 [lng, lat]，转换为 Leaflet 需要的 [lat, lng]
        const coords = newVal.geometry.coordinates.map(c => [c[1], c[0]])
        const bounds = L.latLngBounds(coords)
        leafletMap.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 })
      } catch {
        // fallback：跳到中点
        const midLat = (newVal.start[0] + newVal.end[0]) / 2
        const midLng = (newVal.start[1] + newVal.end[1]) / 2
        leafletMap.flyTo([midLat, midLng], 13, { duration: 1 })
      }
    }
  }
}, { deep: true })

// 清除路线
const clearRoute = () => {
  routeGeometry.value = null
  routeStart.value = null
  routeEnd.value = null
}

// 清除搜索标记
const clearSearchMarker = () => {
  searchMarker.value = null
  searchMarkerInfo.value = null
}

// 暴露方法给父组件
defineExpose({
  getCurrentLocation,
  flyTo,
  clearDistance,
  clearRoute,
  clearSearchMarker,
  currentLocation
})

// 初始化 - 修复 Leaflet 默认图标问题
onMounted(() => {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
  })
})
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
  /* 兼容旧版浏览器 */
  height: 100dvh;
  /* 现代手机浏览器动态视口 */
  position: relative;
}

/* 确保 Leaflet 地图容器撑满 */
:deep(.leaflet-container) {
  width: 100% !important;
  height: 100% !important;
  position: absolute !important;
  top: 0;
  left: 0;
}

.popup-content {
  min-width: 150px;
}

.popup-content strong {
  display: block;
  margin-bottom: 5px;
  color: #333;
}

.popup-content p {
  margin: 0;
  font-size: 12px;
  color: #666;
  word-break: break-all;
}

:deep(.custom-marker) {
  background: transparent !important;
  border: none !important;
}

/* 权限提示弹窗 */
.permission-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.permission-dialog {
  background: white;
  border-radius: 16px;
  padding: 32px 28px;
  max-width: 380px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.permission-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.permission-dialog h3 {
  font-size: 20px;
  font-weight: 600;
  color: #222;
  margin-bottom: 10px;
}

.permission-dialog>p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
}

.permission-steps {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 20px;
  text-align: left;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
  color: #444;
  border-bottom: 1px solid #eee;
}

.step:last-child {
  border-bottom: none;
}

.step-num {
  width: 22px;
  height: 22px;
  background: #4285F4;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
}

.permission-actions {
  display: flex;
  gap: 12px;
}

.btn-retry {
  flex: 1;
  padding: 12px;
  background: #4285F4;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-retry:hover {
  background: #3367d6;
}

.btn-dismiss {
  flex: 1;
  padding: 12px;
  background: #f0f0f0;
  color: #555;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-dismiss:hover {
  background: #e0e0e0;
}

/* 定位中 toast */
.locating-toast {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.72);
  color: white;
  padding: 10px 20px;
  border-radius: 24px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 2000;
  pointer-events: none;
}

.locating-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
