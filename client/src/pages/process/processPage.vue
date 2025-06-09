<template>
  <div class="process-page">
    <h2 class="title">공정 흐름도 관리</h2>

    <!-- 제품 선택 -->
    <div class="product-select">
      <label for="productCode">제품코드</label>
      <select id="productCode" v-model="selectedProductCode">
        <option disabled value="">제품 선택</option>
        <option v-for="product in products" :key="product.product_code" :value="product.product_code">
          {{ product.product_code }}
        </option>
      </select>
      <span class="product-label">제품명: {{ selectedProduct?.product_name || '-' }}</span>
      <span class="product-label">규격: {{ selectedProduct?.product_stand || '-' }}</span>
      <button class="btn save" @click="saveProcesses">저장</button>
    </div>

    <div class="times">
      <span class="product-label">총 소요시간: {{ totalProcessTime }}분</span>
    </div>

    <!-- 공정 목록 -->
    <div class="process-table">
      <div class="table-header">
        <h3>공정순서</h3>
        <div>
          <button class="btn add" @click="addProcess">공정추가</button>
          <button class="btn delete" @click="deleteSelectedProcesses">공정삭제</button>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" disabled /></th>
            <th>순번</th>
            <th>예상소요시간</th>
            <th>시험작업</th>
            <th>설비유형</th>
            <th>상세추가</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(process, index) in processes" :key="index">
            <td><input type="checkbox" v-model="process.selected" /></td>
            <td>{{ index + 1 }}</td>
            <td><input class="time-input" v-model="process.process_time" placeholder="예: 60분" /></td>
            <td><input class="name-input" v-model="process.process_name" placeholder="혼합" /></td>
            <td>
              <select v-if="equipmentCodes.length" class="equipment-select" v-model="process.code_value">
                <option disabled value="">선택</option>
                <option v-for="item in equipmentCodes" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>
              <span v-else style="color: red;">🚫 설비 코드 없음</span>

            </td>
            <td>
              <button class="btn detail" @click="openPopup(`${selectedProductCode}Process${index + 1}`)">
                상세추가
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

      <!-- 상세 추가 팝업 -->
    <div v-if="popupVisible" class="popup-overlay">
      <div class="popup-content wide">
        <div class="popup-header">
          <div>
            <button class="btn add" @click="addMaterial">재료추가</button>
            <button class="btn delete"@click="deleteSelectedMaterials">재료삭제</button>
          </div>
        </div>

        <table class="material-table">
          <thead>
            <tr>
              <th><input type="checkbox" disabled/></th>
              <th>자재코드</th>
              <th>자재명</th>
              <th>단위</th>
              <th>투입량</th>
              <th>담당자</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in materialList" :key="index">
              <td><input type="checkbox" v-model="row.selected" /></td>
              <td><select v-model="row.material_code"><option>PM1000</option><option>PM1001</option></select></td>
              <td><select v-model="row.material_name"><option>판크레아틴</option><option>유당</option></select></td>
              <td><select v-model="row.unit"><option>mg</option><option>g</option></select></td>
              <td><input type="number" v-model="row.input_qty" /></td>
              <td><input type="text" v-model="row.responsible" /></td>
            </tr>
          </tbody>
        </table>

        <div class="popup-footer">
          <button class="btn save">저장</button>
          <button class="btn" @click="popupVisible = false">취소</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import axios from 'axios'
import { onMounted ,computed, ref } from 'vue'

interface Product {
  product_code: string
  product_name: string
  product_stand: string
}

interface Process {
  process_time: string
  process_name: string
  code_value: string
  selected?: boolean
}

interface ProcessPayload {
  process_code: string
  process_name: string
  process_time: string
  process_seq: number
  product_code: string
  code_value: string
}

interface EquipmentCode {
  value: string
  label: string
}

interface MaterialRow {
  material_code: string
  material_name: string
  unit: string
  input_qty: number
  responsible: string
  selected?: boolean
}

