<template>
  <div class="product-form">
    <h3 class="form-title">제품검사항목 등록</h3>
    <br>
    <div class="form-section">
      <h3 class="form-title">기본정보</h3>
      <br>

      <div class="input-row">
        <select v-model="form.productCode">
          <option v-for="item in productOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </div>
      <br>

      <div class="input-row">
        <va-input v-model="form.inspCode" label="항목코드" class="quarter-width" />
        <va-select v-model="form.inspName" :options="processOptions" label="공정명" class="quarter-width"/>
        <va-input v-model="form.inspValueType" label="판정방식" class="quarter-width" />
      </div>
      <div class="input-row">
        <va-input v-model="form.supplementary" label="비고" class="half-width" />
      </div>
    </div>

    <div class="form-section">
      <h3 class="form-title">기준값 정보</h3>
      <br>
      <div class="input-row">
        <va-select
          v-model="form.inspRefValue"
          :options="['정량', '정성']"
          label="기준값 유형"
          class="quarter-width"
        />
        <va-input
          v-model="form.inspQuantitaValue"
          label="정량 기준값"
          class="quarter-width"
          :disabled="!isQuantitative"
        />
        <va-input
          v-model="form.inspQualitaValue"
          label="정성 기준값"
          class="quarter-width"
          :disabled="!isQualitative"
        />
      </div>
      <div class="input-row">
        <va-input
          v-model="form.inspUnit"
          label="단위"
          class="quarter-width"
          :disabled="!isQuantitative"
        />
        <va-input
          v-model="form.inspQuantitaMin"
          label="최소범위"
          class="quarter-width"
          type="number"
          :disabled="!isQuantitative"
        />
        <va-input
          v-model="form.inspQuantitaMax"
          label="최대범위"
          class="quarter-width"
          type="number"
          :disabled="!isQuantitative"
        />
      </div>
      <div class="input-row">
        <div class="form-buttons">
          <va-button @click="submitForm" color="primary">등록</va-button>
        </div>
      </div>
    </div>

    <div class="form-section">
      <table class="custom-table">
        <thead>
          <tr>
            <th>항목코드</th>
            <th>공정명</th>
            <th>판정방식</th>
            <th>기준수치</th>
            <th>단위</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in inspectionList" :key="item.insp_code">
            <td>{{ item.insp_code }}</td>
            <td>{{ item.insp_name }}</td>
            <td>{{ item.insp_value_type }}</td>
            <td>{{ item.insp_quantita_value }}</td>
            <td>{{ item.insp_unit }}</td>
            <td>{{ item.insp_remark }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

interface InspectionItem {
  product_name: string;
  product_code: string;
  insp_code: string;
  insp_name: string;
  insp_value_type: string;
  insp_ref_value: string;
  insp_quantita_value: string;
  insp_qualita_value: string;
  insp_unit: string;
  insp_quantita_min: number;
  insp_quantita_max: number;
  insp_judgment: string;
  insp_remark: string;
  checked?: boolean;
}

const inspectionList = ref<InspectionItem[]>([])

const processOptions = [
  '칭량',
  '혼합',
  '과립',
  '건조',
  '타정',
  '코팅'
]

const form = ref({
  productCode: '',
  prodName: '',
  inspCode: '',
  inspName: '',
  inspValueType: '',
  inspRefValue: '',
  inspQuantitaValue: '',
  inspQualitaValue: '',
  inspUnit: '',
  inspQuantitaMin: 0,
  inspQuantitaMax: 0,
  inspJudgment: '',
  inspRemark: '',
  supplementary: ''
})

const resetForm = () => {
  form.value = {
    productCode: '',
    prodName: '',
    inspCode: '',
    inspName: '',
    inspValueType: '',
    inspRefValue: '',
    inspQuantitaValue: '',
    inspQualitaValue: '',
    inspUnit: '',
    inspQuantitaMin: 0,
    inspQuantitaMax: 0,
    inspJudgment: '',
    inspRemark: '',
    supplementary: ''
  }
}

const productOptions = ref<{ label: string; value: string }[]>([])

const fetchProductNameList = async () => {
  try {
    const res = await axios.get('/inspections/productList')
    productOptions.value = res.data
      .filter((item: any) => item.product_name && item.product_code)
      .map((item: any) => ({
        label: item.product_name,
        value: item.product_code.toString()
      }))
  } catch (err) {
    console.error('제품명 리스트 조회 실패:', err)
  }
}

const isQuantitative = computed(() => form.value.inspRefValue?.toLowerCase() === '정량')
const isQualitative = computed(() => form.value.inspRefValue?.toLowerCase() === '정성')

const fetchInspectionList = async () => {
  try {
    const res = await axios.get('/inspections/list')
    inspectionList.value = res.data.map((item: InspectionItem) => ({
      ...item,
      checked: false
    }))
  } catch (err) {
    console.error('검사항목 조회 실패:', err)
  }
}

const submitForm = async () => {
  try {
    const payload = {
      product_code: form.value.productCode,
      insp_code: form.value.inspCode,
      insp_name: form.value.inspName,
      insp_value_type: form.value.inspValueType,
      insp_ref_value: form.value.inspRefValue,
      insp_quantita_value: isQuantitative.value ? form.value.inspQuantitaValue || 0 : 0,
      insp_qualita_value: isQualitative.value ? form.value.inspQualitaValue : null,
      insp_unit: isQuantitative.value ? form.value.inspUnit : null,
      insp_quantita_min: isQuantitative.value ? form.value.inspQuantitaMin : null,
      insp_quantita_max: isQuantitative.value ? form.value.inspQuantitaMax : null,
      insp_remark: form.value.supplementary
    }

    const res = await axios.post('/inspections/insert', payload)
    console.log('전송 payload:', payload)
    if (res.data.success) {
      alert('검사항목 등록')
      fetchInspectionList()
      resetForm()
    } else {
      alert('등록에 실패했습니다: ' + res.data.message)
    }
  } catch (err) {
    console.error('등록 실패:', err)
    alert('❌ 서버 오류로 등록에 실패했습니다.')
  }
}

onMounted(() => {
  fetchInspectionList()
  fetchProductNameList().then(() => {
    console.log('productOptions:', productOptions.value)
  })
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
