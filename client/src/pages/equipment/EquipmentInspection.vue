<template>
  <div class="equipment-inspection-page">
    <h1 class="va-h3 mb-6">설비 점검</h1>

    <!-- 검색 영역 -->
    <VaCard class="mb-6">
      <VaCardContent>
        <h2 class="va-h5 mb-4">검색 조건</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <VaInput
            v-model="searchParams.equipmentCode"
            label="설비번호"
            placeholder="설비번호를 입력하세요"
            clearable
            @input="onSearchInput"
          >
            <template #appendInner>
              <VaIcon name="search" color="secondary" />
            </template>
          </VaInput>
          <VaInput
            v-model="searchParams.equipmentName"
            label="설비명"
            placeholder="설비명을 입력하세요"
            clearable
            @input="onSearchInput"
          >
            <template #appendInner>
              <VaIcon name="search" color="secondary" />
            </template>
          </VaInput>
          <VaSelect
            v-model="searchParams.category"
            label="설비분류"
            :options="categoryOptions"
            text-by="label"
            value-by="value"
            clearable
            placeholder="전체"
            @update:model-value="onSearchInput"
          />
          <VaSelect
            v-model="searchParams.status"
            label="설비상태"
            :options="statusOptions"
            text-by="label"
            value-by="value"
            clearable
            placeholder="전체"
            @update:model-value="onSearchInput"
          />
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <VaButton 
            color="secondary"
            @click="resetSearch"
          >
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

        <VaDataTable
          :items="displayedEquipments"
          :columns="columns"
          :loading="loading"
          hoverable
          clickable
          @row:click="openInspectionModal"
        >
          <template #cell(eq_id)="{ rowData }">
            <span class="font-semibold text-primary cursor-pointer">{{ rowData.eq_id }}</span>
          </template>
          <template #cell(eq_name)="{ rowData }">
            <span class="font-medium">{{ rowData.eq_name }}</span>
          </template>
          <template #cell(eq_group_name)="{ rowData }">
            <VaChip 
              :color="getCategoryColor(rowData.eq_group_code)" 
              size="small"
              flat
            >
              {{ rowData.eq_group_name || rowData.eq_group_code }}
            </VaChip>
          </template>
          <template #cell(location)="{ rowData }">
            <span class="text-sm">{{ getLocationText(rowData) }}</span>
          </template>
          <template #cell(eq_run_name)="{ rowData }">
            <VaChip 
              :color="getStatusColor(rowData.eq_run_code)" 
              size="small"
              flat
            >
              {{ rowData.eq_run_name || rowData.eq_run_code }}
            </VaChip>
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
      @update:model-value="(val) => !val && handleCloseModal()"
    >
      <template #header>
        <h2 class="va-h5">설비 점검</h2>
      </template>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <VaSelect 
          v-model="inspectionData.operator_id" 
          :options="employeeOptions"
          text-by="label"
          value-by="value"
          label="작업자 *" 
          :disabled="inspectionModal.isInProgress" 
        />
        <VaInput 
          v-model="inspectionData.equipment_name" 
          label="설비명" 
          disabled 
        />
        <VaInput 
          v-model="currentInspectionStatus" 
          label="점검 상태" 
          disabled 
        />
        <VaSelect 
          v-model="inspectionData.inspection_type_code" 
          :options="inspectionTypeOptions"
          text-by="label"
          value-by="value"
          label="점검 유형 *" 
          :disabled="inspectionModal.isInProgress" 
        />
      </div>

      <!-- 점검 시작 버튼 -->
      <div class="flex justify-start mb-4">
        <VaButton 
          color="success" 
          @click="handleInspectionStart" 
          :disabled="inspectionModal.isInProgress || !canStart"
        >
          점검 시작
        </VaButton>
      </div>

      <!-- 점검 항목 (항상 표시되나 disabled 상태로) -->
      <VaDivider class="my-4" />
      <h3 class="va-h6 mb-2">점검 항목</h3>
      <div class="space-y-2 mb-4">
        <VaCheckbox 
          v-for="item in inspectionParts" 
          :key="item.inspect_part_id" 
          v-model="inspectionData.checked_parts" 
          :array-value="item" 
          :label="item.inspect_part_name" 
          :disabled="!inspectionModal.isInProgress" 
        />
      </div>

      <h3 class="va-h6 mb-2">판정 결과 *</h3>
      <div class="mb-4">
        <VaRadio 
          v-for="result in judgmentOptions" 
          :key="result.value" 
          v-model="inspectionData.result_code" 
          :option="result.value" 
          :label="result.label" 
          class="mr-4" 
          :disabled="!inspectionModal.isInProgress" 
        />
      </div>

      <VaTextarea 
        v-model="inspectionData.inspection_remark" 
        label="비고" 
        :disabled="!inspectionModal.isInProgress" 
        :rules="remarkRules"
        :rows="3" 
        class="mb-4"
      />

      <VaSelect 
        v-model="inspectionData.confirmer_id" 
        :options="employeeOptions"
        text-by="label"
        value-by="value"
        label="확인자 *" 
        :disabled="!inspectionModal.isInProgress" 
        class="mb-4"
      />

      <!-- 점검 종료 버튼 -->
      <template #footer>
        <div class="flex justify-end gap-2">
          <VaButton 
            color="secondary" 
            @click="handleCloseModal"
          >
            취소
          </VaButton>
          <VaButton 
            color="primary" 
            @click="handleInspectionComplete" 
            :disabled="!inspectionModal.isInProgress || !canComplete"
          >
            점검 종료
          </VaButton>
        </div>
      </template>
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

