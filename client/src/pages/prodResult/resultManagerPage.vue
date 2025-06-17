<template>
  <div class="va-pa-4">
    <!-- 검색 필터 -->
    <div class="search-grid">
      <va-input v-model="filters.workOrder" label="작업지시서 번호" placeholder="작업지시서 번호 입력" readonly />
      <va-input v-model="filters.productName" label="제품명" placeholder="제품명 입력" readonly />
      <va-input v-model="filters.productSpec" label="제품규격" placeholder="제품 규격 입력" readonly />
      <va-date-input v-model="filters.workDate" label="작업일자" :manual-input="false" :clearable="true" />
      <va-input v-model="filters.worker" label="작업자명" placeholder="작업자 이름 입력" />
      <va-select v-model="filters.status" :options="['진행중', '완료', '대기']" label="진행상태" placeholder="상태 선택" />

      <div class="button-group">
        <va-button color="info" @click="openProductPopup">작업지시 검색</va-button>
        <va-button color="primary" @click="searchItems">조회</va-button>
        <va-button color="secondary" @click="resetFilters">초기화</va-button>
      </div>
    </div>

    <!-- 리스트 테이블 -->
    <va-data-table :items="workList" :columns="columns" track-by="result_id">
      <template #cell(select)="{ row }">
        <va-checkbox :model-value="row.rowData.selected" @update:modelValue="val => handleCheck(row.rowData, val)" />
      </template>
      <template #cell(work_start_time)="{ row }">
        {{ formatTime(row.rowData.work_start_time) }}
      </template>
      <template #cell(work_end_time)="{ row }">
        {{ formatTime(row.rowData.work_end_time) }}
      </template>
      <template #cell(duration)="{ row }">
        {{ calculateDuration(row.rowData.work_start_time, row.rowData.work_end_time) }}
      </template>
    </va-data-table>

    <!-- 탭 버튼 -->
    <div class="va-mt-6 tab-toggle">
      <va-button-toggle
        v-model="activeTab"
        :options="[
          { label: '작업실적 입력', value: 'input' },
          { label: '자재 내역', value: 'material' }
        ]"
        color="primary"
        toggle-color="primary"
      />
    </div>

    <!-- v-model.number="selectedItem.pass_qty"-->
    <!-- 작업실적 입력 -->
    <div v-if="activeTab === 'input'" class="input-layout">
      <div class="input-grid">
        <va-input v-model="selectedItem.process_code" label="공정코드" readonly />
        <va-input v-model="selectedItem.process_name" label="공정명" readonly />
        <va-input v-model="selectedItem.product_name" label="제품명" readonly />
        <va-input v-model="selectedItem.product_stand" label="제품규격" readonly />
        <va-input value="과립기1" label="설비명" readonly />
        <va-input v-model="selectedItem.manager_id" label="작업자명" />
        <va-input :model-value="formatTime(selectedItem.work_start_time)" label="시작시간" readonly />
        <va-input :model-value="formatTime(selectedItem.work_end_time)" label="종료시간" readonly />
        <va-input v-model.number="selectedItem.pass_qty" label="생산수량" />
        <va-input value="100" label="불량수량" />
        <va-input v-model="selectedItem.etc" label="비고" />
      </div>
      <div class="side-buttons">
        <va-button color="primary">작업시작</va-button>
        <va-button color="info">작업종료</va-button>
        <va-button color="secondary" @click="clearForm">초기화</va-button>
        <va-button color="primary" @click="saveResult">저장</va-button>
        <va-button color="info" @click="openProcessPopup">공정 검색</va-button>
      </div>
    </div>

    <!-- 자재 내역 -->
    <div v-else-if="activeTab === 'material'">
      <p>🔧 자재 출고 내역을 여기에 표시합니다.</p>
    </div>

    <!-- 🔍 제품 검색 팝업 -->
    <ProductSearchModal v-model:visible="isProductPopupOpen" @apply="applyProduct" />
    <!-- 🔍 공정 검색 팝업 -->
    <ProcessSearchModal
      v-model:visible="isProcessPopupOpen"
      :processList="processList"
      @apply="applyProcess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import ProductSearchModal from '../modals/ProductSearchModal.vue'
import ProcessSearchModal from '../modals/ProcessSearchModal.vue'

interface WorkItem {
  result_id: string
  product_name: string
  product_stand: string
  process_code: string
  process_name?: string
  work_start_date: string
  work_start_time: string
  work_end_time: string | null
  work_order_qty: number
  pass_qty: number | null
  result_code_label: string
  detail_code_label: string
  manager_id: string
  selected?: boolean
  etc?: string
}

