<template>
  <div class="equipment-inspection-page">
    <h1 class="va-h3 mb-6">설비 점검</h1>

    <!-- 검색 영역 -->
    <VaCard class="mb-6">
      <VaCardContent>
        <h2 class="va-h5 mb-4">검색 조건</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <VaInput v-model="searchParams.equipmentCode" label="설비번호" placeholder="설비번호를 입력하세요" clearable @input="onSearchInput">
            <template #appendInner>
              <VaIcon name="search" color="secondary" />
            </template>
          </VaInput>
          <VaInput v-model="searchParams.equipmentName" label="설비명" placeholder="설비명을 입력하세요" clearable @input="onSearchInput">
            <template #appendInner>
              <VaIcon name="search" color="secondary" />
            </template>
          </VaInput>
          <VaSelect v-model="searchParams.category" label="설비분류" :options="categoryOptions" text-by="label" value-by="value" clearable placeholder="전체" @update:model-value="onSearchInput" />
          <VaSelect v-model="searchParams.status" label="설비상태" :options="statusOptions" text-by="label" value-by="value" clearable placeholder="전체" @update:model-value="onSearchInput" />
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <VaButton color="secondary" @click="resetSearch">
            <div class="flex items-center">
              <VaIcon name="refresh" size="16px" class="mr-1" />
              <span>초기화</span>
            </div>
          </VaButton>
        </div>
      </VaCardContent>
    </VaCard>

    <!-- 설비 목록 -->
    <VaCard>
      <VaCardContent>
        <div class="flex justify-between items-center mb-4">
          <h2 class="va-h5">설비 목록 (총 {{ totalCount }}개)</h2>
        </div>

        <VaDataTable :items="displayedEquipments" :columns="columns" :loading="loading" hoverable clickable @row-click="openInspectionModal">
          <template #cell(eq_id)="{ rowData }">
            <span class="font-semibold text-primary cursor-pointer">{{ rowData.eq_id }}</span>
          </template>
          <template #cell(eq_name)="{ rowData }">
            <span class="font-medium">{{ rowData.eq_name }}</span>
          </template>
          <template #cell(eq_group_name)="{ rowData }">
            <VaChip :color="getCategoryColor(rowData.eq_group_code)" size="small" flat>
              {{ rowData.eq_group_name || rowData.eq_group_code }}
            </VaChip>
          </template>
          <template #cell(location)="{ rowData }">
            <span class="text-sm">{{ getLocationText(rowData) }}</span>
          </template>
          <template #cell(eq_run_name)="{ rowData }">
            <VaChip :color="getStatusColor(rowData.eq_run_code)" size="small" flat>
              {{ rowData.eq_run_name }}
            </VaChip>
          </template>
          <template #cell(work_status_combined)="{ rowData }">
            <span class="text-sm text-info">
              {{ getWorkStatusText(rowData) }}
            </span>
          </template>
          <template #cell(inspection_status)="{ rowData }">
            <span class="text-sm text-secondary">
              {{ rowData.inspection_status || '점검 이력 없음' }}
            </span>
          </template>
        </VaDataTable>

        <div v-if="displayedEquipments.length === 0 && !loading" class="text-center py-8 text-secondary">
          조회된 설비가 없습니다.
        </div>
      </VaCardContent>
    </VaCard>

    <!-- 점검 모달 -->
    <VaModal 
      v-model="inspectionModal.show" 
      size="large" 
      :close-button="true" 
      :ok-button="false" 
      :cancel-button="false"
      :overlay-opacity="0.6"
      :z-index="1000"
      @update:model-value="(val) => !val && handleCloseModal()"
    >
      <template #header>
        <h2 class="va-h5">설비 점검 - {{ selectedEquipment?.eq_name || '설비명 없음' }}</h2>
      </template>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <VaSelect v-model="inspectionData.operator_id" :options="employeeOptions" text-by="label" value-by="value" label="작업자" :disabled="inspectionModal.isInProgress" />
        <VaInput v-model="inspectionData.equipment_name" label="설비명" disabled />
        <VaInput v-model="currentInspectionStatus" label="점검 상태" disabled />
        <VaSelect v-model="inspectionData.inspection_type_code" :options="inspectionTypeOptions" text-by="label" value-by="value" label="점검 유형" :disabled="inspectionModal.isInProgress" />
      </div>

      <div class="flex justify-start mb-4">
        <VaButton color="success" @click="handleInspectionStart" :disabled="inspectionModal.isInProgress || !canStart">
          점검 시작
        </VaButton>
      </div>

      <VaDivider class="my-4" />
      <div class="mb-4">
        <label class="va-input__label mb-4">점검 항목</label>
        <div v-if="inspectionParts.length > 0 && inspectionData.checked_parts.length > 0" class="space-y-4">
          <div v-for="(part, index) in inspectionData.checked_parts" :key="`part-${part.inspect_part_id}-${index}`" class="grid grid-cols-12 gap-2 items-center p-3 border rounded">
            <div class="col-span-1">
              <VaCheckbox v-model="part.is_checked" :disabled="!inspectionModal.isInProgress" />
            </div>
            <div class="col-span-3">
              <span class="text-sm font-medium">{{ inspectionParts.find(p => p.inspect_part_id === part.inspect_part_id)?.inspect_part_name || '항목명 없음' }}</span>
            </div>
            <div class="col-span-2">
              <div class="flex gap-2">
                <VaRadio v-for="result in judgmentOptions" :key="result.value" v-model="part.result_code" :option="result.value" :label="result.label" size="small" :disabled="!inspectionModal.isInProgress || !part.is_checked" />
              </div>
            </div>
            <div class="col-span-3">
              <VaInput v-model="part.inspection_remark" placeholder="비고" size="small" :disabled="!inspectionModal.isInProgress || !part.is_checked" :rules="inspectionData.inspection_type_code === 'n4' && part.is_checked ? [(v) => !!v || '비상점검시 비고는 필수입니다.'] : []" />
            </div>
            <div class="col-span-3">
              <VaSelect v-model="part.confirmer_id" :options="employeeOptions" text-by="label" value-by="value" placeholder="확인자 선택" size="small" :disabled="!inspectionModal.isInProgress || !part.is_checked" />
            </div>
          </div>
        </div>
        <div v-else class="text-center py-4 text-secondary">
          점검 항목이 없습니다.
        </div>
      </div>

      <div class="flex justify-start mt-6">
        <VaButton color="primary" @click="handleInspectionComplete" :disabled="!inspectionModal.isInProgress || !canComplete">
          점검 종료
        </VaButton>
      </div>
    </VaModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { useInspectionStore } from '../../stores/equipment-inspection'
