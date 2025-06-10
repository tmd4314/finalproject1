<template>

<div class="defect-form">
  <h3 class="form-title">검사항목 등록</h3>

  <!-- 상단 입력박스 -->
  <div class="form-section">
    <div class="input-row">
      <va-input v-model="form.defectTypeCode" label="불량유형코드" class="quarter-width"/>
      <va-input v-model="form.defectTypeName" label="불량명" class="quarter-width"/>
      <va-input v-model="form.defectremark" label="비고" class="half-width"/>
    </div>
    <div class="form-buttons">
      <va-button @click="registerDefect" color="primary">등록</va-button>
      <va-button @click="resetForm" color="secondary">초기화</va-button>
      <va-button @click="deletDefect" color="danger">설명</va-button>
    </div>
  </div>
   <!-- 하단 데이터 리스트 -->
  <div class="form-section">
    <table class="custom-table">
      <thead>
        <tr>
          <th>불량유형코드</th>
          <th>불량명</th>
          <th>설명</th>
        </tr>
      </thead>
      <tbody>
        <tr>
        </tr>
      </tbody>
    </table>
  </div>
</div>

</template>

<script lang="ts" setup>
import {ref, onMounted } from 'vue'
import axios from 'axios'

const defectList = ref<DefectItem[]>([])

interface DefectItem{
  defect_type_code: string,
  defect_type_name: string,
  defect_remark: string
}

const form = ref({
  defectTypeCode:'',
  defectTypeName:'',
  defectremark:''
})

function registerDefect() {
  alert("기능 미구현");
}

function resetForm() {
  alert("기능 미구현");
}

function deletDefect() {
  alert("기능 미구현");
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

.defect-form {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
  padding: 1rem;
}

.form-title {
  font-size: 1.125rem;
  font-weight: 1000;
  width: 200px;
  margin-bottom: 1rem;
}

.input-row {
  display: flex;
  gap: 1rem; /* 두 박스 간 여백 */
  margin-bottom: 0.5rem;
}

.va-input {
  margin-bottom: 0.5rem;
}

.quarter-width {
  flex: 1; /* 전체 너비를 4등분 */
}

.half-width {
  flex: 2; /* 전체 너비를 2칸 차지 */
}

.half-width {
  width: 50%;
}

.form-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.form-buttons {
  display: flex;
  justify-content: flex-end; /* ← 이 부분을 변경 */
  gap: 0.5rem; /* 버튼 사이 간격 추가 (선택 사항) */
  margin-top: 0.5rem;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  border-radius: 0.5rem;
  overflow: hidden;
}

.custom-table th,
.custom-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
  text-align: center;
  background-color: #ffffff;
}

.custom-table th {
  background-color: #ffffff;
  font-weight: bold;
} 

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
}

.image-preview img {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
  border: 1px solid #ccc;
  padding: 4px;
  border-radius: 4px;
}
</style>