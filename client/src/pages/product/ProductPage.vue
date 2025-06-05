<template>
  <div class="product-page">
    <div class="product-container">
      <h2 class="product-title">제품 관리</h2>
      <div class="product-grid">
        <!-- 제품 검색 필터 및 테이블 -->
        <div class="product-table">
          <div class="product-filters">
            <va-input v-model="filters.code" label="제품코드" class="filter-input" />
            <va-input v-model="filters.name" label="제품명" class="filter-input" />
            <va-input v-model="filters.spec" label="규격" class="filter-spec-input" />
          </div>
          <va-data-table :items="filteredProducts" :columns="columns" :per-page="10" :current-page.sync="page" />
        </div>

        <!-- 제품 등록 폼 -->
        <div class="product-form">
          <h3 class="form-title">제품 등록</h3>
          <va-input v-model="form.code" label="제품코드" />
          <va-input v-model="form.name" label="제품명" />
          <va-input v-model="form.atc" label="ATC코드" />
          <va-input v-model="form.mainIngredient" label="주요성분" />
          <va-input v-model="form.spec" label="규격" />
          <va-input v-model="form.approval" label="허가일" type="date" />
          <va-input v-model="form.packType" label="포장 유형" />
          <va-input v-model="form.unit" label="단위" />
          <va-input v-model="form.safety" label="안전코드" />

          <div class="form-buttons">
            <va-button @click="registerProduct" color="primary">등록</va-button>
            <va-button @click="resetForm">취소</va-button>
          </div>

          <div class="form-buttons">
            <va-button @click="updateProduct" color="warning">수정</va-button>
            <va-button @click="deleteProduct" color="danger">삭제</va-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'

interface Product {
  code: string
  name: string
  spec: string
  unit: string
}

const products = ref<Product[]>([
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
})

const page = ref(1)

const filteredProducts = computed(() => {
  return products.value.filter((p) =>
    (!filters.value.code || p.code.includes(filters.value.code)) &&
    (!filters.value.name || p.name.includes(filters.value.name)) &&
    (!filters.value.spec || p.spec.includes(filters.value.spec))
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

function registerProduct() {
  if (!form.value.code || !form.value.name) return alert('필수값 누락')
  products.value.push({ code: form.value.code, name: form.value.name, spec: form.value.spec, unit: form.value.unit })
  resetForm()
}

function updateProduct() {
  alert('수정 기능은 아직 구현되지 않았습니다.')
}

function deleteProduct() {
  alert('삭제 기능은 아직 구현되지 않았습니다.')
}
</script>

<style scoped>
.product-page {
  padding: 1.5rem;
  display: flex;
  justify-content: center;
   height: 739px;
}

.product-container {
  width: 1060px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.product-title {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 2.5rem;
}

.product-table {
  grid-column: span 2 / span 2;
}

.product-filters {
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

.product-form {
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