import { useToast } from 'vuestic-ui'

// 타입 정의
interface Equipment {
  eq_id: string
  eq_name: string
  eq_group_code: string
  eq_group_name?: string
  eq_run_code: string
  eq_run_name?: string
  eq_type_code: string
  factory_name?: string
  floor_name?: string
  room_name?: string
  inspection_status?: string
  cleaning_status?: string
  eq_manufacturer?: string
  eq_model?: string
  eq_manufacture_date?: string | null
  eq_registration_date?: string | null
  work_code?: string
  work_status_code?: string
}

interface InspectionPart {
  inspect_part_id: number
  eq_type_code: string
  inspect_part_name: string
}

interface CodeOption {
  label: string
  value: string | number
}

interface InspectionPartResult {
  inspect_part_id: number
  is_checked: boolean
  result_code: string
  inspection_remark: string
  confirmer_id: number | null
}

interface InspectionDataType {
  operator_id: number | null
  equipment_name: string
  inspection_type_code: string
  checked_parts: InspectionPartResult[]
}

interface SearchParams {
  equipmentCode: string
  equipmentName: string
  category: string
  status: string
}

interface ApiResponse<T = any> {
  isSuccessed: boolean
  data: T
  totalCount?: number
}

interface TableRowClickEvent {
  item: Equipment
  itemIndex: number
}

