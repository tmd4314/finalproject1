<template>
  <div class="max-w-[1060px] h-[739px] mx-auto p-4 bg-gray-50 overflow-hidden">
    <!-- 상단 타이틀 -->
    <div class="mb-3">
      <h1 class="text-2xl font-bold text-gray-800">작업지시서 관리</h1>
    </div>

    <div class="h-[calc(100%-60px)] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <!-- 기본 정보 영역 -->
      <div class="grid grid-cols-4 gap-3 mb-4">
        <!-- 작업지시서 번호 -->
        <div>
          <label class="block text-xs font-medium text-blue-600 mb-1">작업지시서 번호</label>
          <div class="flex">
            <input 
              v-model="form.work_order_no" 
              class="flex-1 px-2 py-1.5 border border-gray-300 rounded-l-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="WO001"
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
          <div class="flex">
            <input 
              v-model="form.writer_name" 
              class="flex-1 px-2 py-1.5 border border-gray-300 rounded-l-md text-xs bg-gray-50"
              readonly
            />
            <button 
              @click="openEmployeeModal('writer')"
              class="px-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 text-xs flex items-center justify-center"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 담당자 -->
        <div>
          <label class="block text-xs font-medium text-blue-600 mb-1">담당자</label>
          <div class="flex">
            <input 
              v-model="form.manager_name" 
              class="flex-1 px-2 py-1.5 border border-gray-300 rounded-l-md text-xs bg-gray-50"
              readonly
            />
            <button 
              @click="openEmployeeModal('manager')"
              class="px-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 text-xs flex items-center justify-center"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>
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
            v-model="form.start_date" 
            type="date"
            class="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <!-- 종료예정일 -->
        <div>
          <label class="block text-xs font-medium text-blue-600 mb-1">종료예정일</label>
          <input 
            v-model="form.end_date" 
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
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">순번</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">제품코드</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">제품명</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">수량</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">단위</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">규격</th>
                <th class="border border-gray-200 px-2 py-1.5 text-left font-medium text-gray-700">공정코드</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(product, index) in form.products" :key="index" class="hover:bg-gray-50">
                <td class="border border-gray-200 px-2 py-1.5 text-center">
                  <input type="checkbox" v-model="product.selected" class="rounded w-3 h-3" />
                </td>
                <td class="border border-gray-200 px-2 py-1.5">{{ index + 1 }}</td>
                <td class="border border-gray-200 px-2 py-1.5">{{ product.product_code }}</td>
                <td class="border border-gray-200 px-2 py-1.5">{{ product.product_name }}</td>
                <td class="border border-gray-200 px-2 py-1.5">
                  <input 
                    v-model.number="product.product_qty" 
                    type="number" 
                    min="1"
                    class="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td class="border border-gray-200 px-2 py-1.5">{{ product.product_unit }}</td>
                <td class="border border-gray-200 px-2 py-1.5">{{ product.product_stand }}</td>
                <td class="border border-gray-200 px-2 py-1.5">
                  <input 
                    v-model="product.process_code" 
                    class="w-20 px-1 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="공정코드"
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
    <!-- <WorkOrderSearchModal 
      v-if="showWorkOrderModal" 
      @select="selectWorkOrder" 
      @close="showWorkOrderModal = false" 
    />
    
    <PlanSearchModal 
      v-if="showPlanModal" 
      @select="selectPlan" 
      @close="showPlanModal = false" 
    /> -->
    
    <EmployeeSearchModal 
      v-if="showEmployeeModal" 
      :type="employeeModalType"
      @select="selectEmployee" 
      @close="showEmployeeModal = false" 
    />
    
    <!-- <ProductSearchModal 
      v-if="showProductModal" 
      @select="addProduct" 
      @close="showProductModal = false" 
    /> -->
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

// 모달 컴포넌트들 (나중에 생성)
import EmployeeSearchModal from './EmployeeSearchModal.vue'
// import ProductSearchModal from './ProductSearchModal.vue'
// import PlanSearchModal from './PlanSearchModal.vue'
// import WorkOrderSearchModal from './WorkOrderSearchModal.vue'

// 기본 상태
const isEditMode = ref(false)

// 모달 상태
const showWorkOrderModal = ref(false)
const showPlanModal = ref(false)
const showEmployeeModal = ref(false)
const showProductModal = ref(false)
const employeeModalType = ref('') // 'writer' | 'manager'

// 폼 데이터
const form = ref({
  work_order_no: '',
  plan_id: '',
  writer_id: '',
  writer_name: '',
  manager_id: '',
  manager_name: '',
  write_date: '', // 자동 생성
  start_date: '',
  end_date: '',
  order_remark: '',
  products: []
})

// Computed 속성들
const hasSelectedProducts = computed(() => {
  return form.value.products.some(product => product.selected)
})

const canSave = computed(() => {
  return form.value.work_order_no && 
         form.value.plan_id && 
         form.value.writer_id && 
         form.value.products.length > 0
})

// 메서드들
const openWorkOrderModal = () => {
  showWorkOrderModal.value = true
}

const openPlanModal = () => {
  showPlanModal.value = true
}

const openEmployeeModal = (type) => {
  employeeModalType.value = type
  showEmployeeModal.value = true
}

