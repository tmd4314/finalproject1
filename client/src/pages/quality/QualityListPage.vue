<template>
  <div class="product-form">
    <h3 class="form-title">제품품질검사</h3>
    <br>

    <div class="form-section">
      <h3 class="form-title">조회</h3>
      <br>
      <div class="input-row">
        <va-select
          v-model="form.workNum"
          :options="workOrderOptions"
          label="작업지시서번호"
          class="quarter-width"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// 작업지시서 선택 폼 바인딩 객체
const form = ref({
  workNum: '' // 선택된 작업지시서 번호
})

// 작업지시서 옵션 (드롭다운용)
const workOrderOptions = ref<string[]>([])

onMounted(async () => {
  try {
    // ✅ 백엔드에서 작업지시서 목록 가져오기
    const response = await axios.get('/qualitys/workOrderList')
    workOrderOptions.value = response.data.map((item: any) => item.work_order_no)

    console.log('✅ 작업지시서 목록:', workOrderOptions.value)
  } catch (err) {
    console.error('❌ 작업지시서 불러오기 실패:', err)
  }
})
</script>

<style scoped>
/* 전체 레이아웃 */
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

.product-form {
  border-radius: 0.5rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
  padding: 1rem;
}

/* 섹션 스타일 */
.form-section {
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: white;
}

.form-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

/* 입력 행 정렬 */
.input-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

/* 셀렉트 박스 기본 스타일 */
select {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.3rem 0.5rem;
  font-size: 1rem;
  outline: none;
  box-sizing: border-box;
}

/* 너비 클래스 */
.quarter-width {
  flex: 1;
}

.half-width {
  flex: 2;
}

/* 버튼 정렬 */
.form-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

/* 테이블 스타일 */
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
}

.custom-table th {
  background-color: #ffffff;
  font-weight: bold;
}
</style>