const emptyItem = (): WorkItem => ({
  result_id: '',
  product_name: '',
  product_stand: '',
  process_code: '',
  process_name: '',
  work_start_date: '',
  work_start_time: '',
  work_end_time: '',
  work_order_qty: 0,
  pass_qty: 0,
  result_code_label: '',
  detail_code_label: '',
  manager_id: '',
  selected: false,
  etc: ''
})

const allResultList = ref<WorkItem[]>([])
const workList = ref<WorkItem[]>([])
const selectedItem = ref<WorkItem>(emptyItem())
const activeTab = ref<'input' | 'material'>('input')


const columns = [
  { key: 'select', label: '선택', width: 40 },
  { key: 'result_id', label: '실적ID' },
  { key: 'product_name', label: '제품명' },
  { key: 'product_stand', label: '제품규격' },
  { key: 'process_code', label: '공정코드' },
  { key: 'process_name', label: '공정명' },
  { key: 'work_start_time', label: '시작시간' },
  { key: 'work_end_time', label: '종료시간' },
  { key: 'duration', label: '소요시간(분)' },
  { key: 'pass_qty', label: '재작수량' },
  { key: 'detail_code_label', label: '진행상태' },
  { key: 'manager_id', label: '작업자' }
]

const filters = ref({
  workOrder: '',
  workDate: '',
  status: '',
  productName: '',
  productSpec: '',
  worker: ''
})

const formatTime = (value: string | null): string => {
  if (!value) return '-'
  const date = new Date(value)
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

const calculateDuration = (start: string, end: string | null): string => {
  if (!start || !end) return '-'
  const startTime = new Date(start)
  const endTime = new Date(end)
  const diffMs = endTime.getTime() - startTime.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  return `${diffMin}분`
}

const handleCheck = (item: WorkItem, val: boolean) => {
  workList.value.forEach(i => (i.selected = false))
  item.selected = val
  if (val) selectedItem.value = { ...item }
}

const fetchResultList = async () => {
  try {
    if (!filters.value.workOrder) {
      alert('작업지시서 번호를 입력하세요.')
      return
    }
    const res = await axios.get(`/prodResult/${filters.value.workOrder}`)
    const mapped = res.data.map((item: WorkItem) => ({ ...item, selected: false }))
    allResultList.value = mapped
    workList.value = mapped
  } catch (err) {
    alert('조회 실패: 존재하지 않는 작업지시서일 수 있습니다.')
  }
}

const saveResult = async () => {
  try {
    await axios.post('/prodResult/save', selectedItem.value)
    alert('저장 완료')
    selectedItem.value = emptyItem()
    fetchResultList()
  } catch (err) {
    alert('저장 실패')
  }
}

const clearForm = () => {
  selectedItem.value = emptyItem()
  workList.value.forEach(item => (item.selected = false))
}

const searchItems = async () => {
  await fetchResultList()
}

const resetFilters = () => {
  filters.value = {
    workOrder: '',
    workDate: '',
    status: '',
    productName: '',
    productSpec: '',
    worker: ''
  }
  workList.value = []
  allResultList.value = []
}

// 🔍 제품 검색 팝업
const isProductPopupOpen = ref(false)
const openProductPopup = () => {
  isProductPopupOpen.value = true
}
const applyProduct = (product: any) => {
  filters.value.productName = product.product_name
  filters.value.productSpec = product.product_stand
  filters.value.workOrder = product.work_order_no
  isProductPopupOpen.value = false
}

// 🔍 공정 검색 팝업
const isProcessPopupOpen = ref(false)
const processList = ref<any[]>([]) // 자식에게 줄 데이터
const openProcessPopup = async () => {
  try {
    const res = await axios.get('/processCheck')
    processList.value = res.data // 받아온 데이터 저장
    isProcessPopupOpen.value = true
  } catch (err) {
    alert('공정 데이터를 불러오지 못했습니다.')
  }
}

const applyProcess = (process: any) => {
  selectedItem.value.process_code = process.process_code
  selectedItem.value.process_name = process.process_name
  selectedItem.value.product_name = process.product_name
  selectedItem.value.product_stand = process.product_stand
  isProcessPopupOpen.value = false
}

onMounted(() => {
  // 필요한 경우 여기에 초기 로딩 추가 가능
})
</script>

<style scoped>
.search-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  align-items: end;
  margin-bottom: 1.5rem;
}
.button-group {
  display: flex;
  gap: 0.5rem;
  grid-column: span 3;
  justify-content: flex-start;
  padding-top: 0.5rem;
}
.input-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}
.input-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.side-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>