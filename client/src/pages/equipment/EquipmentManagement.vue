<template>
  <div class="equipment-management-page">
    <h1 class="va-h3 mb-6">설비 관리</h1>

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
          />
          <VaSelect
            v-model="searchParams.status"
            label="설비상태"
            :options="statusOptions"
            text-by="label"
            value-by="value"
            clearable
            placeholder="전체"
          />
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <VaButton 
            color="primary"
            @click="search"
          >
            <VaIcon name="search" class="mr-1" />
            조회
          </VaButton>
          <VaButton 
            color="secondary"
            @click="resetSearch"
          >
            <VaIcon name="refresh" class="mr-1" />
            초기화
          </VaButton>
        </div>
      </VaCardContent>
    </VaCard>

    <!-- 설비 목록 -->
    <VaCard>
      <VaCardContent>
        <div class="flex justify-between items-center mb-4">
          <h2 class="va-h5">설비 목록</h2>
          <div class="flex gap-2">
            <VaButton 
              color="warning"
              :disabled="selectedRows.length !== 1"
              @click="editEquipment"
            >
              <VaIcon name="edit" class="mr-1" />
              수정
            </VaButton>
            <VaButton 
              color="danger"
              :disabled="selectedRows.length === 0"
              @click="deleteEquipments"
            >
              <VaIcon name="delete" class="mr-1" />
              삭제
            </VaButton>
          </div>
        </div>

        <VaAlert 
          v-if="selectedRows.length > 0"
          color="info" 
          outline 
          class="mb-4"
        >
          <template #icon>
            <VaIcon name="info" />
          </template>
          {{ selectedRows.length }}개의 설비가 선택되었습니다.
          <span v-if="selectedRows.length > 1" class="ml-2 text-sm">
            (수정은 1개만 선택 가능)
          </span>
        </VaAlert>

        <VaDataTable
          v-model="selectedRows"
          :items="filteredEquipments"
          :columns="columns"
          :loading="loading"
          selectable
          select-mode="multiple"
          hoverable
          sticky-header
          :per-page="20"
          :current-page="currentPage"
          @update:current-page="currentPage = $event"
          @selection-change="handleSelectionChange"
        >
          <!-- 설비 번호 -->
          <template #cell(eq_id)="{ rowData }">
            <span class="font-semibold">{{ rowData.eq_id }}</span>
          </template>

          <!-- 설비명 -->
          <template #cell(eq_name)="{ rowData }">
            <span class="font-medium">{{ rowData.eq_name }}</span>
          </template>

          <!-- 분류 -->
          <template #cell(eq_group_name)="{ rowData }">
            <VaChip 
              :color="getCategoryColor(rowData.eq_group_code)" 
              size="small"
              flat
            >
              {{ rowData.eq_group_name || rowData.eq_group_code }}
            </VaChip>
          </template>

          <!-- 위치 -->
          <template #cell(location)="{ rowData }">
            <span class="text-sm">{{ getLocationText(rowData) }}</span>
          </template>

          <!-- 설비상태 -->
          <template #cell(eq_run_name)="{ rowData }">
            <VaChip 
              :color="getStatusColor(rowData.eq_run_code)" 
              size="small"
              flat
            >
              {{ rowData.eq_run_name || rowData.eq_run_code }}
            </VaChip>
          </template>

          <!-- 점검상태 -->
          <template #cell(inspection_status)="{ rowData }">
            <span class="text-sm text-secondary">
              {{ rowData.inspection_status || '점검 이력 없음' }}
            </span>
          </template>

          <!-- 청소상태 -->
          <template #cell(cleaning_status)="{ rowData }">
            <span class="text-sm text-secondary">
              {{ rowData.cleaning_status || '청소 이력 없음' }}
            </span>
          </template>
        </VaDataTable>

        <div class="flex justify-center mt-4">
          <VaPagination
            v-model="currentPage"
            :pages="Math.ceil(filteredEquipments.length / 20)"
            :visible-pages="5"
            buttons-preset="secondary"
            rounded
            gapped
            border-color="primary"
            :page-size="20"
          />
        </div>
      </VaCardContent>
    </VaCard>

    <!-- 삭제 확인 모달 -->
    <VaModal
      v-model="showDeleteModal"
      title="설비 삭제 확인"
      size="small"
      :close-button="true"
    >
      <div class="mb-4">
        <p class="mb-4">
          선택한 {{ selectedRows.length }}개의 설비를 삭제하시겠습니까?
        </p>
        <VaCard color="background-element" class="pa-3">
          <div class="text-sm">
            <p class="font-semibold mb-2">삭제할 설비:</p>
            <ul class="list-disc list-inside ml-2">
              <li v-for="equipment in selectedRows" :key="equipment.eq_id">
                {{ equipment.eq_name }} ({{ equipment.eq_id }})
              </li>
            </ul>
          </div>
        </VaCard>
      </div>
      <VaAlert color="danger" class="mb-4">
        <template #icon>
          <VaIcon name="warning" />
        </template>
        <span class="font-semibold">주의!</span> 이 작업은 되돌릴 수 없습니다.
      </VaAlert>
      <template #footer>
        <VaButton 
          preset="secondary" 
          @click="showDeleteModal = false"
        >
          취소
        </VaButton>
        <VaButton 
          color="danger" 
          @click="confirmDelete"
          :loading="deleteLoading"
        >
          삭제
        </VaButton>
      </template>
    </VaModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

