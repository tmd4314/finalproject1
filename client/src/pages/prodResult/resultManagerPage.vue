<template>
  <div class="va-pa-4">
    <!-- 검색 필터 -->
    <div class="search-grid">
      <va-input v-model="filters.workOrder" label="작업지시서 번호" placeholder="작업지시서 번호 입력" readonly />
      <va-input v-model="filters.productName" label="제품명" placeholder="제품명 입력" readonly />
      <va-input v-model="filters.productSpec" label="제품규격" placeholder="제품 규격 입력" readonly />
      <va-input v-model="filters.resultId" label="작업실적 ID" placeholder="작업 실적 ID 입력" readonly />
      <va-date-input v-model="filters.workDate" label="작업일자" :manual-input="false" :clearable="true" />
      <va-input v-model.number="selectedItem.final_qty" label="최종 수량" />

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
        <va-input v-model="selectedItem.eq_name" label="설비명" readonly />
        <va-input v-model="selectedItem.code_label" label="가동상태" readonly />
        <va-input v-model="selectedItem.manager_id" label="작업자명" />
        <va-input :model-value="formatTime(selectedItem.work_start_time)" label="시작시간" readonly />
        <va-input :model-value="formatTime(selectedItem.work_end_time)" label="종료시간" readonly />
        <va-input v-model.number="selectedItem.pass_qty" label="생산수량" />
        <va-input v-model="selectedItem.product_qual_qty" label="합격 수량" readonly/>
        <va-input v-model="selectedItem.result_remark" label="비고" />
      </div>
      <div class="side-buttons">
        <va-button color="primary" @click="startWork">작업시작</va-button>
        <va-button color="danger" @click="endWork">작업종료</va-button>
        <va-button color="secondary" @click="clearForm">초기화</va-button>
        <va-button color="primary" @click="saveResult">저장</va-button>
        <va-button color="info" @click="openProcessPopup">공정 검색</va-button>
        <va-button color="info" @click="openEquipmentPopup">설비 검색</va-button>
        <va-button
          color="success"
          :disabled="!canRegisterFinalQty"
          @click="registerFinalQty"
        >
          최종 수량 등록
        </va-button>
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
    <!-- 🔍 설비 검색 팝업 -->
    <EquipmentSearchModal
      v-model="isEquipmentPopupOpen"
      :equipmentList="equipmentList"
      @apply="applyEquipment"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed  } from 'vue'
import axios from 'axios'
import ProductSearchModal from '../modals/ProductSearchModal.vue'
import ProcessSearchModal from '../modals/ProcessSearchModal.vue'
import EquipmentSearchModal from '../modals/EquipmentSearchModal.vue'

interface WorkItem {
  result_id: string
  result_detail: number
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
  product_qual_qty: string
  eq_id: string
  eq_name: string
  code_label: string
  selected?: boolean
  result_remark?: string
  final_qty: number
}

