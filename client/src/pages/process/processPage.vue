<template>
  <div class="process-page">
    <h2 class="title">공정 흐름도 관리</h2>

    <!-- 제품 선택 -->
    <div class="product-select">
      <label for="productCode">제품코드:</label>
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
              <button class="btn save" 
               @click="handlePopupOpen(process.process_code, index)"
              >
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
            <button class="btn delete" @click="deleteSelectedMaterials">재료삭제</button>
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

              <td>
                <select v-model="row.material_code" @change="onMaterialCodeChange(row)">
                  <option disabled value="">자재 선택</option>
                  <option v-for="item in materialOptions" :key="item.material_code" :value="item.material_code">
                    {{ item.material_code }}
                  </option>
                </select>
              </td>

              <td>{{ row.material_name }}</td>
              <td>{{ row.material_unit }}</td>
              <td>{{ row.usage_qty }}</td>
              <td><input type="text" v-model="row.responsible" /></td>
            </tr>
          </tbody>
        </table>

        <div class="popup-footer">
          <button class="btn save" @click="saveMaterial">저장</button>
          <button class="btn" @click="popupVisible = false">취소</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import axios from 'axios'
import { onMounted ,computed, ref, watch } from 'vue'

interface Product {
  product_code: string
  product_name: string
  product_stand: string
}

interface Process {
  process_code: string
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
  process_code: string
  material_code: string
  material_name: string
  material_unit: string
  BOM_code: string
  usage_qty: number
  responsible: string
  selected?: boolean
}

interface MaterialOption {
  material_code: string
  material_name: string
  material_unit: string
  usage_qty: number
}

const selectedProductCode = ref<string>('')
const products = ref<Product[]>([])
const processes = ref<Process[]>([])
const equipmentCodes = ref<EquipmentCode[]>([])
const popupVisible = ref(false)
const popupProcessCode = ref('')
const materialList = ref<MaterialRow[]>([])
const materialOptions = ref<MaterialOption[]>([])
const popupProductCode = ref<string>('')
const bomCode = ref('')

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

const fetchMaterials = async () => {
  try {
    const res = await axios.get(`/bom/processList/${popupProductCode.value}`)
    
    materialOptions.value = res.data
    bomCode.value = res.data[0].bom_code
    console.log("자재:",res.data);
  } catch (err) {
    console.log('❌ 자재 목록 조회 실패:', err)
  }
}

const fetchProcess = async () => {

  try {
    const res = await axios.get(`/process/${selectedProductCode.value}`)
    processes.value = res.data
  } catch (err) {
    console.log('❌ 공정정보 조회 실패:', err)
  }
}

const fetchProcessDetail = async () => {
  try {
    const res = await axios.get(`/processDetail/${popupProcessCode.value}`)
    const fetchedDetails = res.data

    // material_code 기준으로 name, unit 채워 넣기
    materialList.value = fetchedDetails.map((item: any) => {
      const matched = materialOptions.value.find(opt => opt.material_code === item.material_code)

      return {
        process_code: item.process_code || popupProcessCode.value,
        material_code: item.material_code,
        BOM_code: item.BOM_code || '', // 필요 시
        usage_qty: item.usage_qty,
        responsible: item.name,
        material_name: matched?.material_name || '',
        material_unit: matched?.material_unit || '',
        selected: false
      }
    })
  } catch (err) {
    console.log('❌ 상세정보 조회 실패:', err)
  }
}

watch(popupProcessCode, (newCode) => {
  if (newCode) {
    fetchProcessDetail()
  }
})

watch(selectedProductCode, (newCode) => {
  if (newCode) {
    fetchProcess()
  }
})

const onMaterialCodeChange = (row: MaterialRow) => {
  const selected = materialOptions.value.find(m => m.material_code === row.material_code)
  if (selected) {
    row.material_name = selected.material_name
    row.material_unit = selected.material_unit
    row.usage_qty = selected.usage_qty
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
    process_code:'',
    process_time: '',
    process_name: '',
    code_value: '',
    selected: false
  })
}

const deleteSelectedProcesses = async () => {
  for (const p of processes.value) {
    if (p.selected && p.process_code) {
      try {
        await axios.delete(`/process/${p.process_code}`)
        console.log(`🗑️ 서버에서 공정 삭제 완료: ${p.process_code}`)
      } catch (err) {
        console.error(`❌ 공정 삭제 실패: ${p.process_code}`, err)
        alert(`공정 ${p.process_code} 삭제 실패!`)
      }
    }
  }
  // ✅ 선택된 항목은 모두 제거 (등록 전/후 상관없이)
  processes.value = processes.value.filter(p => !p.selected)
}

