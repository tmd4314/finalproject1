<template>
  <va-modal v-model="visible" title="공정 검색" size="large">
    <div class="va-mb-4 va-row va-gap-2">
      <va-input v-model="search.process_code" label="공정코드" />
      <va-input v-model="search.process_name" label="공정명" />
      <va-input v-model="search.product_name" label="제품명" />
      <va-input v-model="search.product_stand" label="제품규격" />
      <va-button @click="applySelection">검색</va-button>
    </div>

    <va-data-table :items="filteredProcessList" :columns="columns" track-by="process_code">
      <template #cell(select)="{ row }">
        <va-checkbox
          :model-value="row.rowData.selected"
          @update:modelValue="val => handleSelect(row.rowData, val)"
        />
      </template>
    </va-data-table>

    <div class="va-mt-4 va-row va-justify-end va-gap-2">
      <va-button color="primary" @click="applySelection">선택</va-button>
    </div>
  </va-modal>
</template>

<script setup lang="ts">
import { ref, computed, defineProps, defineEmits, watch } from 'vue'

// ✅ Props 정의
const props = defineProps<{
  visible: boolean
  processList: any[]
}>()

// ✅ Emits 정의
const emit = defineEmits(['update:visible', 'apply'])

// ✅ v-model 처리
const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// ✅ 검색 필터
const search = ref({
  process_code: '',
  process_name: '',
  product_name: '',
  product_stand: ''
})

// ✅ 테이블 컬럼 정의
const columns = [
  { key: 'select', label: '선택', width: 60 },
  { key: 'process_code', label: '공정코드' },
  { key: 'process_name', label: '공정명' },
  { key: 'product_name', label: '제품명' },
  { key: 'product_stand', label: '제품규격' }
]


const localProcessList = ref<any[]>([])

watch(() => props.processList, (newList) => {
  localProcessList.value = newList.map(item => ({
    ...item,
    selected: false,
  }))
}, { immediate: true })

// ✅ 검색 결과 필터링 (props.processList을 가공해서 보여줌)
const filteredProcessList = computed(() =>
  localProcessList.value.filter(item =>
    (!search.value.process_code || item.process_code.includes(search.value.process_code)) &&
    (!search.value.process_name || item.process_name.includes(search.value.process_name)) &&
    (!search.value.product_name || item.product_name.includes(search.value.product_name)) &&
    (!search.value.product_stand || item.product_stand.includes(search.value.product_stand))
  )
)

// ✅ 선택 체크박스 처리
const handleSelect = (target: any, val: boolean) => {
  localProcessList.value.forEach(item => item.selected = false)
  if (val) target.selected = true
}

// ✅ 선택 버튼 클릭 처리
const applySelection = () => {
  const selected = localProcessList.value.find(p => p.selected)
  if (selected) {
    emit('apply', selected)
    emit('update:visible', false)
  } else {
    alert('선택된 공정이 없습니다.')
  }
}

</script>

<style scoped>
.va-mb-4 {
  margin-bottom: 1rem;
}
</style>
