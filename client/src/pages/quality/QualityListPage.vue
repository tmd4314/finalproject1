<template>
  <div class="product-form">
    <h3 class="form-title">제품품질검사</h3>
    <br />

    <div class="form-section">
      <h3 class="form-title">조회</h3>
      <br />
      <div class="input-row">
        <!-- 제품명 선택 -->
        <va-select
          v-model="form.productName"
          :options="productOptions"
          label="제품명"
          class="quarter-width"
          @update:modelValue="fetchWorkOrdersByProductName"
        />

        <!-- 작업지시서번호 선택 -->
        <va-select
          v-model="form.workNum"
          :options="workOrderOptions"
          label="작업지시서번호"
          class="quarter-width"
          @update:modelValue="fetchDetail"
        />

        <va-input
          v-model="form.managerId"
          label="담당자 명"
          class="quarter-width"
          readonly
        />
      </div>

      <div class="input-row">
        <va-select
          v-model="form.inspName"
          :options="inspNameOptions"
          label="검사항목명"
          class="quarter-width"
        />
      </div>
    </div>

    <div class="form-section">
      <table class="custom-table">
        <thead>
          <tr>
            <th>검사항목</th>
            <th>기준값</th>
            <th>측정값</th>
            <th>판정</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in filteredInspectionDetails" :key="index">
            <td>{{ item.insp_name }}</td>
            <td>
              {{
                item.insp_ref_value === '정량'
                  ? (item.insp_quantita_value ?? 'N/A')
                  : (item.insp_qualita_value ?? 'N/A')
              }}
            </td>
            <td>
              <!-- 측정값 입력 -->
              <template v-if="item.insp_ref_value === '정량'">
                <va-input
                  v-model="item.measuredValue"
                  type="number"
                  @input="evaluateJudgement(item)"
                />
              </template>
              <template v-else>
                <va-input v-model="item.measuredValue" />
              </template>
            </td>
            <td>
              <!-- 판정 표시 -->
              <template v-if="item.insp_ref_value === '정량'">
                {{ item.judgement || '판정대기' }}
              </template>
              <template v-else>
                <va-select
                  v-model="item.judgement"
                  :options="['합', '불합']"
                  placeholder="선택"
                  class="w-full"
                />
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// form 상태
const form = ref({
  workNum: '',
  productName: '',
  managerId: '',
  inspName: ''
})

// 옵션 리스트들
const productOptions = ref<string[]>([])
const workOrderOptions = ref<string[]>([])
const inspNameOptions = ref<string[]>([])

// 상세 검사 항목 전체 데이터
const inspectionDetails = ref<any[]>([])

// inspName으로 필터링한 상세 데이터 (선택 없으면 전체 출력)
const filteredInspectionDetails = computed(() => {
  if (!form.value.inspName) {
    return inspectionDetails.value
  }
  return inspectionDetails.value.filter(
    item => item.insp_name === form.value.inspName
  )
})

// 초기 제품명 목록 호출
onMounted(async () => {
  try {
    const res = await axios.get('/qualitys/productList')
    productOptions.value = res.data.map((item: any) => item.product_name)
  } catch (err) {
    console.error('제품명 불러오기 실패:', err)
  }
})

// 제품명 선택 시 작업지시서 목록 호출
const fetchWorkOrdersByProductName = async (productName: string) => {
  if (!productName) {
    workOrderOptions.value = []
    form.value.workNum = ''
    return
  }
  try {
    const res = await axios.get(
      `/qualitys/workOrderListByProduct/${encodeURIComponent(productName)}`
    )
    workOrderOptions.value = res.data.map((item: any) => item.work_order_no)
    form.value.workNum = ''
  } catch (err) {
    console.error('작업지시서 목록 조회 실패:', err)
  }
}

// 작업지시서번호 선택 시 상세정보 조회
const fetchDetail = async (workNo: string) => {
  if (!workNo) {
    inspNameOptions.value = []
    inspectionDetails.value = []
    form.value.inspName = ''
    return
  }
  try {
    const res = await axios.get(
      `/qualitys/workOrderDetailList/${encodeURIComponent(workNo)}`
    )
    if (res.data.length > 0) {
      const data = res.data[0]
      form.value.productName = data.product_name
      form.value.managerId = data.manager_id || ''

      // insp_name 중복 제거
      const uniqueInspNames = Array.from(
        new Set(res.data.map((item: any) => item.insp_name))
      )
      inspNameOptions.value = uniqueInspNames

      // inspName 초기값을 빈 문자열로 세팅
      form.value.inspName = ''

      // 상세 검사 항목 데이터 저장 + 초기 measuredValue, judgement 필드 추가
      inspectionDetails.value = res.data.map((item: any) => ({
        ...item,
        measuredValue: '',
        judgement: ''
      }))
    } else {
      form.value.productName = ''
      form.value.managerId = ''
      inspNameOptions.value = []
      inspectionDetails.value = []
      form.value.inspName = ''
    }
  } catch (err) {
    console.error('상세정보 조회 실패:', err)
    form.value.productName = ''
    form.value.managerId = ''
    inspNameOptions.value = []
    inspectionDetails.value = []
    form.value.inspName = ''
  }
}

// 정량 항목 자동 판정 함수
const evaluateJudgement = (item: any) => {
  const 기준값 = parseFloat(item.insp_quantita_value)
  const 측정값 = parseFloat(item.measuredValue)

  if (!isNaN(기준값) && !isNaN(측정값)) {
    item.judgement = 기준값 === 측정값 ? '합' : '불합'
  } else {
    item.judgement = ''
  }
}
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