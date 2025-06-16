<template>
  <div class="va-pa-4">
    <!-- 검색 필터 -->
    <div class="search-grid">
      <va-input
        v-model="filters.workOrder"
        label="작업지시서 번호"
        placeholder="작업지시서 번호 입력"
      />
      <va-input
        v-model="filters.productName"
        label="제품명"
        placeholder="제품명 입력"
      />
      <va-input
        v-model="filters.productSpec"
        label="제품규격"
        placeholder="제품 규격 입력"
      />
      <va-date-input
        v-model="filters.workDate"
        label="작업일자"
        :manual-input="false"
        :clearable="true"
      />
      <va-input
        v-model="filters.worker"
        label="작업자명"
        placeholder="작업자 이름 입력"
      />
      <va-select
        v-model="filters.status"
        :options="['진행중', '완료', '대기']"
        label="진행상태"
        placeholder="상태 선택"
      />
      <div class="button-group">
        <va-button color="primary" @click="searchItems">조회</va-button>
        <va-button color="secondary" @click="resetFilters">초기화</va-button>
      </div>
    </div>

    <!-- 리스트 테이블 -->
    <va-data-table :items="workList" :columns="columns" track-by="result_id">
      <template #cell(select)="{ row }">
        <va-checkbox
          :model-value="row.rowData.selected"
          @update:modelValue="val => handleCheck(row.rowData, val)"
        />
      </template>
      <template #cell(work_start_time)="{ row }">
        {{ formatTime(row.rowData.work_start_time) }}
      </template>
      <template #cell(work_end_time)="{ row }">
        {{ formatTime(row.rowData.work_end_time) }}
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

    <!-- 작업실적 입력 -->
    <div v-if="activeTab === 'input'" class="input-layout">
      <div class="input-grid">
        <va-input v-model="selectedItem.process_code" label="공정코드" />
        <va-input v-model="selectedItem.process_name" label="공정명" />
        <va-input v-model="selectedItem.product_name" label="제품명" />
        <va-input value="과립기1" label="설비명" readonly />
        <va-input v-model="selectedItem.manager_id" label="작업자명" />
        <va-input :model-value="formatTime(selectedItem.work_start_time)" label="시작시간" readonly />
        <va-input :model-value="formatTime(selectedItem.work_end_time)" label="종료시간" readonly />
        <va-input v-model.number="selectedItem.work_order_qty" label="생산수량" />
        <va-input v-model.number="selectedItem.pass_qty" label="불량수량" />
        <va-input v-model="selectedItem.etc" label="비고" />
      </div>
      <div class="side-buttons">
        <va-button color="primary">작업시작</va-button>
        <va-button color="info">작업종료</va-button>
        <va-button color="secondary" @click="clearForm">초기화</va-button>
        <va-button color="primary" @click="saveResult">저장</va-button>
      </div>
    </div>

    <!-- 자재 내역 -->
    <div v-else-if="activeTab === 'material'">
      <p>🔧 자재 출고 내역을 여기에 표시합니다.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { onMounted, ref } from 'vue'

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
  { key: 'pass_qty', label: '재작수량' },
  { key: 'detail_code_label', label: '진행상태' },
  { key: 'manager_id', label: '작업자' }
]

const formatTime = (value: string | null): string => {
  if (!value) return '-'
  const date = new Date(value)
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

const fetchResultList = async () => {
  try {
    if (!filters.value.workOrder) {
      alert('작업지시서 번호를 입력하세요.')
      return
    }

    const res = await axios.get(`/prodResult/${filters.value.workOrder}`)

    if (typeof res.data === 'string') {
      console.error('⚠ HTML 응답 수신됨. 백엔드 주소 확인 필요.')
      return
    }

    const mapped = res.data.map((item: WorkItem) => ({ ...item, selected: false }))
    allResultList.value = mapped
    workList.value = mapped
  } catch (err) {
    console.error('작업지시 실적 조회 실패', err)
    alert('조회 실패: 존재하지 않는 작업지시서일 수 있습니다.')
  }
}

const handleCheck = (item: WorkItem, val: boolean) => {
  workList.value.forEach(i => (i.selected = false))
  item.selected = val
  if (val) selectedItem.value = { ...item }
}

const saveResult = async () => {
  try {
    await axios.post('/prodResult/save', selectedItem.value)
    alert('저장 완료')
    selectedItem.value = emptyItem()
    fetchResultList()
  } catch (err) {
    console.error('저장 실패', err)
    alert('저장 실패')
  }
}

const clearForm = () => {
  selectedItem.value = emptyItem()
  workList.value.forEach(item => (item.selected = false))
}

const filters = ref({
  workOrder: '',
  workDate: '',
  status: '',
  productName: '',
  productSpec: '',
  worker: ''
})

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

onMounted(() => {
  // 초기 데이터 요청 안함 (사용자가 검색할 때만 요청)
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

.tab-toggle {
  margin-top: 2rem;
  margin-bottom: 1rem;
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
  justify-content: flex-start;
  padding-top: 0.5rem;
}

.va-input {
  min-width: 200px;
}
</style>