// 상태
const loading = ref(false)
const deleteLoading = ref(false)
const equipments = ref<any[]>([])
const currentPage = ref(1)
const selectedRows = ref<any[]>([])
const showDeleteModal = ref(false)

// 검색 파라미터
const searchParams = ref({
  equipmentCode: '',
  equipmentName: '',
  category: '',
  status: ''
})

// 공통코드 옵션 (DB에서 가져옴)
const categoryOptions = ref<any[]>([])
const statusOptions = ref<any[]>([])

// 테이블 컬럼 정의
const columns = [
  { key: 'eq_id', label: '설비 번호', sortable: true },
  { key: 'eq_name', label: '설비명', sortable: true },
  { key: 'eq_group_name', label: '분류', sortable: true },
  { key: 'location', label: '위치', sortable: true },
  { key: 'eq_run_name', label: '설비상태', sortable: true },
  { key: 'inspection_status', label: '점검상태(일자)' },
  { key: 'cleaning_status', label: '청소상태(일자)' }
]

// 필터링된 설비 목록
const filteredEquipments = computed(() => {
  return equipments.value.filter(eq => {
    // 설비코드 검색 (대소문자 구분 없음)
    if (searchParams.value.equipmentCode && 
        !eq.eq_id.toString().toLowerCase().includes(searchParams.value.equipmentCode.toLowerCase())) {
      return false
    }
    
    // 설비명 검색 (대소문자 구분 없음)
    if (searchParams.value.equipmentName && 
        !eq.eq_name.toLowerCase().includes(searchParams.value.equipmentName.toLowerCase())) {
      return false
    }
    
    // 설비분류 필터
    if (searchParams.value.category && 
        eq.eq_group_code !== searchParams.value.category) {
      return false
    }
    
    // 설비상태 필터
    if (searchParams.value.status && 
        eq.eq_run_code !== searchParams.value.status) {
      return false
    }
    
    return true
  })
})

// 설비 목록 불러오기 (DB에서 가져옴)
const loadEquipments = async () => {
  loading.value = true
  try {
    const { data } = await axios.get('/equipments')
    if (data.isSuccessed) {
      equipments.value = data.data
    }
  } catch (err) {
    console.error('설비 목록 불러오기 실패:', err)
    alert('설비 목록을 불러올 수 없습니다.')
  } finally {
    loading.value = false
  }
}

// 공통코드 불러오기 (DB에서 가져옴)
const loadCommonCodes = async () => {
  try {
    const { data } = await axios.get('/common-codes?groups=0E,0S')
    categoryOptions.value = data['0E'] || []
    statusOptions.value = data['0S'] || []
  } catch (err) {
    console.error('공통코드 불러오기 실패:', err)
  }
}

// 검색
const search = () => {
  currentPage.value = 1
  selectedRows.value = []
}

// 검색 초기화
const resetSearch = () => {
  searchParams.value = {
    equipmentCode: '',
    equipmentName: '',
    category: '',
    status: ''
  }
  currentPage.value = 1
  selectedRows.value = []
}

// 선택 변경 처리
const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection
}

// 수정
const editEquipment = () => {
  if (selectedRows.value.length !== 1) {
    return
  }
  
  const equipment = selectedRows.value[0]
  router.push(`/facility/edit/${equipment.eq_id}`)
}

// 삭제
const deleteEquipments = () => {
  if (selectedRows.value.length === 0) {
    return
  }
  
  showDeleteModal.value = true
}

// 삭제 확인
const confirmDelete = async () => {
  deleteLoading.value = true
  
  try {
    // 선택된 설비들을 순차적으로 삭제
    const deletePromises = selectedRows.value.map(equipment => 
      axios.delete(`/equipments/${equipment.eq_id}`)
    )
    
    await Promise.all(deletePromises)
    
    alert(`${selectedRows.value.length}개의 설비가 삭제되었습니다.`)
    showDeleteModal.value = false
    selectedRows.value = []
    
    // 목록 새로고침
    await loadEquipments()
    
  } catch (err) {
    console.error('설비 삭제 실패:', err)
    alert('설비 삭제에 실패했습니다.')
  } finally {
    deleteLoading.value = false
  }
}

// 카테고리별 색상
const getCategoryColor = (code: string) => {
  const colors: Record<string, string> = {
    'e1': 'primary',    // 생산설비
    'e2': 'success',    // 품질관리설비
    'e3': 'warning'     // 포장설비
  }
  return colors[code] || 'secondary'
}

// 상태별 색상
const getStatusColor = (code: string) => {
  const colors: Record<string, string> = {
    's1': 'success',    // 가동 중
    's2': 'info',       // 가동대기 중
    's3': 'danger'      // 정지
  }
  return colors[code] || 'secondary'
}

// 위치 텍스트
const getLocationText = (equipment: any) => {
  const parts = []
  if (equipment.factory_name) parts.push(equipment.factory_name)
  if (equipment.floor_name) parts.push(equipment.floor_name)
  if (equipment.room_name) parts.push(equipment.room_name)
  return parts.join(' > ') || '-'
}

onMounted(() => {
  loadEquipments()
  loadCommonCodes()
})
</script>