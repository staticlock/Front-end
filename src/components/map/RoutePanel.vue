<template>
  <div class="route-panel">
    <button class="route-btn" :class="{ active: showPanel }" @click="togglePanel">
      <span class="btn-icon">🚗</span>
      <span class="btn-text">路线</span>
    </button>

    <!-- 路线规划面板 -->
    <div v-if="showPanel" class="panel-content">
      <div class="panel-header">
        <span>🗺️ 路线规划</span>
        <button class="close-btn" @click="showPanel = false">✕</button>
      </div>

      <div class="panel-body">
        <!-- 出行方式选择 -->
        <div class="travel-modes">
          <button v-for="mode in travelModes" :key="mode.value" class="mode-btn"
            :class="{ active: selectedMode === mode.value }" @click="selectedMode = mode.value">
            <span>{{ mode.icon }}</span>
            <span>{{ mode.label }}</span>
          </button>
        </div>

        <!-- 起点输入 -->
        <div class="input-group">
          <span class="input-icon start">🚩</span>
          <input v-model="startInput" type="text" placeholder="输入起点或点击地图选择" @focus="activeInput = 'start'" />
          <button v-if="!startInput" class="current-btn" @click="useCurrentLocation" title="使用当前位置">
            📍
          </button>
          <button v-else class="clear-btn" @click="startInput = ''; startCoord = null">
            ✕
          </button>
        </div>

        <!-- 终点输入 -->
        <div class="input-group">
          <span class="input-icon end">🏁</span>
          <input v-model="endInput" type="text" placeholder="输入终点或点击地图选择" @focus="activeInput = 'end'" />
          <button v-if="endInput" class="clear-btn" @click="endInput = ''; endCoord = null">
            ✕
          </button>
        </div>

        <!-- 规划按钮 -->
        <button class="plan-btn" :disabled="!canPlan || loading" @click="planRoute">
          {{ loading ? '规划中...' : '开始导航' }}
        </button>
      </div>

      <!-- 路线结果 -->
      <div v-if="routeInfo" class="route-info">
        <div class="route-summary">
          <div class="summary-item">
            <span class="label">总距离</span>
            <span class="value">{{ routeInfo.distance }}</span>
          </div>
          <div class="summary-item">
            <span class="label">预计时间</span>
            <span class="value">{{ routeInfo.duration }}</span>
          </div>
        </div>
        <button class="clear-route-btn" @click="clearRoute">
          清除路线
        </button>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="error-msg">
        ⚠️ {{ errorMsg }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getRoute, formatDistance, formatDuration, reverseGeocode } from '../../utils/mapApi'

const props = defineProps({
  currentLocation: Array,
  mapClickCoord: Object
})

const emit = defineEmits(['route-planned', 'clear-route'])

const showPanel = ref(false)
const selectedMode = ref('driving')
const startInput = ref('')
const endInput = ref('')
const startCoord = ref(null)
const endCoord = ref(null)
const activeInput = ref(null)
const loading = ref(false)
const routeInfo = ref(null)
const errorMsg = ref('')

const travelModes = [
  { value: 'driving', label: '驾车', icon: '🚗' },
  { value: 'walking', label: '步行', icon: '🚶' },
  { value: 'cycling', label: '骑行', icon: '🚴' }
]

const canPlan = computed(() => {
  return startCoord.value && endCoord.value
})

const togglePanel = () => {
  showPanel.value = !showPanel.value
  if (!showPanel.value) {
    activeInput.value = null
  }
}

const useCurrentLocation = async () => {
  if (props.currentLocation) {
    startCoord.value = props.currentLocation
    const address = await reverseGeocode(
      props.currentLocation[0],
      props.currentLocation[1]
    )
    startInput.value = address?.shortName || '当前位置'
  } else {
    errorMsg.value = '请先获取当前位置'
    setTimeout(() => errorMsg.value = '', 3000)
  }
}

const planRoute = async () => {
  if (!canPlan.value) return

  loading.value = true
  errorMsg.value = ''
  routeInfo.value = null

  try {
    const start = [startCoord.value[1], startCoord.value[0]] // [lng, lat]
    const end = [endCoord.value[1], endCoord.value[0]]

    const route = await getRoute(start, end, selectedMode.value)

    if (route) {
      routeInfo.value = {
        distance: formatDistance(route.distance),
        duration: formatDuration(route.duration)
      }

      emit('route-planned', {
        geometry: route.geometry,
        start: startCoord.value,
        end: endCoord.value,
        distance: route.distance,
        duration: route.duration
      })
    } else {
      errorMsg.value = '未找到可用路线'
    }
  } catch (error) {
    console.error('路线规划失败:', error)
    errorMsg.value = '路线规划失败，请重试'
  } finally {
    loading.value = false
  }
}

const clearRoute = () => {
  routeInfo.value = null
  emit('clear-route')
}

// 监听地图点击，设置起点或终点
watch(() => props.mapClickCoord, async (coord) => {
  if (!coord || !showPanel.value || !activeInput.value) return

  const address = await reverseGeocode(coord.lat, coord.lng)
  const displayName = address?.shortName || `${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`

  if (activeInput.value === 'start') {
    startCoord.value = [coord.lat, coord.lng]
    startInput.value = displayName
  } else if (activeInput.value === 'end') {
    endCoord.value = [coord.lat, coord.lng]
    endInput.value = displayName
  }
})

defineExpose({
  showPanel
})
</script>

<style scoped>
.route-panel {
  position: relative;
}

.route-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border: none;
  border-radius: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  color: #333;
}

.route-btn:hover {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

.route-btn.active {
  background: #34A853;
  color: white;
}

.panel-content {
  position: absolute;
  top: 50px;
  right: 0;
  left: auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 300px;
  overflow: hidden;
  z-index: 100;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  padding: 4px;
}

.panel-body {
  padding: 16px;
}

.travel-modes {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.mode-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  background: #f5f5f5;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.mode-btn:hover {
  background: #e8e8e8;
}

.mode-btn.active {
  background: #e8f5e9;
  border-color: #34A853;
  color: #34A853;
}

.input-group {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
}

.input-icon {
  font-size: 16px;
  margin-right: 10px;
}

.input-group input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
}

.current-btn,
.clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
}

.plan-btn {
  width: 100%;
  padding: 12px;
  background: #4285F4;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  transition: background 0.2s;
}

.plan-btn:hover:not(:disabled) {
  background: #3367d6;
}

.plan-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.route-info {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.route-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.summary-item {
  flex: 1;
  text-align: center;
}

.summary-item .label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.summary-item .value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.clear-route-btn {
  width: 100%;
  padding: 10px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: background 0.2s;
}

.clear-route-btn:hover {
  background: #e8e8e8;
}

.error-msg {
  padding: 12px 16px;
  background: #fff3e0;
  color: #e65100;
  font-size: 13px;
  border-top: 1px solid #ffe0b2;
}
</style>