// Composables
const inspectionStore = useInspectionStore()
const toast = useToast()

// State
const loading = ref(false)
const equipments = ref<Equipment[]>([])
const displayedEquipments = ref<Equipment[]>([])
const currentDisplayCount = ref<number>(30)
const totalCount = ref(0)
const inspectionParts = ref<InspectionPart[]>([])

const inspectionModal = ref({ 
  show: false, 
  isInProgress: false 
})

const selectedEquipment = ref<Equipment | null>(null)

const employeeOptions = ref<CodeOption[]>([])
const inspectionTypeOptions = ref<CodeOption[]>([])
const judgmentOptions = ref<CodeOption[]>([])
const categoryOptions = ref<CodeOption[]>([])
const statusOptions = ref<CodeOption[]>([])
const workTypeOptions = ref<CodeOption[]>([])
const workStatusOptions = ref<CodeOption[]>([])

const inspectionData = ref<InspectionDataType>({
  operator_id: null,
  equipment_name: '',
  inspection_type_code: '',
  checked_parts: []
})

const searchParams = ref<SearchParams>({
  equipmentCode: '',
  equipmentName: '',
  category: '',
  status: ''
})

// 검색 디바운스용
let searchTimeout: any | null = null

// 테이블 컬럼 정의
const columns = [
  { key: 'eq_id', label: '설비 번호', sortable: true },
  { key: 'eq_name', label: '설비명', sortable: true },
  { key: 'eq_group_name', label: '분류', sortable: true },
  { key: 'location', label: '위치', sortable: true },
  { key: 'eq_run_name', label: '설비상태', sortable: true },
  { key: 'work_status_combined', label: '작업 상태' },
  { key: 'inspection_status', label: '최근 점검일자' }
]

// Computed
const canStart = computed(() => 
  inspectionData.value.operator_id && 
  inspectionData.value.inspection_type_code
)

const canComplete = computed(() => {
  if (!inspectionData.value.checked_parts || inspectionData.value.checked_parts.length === 0) {
    return false
  }
  
  const hasCheckedParts = inspectionData.value.checked_parts.some(part => part.is_checked)
  
  // 체크된 항목들이 모두 필수 정보를 가지고 있는지 확인
  const checkedPartsValid = inspectionData.value.checked_parts
    .filter(part => part.is_checked)
    .every(part => part.result_code && part.confirmer_id)
  
  // 비상점검인 경우 체크된 항목들이 모두 비고를 가지고 있는지 확인
  const remarksValid = inspectionData.value.inspection_type_code === 'n4' 
    ? inspectionData.value.checked_parts
        .filter(part => part.is_checked)
        .every(part => part.inspection_remark?.trim())
    : true
  
  return hasCheckedParts && checkedPartsValid && remarksValid
})

const currentInspectionStatus = computed(() => 
  inspectionModal.value.isInProgress ? '점검 진행 중' : '점검 대기 중'
)

// 검색 조건이 있는지 확인하는 computed
const hasSearchCondition = computed(() => {
  return !!(
    searchParams.value.equipmentCode || 
    searchParams.value.equipmentName || 
    searchParams.value.category || 
    searchParams.value.status
  )
})

// 필터링된 설비 목록
const filteredEquipments = computed(() => {
  return equipments.value.filter(eq => {
    if (
      searchParams.value.equipmentCode &&
      !eq.eq_id.toString().toLowerCase().includes(searchParams.value.equipmentCode.toLowerCase())
    ) return false

    if (
      searchParams.value.equipmentName &&
      !eq.eq_name.toLowerCase().includes(searchParams.value.equipmentName.toLowerCase())
    ) return false

    if (
      searchParams.value.category &&
      eq.eq_group_code !== searchParams.value.category
    ) return false

    if (
      searchParams.value.status &&
      eq.eq_run_code !== searchParams.value.status
    ) return false

    return true
  })
})

