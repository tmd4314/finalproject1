<template>
  <div class="quality-page">
    <div class="quality-container">
      <h2 class="quality-title">품질 관리</h2>
      <div class="quality-grid">
        <!-- 제품 검색 필터 및 테이블 -->
        <div class="quality-table">
          <div class="quality-filters">
            <va-input v-model="filters.code" label="제품명" class="filter-input" />
            <va-input v-model="filters.name" label="작업지시번호" class="filter-input" />
            <va-input v-model="filters.spec" label="검사자" class="filter-spec-input" />
          </div>
          <div style="margin-top: 0.5rem" class="quality-filters">
            <va-date-input v-model="filters.date" label="검사일자" class="filter-input" />
            <va-select v-model="filters.step" label="공정단계" class="filter-input" />
            <va-input v-model="filters.spec" label="수량" class="filter-spec-input" />
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
  spec: string
  unit: string
}

const qualitys = ref<Quality[]>([
  { code: 'BJA-STD-10', name: '베아제정', spec: '10정/1판', unit: '박스' },
  { code: 'BJA-STD-30', name: '베아제정', spec: '30정/1판', unit: '플라스틱병' },
  { code: 'BJA-STD-60', name: '베아제정', spec: '60정/1판', unit: '플라스틱병' },
  { code: 'FST-PLUS-10', name: '훼스탈플러스정', spec: '10정/1판', unit: '박스' },
  { code: 'FST-PLUS-30', name: '훼스탈플러스정', spec: '30정/1판', unit: '플라스틱병' },
  { code: 'FST-PLUS-60', name: '훼스탈플러스정', spec: '60정/1판', unit: '플라스틱병' },
  { code: 'FST-GOLD-10', name: '훼스탈골드정', spec: '10정/1판', unit: '박스' },
  { code: 'FST-GOLD-30', name: '훼스탈골드정', spec: '30정/1판', unit: '플라스틱병' },
])

const columns = [
  { key: 'code', label: '제품코드' },
  { key: 'name', label: '제품명' },
  { key: 'unit', label: '단위' },
  { key: 'spec', label: '규격' },
]

const filters = ref({
  code: '',
  name: '',
  spec: '',
  date: '',
  step: '',
})

const processSteps = [
  '칭량', '혼합', '과립', '건조', '타정', '코팅'
]


const page = ref(1)

const filteredQualitys = computed(() => {
  return qualitys.value.filter((q) =>
    (!filters.value.code || q.code.includes(filters.value.code)) &&
    (!filters.value.name || q.name.includes(filters.value.name)) &&
    (!filters.value.spec || q.spec.includes(filters.value.spec))
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

function registerQuality() {
  if (!form.value.code || !form.value.name) return alert('필수값 누락')
  qualitys.value.push({ code: form.value.code, name: form.value.name, spec: form.value.spec, unit: form.value.unit })
  resetForm()
}

function updateQuality() {
  alert('수정 기능은 아직 구현되지 않았습니다.')
}

function deleteQuality() {
  alert('삭제 기능은 아직 구현되지 않았습니다.')
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