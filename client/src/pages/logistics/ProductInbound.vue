<template>
  <div class="max-w-[1200px] h-[739px] mx-auto p-4 bg-gray-50 overflow-hidden">
    <!-- 상단 타이틀 -->
    <div class="mb-3">
      <h1 class="text-2xl font-bold text-gray-800">제품 입고 관리</h1>
    </div>

    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4" style="height: calc(100% - 60px);">
      
      <!-- 상단 버튼 영역 -->
      <div class="flex justify-between items-center mb-4">
        <div class="flex items-center gap-3">
          <button 
            @click="loadInboundList" 
            class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
            새로고침
          </button>
          
          <div class="text-sm text-gray-600">
            입고 대기: <span class="font-medium text-blue-600">{{ inboundList.length }}건</span>
          </div>
        </div>
      </div>

      <!-- 입고 대기 목록 테이블 -->
      <div class="flex-1 overflow-auto border border-gray-200 rounded mb-4" style="height: calc(100% - 80px);">
        <table class="w-full text-xs border-collapse bg-white">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              <th class="border border-gray-200 px-2 py-2 text-left font-medium text-gray-700 w-32">완제품LOT번호</th>
              <th class="border border-gray-200 px-2 py-2 text-left font-medium text-gray-700 w-32">제품명</th>
              <th class="border border-gray-200 px-2 py-2 text-left font-medium text-gray-700 w-24">자재코드</th>
              <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-20">입고수량</th>
              <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-16">단위</th>
              <th class="border border-gray-200 px-2 py-2 text-left font-medium text-gray-700 w-24">규격</th>
              <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-24">요청일자</th>
              <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-20">입고</th>
            </tr>
          </thead>
          <tbody>
            <!-- 로딩 상태 -->
            <tr v-if="isLoading">
              <td colspan="8" class="text-center text-gray-500 py-8">
                <div class="flex items-center justify-center gap-2">
                  <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  데이터를 불러오는 중...
                </div>
              </td>
            </tr>
            
            <!-- 데이터 없음 -->
            <tr v-else-if="inboundList.length === 0">
              <td colspan="8" class="text-center text-gray-500 py-8">
                입고 대기 중인 제품이 없습니다.
              </td>
            </tr>
            
            <!-- 데이터 행들 -->
            <tr v-else v-for="(item, index) in inboundList" :key="`${item.result_id}-${item.product_code}`" 
                class="hover:bg-gray-50">
              <td class="border border-gray-200 px-2 py-2 font-mono text-xs">
                {{ item.preview_lot_num }}
              </td>
              <td class="border border-gray-200 px-2 py-2">
                {{ item.product_name }}
              </td>
              <td class="border border-gray-200 px-2 py-2 font-mono text-xs">
                {{ item.product_code }}
              </td>
              <td class="border border-gray-200 px-2 py-2 text-center">
                {{ formatNumber(item.inbound_qty) }}
              </td>
              <td class="border border-gray-200 px-2 py-2 text-center">
                {{ item.product_unit || '-' }}
              </td>
              <td class="border border-gray-200 px-2 py-2">
                {{ item.product_stand || '-' }}
              </td>
              <td class="border border-gray-200 px-2 py-2 text-center">
                {{ item.request_date }}
              </td>
              <td class="border border-gray-200 px-2 py-2 text-center">
                <button 
                  @click="processSingleItem(item)"
                  class="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                  :disabled="item.isProcessing"
                >
                  {{ item.isProcessing ? '처리중' : '입고' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 하단 정보 -->
      <div class="flex justify-between items-center text-xs text-gray-600">
        <div>
          전체 {{ inboundList.length }}건
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// 상태 관리
const isLoading = ref(false)
const inboundList = ref([])

// 숫자 포맷팅
const formatNumber = (value) => {
  if (!value && value !== 0) return '-'
  return new Intl.NumberFormat('ko-KR').format(value)
}

// LOT 번호 생성 (화면에서 난수 처리)
const generateLotPreview = (lotBase) => {
  const randomNum = Math.floor(Math.random() * 900) + 100 // 100-999
  return `${lotBase}-${randomNum.toString().padStart(3, '0')}`
}

// LOT 번호 재생성
const regenerateLotNumber = (item) => {
  const randomNum = Math.floor(Math.random() * 900) + 100 // 100-999
  item.preview_lot_num = `${item.lot_base}-${randomNum.toString().padStart(3, '0')}`
  console.log('LOT 번호 재생성:', item.preview_lot_num)
}

// 입고 대기 목록 조회
const loadInboundList = async () => {
  isLoading.value = true
  
  try {
    console.log('입고 대기 목록 조회 시작')
    
    const response = await axios.get('/productInbound/waiting-list')
    
    console.log('조회 결과:', response.data)
    
    // 각 항목에 LOT 번호 미리보기 추가
    inboundList.value = response.data.map(item => ({
      ...item,
      isProcessing: false,
      preview_lot_num: generateLotPreview(item.lot_base)
    }))
    
    console.log(`입고 대기 목록 로드 완료: ${inboundList.value.length}건`)
    
  } catch (error) {
    console.error('입고 대기 목록 조회 오류:', error)
    
    let errorMessage = '입고 대기 목록을 불러오는데 실패했습니다.'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    alert(errorMessage)
    inboundList.value = []
  } finally {
    isLoading.value = false
  }
}

// 단일 제품 입고 처리
const processSingleItem = async (item) => {
  if (item.isProcessing) return
  
  try {
    item.isProcessing = true
    
    console.log('단일 제품 입고 처리 시작:', item)
    
    const inboundData = {
      result_id: item.result_id,
      product_code: item.product_code,
      inbound_qty: item.inbound_qty,
      manufacture_datetime: item.manufacture_datetime,
      lot_number: item.preview_lot_num,  // 화면에서 생성된 LOT 번호
      work_order_no: item.work_order_no  // work_order_no 추가
    }
    
    console.log('전송할 입고 데이터:', inboundData)
    
    const response = await axios.post('/productInbound/process', inboundData)
    
    console.log('입고 처리 성공:', response.data)
    
    // 성공 시 목록에서 제거
    const index = inboundList.value.findIndex(listItem => 
      listItem.result_id === item.result_id && listItem.product_code === item.product_code
    )
    if (index > -1) {
      inboundList.value.splice(index, 1)
    }
    
    alert(`${item.product_name} 입고 처리가 완료되었습니다.\nLOT번호: ${response.data.lot_number}`)
    
  } catch (error) {
    console.error('단일 제품 입고 처리 오류:', error)
    
    let errorMessage = '입고 처리 중 오류가 발생했습니다.'
    
    // LOT 번호 중복 에러 처리
    if (error.response?.data?.error_code === 'DUPLICATE_LOT_NUMBER') {
      errorMessage = 'LOT 번호가 중복되었습니다.'
      
      // LOT 번호 재생성
      regenerateLotNumber(item)
      
      const retry = confirm(`${errorMessage}\n새로운 LOT 번호 ${item.preview_lot_num}로 다시 시도하시겠습니까?`)
      if (retry) {
        // 재시도
        item.isProcessing = false
        processSingleItem(item)
        return
      }
    } else if (error.response?.data?.error_code === 'ALREADY_PROCESSED') {
      errorMessage = '이미 입고 처리된 제품입니다.'
      
      // 이미 처리된 경우 목록에서 제거
      const index = inboundList.value.findIndex(listItem => 
        listItem.result_id === item.result_id && listItem.product_code === item.product_code
      )
      if (index > -1) {
        inboundList.value.splice(index, 1)
      }
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    alert(`${item.product_name} 입고 처리 실패:\n${errorMessage}`)
    
  } finally {
    item.isProcessing = false
  }
}

// 컴포넌트 마운트 시 데이터 로드
onMounted(() => {
  console.log('제품 입고 관리 컴포넌트 마운트')
  loadInboundList()
})
</script>

<style scoped>
input, select, button {
  transition: all 0.15s ease-in-out;
}

input:focus, select:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f8fafc;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

button {
  transition: all 0.15s ease-in-out;
}
</style>