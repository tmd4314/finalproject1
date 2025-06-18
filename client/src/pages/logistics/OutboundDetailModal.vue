<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
      <!-- 모달 헤더 -->
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 class="text-lg font-semibold text-gray-900">
          {{ modalType === 'order' 
            ? `주문 상세 정보 - ${modalData && modalData[0] ? modalData[0].order_number : ''}` 
            : `출고 상세 정보 - ${modalData && modalData[0] ? modalData[0].outbound_code : ''}`
          }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <!-- 모달 내용 -->
      <div class="p-6">
        <!-- 기본 정보 -->
        <div v-if="modalData && modalData.length > 0" class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ modalType === 'order' ? '주문ID' : '출고코드' }}
            </label>
            <p class="mt-1 text-sm text-gray-900">
              {{ modalType === 'order' ? modalData[0].order_id : modalData[0].outbound_code }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">거래처</label>
            <p class="mt-1 text-sm text-gray-900">{{ modalData[0].client_name }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ modalType === 'order' ? '주문일' : '출고일' }}
            </label>
            <p class="mt-1 text-sm text-gray-900">
              {{ modalType === 'order' ? modalData[0].order_date : modalData[0].outbound_date }}
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">
              {{ modalType === 'order' ? '납기일' : '담당자' }}
            </label>
            <p class="mt-1 text-sm text-gray-900">
              {{ modalType === 'order' ? modalData[0].delivery_date : modalData[0].employee_name }}
            </p>
          </div>
        </div>

        <!-- 제품 목록 -->
        <div class="border-t pt-4">
          <h4 class="text-md font-medium text-gray-900 mb-4">
            {{ modalType === 'order' ? '주문 제품 목록' : '출고 제품 목록' }}
          </h4>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">제품코드</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">제품명</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {{ modalType === 'order' ? '주문수량' : '출고수량' }}
                  </th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">규격</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">단위</th>
                  <th v-if="modalType === 'outbound'" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">LOT번호</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="(detail, index) in modalData" :key="index">
                  <td class="px-4 py-2 text-sm font-medium text-blue-600">{{ detail.product_code }}</td>
                  <td class="px-4 py-2 text-sm text-gray-900">{{ detail.product_name }}</td>
                  <td class="px-4 py-2 text-sm text-gray-900">
                    {{ formatNumber(modalType === 'order' ? detail.quantity : detail.outbound_quantity) }}
                  </td>
                  <td class="px-4 py-2 text-sm text-gray-900">{{ detail.spec }}</td>
                  <td class="px-4 py-2 text-sm text-gray-900">{{ detail.unit }}</td>
                  <td v-if="modalType === 'outbound'" class="px-4 py-2 text-sm font-mono text-gray-900">
                    {{ detail.lot_number }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 메모 (출고인 경우만) -->
        <div v-if="modalType === 'outbound' && modalData && modalData[0] && modalData[0].notes" class="border-t pt-4 mt-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">메모</label>
          <p class="text-sm text-gray-900 bg-gray-50 p-3 rounded">{{ modalData[0].notes }}</p>
        </div>
      </div>
      
      <!-- 모달 푸터 -->
      <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
        <button
          @click="$emit('close')"
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Props 정의
const props = defineProps({
  modalData: {
    type: Array,
    default: () => []
  },
  modalType: {
    type: String,
    default: 'order',
    validator: (value) => ['order', 'outbound'].includes(value)
  }
})

// Emits 정의
const emit = defineEmits(['close'])

// 숫자 포맷팅
const formatNumber = (value) => {
  if (!value && value !== 0) return '-'
  return new Intl.NumberFormat('ko-KR').format(value)
}
</script>

<style scoped>
/* 모달 애니메이션 */
.fixed {
  animation: fadeIn 0.3s ease-out;
}

.bg-white {
  animation: slideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>