const emptyItem = (): WorkItem => ({
  result_id: '',
  result_detail: 0,
  product_name: '',
  product_stand: '',
  process_code: '',
  process_name: '',
  eq_id: '',
  eq_name: '',
  code_label: '',
  work_start_date: '',
  work_start_time: '',
  work_end_time: '',
  work_order_qty: 0,
  pass_qty: 0,
  product_qual_qty: '',
  result_code_label: '',
  detail_code_label: '',
  manager_id: '',
  selected: false,
  result_remark: '',
  final_qty: 0
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
  { key: 'process_time', label: '예상시간(분)' },
  { key: 'duration', label: '소요시간(분)' },
  { key: 'pass_qty', label: '재작수량' },
  { key: 'detail_code_label', label: '진행상태' },
  { key: 'manager_id', label: '작업자' }
]

const filters = ref({
  workOrder: '',
  workDate: '',
  resultId: '',
  productName: '',
  productSpec: '',
  worker: ''
})

const canRegisterFinalQty = computed(() => {
  return (
    selectedItem.value.process_name === '포장' &&
    selectedItem.value.work_end_time !== null &&
    !!selectedItem.value.product_qual_qty
  )
})

const startWork = async () => {
  const status = selectedItem.value.code_label


  const selectedSeq = Number(selectedItem.value.process_code.match(/\d+$/)?.[0]) || 0

  const unfinishedPrev = workList.value.find(item => {
    const currentSeq = Number(item.process_code.match(/\d+$/)?.[0]) || 0
    return (
      item.result_id === selectedItem.value.result_id &&
      currentSeq < selectedSeq &&
      (item.product_qual_qty === null || item.product_qual_qty === '')
    )
  })

  if (unfinishedPrev) {
    alert(`⚠️ ${unfinishedPrev.process_name} 공정의 품질검사가 완료되지 않았습니다.\n완료 후 작업을 시작해주세요.`)
    return
  }


  // ✅ 필수값 검사
  if (!selectedItem.value.result_id || !selectedItem.value.process_code) {
    alert('⚠️ 실적 ID와 공정코드를 먼저 검색하거나 선택해주세요.')
    return
  }

  // ✅ 설비 상태 검사
  if (status === '가동 중') {
    alert('⚠️ 현재 설비는 가동중입니다.\n가동이 종료되고 점검 및 청소가 완료된 후 사용하십시오.')
    return
  }

  if (status === '정지') {
    alert('⚠️ 현재 설비는 정지 상태입니다.\n점검 및 청소가 모두 완료되기를 기다려주세요.')
    return
  }

  // ✅ 작업 시작 처리
  const now = new Date()
  selectedItem.value.work_start_time = now.toISOString()
  selectedItem.value.work_start_date = now.toISOString().split('T')[0]

  try {
    // ✅ 서버에 설비 상태 업데이트 요청
    
    await axios.put(`prodResult/${selectedItem.value.result_detail}`, selectedItem.value.pass_qty)
    
    await axios.put(`/eqStatus/${selectedItem.value.eq_id}`)

    alert('✅ 작업이 시작되었습니다.')
    fetchResultList()
    console.log('✅ 작업이 시작되었습니다.', selectedItem.value.work_start_date, selectedItem.value.work_start_time)
  } catch (err) {
    alert('❌ 설비 상태 업데이트에 실패했습니다.')
    console.error(err)
  }
}

const endWork = async () => {
  if (!selectedItem.value.result_detail) {
    alert('⚠️ 작업 실적이 선택되지 않았습니다.')
    return
  }

  if (!selectedItem.value.result_remark || selectedItem.value.result_remark.trim() === '') {
    alert('⚠️ 종료 사유(비고)를 작성해주세요.')
    return
  }

  const now = new Date()
  const endTime = now.toISOString()

  // 종료시간 업데이트
  selectedItem.value.work_end_time = endTime

  try {
    // ✅ 실적 상세 업데이트
    await axios.put(`/prodResultStop/${selectedItem.value.result_detail}`, {
      pass_qty: selectedItem.value.pass_qty,
      result_remark: selectedItem.value.result_remark
    })

    // ✅ 설비 상태 업데이트
    await axios.put(`/eqStop/${selectedItem.value.eq_id}`)

    alert('✅ 작업이 종료되었습니다.')
    selectedItem.value = emptyItem()
    fetchResultList()
  } catch (err) {
    console.error(err)
    alert('❌ 작업 종료 처리 중 오류가 발생했습니다.')
  }
}

const registerFinalQty = async () => {
  try {
    if (!selectedItem.value.result_id || !selectedItem.value.product_qual_qty) {
      alert('❌ 실적 ID 또는 합격 수량이 누락되었습니다.')
      return
    }

    await axios.put(`/prodEnd/${selectedItem.value.result_id}`, {
      final_qty: selectedItem.value.product_qual_qty
    })

    // ✅ 등록된 값을 즉시 반영
    selectedItem.value.final_qty = Number(selectedItem.value.product_qual_qty)

    alert('✅ 최종 수량이 등록되었습니다.')
    fetchResultList()
  } catch (err) {
    alert('❌ 최종 수량 등록 실패')
    console.error(err)
  }
}


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

    const res = await axios.get(`/prodResult/${filters.value.workOrder}/${filters.value.productSpec}`)
    const mapped: WorkItem[] = res.data.map((item: WorkItem) => ({ ...item, selected: false }))

    if (mapped.length === 0) {
      alert('조회된 실적이 없습니다. 공정을 등록하여 실적을 입력하세요.')
      selectedItem.value = Object.assign(emptyItem(), {
        product_name: filters.value.productName,
        product_stand: filters.value.productSpec,
        result_id: filters.value.resultId,
        manager_id: filters.value.worker
      })
      return
    }

    // 🔥 이 부분이 빠져 있으면 화면에 안 나옴
    allResultList.value = mapped
    workList.value = mapped  // ✅ 이게 반드시 있어야 함

  } catch (err) {
    alert('조회 실패: 존재하지 않는 작업지시서일 수 있습니다.')
  }
}

const saveResult = async () => {
  try {
    if (selectedItem.value.result_detail) {
      // ✅ result_detail이 있으면 업데이트
      await axios.put(`/prodResultDetail/${selectedItem.value.result_detail}`, selectedItem.value)
    } else {
      // ✅ 신규 저장
      const res = await axios.post('/prodResultDetail', selectedItem.value)

      const { result_id, result_detail } = res.data

      if (result_id) {
        selectedItem.value.result_id = result_id
      }
      if (result_detail) {
        selectedItem.value.result_detail = result_detail
      }

      // ✅ work_result 상태를 '진행중'으로 업데이트
      if (selectedItem.value.result_id) {
        await axios.put(`/workResultStatus/${selectedItem.value.result_id}`, {
          status_code: '진행중' // ← 서버에서 인식 가능한 코드 값 사용
        })
      }
    }

    alert('✅ 저장 완료')
    selectedItem.value = emptyItem()
    fetchResultList()
  } catch (err) {
    console.error(err)
    alert('❌ 저장 실패')
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
    resultId: '',
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
  filters.value.resultId = product.result_id
  selectedItem.value.result_id = product.result_id
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

// 🔍 공정 검색 팝업
const isEquipmentPopupOpen = ref(false)
const equipmentList = ref<any[]>([]) // 자식에게 줄 데이터
const openEquipmentPopup = async () => {
  try {
    const res = await axios.get('/equipment')
    equipmentList.value = res.data // 받아온 데이터 저장
    isEquipmentPopupOpen.value = true
  } catch (err) {
    alert('공정 데이터를 불러오지 못했습니다.')
  }
}

const applyEquipment = (equipment: any) => {
  selectedItem.value.eq_id = equipment.eq_id
  selectedItem.value.eq_name = equipment.eq_name
  selectedItem.value.code_label = equipment.code_label
  isEquipmentPopupOpen.value = false
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