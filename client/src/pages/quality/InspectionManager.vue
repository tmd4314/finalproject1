<template>
  <!-- 제품 등록 폼 -->
  <div class="product-form">
    <h3 class="form-title">검사항목 등록  </h3>
    <br>

    <!-- 상단 폼 -->
    <div class="form-section">
      <div class="input-row">
        <va-input v-model="form.type" label="유형" class="quarter-width"  />
        <va-input v-model="form.itemCode" label="항목코드" class="quarter-width" :readonly="isEditMode" />
        <va-input v-model="form.itemName" label="항목명" class="quarter-width" />
        <va-input v-model="form.basicFigure" label="기본수치" class="quarter-width" />
      </div>
      <div class="input-row">
        <va-input v-model="form.unit" label="단위" class="quarter-width" />
        <va-input v-model="form.judgment" label="판정방식" class="quarter-width" />
        <va-input v-model="form.supplementary" label="비고" class="half-width" />
      </div>
      <div class="form-buttons">
        <va-button @click="registerProduct" color="primary">등록</va-button>
        <va-button @click="resetForm" color="secondary">초기화</va-button>
        <va-button @click="deleteProduct" color="danger">삭제</va-button>
      </div>
    </div>

    <!-- 하단 폼 -->
      <div class="form-section">
        <table class="custom-table">
          <thead>
            <tr>
              <th>유형</th>
              <th>항목코드</th>
              <th>항목명</th>
              <th>기본수치</th>
              <th>단위</th>
              <th>판정방식</th>
              <th>비고</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in inspectionList" :key="item.insp_code" @click="selectItem(item)">
              <td>{{ item.item_type }}</td>
              <td>{{ item.insp_code }}</td>
              <td>{{ item.insp_name }}</td>
              <td>{{ item.insp_stad_val }}</td>
              <td>{{ item.insp_unit }}</td>
              <td>{{ item.insp_judt_type }}</td>
              <td>{{ item.insp_remark }}</td>
            </tr>
          </tbody>
        </table>
      </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

interface InspectionItem {
  item_type: string
  insp_code: string
  insp_name: string
  insp_stad_val: string
  insp_unit: string
  insp_judt_type: string
  insp_remark: string
}

const inspectionList = ref<InspectionItem[]>([])

const form = ref({
  type: '',
  itemCode: '',
  itemName: '',
  basicFigure: '',
  unit: '',
  judgment: '',
  supplementary: '',
})

const fetchInspectionList = async () => {
  try {
    const res = await axios.get('/inspections/list')
    console.log('응답데이터 : ', res.data);
    inspectionList.value = res.data
  } catch (err) {
    console.error('검사항목 조회 실패:', err)
  }
}

const isEditMode = ref(false)

function selectItem(item: any) {
  form.value = {
    type: item.item_type,
    itemCode: item.insp_code,
    itemName: item.insp_name,
    basicFigure: item.insp_stad_val,
    unit: item.insp_unit,
    judgment: item.insp_judt_type,
    supplementary: item.insp_remark
  };
  isEditMode.value =true;
}


function resetForm() {
  form.value = {
    type: '', itemCode: '', itemName: '', basicFigure: '', unit: '',
    judgment: '', supplementary: ''
  };
  isEditMode.value = false;
}

const registerProduct = async () => {
    
  if (
    !form.value.type.trim() ||
    !form.value.itemCode.trim() ||
    !form.value.itemName.trim() ||
    !form.value.basicFigure.trim() ||
    !form.value.unit.trim() ||
    !form.value.judgment.trim()
  ) {
    alert('모든 필수 항목을 입력해주세요.');
    return;
  }

  const newInspection = {
      item_type: form.value.type,
      insp_code: form.value.itemCode,
      insp_name: form.value.itemName,
      insp_stad_val: form.value.basicFigure,
      insp_unit: form.value.unit,
      insp_judt_type: form.value.judgment,
      insp_remark: form.value.supplementary
    }
    
    try {
      if (isEditMode.value) {
        const res = await axios.post('/inspections/update', newInspection);
        if (res.data.success) {
          alert('수정성공');
          await fetchInspectionList();
          resetForm();
        } else {
          alert(res.data.message || '수정 실패');
        }
      } else {
        const res = await axios.post('/inspections/insert', newInspection);
        if(res.data.success) {
          alert('등록 성공');
          inspectionList.value.push({ ...newInspection });
          resetForm();
        }
      }
    } catch (err: any) {

      if(err.response?.status === 400 && err.response.data?.message) {
        alert(err.response.data.message);
        resetForm();
      } else {
        console.log('서버 에러 : ', err);
        alert('중복된 코드를 입력하였습니다');
      }
  }
};

function deleteProduct() {
  alert('삭제 기능은 아직 구현되지 않았습니다.')
}

onMounted(() => {
  fetchInspectionList()
})

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

.product-form {
  /* background-color: white; ← 이 줄 제거 또는 주석 처리 */
  background-color: transparent; /* 배경 투명하게 */
  border-radius: 0.5rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
  padding: 1rem;
}

/* 회색 테두리 박스를 흰색으로 */
.form-section {
  border: 1px solid #ccc;       /* 테두리는 유지 */
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: white;      /* 배경을 흰색으로 바꿈 */
}


.form-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.input-row {
  display: flex;
  gap: 1rem; /* 두 박스 간 여백 */
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

.va-input {
  margin-bottom: 0.5rem;
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

</style>