// 더보기 버튼 표시 여부
const hasMore = computed(() => {
  return currentDisplayCount.value < filteredEquipments.value.length
})

// 표시할 설비 목록 업데이트 함수
const updateDisplayedEquipments = (): void => {
  displayedEquipments.value = filteredEquipments.value.slice(0, currentDisplayCount.value)
}

// 필터링된 설비 목록 변경 시 표시 목록 업데이트
watch(filteredEquipments, (newFiltered) => {
  totalCount.value = newFiltered.length
  updateDisplayedEquipments()
})

// Methods
const loadEquipments = async (): Promise<void> => {
  loading.value = true
  try {
    const response = await axios.get('/equipments')
    const data: ApiResponse<Equipment[]> = response.data
    if (data.isSuccessed) {
      equipments.value = data.data
      updateDisplayedEquipments()
    }
  } catch (err: any) {
    console.error('설비 목록 불러오기 실패:', err)
    toast.init({
      message: '설비 목록을 불러올 수 없습니다.',
      color: 'danger'
    })
  } finally {
    loading.value = false
  }
}

const loadCommonCodes = async (): Promise<void> => {
  try {
    const response = await axios.get('/common-codes?groups=0E,0S,0N,0J') 
    const data: Record<string, CodeOption[]> = response.data
    categoryOptions.value = data['0E'] || []
    statusOptions.value = data['0S'] || []
    inspectionTypeOptions.value = data['0N'] || []
    judgmentOptions.value = data['0J'] || []
  } catch (err: any) {
    console.error('공통코드 불러오기 실패:', err)
  }
}

const loadEmployees = async () => {
  try {
    const res = await axios.get('/equipment-inspection/employees')
    employeeOptions.value = res.data
  } catch (error: any) {
    console.error('직원 목록 조회 실패:', error)
    
    // 에러 발생 시 빈 배열로 초기화
    employeeOptions.value = []
    
    // 500 에러인 경우 토스트 메시지 표시
    if (error.response?.status === 500) {
      toast.init({
        message: '직원 목록을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.',
        color: 'warning'
      })
      
      // 개발/테스트를 위한 더미 데이터 제공
      employeeOptions.value = [
        { label: '홍길동', value: 1 },
        { label: '김철수', value: 2 },
        { label: '이영희', value: 3 },
        { label: '박민수', value: 4 },
        { label: '정수진', value: 5 }
      ]
    }
  }
}

const loadInspectionParts = async (eqTypeCode: string) => {
  try {
    const res = await axios.get(`/equipment-inspection/parts/${eqTypeCode}`) 
    inspectionParts.value = res.data.data || []
  } catch (error) {
    console.error('점검 항목 조회 실패:', error)
    inspectionParts.value = []
  }
}

// 검색 입력 시 디바운스 처리
const onSearchInput = (): void => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = setTimeout(() => {
    if (hasSearchCondition.value) {
      currentDisplayCount.value = Math.max(filteredEquipments.value.length, 999999)
    } else {
      currentDisplayCount.value = 30
    }
  }, 300)
}

const resetSearch = (): void => {
  searchParams.value = {
    equipmentCode: '',
    equipmentName: '',
    category: '',
    status: ''
  }
  currentDisplayCount.value = 30
}

