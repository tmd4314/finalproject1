<template>
  <div class="quality-page">
    <div class="quality-container">
      <h2 class="quality-title">품질 관리</h2>
      <div class="quality-grid">
        <!-- 제품 검색 필터 및 테이블 -->
        <div class="quality-table">
          <div class="quality-filters">
            <va-input v-model="filters.name" label="제품명" class="filter-input" />
            <va-input v-model="filters.code" label="작업지시번호" class="filter-input" />
            <va-input v-model="filters.examiner" label="검사자" class="filter-input" />
          </div>
          <div style="margin-top: 0.5rem" class="quality-filters">
            <va-date-input v-model="filters.date" label="검사일자" class="filter-input" />
            <va-select v-model="filters.step" label="공정단계" class="filter-input" />
            <va-input v-model="filters.examiner" label="수량" class="filter-spec-input" />
          </div>
          <va-data-table :items="filteredQualitys" :columns="columns" :per-page="10" :current-page.sync="page" />
        </div>
      </div>
    </div>
  </div>
</template>


<script lang="ts" setup>
import { ref, computed } from 'vue'

interface Quality {
  code: string
  name: string
  examiner: string
  unit: string
}

const qualitys = ref<Quality[]>([
  { code: 'BJA-STD-10', name: '베아제정', examiner: '김길동', unit: '박스' },
  { code: 'BJA-STD-30', name: '타이레놀', examiner: '박길동', unit: '플라스틱병' },
])

const columns = [
  { key: 'name', label: '제품명' }, 
  { key: 'code', label: '작업지시번호' },
  { key: 'examiner', label: '검사자' },
  { key: 'spec', label: '규격' },
]

const filters = ref({
  code: '',
  name: '',
  examiner: '',
  date: '',
  step: '',
})
const page = ref(1)

const filteredQualitys = computed(() => {
  return qualitys.value.filter((q) =>
    (!filters.value.code || q.code.includes(filters.value.code)) &&
    (!filters.value.name || q.name.includes(filters.value.name))
  )
})

const form = ref({
  code: '',
  name: '',
  atc: '',
  mainIngredient: '',
  spec: '',
  approval: '',
  packType: '',
  unit: '',
  safety: '',
})

function resetForm() {
  form.value = {
    code: '', name: '', atc: '', mainIngredient: '', spec: '',
    approval: '', packType: '', unit: '', safety: ''
  }
}

</script>

<style scoped>
.quality-page {
  padding: 1.5rem;
  display: flex;
  justify-content: center;
   height: 739px;
}

.quality-container {
  width: 1060px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.quality-title {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.quality-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 2.5rem;
}

.quality-table {
  grid-column: span 2 / span 2;
}

.quality-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.filter-input {
  width: 33.333%;
}

.filter-spec-input {
  width: 25%;
}

.quality-form {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
  padding: 1rem;
}

.form-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.va-input {
  margin-bottom: 0.5rem;
}

.form-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
}
</style>