interface InspectionDataType {
  operator_id: number | null
  equipment_name: string
  inspection_type_code: string
  checked_parts: InspectionPart[]
  result_code: string
  inspection_remark: string
  confirmer_id: number | null
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

const inspectionData = ref<InspectionDataType>({
  operator_id: null,
  equipment_name: '',
  inspection_type_code: '',
  checked_parts: [],
  result_code: '',
  inspection_remark: '',
  confirmer_id: null
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
  { key: 'inspection_status', label: '최근 점검일자' }
]

// Computed
const remarkRules = computed(() => {
  return inspectionData.value.inspection_type_code === 'n4' 
    ? [(v: string) => !!v || '비상점검시 비고는 필수입니다.']
    : []
})

const canStart = computed(() => 
  inspectionData.value.operator_id && 
  inspectionData.value.inspection_type_code
)

const canComplete = computed(() => {
  const hasResult = inspectionData.value.result_code
  const hasConfirmer = inspectionData.value.confirmer_id
  const hasRemark = inspectionData.value.inspection_type_code === 'n4' 
    ? inspectionData.value.inspection_remark?.trim()
    : true
  const hasCheckedParts = inspectionData.value.checked_parts.length > 0
  
  return hasResult && hasConfirmer && hasRemark && hasCheckedParts
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
    employeeOptions.value = res.data.map((emp: any) => ({
      value: emp.emp_id,
      label: `${emp.emp_name} (${emp.emp_id})`
    }))
  } catch (error) {
    console.error('직원 목록 조회 실패:', error)
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

const openInspectionModal = async (row: TableRowClickEvent) => {
  selectedEquipment.value = row.item
  
  // 설비별 점검 항목 로드
  await loadInspectionParts(row.item.eq_type_code)
  
  // 저장된 점검 데이터 확인
  const cached = inspectionStore.get(row.item.eq_id)
  
  if (cached) {
    inspectionData.value = {
      operator_id: cached.data.operator_id,
      equipment_name: cached.data.equipment_name,
      inspection_type_code: cached.data.inspection_type_code,
      checked_parts: (cached.data.checked_parts || []).map(part => ({
        inspect_part_id: part.inspect_part_id,
        eq_type_code: row.item.eq_type_code,
        inspect_part_name: part.inspect_part_name
      })),
      result_code: cached.data.result_code,
      inspection_remark: cached.data.inspection_remark,
      confirmer_id: cached.data.confirmer_id
    }
    inspectionModal.value.isInProgress = cached.isInProgress
  } else {
    inspectionData.value = {
      operator_id: null,
      equipment_name: row.item.eq_name,
      inspection_type_code: '',
      checked_parts: [],
      result_code: '',
      inspection_remark: '',
      confirmer_id: null
    }
    inspectionModal.value.isInProgress = false
  }
  
  inspectionModal.value.show = true
}

const handleCloseModal = () => {
  if (inspectionModal.value.isInProgress && selectedEquipment.value) {
    inspectionStore.save(selectedEquipment.value.eq_id, {
      data: {
        operator_id: inspectionData.value.operator_id,
        equipment_name: inspectionData.value.equipment_name,
        inspection_type_code: inspectionData.value.inspection_type_code,
        checked_parts: inspectionData.value.checked_parts.map(part => ({
          inspect_part_id: part.inspect_part_id,
          inspect_part_name: part.inspect_part_name
        })),
        result_code: inspectionData.value.result_code,
        inspection_remark: inspectionData.value.inspection_remark,
        confirmer_id: inspectionData.value.confirmer_id
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
      
      inspectionStore.save(selectedEquipment.value.eq_id, {
        data: {
          operator_id: inspectionData.value.operator_id,
          equipment_name: inspectionData.value.equipment_name,
          inspection_type_code: inspectionData.value.inspection_type_code,
          checked_parts: inspectionData.value.checked_parts.map(part => ({
            inspect_part_id: part.inspect_part_id,
            inspect_part_name: part.inspect_part_name
          })),
          result_code: inspectionData.value.result_code,
          inspection_remark: inspectionData.value.inspection_remark,
          confirmer_id: inspectionData.value.confirmer_id
        },
        isInProgress: true,
        inspection_log_id: res.data.data.inspection_log_id
      })

      toast.init({
        message: '점검이 시작되었습니다.',
        color: 'success'
      })
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

    const completeData = {
      inspection_log_id,
      eq_id: selectedEquipment.value.eq_id,
      result_code: inspectionData.value.result_code,
      inspection_remark: inspectionData.value.inspection_remark,
      confirmer_id: inspectionData.value.confirmer_id,
      checked_parts: inspectionData.value.checked_parts.map(part => ({
        inspect_part_id: part.inspect_part_id,
        result_code: inspectionData.value.result_code
      }))
    }

    const res = await axios.post('/equipment-inspection/complete', completeData)
    
    if (res.data.isSuccessed) {
      inspectionModal.value.show = false
      inspectionModal.value.isInProgress = false
      
      inspectionStore.clear(selectedEquipment.value.eq_id)

      toast.init({
        message: '점검이 완료되었습니다.',
        color: 'success'
      })

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

// 상태 색상
const getStatusColor = (code: string): string => {
  const colors: Record<string, string> = {
    's1': 'success',
    's2': 'info',
    's3': 'danger'
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

.space-y-2 > * + * {
  margin-top: 0.5rem;
}
</style>