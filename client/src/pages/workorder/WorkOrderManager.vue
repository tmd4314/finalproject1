<template>
  <div class="max-w-[1060px] h-[739px] mx-auto p-4 bg-gray-50 overflow-hidden">
    <!-- 상단 타이틀 -->
    <div class="mb-3">
      <h1 class="text-2xl font-bold text-gray-800">작업지시서 관리</h1>
    </div>

    <div class="h-[calc(100%-60px)] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <!-- 기본 정보 영역 -->
      <div class="grid grid-cols-3 gap-3 mb-4">
        <!-- 작업지시서 번호 -->
        <div>
          <label class="block text-xs font-medium text-blue-600 mb-1">작업지시서 번호</label>
          <div class="flex">
            <input 
              v-model="form.work_order_no" 
              class="flex-1 px-2 py-1.5 border border-gray-300 rounded-l-md text-xs bg-gray-50"
              readonly
            />
            <button 
              @click="openWorkOrderModal"
              class="px-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 text-xs flex items-center justify-center"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 계획 ID -->
        <div>
          <label class="block text-xs font-medium text-blue-600 mb-1">계획 ID</label>
          <div class="flex">
            <input 
              v-model="form.plan_id" 
              class="flex-1 px-2 py-1.5 border border-gray-300 rounded-l-md text-xs bg-gray-50"
              readonly
            />
            <button 
              @click="openPlanModal"
              class="px-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 text-xs flex items-center justify-center"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 작성자 -->
        <div>
          <label class="block text-xs font-medium text-blue-600 mb-1">작성자</label>
          <input 
            v-model="form.writer_name" 
            class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-gray-50"
            readonly
            placeholder="로그인된 사용자"
          />
        </div>
      </div>

      <!-- 일정 및 비고 영역 -->
      <div class="grid grid-cols-4 gap-3 mb-4">
        <!-- 작성일 -->
        <div>
          <label class="block text-xs font-medium text-blue-600 mb-1">작성일</label>
          <input 
            v-model="form.write_date" 
            type="date"
            class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-gray-50"
            readonly
          />
        </div>

        <!-- 시작예정일 -->
        <div>
          <label class="block text-xs font-medium text-blue-600 mb-1">시작예정일</label>
          <input 
            v-model="form.order_start_dt" 
            type="date"
            class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <!-- 종료예정일 -->
        <div>
          <label class="block text-xs font-medium text-blue-600 mb-1">종료예정일</label>
          <input 
            v-model="form.order_end_dt" 
            type="date"
            class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <!-- 비고 -->
        <div>
          <label class="block text-xs font-medium text-blue-600 mb-1">비고</label>
          <input 
            v-model="form.order_remark" 
            class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="비고 입력"
          />
        </div>
      </div>

      <!-- 제품 목록 영역 -->
      <div class="flex flex-col h-[calc(100%-140px)]">
        <div class="flex justify-between items-center mb-3">
          <label class="text-sm font-medium text-blue-600">제품 목록</label>
          <div class="flex gap-2">
            <button 
              @click="removeSelectedProducts" 
              class="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors disabled:opacity-50"
              :disabled="!hasSelectedProducts"
            >
              제거
            </button>
            <button 
              @click="openProductModal"
              class="px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
            >
              제품 추가
            </button>
          </div>
        </div>

        <!-- 제품 테이블 -->
        <div class="flex-1 overflow-auto border border-gray-200 rounded mb-4">
          <table class="w-full text-xs border-collapse bg-white">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="border border-gray-200 px-2 py-1.5 text-center font-medium text-gray-700">#</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">제품코드</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">제품명</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">단위</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">규격</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">공정코드</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">우선순위</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">비고</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(product, index) in form.products" :key="index" class="hover:bg-gray-50">
                <td class="border border-gray-200 px-2 py-1.5 text-center">
                  <input type="checkbox" v-model="product.selected" class="rounded w-3 h-3" />
                </td>
                <td class="border border-gray-200 px-2 py-1.5">{{ product.product_code }}</td>
                <td class="border border-gray-200 px-2 py-1.5">{{ product.product_name }}</td>
                <td class="border border-gray-200 px-2 py-1.5">{{ product.product_unit }}</td>
                <td class="border border-gray-200 px-2 py-1.5">{{ product.product_stand }}</td>
                <td class="border border-gray-200 px-2 py-1.5">{{ product.process_code }}</td>
                <td class="border border-gray-200 px-2 py-1.5">
                  <input 
                    v-model.number="product.work_order_priority" 
                    type="number" 
                    min="1"
                    class="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder=""
                    @input="sortProductsByPriority"
                  />
                </td>
                <td class="border border-gray-200 px-2 py-1.5">
                  <input 
                    v-model="product.order_detail_remark" 
                    class="w-full px-1 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="비고"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 저장/초기화 버튼 -->
        <div class="flex gap-3 justify-center">
          <button 
            @click="saveWorkOrder" 
            class="px-6 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
            :disabled="!canSave"
          >
            {{ isEditMode ? '수정' : '저장' }}
          </button>
          <button 
            @click="resetForm" 
            class="px-6 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors font-medium"
          >
            초기화
          </button>
        </div>
      </div>
    </div>

    <!-- 모달들 -->
    <ProductSearchModal 
      v-if="showProductModal" 
      @select="addProduct" 
      @close="showProductModal = false" 
    />
    
    <PlanSearchModal 
      v-if="showPlanModal" 
      @select="selectPlan" 
      @close="showPlanModal = false" 
    />

    <WorkOrderSearchModal 
      v-if="showWorkOrderModal" 
      @select="selectWorkOrder" 
      @close="showWorkOrderModal = false" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// 모달 컴포넌트들
