<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg w-[800px] h-[600px] flex flex-col">
      <!-- 모달 헤더 -->
      <div class="flex justify-between items-center p-4 border-b">
        <h2 class="text-lg font-semibold text-gray-800">작업지시서 검색</h2>
        <button 
          @click="$emit('close')"
          class="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>

      <!-- 검색 영역 -->
      <div class="p-4 border-b">
        <div class="flex gap-2">
          <input 
            v-model="searchTerm"
            @keyup.enter="searchWorkOrders"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="작업지시서 번호 또는 비고로 검색"
          />
          <button 
            @click="searchWorkOrders"
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            검색
          </button>
        </div>
      </div>

      <!-- 검색 결과 -->
      <div class="flex-1 overflow-auto p-4">
        <div v-if="loading" class="text-center py-8 text-gray-500">
          검색 중...
        </div>
        
        <div v-else-if="workOrders.length === 0" class="text-center py-8 text-gray-500">
          검색 결과가 없습니다.
        </div>
        
        <div v-else class="space-y-2">
          <div 
            v-for="workOrder in workOrders" 
            :key="workOrder.work_order_no"
            @click="selectWorkOrder(workOrder)"
            class="p-3 border border-gray-200 rounded-md hover:bg-blue-50 cursor-pointer transition-colors"
          >
            <div class="flex justify-between items-start">
              <div>
                <div class="font-medium text-gray-800">{{ workOrder.work_order_no }}</div>
                <div class="text-sm text-gray-600 mt-1">
                  계획ID: {{ workOrder.plan_id || '-' }}
                </div>
                <div class="text-sm text-gray-600">
                  작성일: {{ formatDate(workOrder.write_date) }}
                </div>
                <div v-if="workOrder.order_remark" class="text-sm text-gray-500 mt-1">
                  비고: {{ workOrder.order_remark }}
                </div>
              </div>
              <div class="text-right text-sm text-gray-500">
                <div v-if="workOrder.order_start_dt">
                  시작: {{ formatDate(workOrder.order_start_dt) }}
                </div>
                <div v-if="workOrder.order_end_dt">
                  종료: {{ formatDate(workOrder.order_end_dt) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 모달 푸터 -->
      <div class="p-4 border-t flex justify-end">
        <button 
          @click="$emit('close')"
          class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
        >
          취소
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// Props & Emits
const emit = defineEmits(['select', 'close'])

// 상태
const searchTerm = ref('')
const workOrders = ref([])
const loading = ref(false)

// 메서드
const searchWorkOrders = async () => {
  loading.value = true
  try {
    const res = await axios.get('/workOrder/search', {
      params: { q: searchTerm.value }
    })
    workOrders.value = res.data || []
  } catch (err) {
    console.error('작업지시서 검색 오류:', err)
    alert('작업지시서 검색에 실패했습니다.')
  } finally {
    loading.value = false
  }
}

const selectWorkOrder = (workOrder) => {
  emit('select', workOrder)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('ko-KR')
}

// 마운트 시 전체 목록 로딩
onMounted(() => {
  searchWorkOrders()
})
</script>

<style scoped>
/* 모달 스타일 */
.z-50 {
  z-index: 9999;
}
</style>