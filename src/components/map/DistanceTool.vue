<template>
  <div class="distance-tool">
    <button class="measure-btn" :class="{ active: isActive }" @click="toggleMeasure">
      <span class="btn-icon">📏</span>
      <span class="btn-text">{{ isActive ? '测量中' : '测距' }}</span>
    </button>

    <!-- 测量结果面板 -->
    <div v-if="measureResult" class="measure-result">
      <div class="result-header">
        <span>📏 测量结果</span>
        <button class="close-btn" @click="clearMeasure">✕</button>
      </div>
      <div class="result-body">
        <div class="result-row">
          <span class="label">直线距离</span>
          <span class="value">{{ measureResult.distance }}</span>
        </div>
        <div class="result-row">
          <span class="label">起点坐标</span>
          <span class="value small">{{ formatCoord(measureResult.start) }}</span>
        </div>
        <div class="result-row">
          <span class="label">终点坐标</span>
          <span class="value small">{{ formatCoord(measureResult.end) }}</span>
        </div>
      </div>
      <div class="result-footer">
        <button class="action-btn" @click="clearMeasure">重新测量</button>
      </div>
    </div>

    <!-- 提示 -->
    <div v-if="isActive && !measureResult" class="measure-tip">
      <span>👆 点击地图选择{{ pointCount === 0 ? '起点' : '终点' }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { calculateDistance, formatDistance } from '../../utils/mapApi'

const props = defineProps({
  points: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['toggle', 'clear'])

const isActive = ref(false)
const measureResult = ref(null)

const pointCount = computed(() => props.points.length)

const toggleMeasure = () => {
  if (measureResult.value) {
    clearMeasure()
    return
  }
  isActive.value = !isActive.value
  emit('toggle', isActive.value)
}

const clearMeasure = () => {
  isActive.value = false
  measureResult.value = null
  emit('clear')
}

// 仅重置UI状态，不触发事件（供外部调用避免循环）
const resetState = () => {
  isActive.value = false
  measureResult.value = null
}

const setResult = (data) => {
  if (data.points && data.points.length === 2) {
    const [start, end] = data.points
    const distance = calculateDistance(start[0], start[1], end[0], end[1])
    measureResult.value = {
      distance: formatDistance(distance),
      start: data.start,
      end: data.end
    }
    isActive.value = false
  }
}

const formatCoord = (coord) => {
  if (!coord) return ''
  return `${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}`
}

defineExpose({
  setResult,
  clearMeasure,
  resetState
})
</script>

<style scoped>
.distance-tool {
  position: relative;
}

.measure-btn {
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

.measure-btn:hover {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

.measure-btn.active {
  background: #4285F4;
  color: white;
}

.btn-icon {
  font-size: 16px;
}

.measure-result {
  position: absolute;
  top: 50px;
  right: 0;
  left: auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 220px;
  overflow: hidden;
  z-index: 100;
}

.result-header {
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
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.result-body {
  padding: 12px 16px;
}

.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.result-row:last-child {
  border-bottom: none;
}

.label {
  font-size: 13px;
  color: #666;
}

.value {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.value.small {
  font-size: 11px;
  font-weight: normal;
  color: #999;
}

.result-footer {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  width: 100%;
  padding: 10px;
  background: #4285F4;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #3367d6;
}

.measure-tip {
  position: absolute;
  top: 50px;
  right: 0;
  left: auto;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  white-space: nowrap;
  z-index: 100;
}

/* ====== 手机端：面板从底部弹出 ====== */
@media (max-width: 768px) {
  .distance-tool {
    position: static;
  }

  .measure-result {
    position: fixed !important;
    top: auto !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.2);
    z-index: 2000 !important;
  }

  .result-header {
    position: relative;
    padding-top: 20px;
  }

  .result-header::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 4px;
    background: #ccc;
    border-radius: 2px;
  }

  .measure-tip {
    position: fixed !important;
    top: auto !important;
    bottom: 110px !important;
    right: 70px !important;
    left: auto !important;
  }
}
</style>
