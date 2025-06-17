<template>
  <va-modal v-model="visible" title="설비 검색" size="large">
    <!-- 검색 영역 -->
    <div class="va-mb-4 va-row va-gap-2">
      <va-input v-model="search.eq_id" label="설비코드" />
      <va-input v-model="search.eq_name" label="설비명" />
      <va-button @click="filterEquipment">검색</va-button>
    </div>

    <!-- 테이블 영역 -->
    <va-data-table :items="filteredEquipment" :columns="columns" track-by="eq_id">
      <template #cell(select)="{ row }">
        <va-checkbox
          :model-value="row.rowData.selected"
          @update:modelValue="val => handleSelect(row.rowData, val)"
        />
      </template>
    </va-data-table>

    <!-- 하단 버튼 -->
    <div class="va-mt-4 va-row va-justify-end va-gap-2">
      <va-button color="primary" @click="applySelection">선택</va-button>
    </div>
  </va-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Equipment {
  eq_id: string
  eq_name: string
  code_label: string  
  selected?: boolean
}

const props = defineProps<{
  modelValue: boolean
  equipmentList: Equipment[]
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'apply', equipment: Equipment): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const search = ref({
  eq_id: '',
  eq_name: ''
})

const filteredEquipment = computed(() =>
  props.equipmentList.filter(e =>
    (!search.value.eq_id || e.eq_id.includes(search.value.eq_id)) &&
    (!search.value.eq_name || e.eq_name.includes(search.value.eq_name))
  )
)

const columns = [
  { key: 'select', label: '선택', width: 50 },
  { key: 'eq_id', label: '설비코드' },
  { key: 'eq_name', label: '설비명' },
  { key: 'code_label', label: '가동상태' }
]

const handleSelect = (row: Equipment, val: boolean) => {
  props.equipmentList.forEach(eq => eq.selected = false)
  row.selected = val
}

const applySelection = () => {
  const selected = props.equipmentList.find(e => e.selected)
  if (!selected) {
    alert('장비를 선택하세요.')
    return
  }
  emit('apply', selected)
  emit('update:modelValue', false)
}

const filterEquipment = () => {
  // computed로 필터링됨
}
</script>
