<template>
  <div class="map-container">
    <l-map ref="mapRef" v-model:zoom="zoom" v-model:center="center" :use-global-leaflet="false"
      :options="{ zoomControl: false }"
      @click="handleMapClick"
      @ready="onMapReady">
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
          <div class="popup-content">
            <strong>🚩 起点</strong>
          </div>
        </l-popup>
      </l-marker>

      <l-marker v-if="routeEnd" :lat-lng="routeEnd" :icon="endIcon">
        <l-popup>
          <div class="popup-content">
            <strong>🏁 终点</strong>
          </div>
        </l-popup>
      </l-marker>
    </l-map>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
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

// 地图准备就绪
const onMapReady = () => {
  console.log('地图已加载')
}

// 获取当前位置
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持定位'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        currentLocation.value = [latitude, longitude]
        center.value = [latitude, longitude]
        zoom.value = 15
        emit('location-found', { lat: latitude, lng: longitude })
        resolve({ lat: latitude, lng: longitude })
      },
      (error) => {
        console.error('定位失败:', error)
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
  center.value = [lat, lng]
  zoom.value = zoomLevel
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

    // 调整视野以显示完整路线
    if (mapRef.value && newVal.bounds) {
      // 简单处理：设置中心点
      const midLat = (newVal.start[0] + newVal.end[0]) / 2
      const midLng = (newVal.start[1] + newVal.end[1]) / 2
      center.value = [midLat, midLng]
      zoom.value = 12
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

// 初始化
onMounted(() => {
  // 修复 Leaflet 默认图标问题
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
  height: 100%;
  position: relative;
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
</style>
