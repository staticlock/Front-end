<template>
  <div class="search-box">
    <div class="search-input-wrapper">
      <span class="search-icon">🔍</span>
      <input v-model="searchQuery" type="text" placeholder="搜索地点、地址..." @input="handleInput" @focus="showResults = true"
        @keydown.enter="handleEnter" @keydown.down.prevent="navigateDown" @keydown.up.prevent="navigateUp" />
      <button v-if="searchQuery" class="clear-btn" @click="clearSearch">
        ✕
      </button>
    </div>

    <!-- 搜索结果列表 -->
    <div v-if="showResults && (results.length > 0 || loading)" class="search-results">
      <div v-if="loading" class="loading">
        <span class="spinner"></span>
        搜索中...
      </div>

      <div v-for="(result, index) in results" :key="result.id" class="result-item"
        :class="{ active: index === activeIndex }" @click="selectResult(result)" @mouseenter="activeIndex = index">
        <span class="result-icon">📍</span>
        <div class="result-info">
          <div class="result-name">{{ result.shortName }}</div>
          <div class="result-address">{{ result.name }}</div>
        </div>
      </div>

      <div v-if="!loading && results.length === 0 && searchQuery.length >= 2" class="no-results">
        未找到相关地点
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { searchPlaces, debounce } from '../../utils/mapApi'

const emit = defineEmits(['select', 'clear'])

const searchQuery = ref('')
const results = ref([])
const loading = ref(false)
const showResults = ref(false)
const activeIndex = ref(-1)

// 防抖搜索
const debouncedSearch = debounce(async (query) => {
  if (!query || query.length < 2) {
    results.value = []
    loading.value = false
    return
  }

  loading.value = true
  try {
    results.value = await searchPlaces(query, 8)
  } catch (error) {
    console.error('搜索失败:', error)
    results.value = []
  } finally {
    loading.value = false
  }
}, 500)

const handleInput = () => {
  activeIndex.value = -1
  if (searchQuery.value.length >= 2) {
    loading.value = true
    debouncedSearch(searchQuery.value)
  } else {
    results.value = []
    loading.value = false
  }
}

const selectResult = (result) => {
  searchQuery.value = result.shortName
  showResults.value = false
  emit('select', result)
}

const clearSearch = () => {
  searchQuery.value = ''
  results.value = []
  showResults.value = false
  activeIndex.value = -1
  emit('clear')
}

const handleEnter = () => {
  if (activeIndex.value >= 0 && results.value[activeIndex.value]) {
    selectResult(results.value[activeIndex.value])
  } else if (results.value.length > 0) {
    selectResult(results.value[0])
  }
}

const navigateDown = () => {
  if (results.value.length > 0) {
    activeIndex.value = (activeIndex.value + 1) % results.value.length
  }
}

const navigateUp = () => {
  if (results.value.length > 0) {
    activeIndex.value = activeIndex.value <= 0
      ? results.value.length - 1
      : activeIndex.value - 1
  }
}

// 点击外部关闭搜索结果
const handleClickOutside = (event) => {
  const searchBox = document.querySelector('.search-box')
  if (searchBox && !searchBox.contains(event.target)) {
    showResults.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.search-box {
  position: relative;
  width: 100%;
  max-width: 400px;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 24px;
  padding: 8px 16px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.3s;
}

.search-input-wrapper:focus-within {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.search-icon {
  font-size: 18px;
  margin-right: 10px;
}

.search-input-wrapper input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  background: transparent;
}

.search-input-wrapper input::placeholder {
  color: #999;
}

.clear-btn {
  background: #eee;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: #ddd;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #666;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #eee;
  border-top-color: #4285F4;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.result-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover,
.result-item.active {
  background: #f5f5f5;
}

.result-icon {
  font-size: 20px;
  margin-right: 12px;
  margin-top: 2px;
}

.result-info {
  flex: 1;
  overflow: hidden;
}

.result-name {
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.result-address {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-results {
  padding: 20px;
  text-align: center;
  color: #999;
}
</style>