const openProductModal = () => {
  showProductModal.value = true
}

const selectWorkOrder = (workOrder) => {
  form.value.work_order_no = workOrder.work_order_no
  form.value.plan_id = workOrder.plan_id
  form.value.write_date = workOrder.write_date
  form.value.start_date = workOrder.start_date
  form.value.end_date = workOrder.end_date
  form.value.order_remark = workOrder.order_remark
  
  // 상세 정보 로드
  loadWorkOrderDetail(workOrder.work_order_no)
  isEditMode.value = true
  showWorkOrderModal.value = false
}

const selectPlan = (plan) => {
  form.value.plan_id = plan.plan_id
  
  // 계획의 제품들을 작업지시서로 복사
  loadPlanProducts(plan.plan_id)
  showPlanModal.value = false
}

const selectEmployee = (employee) => {
  if (employeeModalType.value === 'writer') {
    form.value.writer_id = employee.employee_id
    form.value.writer_name = employee.emp_name
  } else if (employeeModalType.value === 'manager') {
    form.value.manager_id = employee.employee_id
    form.value.manager_name = employee.emp_name
  }
  showEmployeeModal.value = false
}

const addProduct = (product) => {
  const newProduct = {
    seq_no: form.value.products.length + 1,
    product_code: product.product_code,
    product_name: product.product_name,
    product_qty: 1,
    product_unit: product.product_unit,
    product_stand: product.product_stand,
    process_code: '',
    selected: false
  }
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
  
  // 순번 재정렬
  form.value.products.forEach((product, index) => {
    product.seq_no = index + 1
  })
}

const loadWorkOrderDetail = async (workOrderNo) => {
  try {
    const res = await axios.get(`/workOrder/${workOrderNo}`)
    if (res.data && res.data.master) {
      const master = res.data.master
      const products = res.data.products || []
      
      form.value = {
        work_order_no: master.work_order_no,
        plan_id: master.plan_id,
        writer_id: master.writer_id,
        writer_name: master.writer_name,
        manager_id: master.manager_id,
        manager_name: master.manager_name,
        write_date: master.write_date,
        start_date: master.start_date,
        end_date: master.end_date,
        order_remark: master.order_remark,
        products: products.map(product => ({
          seq_no: product.seq_no,
          product_code: product.product_code,
          product_name: product.product_name,
          product_qty: product.product_qty,
          product_unit: product.product_unit,
          product_stand: product.product_stand,
          process_code: product.process_code || '',
          selected: false
        }))
      }
    }
  } catch (err) {
    console.error('작업지시서 상세 조회 오류:', err)
    alert('작업지시서 정보를 불러오는데 실패했습니다.')
  }
}

const loadPlanProducts = async (planId) => {
  try {
    const res = await axios.get(`/workOrder/plan/${planId}`)
    if (res.data && res.data.length > 0) {
      // 계획의 제품들로 제품 목록 초기화
      form.value.products = res.data.map((item, index) => ({
        seq_no: index + 1,
        product_code: item.product_code,
        product_name: item.product_name,
        product_qty: item.plan_qty || 1,
        product_unit: item.product_unit,
        product_stand: item.product_stand,
        process_code: '',
        selected: false
      }))
    }
  } catch (err) {
    console.error('계획 제품 조회 오류:', err)
    alert('계획 정보를 불러오는데 실패했습니다.')
  }
}

const saveWorkOrder = async () => {
  if (!canSave.value) {
    alert('작업지시서 번호, 계획 ID, 작성자, 제품을 모두 입력해주세요.')
    return
  }

  try {
    const payload = {
      master: {
        work_order_no: form.value.work_order_no,
        plan_id: form.value.plan_id,
        writer_id: form.value.writer_id,
        manager_id: form.value.manager_id,
        start_date: form.value.start_date,
        end_date: form.value.end_date,
        order_remark: form.value.order_remark
      },
      products: form.value.products.map(product => ({
        product_code: product.product_code,
        product_qty: product.product_qty,
        process_code: product.process_code,
        seq_no: product.seq_no
      }))
    }

    if (isEditMode.value) {
      await axios.put('/workOrder', payload)
      alert('작업지시서 수정 완료')
    } else {
      await axios.post('/workOrder', payload)
      alert('작업지시서 등록 완료')
    }
    
    resetForm()
  } catch (err) {
    console.error('작업지시서 저장 오류:', err)
    alert('작업지시서 저장에 실패했습니다.')
  }
}

const resetForm = () => {
  form.value = {
    work_order_no: '',
    plan_id: '',
    writer_id: '',
    writer_name: '',
    manager_id: '',
    manager_name: '',
    write_date: '',
    start_date: '',
    end_date: '',
    order_remark: '',
    products: []
  }
  isEditMode.value = false
}

// 컴포넌트 마운트 시 작성일 자동 설정
onMounted(() => {
  const today = new Date().toISOString().split('T')[0]
  form.value.write_date = today
})
</script>

<style scoped>
input, select {
  transition: all 0.15s ease-in-out;
}

input:focus, select:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 스크롤바 스타일링 */
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

/* 버튼 hover 효과 */
button {
  transition: all 0.15s ease-in-out;
}
</style>