const addMaterial = () => {
  materialList.value.push({
    process_code: '',
    material_code: '',
    material_name: '',
    material_unit: '',
    BOM_code: '',
    usage_qty: 0,
    responsible: '',
    selected: false
  })
}

const deleteSelectedMaterials = async () => {
  for (const row of materialList.value) {
    console.log("✅ 삭제 후보:", row) // 이 로그로 값 제대로 들어오는지 확인
    if (row.selected && row.process_code && row.material_code) {
      try {
        await axios.delete(`/processDetail/${row.process_code}/${row.material_code}`)
      } catch (err) {
      }
    }
  }
  materialList.value = materialList.value.filter(row => !row.selected)
}

const saveMaterial = async (): Promise<void> => {
  // 현재 공정에 해당하는 모든 자재 먼저 삭제
  try {
    await axios.delete(`/processDetail/${popupProcessCode.value}`)
    console.log(`✅ ${popupProcessCode.value} 에 해당하는 기존 자재 삭제 완료`)
  } catch (err) {
    console.error('❌ 기존 자재 삭제 실패:', err)
    alert('기존 자재 삭제 중 오류 발생!')
    return
  }

  // 새로운 자재 저장 (삭제 후 insert)
  const payload = materialList.value.map(p => ({
    process_code: popupProcessCode.value,
    material_code: p.material_code,
    BOM_code: bomCode.value,
    name: p.responsible,
  }))

  console.log('📦 저장할 재료 데이터:', payload)

  try {
    const res = await axios.post(`/process/${popupProcessCode.value}`, payload)
    if (res.data.isSuccessed === true) {
      alert('모든 재료 등록 완료!')
      await fetchProcessDetail()
    } else {
      alert('등록 실패!')
    }
  } catch (err) {
    console.error('❌ 자재 등록 실패:', err)
    alert('서버 오류 발생!')
  }
}

const saveProcesses = async (): Promise<void> => {
  const insertList: ProcessPayload[] = []
  const updateList: ProcessPayload[] = []

  processes.value.forEach((p, idx) => {
    const code = `${selectedProductCode.value}Process${idx + 1}`
    const payload: ProcessPayload = {
      process_code: code,
      process_name: p.process_name,
      process_time: p.process_time,
      process_seq: idx + 1,
      code_value: p.code_value,
      product_code: selectedProductCode.value,
    }

    if (!p.process_code) {
      // 신규 등록 대상
      insertList.push(payload)
    } else {
      // 기존 수정 대상
      updateList.push(payload)
    }
  })

  try {
    if (insertList.length > 0) {
      const res = await axios.post('/process/', insertList)
      if (!res.data.isSuccessed) throw new Error('신규 등록 실패')
    }

    if (updateList.length > 0) {
    for (const payload of updateList) {
      try {
        const res = await axios.put(`/process/${payload.process_code}`, [payload])
        if (!res.data.isSuccessed) {
          console.warn(`⚠️ 수정 실패: ${payload.process_code}`)
          continue // 실패한 항목은 건너뛰고 다음으로 진행
        }
      } catch (err) {
        console.error(`❌ 수정 중 오류: ${payload.process_code}`, err)
        alert(`공정 수정 중 오류 발생: ${payload.process_code}`)
        continue
      }
    }
}

    alert('공정 저장 완료!')
    await fetchProcess()
  } catch (err) {
    console.error('❌ 저장 실패:', err)
    alert('저장 중 오류 발생!')
  }
}

const openPopup = (processCode: string,  productCode: string): void => {
  popupProcessCode.value = processCode
  popupProductCode.value = productCode
  popupVisible.value = true
  fetchMaterials()
}

const handlePopupOpen = (processCode: string, index: number): void => {
  if (!processCode) {
    alert('공정을 먼저 저장해야 상세정보를 추가할 수 있습니다.')
    return
  }

  const fullCode = `${selectedProductCode.value}Process${index + 1}`
  openPopup(fullCode, selectedProductCode.value)
}

onMounted(() => {
  fetchProducts()
  fetchEquipmentCodes()
  fetchMaterials()
  fetchProcess()
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

.btn.let {
  background-color: #535658;
  color: white;
}

.btn.delete {
  background-color: #eb5757;
  color: white;
}

.btn.add {
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