<template>
  <div class="equipment-management-page">
    <h1 class="va-h3 mb-6">설비 관리</h1>

    <!-- 검색 -->
    <VaCard class="mb-6">
      <VaCardContent>
        <h2 class="va-h5 mb-4">검색 조건</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <VaInput
            v-model="searchParams.equipmentCode"
            label="설비번호"
            placeholder="설비번호 입력"
            clearable
          />
          <VaInput
            v-model="searchParams.equipmentName"
            label="설비명"
            placeholder="설비명 입력"
            clearable
          />
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
          <VaButton color="secondary" @click="resetSearch">초기화</VaButton>
        </div>
      </VaCardContent>
    </VaCard>

    <!-- 목록 -->
    <VaCard>
      <VaCardContent>
        <div class="flex justify-between items-center mb-4">
          <h2 class="va-h5">설비 목록 (총 {{ filteredEquipments.length }}개)</h2>
          <div class="flex gap-2">
            <VaButton color="warning" @click="handleEdit">수정</VaButton>
            <VaButton color="danger" @click="handleDelete">삭제</VaButton>
          </div>
        </div>

        <VaDataTable
          v-model="selectedRows"
          :items="filteredEquipments"
          :columns="columns"
          selectable
          select-mode="multiple"
          sticky-header
          hoverable
        >
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
              {{ rowData.eq_run_name || rowData.eq_run_code }}
            </VaChip>
          </template>
        </VaDataTable>
      </VaCardContent>
    </VaCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

interface Equipment {
  eq_id: string
  eq_name: string
  eq_group_code: string
  eq_group_name?: string
  eq_run_code: string
  eq_run_name?: string
  factory_name?: string
  floor_name?: string
  room_name?: string
}

interface CodeOption {
  label: string
  value: string
}

const router = useRouter()
const route = useRoute()
const equipments = ref<Equipment[]>([])
const selectedRows = ref<Equipment[]>([])

const searchParams = ref({
  equipmentCode: '',
  equipmentName: '',
  category: '',
  status: ''
})

const categoryOptions = ref<CodeOption[]>([])
const statusOptions = ref<CodeOption[]>([])

const columns = [
  { key: 'eq_id', label: '설비 번호', sortable: true },
  { key: 'eq_name', label: '설비명', sortable: true },
  { key: 'eq_group_name', label: '분류', sortable: true },
  { key: 'location', label: '위치', sortable: true },
  { key: 'eq_run_name', label: '설비상태', sortable: true }
]

const filteredEquipments = computed(() =>
  equipments.value.filter(eq => {
    const matchCode = !searchParams.value.equipmentCode || eq.eq_id.toLowerCase().includes(searchParams.value.equipmentCode.toLowerCase())
    const matchName = !searchParams.value.equipmentName || eq.eq_name.toLowerCase().includes(searchParams.value.equipmentName.toLowerCase())
    const matchCategory = !searchParams.value.category || eq.eq_group_code === searchParams.value.category
    const matchStatus = !searchParams.value.status || eq.eq_run_code === searchParams.value.status
    return matchCode && matchName && matchCategory && matchStatus
  })
)

const resetSearch = () => {
  searchParams.value = {
    equipmentCode: '',
    equipmentName: '',
    category: '',
    status: ''
  }
  selectedRows.value = []
}

const handleEdit = async () => {
  if (selectedRows.value.length !== 1) {
    alert('수정할 설비 1개를 선택해주세요.')
    return
  }
  const id = selectedRows.value[0].eq_id
  try {
    const res = await axios.get(`/equipments/${id}`)
    if (res.data.isSuccessed) {
      const data = res.data.data
      router.push({
        path: '/settings/equipment-register',
        query: {
          mode: 'edit',
          eq_id: data.eq_id,
          data: encodeURIComponent(JSON.stringify(data))
        }
      })
    } else {
      alert('설비 정보를 불러올 수 없습니다.')
    }
  } catch (err) {
    console.error(err)
    alert('설비 정보 요청 실패')
  }
}

const handleDelete = async () => {
  if (selectedRows.value.length === 0) {
    alert('삭제할 설비를 선택해주세요.')
    return
  }
  const confirmed = confirm(`${selectedRows.value.length}개 설비를 삭제하시겠습니까?`)
  if (!confirmed) return

  const ids = selectedRows.value.map(eq => eq.eq_id)
  try {
    await axios.post('/equipments/delete', { eq_ids: ids })
    alert('삭제되었습니다.')
    await loadEquipments()
    selectedRows.value = []
  } catch (err) {
    console.error(err)
    alert('삭제 실패')
  }
}

const loadCommonCodes = async () => {
  const res = await axios.get('/common-codes?groups=0E,0S')
  categoryOptions.value = res.data['0E'] || []
  statusOptions.value = res.data['0S'] || []
}

const loadEquipments = async () => {
  const res = await axios.get('/equipments')
  if (res.data.isSuccessed) {
    equipments.value = res.data.data
  }
}

const getCategoryColor = (code: string) => ({ e1: 'primary', e2: 'success', e3: 'warning' }[code] || 'secondary')
const getStatusColor = (code: string) => ({ s1: 'success', s2: 'info', s3: 'danger' }[code] || 'secondary')
const getLocationText = (eq: Equipment) => [eq.factory_name, eq.floor_name, eq.room_name].filter(Boolean).join(' > ') || '-'

onMounted(() => {
  loadEquipments()
  loadCommonCodes()
})
</script>

<style scoped>
.equipment-management-page {
  padding: 1.5rem;
}
</style>
