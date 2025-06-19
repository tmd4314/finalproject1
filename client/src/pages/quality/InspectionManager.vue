<template>
  <div class="product-form">
    <h3 class="form-title">제품 검사서 등록</h3>
    <br>

    <!-- 검사 유형 등록 폼 -->
    <div class="form-section">
      <h3 class="form-title">검사 유형 등록</h3>
      <br>

      <div class="input-row">
        <va-select
          v-model="form.processInt"
          :options="processOptions" 
          value-by="process_int"
          text-by="process_name"
          label="공정명"
          class="quarter-width"
        />
        <va-input v-model="form.inspValueType" label="판정방식" class="quarter-width" />
        <va-input v-model="form.inspUnit" label="단위" class="quarter-width" />
      </div>

      <div class="input-row">
        <va-input v-model="form.inspValueQty" label="기준값" class="quarter-width" />
        <va-input v-model="form.inspQuantitaMin" label="최소범위" class="quarter-width" type="number" />
        <va-input v-model="form.inspQuantitaMax" label="최대범위" class="quarter-width" type="number" />
      </div>

      <div class="input-row">
        <va-input
          v-model="form.inspRemark"
          label="비고"
          class="quarter-width"
          type="textarea"
          placeholder="특이사항을 입력하세요"
        />
      </div>

      <br>

      <div class="form-buttons">
        <va-button @click="submitForm" color="primary">등록</va-button>
      </div>
    </div>

    <!-- 검사 리스트 테이블 -->
    <div class="form-section">
      <table class="custom-table">
        <thead>
          <tr>
            <th>판정방식</th>
            <th>단위</th>
            <th>기준값</th>
            <th>최소값</th>
            <th>최대값</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredInspectionList" :key="item.insp_code">
            <td>{{ item.insp_value_type }}</td>
            <td>{{ item.insp_unit }}</td>
            <td>{{ item.insp_value_qty }}</td>
            <td>{{ item.insp_value_min }}</td>
            <td>{{ item.insp_value_max }}</td>
            <td>{{ item.insp_remark }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

interface InspectionItem {
  process_name: string;
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

// 검사 리스트 상태
const inspectionList = ref<InspectionItem[]>([])

// 입력 폼 상태
const form = ref({
  processInt: '',
  inspValueType: '',
  inspRefValue: '',
  inspUnit: '',
  inspValueQty: '',
  inspQuantitaMin: 0,
  inspQuantitaMax: 0,
  inspRemark: '',
})

// 공정 목록 옵션
const processOptions = ref<{ process_int: number; process_name: string }[]>([]);

// ✅ 폼 초기화
const resetForm = () => {
  form.value = {
    processInt: '',
    inspValueType: '',
    inspRefValue: '',
    inspUnit: '',
    inspValueQty: '',
    inspQuantitaMin: 0,
    inspQuantitaMax: 0,
    inspRemark: '',
  }
}

// ✅ 검사 항목 등록 함수
const submitForm = async () => {
  try {
    const payload = {
      processInt: form.value.processInt,
      inspValueType: form.value.inspValueType,
      inspUnit: form.value.inspUnit,
      inspValueQty: form.value.inspValueQty,
      inspQuantitaMin: form.value.inspQuantitaMin,
      inspQuantitaMax: form.value.inspQuantitaMax,
      inspRemark: form.value.inspRemark
    };

    const res = await axios.post('/inspections/insert', payload);

    if (res.data.success) {
      alert('검사항목이 등록되었습니다!');
      resetForm();
      await loadInspectionList(form.value.processInt); // 리스트 갱신
    } else {
      alert(res.data.message || '등록 실패');
    }
  } catch (err) {
    console.error('등록 중 오류:', err);
    alert('등록 중 오류가 발생했습니다.');
  }
};

// ✅ 검사 리스트 조회
const loadInspectionList = async (processInt: string | number) => {
  if (!processInt) {
    inspectionList.value = [];
    return;
  }
  try {
    const res = await axios.get('/inspections/list', {
      params: { processInt }
    });
    inspectionList.value = res.data;
  } catch (err) {
    console.error('검사기준 리스트 조회 실패:', err);
    inspectionList.value = [];
  }
};

// ✅ 공정명 목록 불러오기
onMounted(async () => {
  try {
    const res = await axios.get('/inspections/processList');
    processOptions.value = res.data;
  } catch (err) {
    console.error('공정명 목록 조회 실패:', err);
  }
});

// ✅ 공정 선택 시 리스트 조회
watch(() => form.value.processInt, (newProcessInt) => {
  loadInspectionList(newProcessInt);
});

// ✅ 리스트 표시용 computed
const filteredInspectionList = computed(() => inspectionList.value);

const selectedProcessName = computed(() => {
  const found = processOptions.value.find(p => p.process_int === form.value.processInt);
  return found ? found.process_name : '';
});
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