const openInspectionModal = async (event: TableRowClickEvent) => {
  console.log('openInspectionModal 호출됨:', event.item)
  
  selectedEquipment.value = event.item
  
  // 설비별 점검 항목 로드
  await loadInspectionParts(event.item.eq_type_code)
  
  console.log('점검 항목 로드 완료:', inspectionParts.value)
  
  // 저장된 점검 데이터 확인
  const cached = inspectionStore.get(event.item.eq_id)
  
  if (cached && cached.data.checked_parts) {
    inspectionData.value = {
      operator_id: cached.data.operator_id,
      equipment_name: cached.data.equipment_name,
      inspection_type_code: cached.data.inspection_type_code,
      checked_parts: cached.data.checked_parts
    }
    inspectionModal.value.isInProgress = cached.isInProgress
  } else {
    inspectionData.value = {
      operator_id: cached?.data.operator_id || null,
      equipment_name: event.item.eq_name,
      inspection_type_code: cached?.data.inspection_type_code || '',
      checked_parts: initializePartResults()
    }
    inspectionModal.value.isInProgress = cached?.isInProgress || false
  }
  
  console.log('inspectionData 설정 완료:', inspectionData.value)
  console.log('모달 표시 설정:', inspectionModal.value)
  
  inspectionModal.value.show = true
}

const initializePartResults = (): InspectionPartResult[] => {
  return inspectionParts.value.map(part => ({
    inspect_part_id: part.inspect_part_id,
    is_checked: false,
    result_code: '',
    inspection_remark: '',
    confirmer_id: null
  }))
}

const handleCloseModal = () => {
  if (inspectionModal.value.isInProgress && selectedEquipment.value) {
    inspectionStore.save(selectedEquipment.value.eq_id, {
      data: {
        operator_id: inspectionData.value.operator_id,
        equipment_name: inspectionData.value.equipment_name,
        inspection_type_code: inspectionData.value.inspection_type_code,
        checked_parts: inspectionData.value.checked_parts,
        result_code: '',
        inspection_remark: '',
        confirmer_id: null
      },
      isInProgress: true,
      inspection_log_id: inspectionStore.get(selectedEquipment.value.eq_id)?.inspection_log_id
    })
  }
  inspectionModal.value.show = false
}

const handleInspectionStart = async () => {
  try {
    if (!selectedEquipment.value) return
    
    const startData = {
      eq_id: selectedEquipment.value.eq_id,
      operator_id: inspectionData.value.operator_id,
      inspection_type_code: inspectionData.value.inspection_type_code
    }

    const res = await axios.post('/equipment-inspection/start', startData)
    
    if (res.data.isSuccessed) {
      inspectionModal.value.isInProgress = true
      
      // 점검 항목 결과 초기화
      inspectionData.value.checked_parts = initializePartResults()
      
      inspectionStore.save(selectedEquipment.value.eq_id, {
        data: {
          operator_id: inspectionData.value.operator_id,
          equipment_name: inspectionData.value.equipment_name,
          inspection_type_code: inspectionData.value.inspection_type_code,
          checked_parts: inspectionData.value.checked_parts,
          result_code: '',
          inspection_remark: '',
          confirmer_id: null
        },
        isInProgress: true,
        inspection_log_id: res.data.data.inspection_log_id
      })

      toast.init({
        message: '점검이 시작되었습니다. 설비가 정지 상태로 변경되었습니다.',
        color: 'success'
      })

      // 설비 목록 새로고침 (상태 변경 반영)
      await loadEquipments()
    }
  } catch (error) {
    console.error('점검 시작 실패:', error)
    toast.init({
      message: '점검 시작에 실패했습니다.',
      color: 'danger'
    })
  }
}

const handleInspectionComplete = async () => {
  try {
    if (!selectedEquipment.value) return
    
    const cached = inspectionStore.get(selectedEquipment.value.eq_id)
    const inspection_log_id = cached?.inspection_log_id
    
    if (!inspection_log_id) {
      throw new Error('점검 로그 ID를 찾을 수 없습니다.')
    }

    const checkedParts = inspectionData.value.checked_parts?.filter(part => part.is_checked) || []

    const completeData = {
      inspection_log_id,
      eq_id: selectedEquipment.value.eq_id,
      checked_parts: checkedParts.map(part => ({
        inspect_part_id: part.inspect_part_id,
        result_code: part.result_code,
        inspection_remark: part.inspection_remark,
        confirmer_id: part.confirmer_id
      })),
      result_code: 'j1',  // 기본값: 적합
      inspection_remark: '',
      confirmer_id: null
    }

    const res = await axios.post('/equipment-inspection/complete', completeData)
    
    if (res.data.isSuccessed) {
      inspectionModal.value.show = false
      inspectionModal.value.isInProgress = false
      
      inspectionStore.clear(selectedEquipment.value.eq_id)

      toast.init({
        message: '점검이 완료되었습니다. 설비가 가동대기 상태로 변경되었습니다.',
        color: 'success'
      })

      // 설비 목록 새로고침 (상태 변경 반영)
      await loadEquipments()
    }
  } catch (error) {
    console.error('점검 완료 실패:', error)
    toast.init({
      message: '점검 완료에 실패했습니다.',
      color: 'danger'
    })
  }
}