const selectedProductCode = ref<string>('')
const products = ref<Product[]>([])
const processes = ref<Process[]>([])
const equipmentCodes = ref<EquipmentCode[]>([])
const popupVisible = ref(false)
const popupProcessCode = ref('')
const materialList = ref<MaterialRow[]>([])

const fetchProducts = async () => {
  try {
    const res = await axios.get('/product')
    products.value = res.data
  } catch (err) {
    console.log('❌ 제품 목록 조회 실패:', err)
  }
}

const fetchEquipmentCodes = async () => {
  try{
    const res = await axios ('/common-codes/?groups=0T')
    equipmentCodes.value = res.data['0T'] || []
  } catch(err) {
    console.error('❌ 설비유형 불러오기 실패:', err)
  }
}

const selectedProduct = computed(() => {
  return products.value.find(p => p.product_code === selectedProductCode.value) || null
})

const totalProcessTime = computed(() => {
  return processes.value.reduce((sum, p) => {
    const time = parseInt(p.process_time.replace(/[^\d]/g, ''))
    return sum + (isNaN(time) ? 0 : time)
  }, 0)
})

const addProcess = () => {
  processes.value.push({
    process_time: '',
    process_name: '',
    code_value: '',
    selected: false
  })
}

const deleteSelectedProcesses = () => {
  processes.value = processes.value.filter(p => !p.selected)
}

const addMaterial = () => {
  materialList.value.push({
    material_code: '',
    material_name: '',
    unit: 'mg',
    input_qty: 0,
    responsible: '',
    selected: false
  })
}

const deleteSelectedMaterials = () => {
  materialList.value = materialList.value.filter(row => !row.selected)
}

const saveProcesses = async (): Promise<void> => {
  const payload: ProcessPayload[] = processes.value.map((p, idx) => ({
    process_code: `${selectedProductCode.value}Process${idx + 1}`,
    process_name: p.process_name,
    process_time: p.process_time,
    process_seq: idx + 1,
    code_value: p.code_value,
    product_code: selectedProductCode.value,
  }))
  console.log('📦 저장할 데이터:', payload)

  try {
    const res = await axios.post('/process', payload)
    if (res.data.isSuccessed === true) {
      alert('등록완료!')
    } else {
      alert('등록 실패!')
    }
  } catch (err) {
    console.log('오류 발생:', err)
    alert('서버 오류!')
  }
}

const openPopup = (processCode: string): void => {
  popupProcessCode.value = processCode
  popupVisible.value = true
}

onMounted(() => {
  fetchProducts()
  fetchEquipmentCodes()
})
</script>

<style scoped>
.process-page {
  padding: 30px;
  font-family: 'Pretendard', sans-serif;
  background: #fff;
}
.times {
  text-align: center;
}
h3{
  font-size: 24px;
  font-weight: bold;
}

h2.title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
}

.product-select {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.product-label {
  font-size: 14px;
  color: #333;
}

.product-select select {
  padding: 6px;
  font-size: 14px;
}

.btn {
  padding: 6px 12px;
  font-size: 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn.save {
  background-color: #2f80ed;
  color: white;
}

.btn.add {
  background-color: #2d9cdb;
  color: white;
}

.btn.delete {
  background-color: #eb5757;
  color: white;
}

.btn.detail {
  background-color: #2f80ed;
  color: white;
  font-weight: 500;
}

.process-table .table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.process-table table {
  width: 100%;
  border-collapse: collapse;
}

.process-table th, .process-table td {
  border: 1px solid #e0e0e0;
  padding: 10px;
  text-align: center;
  font-size: 14px;
}

.time-input, .name-input, .equipment-select {
  width: 100%;
  padding: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  min-width: 300px;
}

.popup-content.popup-medium {
  min-width: 60%;
  max-width: 800px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.material-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}
.material-table th,
.material-table td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: center;
}
.popup-footer {
  text-align: center;
}
</style>