import ProductSearchModal from './ProductSearchModal.vue'
import PlanSearchModal from './PlanSearchModal.vue'
import WorkOrderSearchModal from './WorkOrderSearchModal.vue'

// 기본 상태
const isEditMode = ref(false)

// 모달 상태
const showWorkOrderModal = ref(false)
const showPlanModal = ref(false)
const showProductModal = ref(false)

// 폼 데이터
const form = ref({
  work_order_no: '',
  plan_id: '',
  writer_id: '',
  writer_name: '',
  write_date: '',
  order_start_dt: '',
  order_end_dt: '',
  order_remark: '',
  products: []
})

// Computed 속성들
const hasSelectedProducts = computed(() => {
  return form.value.products.some(product => product.selected)
})

// 🚨 수정: canSave - work_order_no 체크 제거
const canSave = computed(() => {
  return form.value.writer_id && 
         form.value.products.length > 0
         // work_order_no는 서버에서 생성하므로 체크 불필요
})

// 메서드들
const openWorkOrderModal = () => {
  showWorkOrderModal.value = true
}

const openPlanModal = () => {
  showPlanModal.value = true
}

const openProductModal = () => {
  showProductModal.value = true
}

const selectPlan = (plan) => {
  form.value.plan_id = plan.plan_id
  loadPlanProducts(plan.plan_id)
  showPlanModal.value = false
}

// 제품 추가 시 process_group_code 자동 입력
const addProduct = (product) => {
  console.log('선택된 제품 데이터:', product)
  
  const newProduct = {
    product_code: product.product_code,
    product_name: product.product_name,
    product_unit: product.product_unit,
    product_stand: product.product_stand,
    process_code: product.process_group_code || '',
    work_order_priority: null,
    order_detail_remark: '',
    selected: false
  }
  
  console.log('추가될 제품 데이터:', newProduct)
  form.value.products.push(newProduct)
  showProductModal.value = false
}

const removeSelectedProducts = () => {
  const selectedProducts = form.value.products.filter(product => product.selected)
  
  if (selectedProducts.length === 0) {
    alert('삭제할 제품을 선택해주세요.')
    return
  }
  
  form.value.products = form.value.products.filter(product => !product.selected)
  sortProductsByPriority()
}

const sortProductsByPriority = () => {
  form.value.products.sort((a, b) => {
    if (a.work_order_priority && b.work_order_priority) {
      return a.work_order_priority - b.work_order_priority
    }
    if (a.work_order_priority && !b.work_order_priority) {
      return -1
    }
    if (!a.work_order_priority && b.work_order_priority) {
      return 1
    }
    return 0
  })
}

const loadPlanProducts = async (planId) => {
  try {
    const res = await axios.get(`/workOrder/plan/${planId}`)
    if (res.data && res.data.length > 0) {
      form.value.products = res.data.map((item) => ({
        product_code: item.product_code,
        product_name: item.product_name,
        product_unit: item.product_unit,
        product_stand: item.product_stand,
        process_code: item.process_group_code || '',
        work_order_priority: null,
        order_detail_remark: '',
        selected: false
      }))
    }
  } catch (err) {
    console.error('계획 제품 조회 오류:', err)
    alert('계획 정보를 불러오는데 실패했습니다.')
  }
}