// 카테고리 색상
const getCategoryColor = (code: string): string => {
  const colors: Record<string, string> = {
    'e1': 'primary',
    'e2': 'success',
    'e3': 'warning'
  }
  return colors[code] || 'secondary'
}

// 상태 색상 (실제 설비 가동 상태 기준)
const getStatusColor = (code: string): string => {
  const colors: Record<string, string> = {
    's1': 'success',     // 가동중 - 초록색
    's2': 'info',        // 가동대기중 - 파란색
    's3': 'danger'       // 정지 - 빨간색
  }
  return colors[code] || 'secondary'
}

// 위치 텍스트 생성
const getLocationText = (equipment: Equipment): string => {
  const parts: string[] = []
  if (equipment.factory_name) parts.push(equipment.factory_name)
  if (equipment.floor_name) parts.push(equipment.floor_name)
  if (equipment.room_name) parts.push(equipment.room_name)
  return parts.join(' > ') || '-'
}

// 작업 상태 텍스트 생성
const getWorkStatusText = (equipment: Equipment): string => {
  if (!equipment.work_code && !equipment.work_status_code) {
    return '없음 / 없음'
  }
  
  const workType = workTypeOptions.value.find(opt => String(opt.value) === equipment.work_code)
  const workStatus = workStatusOptions.value.find(opt => String(opt.value) === equipment.work_status_code)
  
  const workTypeLabel = workType?.label || equipment.work_code || '없음'
  const workStatusLabel = workStatus?.label || equipment.work_status_code || '없음'
  
  return `${workTypeLabel} / ${workStatusLabel}`
}

// Lifecycle
onMounted(() => {
  loadEquipments()
  loadCommonCodes()
  loadEmployees()
})
</script>

<style scoped>
.equipment-inspection-page {
  padding: 1.5rem;
}

:deep(.va-data-table__table-tr--clickable) {
  cursor: pointer;
}

:deep(.va-data-table__table-tr--clickable:hover) {
  background-color: var(--va-background-secondary);
}

.grid {
  display: grid;
}

.grid-cols-1 {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .md\:grid-cols-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .lg\:grid-cols-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gap-4 {
  gap: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}

.mb-6 {
  margin-bottom: 1.5rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mt-4 {
  margin-top: 1rem;
}

.my-4 {
  margin-top: 1rem;
  margin-bottom: 1rem;
}

.mr-4 {
  margin-right: 1rem;
}

.mr-1 {
  margin-right: 0.25rem;
}

.flex {
  display: flex;
}

.justify-between {
  justify-content: space-between;
}

.justify-end {
  justify-content: flex-end;
}

.justify-start {
  justify-content: flex-start;
}

.items-center {
  align-items: center;
}

.text-center {
  text-align: center;
}

.py-8 {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.grid-cols-12 {
  grid-template-columns: repeat(12, minmax(0, 1fr));
}

.col-span-1 {
  grid-column: span 1 / span 1;
}

.col-span-2 {
  grid-column: span 2 / span 2;
}

.col-span-3 {
  grid-column: span 3 / span 3;
}

.border {
  border: 1px solid var(--va-background-border);
}

.rounded {
  border-radius: 0.375rem;
}

.p-3 {
  padding: 0.75rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>