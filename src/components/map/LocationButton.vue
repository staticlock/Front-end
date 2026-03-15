<template>
  <button class="location-btn" :class="{ loading: isLoading, success: showSuccess }" :disabled="isLoading"
    @click="handleClick" :title="isLoading ? '定位中...' : '定位到当前位置'">
    <span class="btn-icon">
      <svg v-if="!isLoading" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
      </svg>
      <span v-else class="spinner"></span>
    </span>
    <span class="btn-text">{{ buttonText }}</span>
  </button>
</template>

<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['locate'])

const isLoading = ref(false)
const showSuccess = ref(false)
const errorMsg = ref('')

const buttonText = computed(() => {
  if (isLoading.value) return '定位中...'
  if (showSuccess.value) return '已定位'
  if (errorMsg.value) return errorMsg.value
  return '当前位置'
})

const handleClick = async () => {
  if (isLoading.value) return

  isLoading.value = true
  errorMsg.value = ''
  showSuccess.value = false

  try {
    emit('locate')
  } catch (error) {
    errorMsg.value = '定位失败'
    setTimeout(() => {
      errorMsg.value = ''
    }, 3000)
  }
}

// 暴露方法给父组件
const setLoading = (value) => {
  isLoading.value = value
}

const setSuccess = () => {
  isLoading.value = false
  showSuccess.value = true
  setTimeout(() => {
    showSuccess.value = false
  }, 2000)
}

const setError = (msg) => {
  isLoading.value = false
  errorMsg.value = msg || '定位失败'
  setTimeout(() => {
    errorMsg.value = ''
  }, 3000)
}

defineExpose({
  setLoading,
  setSuccess,
  setError
})
</script>

<style scoped>
.location-btn {
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

.location-btn:hover:not(:disabled) {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

.location-btn:active:not(:disabled) {
  transform: translateY(0);
}

.location-btn:disabled {
  cursor: not-allowed;
  opacity: 0.8;
}

.location-btn.loading {
  background: #f0f0f0;
}

.location-btn.success {
  background: #34A853;
  color: white;
}

.btn-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon svg {
  width: 100%;
  height: 100%;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ddd;
  border-top-color: #4285F4;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-text {
  white-space: nowrap;
}
</style>