// 🚨 수정: 저장 함수 - 번호 생성 로직 제거
const saveWorkOrder = async () => {
  if (!canSave.value) {
    alert('작성자, 제품을 모두 입력해주세요.')  // 메시지 수정
    return
  }

  try {
    const payload = {
      master: {
        // work_order_no는 서버에서 자동 생성하므로 제외
        plan_id: form.value.plan_id || '',
        writer_id: form.value.writer_id,
        write_date: form.value.write_date,
        order_start_dt: form.value.order_start_dt || '',
        order_end_dt: form.value.order_end_dt || '',
        order_remark: form.value.order_remark || ''
      },
      products: form.value.products.map(product => ({
        product_code: product.product_code,
        work_order_priority: product.work_order_priority || null,
        order_detail_remark: product.order_detail_remark || '',
        process_group_code: product.process_code || ''
      }))
    }

    // 🔍 디버깅: 전송할 데이터 출력
    console.log('전송할 payload:', JSON.stringify(payload, null, 2))

    let response
    if (isEditMode.value) {
      // 수정 시에는 기존 번호 포함
      payload.master.work_order_no = form.value.work_order_no
      response = await axios.put('/workOrder', payload)
      alert('작업지시서 수정 완료')
    } else {
      // 신규 등록 시에는 번호 제외 (서버에서 생성)
      response = await axios.post('/workOrder', payload)
      alert('작업지시서 등록 완료')
      
      // 서버에서 생성된 번호를 폼에 설정
      if (response.data && response.data.work_order_no) {
        form.value.work_order_no = response.data.work_order_no
      }
    }
    
    console.log('서버 응답:', response.data)
    resetForm()
  } catch (err) {
    console.error('작업지시서 저장 오류:', err)
    
    // 🔍 상세 에러 정보 출력
    if (err.response) {
      console.error('에러 상태:', err.response.status)
      console.error('에러 데이터:', err.response.data)
      
      // 사용자에게 구체적인 에러 메시지 표시
      if (err.response.data && err.response.data.error) {
        alert(`저장 실패: ${err.response.data.error}`)
      } else {
        alert(`저장 실패 (${err.response.status}): ${JSON.stringify(err.response.data)}`)
      }
    } else {
      alert('작업지시서 저장에 실패했습니다.')
    }
  }
}

const resetForm = () => {
  form.value = {
    work_order_no: '',  // 빈 값으로 시작
    plan_id: '',
    writer_id: '2',
    writer_name: '김홍인',
    write_date: new Date().toISOString().split('T')[0],
    order_start_dt: '',
    order_end_dt: '',
    order_remark: '',
    products: []
  }
  isEditMode.value = false
}

// 작업지시서 번호 자동 생성 (DB 조회)
const generateWorkOrderNo = async () => {
  try {
    const res = await axios.get('/workOrder/generate-no')
    return res.data.work_order_no
  } catch (err) {
    console.error('작업지시서 번호 생성 오류:', err)
    // 에러 시 기본값
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return `WO${today}001`
  }
}

// 작업지시서 불러오기 함수
const selectWorkOrder = async (workOrder) => {
  try {
    // 선택된 작업지시서의 상세 정보 조회
    const res = await axios.get(`/workOrder/${workOrder.work_order_no}`)
    
    if (res.data && res.data.master) {
      const { master, products } = res.data
      
      // 폼에 마스터 정보 설정
      form.value = {
        work_order_no: master.work_order_no,
        plan_id: master.plan_id || '',
        writer_id: master.writer_id || '2',
        writer_name: master.writer_name || '김홍인',
        write_date: master.write_date ? master.write_date.split('T')[0] : new Date().toISOString().split('T')[0],
        order_start_dt: master.order_start_dt ? master.order_start_dt.split('T')[0] : '',
        order_end_dt: master.order_end_dt ? master.order_end_dt.split('T')[0] : '',
        order_remark: master.order_remark || '',
        products: products.map(product => ({
          product_code: product.product_code,
          product_name: product.product_name,
          product_unit: product.product_unit,
          product_stand: product.product_stand,
          process_code: product.process_group_code || '',
          work_order_priority: product.work_order_priority,
          order_detail_remark: product.order_detail_remark || '',
          selected: false
        }))
      }
      
      // 수정 모드로 설정
      isEditMode.value = true
      
      // 우선순위로 정렬
      sortProductsByPriority()
    }
    
    showWorkOrderModal.value = false
  } catch (err) {
    console.error('작업지시서 불러오기 오류:', err)
    alert('작업지시서 정보를 불러오는데 실패했습니다.')
  }
}

onMounted(() => {
  const today = new Date().toISOString().split('T')[0]
  form.value.write_date = today
  form.value.writer_name = '김홍인'  // 더미 데이터
  form.value.writer_id = '2'  // 더미 데이터
  
  // 작업지시서 번호는 빈 값으로 시작 (서버에서 생성)
  form.value.work_order_no = ''
})
</script>

<style scoped>
input, select {
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