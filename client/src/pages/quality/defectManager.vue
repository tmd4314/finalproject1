<template>

<div class="defect-form">
  <h3 class="form-title">검사항목 등록</h3>

  <!-- 상단 입력박스 -->
  <div class="form-section">
    <div class="input-row">
      <va-input v-model="form.defectTypeCode" label="불량유형코드" class="quarter-width" :readonly="isEditMode"/>
      <va-input v-model="form.defectTypeName" label="불량명" class="quarter-width"/>
      <va-input v-model="form.defectremark" label="비고" class="half-width"/>
    </div>
    <div class="form-buttons">
      <va-button @click="insertDefect" color="primary">등록</va-button>
      <va-button @click="resetForm" color="secondary">초기화</va-button>
      <va-button @click="deletDefect" color="danger">삭제</va-button>
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
        <tr v-for="(item, index) in defectList" :key="item.defect_type_code" @click="selectItem(item)">
          <td>{{ item.defect_type_code }}</td>
          <td>{{ item.defect_type_name }}</td>
          <td>{{ item.defect_type_remark }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

interface DefectItem{
  defect_type_code: string
  defect_type_name: string
  defect_type_remark: string
}

const defectList = ref<DefectItem[]>([])

const form = ref({
  defectTypeCode:'',
  defectTypeName:'',
  defectremark:''
})

const fetchDefectList = async () => {
  try{
    const res = await axios.get('/defects/list')
    console.log('응답데이터 : ', res.data);
    defectList.value = res.data
  } catch (err) {
    console.error('검사항목 조회 실패 : ', err);
  }
}

const isEditMode = ref(false)

function selectItem(item: any) {
  form.value = {
    defectTypeCode: item.defect_type_code,
    defectTypeName: item.defect_type_name,
    defectremark: item.defect_type_remark
  };
  isEditMode.value = true; // 등록된 데이터를 클릭하고 초기화를 눌렀을 때 :readonly="isEditMode"에서 isEditMode가 true가 되면서 readonly 작동
}

const insertDefect = async () => {

  const newDefect = {
    defect_type_code: form.value.defectTypeCode,
    defect_type_name: form.value.defectTypeName,
    defect_type_remark: form.value.defectremark
  }

  try{
    if(isEditMode.value) { // input박스에 값이 들어가있은 경우에 true로 지정되면 이를 통해 등록이 아닌 수정인 경우로 분류하기 위한 if 조건문
      const res = await axios.post('/defects/update', newDefect);
      if(res.data.success) {
        alert('수정성공');
      } else {
        alert('수정실패');
      }
    } else { // isEditMode.value의 값이 1이 아닌 경우, input박스에는 값이 없으므로 등록 조건문을 사용
    const res = await axios.post('/defects/insert', newDefect);
      if(res.data.success) {
        alert("등록 성공");
        defectList.value.push({ ...newDefect }); // 수정은 기존의 데이터에 변경된 내용만 입력하면 되기때문에 이부분이 없음
      }
    }

    await fetchDefectList();
    resetForm();
    } catch (err: any) {
      if(axios.isAxiosError(err)) { // axiosError로 타입의 범위를 좁힌다
        const message = err.response?.data?.message;
        if(message === '중복') { // router에 중복err로 등록된 message가 '중복'이기 때문에 같으면 아래 조건을 실행
          alert('이미 존재하는 불량항목코드입니다'); 
        } else {
          alert('등록 중 오류 발생: ' + (message || err.message));
        }
      } else {
        alert('오류 발생'); // 지정하지 않은 나머지 오류에 대한 alert창
      }
  }
};

function resetForm() {
  form.value = {
    defectTypeCode: '', defectTypeName: '', defectremark: ''
  };
  isEditMode.value = false; // false로 지정해야 초기화했을때 불량유형코드 readonly 작동이 풀린다
}

function deletDefect() {
  alert("기능 미구현");
}

onMounted(() => {
  fetchDefectList()
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