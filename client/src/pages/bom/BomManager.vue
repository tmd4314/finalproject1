<template>
  <div class="bom-page">
    <!-- 좌측: BOM 조회 및 검색 -->
    <div class="bom-list">
      <div class="search-bar">
        <va-select
          v-model="selectedProduct"
          :options="productOptions" 
          label="제품명"
          class="bom-select"  
          placeholder="제품명 선택"
          clearable
        />
      </div>
      <div class="table-area">
        <va-data-table
          :items="bomList"
          :columns="bomColumns"
          :per-page="7"
          dense
          class="bom-table"
          @row-click="onProductRowClick"
          :row-class="getRowClass"
        />
      </div>
    </div>
    <!-- 우측: BOM 등록/수정 -->
    <div class="bom-register">
      <form @submit.prevent="saveBOM">
        <fieldset class="fieldset">
          <legend>제품 기본 정보</legend>
          <va-select 
            v-model="registerForm.productCode" 
            :options="productOptions" 
            label="제품명" 
            class="input-short" 
            style="width: 165px; margin-right:10px;"
            :disabled="!!selectedBomCode"
          />
          <va-input 
            v-model="registerForm.bomCode" 
            label="BOM 코드" 
            class="input-short"
            :rules="[value => !!value || 'BOM 코드는 필수입니다']"
            :disabled="!!selectedBomCode"
          />
          <va-input 
            v-model="registerForm.spec" 
            label="규격" 
            class="input-short"
          />
        </fieldset>
        <fieldset class="fieldset">
          <div class="material-header">
            <span>투입 자재</span>
            <va-button
              color="danger"
              @click="removeSelectedMaterials"
              class="remove-btn"
              size="small"
            >제거</va-button>
          </div>
          <va-data-table
            :items="registerForm.materials"
            :columns="materialColumns"
            dense
            selectable
            v-model="selectedMaterials"
            class="material-table"
            select-mode="multiple"
          >
            <template #cell-usage="{ row, rowIndex }">
              <va-input
                v-model="registerForm.materials[rowIndex].usage"
                style="width:60px;"
                placeholder="투입량"
                type="number"
                min="0"
              />
            </template>
          </va-data-table>
        </fieldset>
        <fieldset class="fieldset">
          <legend>자재 검색 및 추가</legend>
          <div class="material-search-row">
            <va-input v-model="searchMaterialCode" label="자재코드" class="input-short" />
            <va-input v-model="searchMaterialName" label="자재명" class="input-short" />
            <va-button color="primary" @click="searchMaterials" size="small" class="search-btn">검색</va-button>
            <va-button
              color="success"
              @click="addSelectedMaterialsToBom"
              class="add-btn"
              size="small"
            >추가</va-button>
          </div>
          <va-data-table
            :items="materialSearchResults"
            :columns="materialSearchColumns"
            dense
            selectable
            v-model="selectedSearchMaterials"
            class="material-table"
            select-mode="multiple"
            :selected-color="'primary'"
          />
        </fieldset>
        <div class="form-buttons">
          <va-button @click="saveBOM" color="primary" class="action-btn">
            {{ selectedBomCode ? '수정' : '저장' }}
          </va-button>
          <va-button @click="resetForm" color="secondary" class="action-btn">초기화</va-button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import axios from 'axios'
import { ref, watch, onMounted } from 'vue'

interface BomItem {
  bomCode: string
  productCode: string
  productName: string
  spec: string
  materials: Material[]
}

interface Material {
  materialCode: string
  materialName: string
  unit: string
  spec: string
  usage: string
}

interface ProductOption {
  text: string
  value: string
  spec: string
  bomCode: string
}

// 반응형 데이터
const productOptions = ref<ProductOption[]>([])
const allBomList = ref<BomItem[]>([])
const bomColumns = [
  { key: 'bomCode', label: 'BOM코드' },
  { key: 'productCode', label: '제품코드' },
  { key: 'productName', label: '제품명' },
  { key: 'spec', label: '규격' },
]
const materialColumns = [
  { key: 'materialCode', label: '자재코드' },  
  { key: 'materialName', label: '자재명' },
  { key: 'unit', label: '단위' },
  { key: 'spec', label: '규격' },
  { key: 'usage', label: '투입량' },
]
const materialSearchColumns = [
  { key: 'materialCode', label: '자재코드' },
  { key: 'materialName', label: '자재명' },
  { key: 'unit', label: '단위' },
  { key: 'spec', label: '규격' },
]

const bomList = ref<BomItem[]>([])
const selectedProduct = ref<string>('')

// 선택된 BOM 코드 (행 클릭으로만 선택)
const selectedBomCode = ref<string | null>(null)

// 우측 등록폼 - 초기값을 빈 값으로 설정
const registerForm = ref<{
  bomCode: string
  productCode: string
  spec: string
  materials: Material[]
}>({ bomCode: '', productCode: '', spec: '', materials: [] })

const selectedMaterials = ref<Material[]>([])
const searchMaterialCode = ref<string>('')
const searchMaterialName = ref<string>('')
const materialSearchResults = ref<Material[]>([])
const selectedSearchMaterials = ref<Material[]>([])

// ========== [axios 요청 경로 실제 라우터에 맞게 수정] ==========

// 제품 목록
async function fetchProducts() {
  try {
    const response = await axios.get('/products')
    productOptions.value = response.data.map((product: any) => ({
      text: product.productName,
      value: product.productCode,
      spec: product.spec,
      bomCode: product.bomCode
    }))
  } catch (error) {
    console.error('제품 목록 조회 실패:', error)
    alert('제품 목록을 불러오는데 실패했습니다.')
  }
}

// BOM 목록
async function fetchBomList() {
  try {
    const response = await axios.get('/bom')
    allBomList.value = response.data
    bomList.value = [...allBomList.value]
  } catch (error) {
    console.error('BOM 목록 조회 실패:', error)
    alert('BOM 목록을 불러오는데 실패했습니다.')
  }
}

// 자재 검색
async function searchMaterials() {
  try {
    const params = {
      materialCode: searchMaterialCode.value,
      materialName: searchMaterialName.value
    }
    const response = await axios.get('/materials/search', { params })
    materialSearchResults.value = response.data
  } catch (error) {
    console.error('자재 검색 실패:', error)
    alert('자재 검색에 실패했습니다.')
  }
}

// BOM 저장
async function saveBOM() {
  // 유효성 검사
  if (!registerForm.value.bomCode.trim()) {
    alert('BOM 코드를 입력해주세요.')
    return
  }
  if (!registerForm.value.productCode) {
    alert('제품을 선택해주세요.')
    return
  }
  if (registerForm.value.materials.length === 0) {
    alert('투입 자재를 추가해주세요.')
    return
  }
  const invalidMaterials = registerForm.value.materials.filter(m => !m.usage || parseFloat(m.usage) <= 0)
  if (invalidMaterials.length > 0) {
    alert('모든 자재의 투입량을 올바르게 입력해주세요.')
    return
  }
  try {
    const prod = productOptions.value.find(p => p.value === registerForm.value.productCode)
    const bomData = {
      bomCode: registerForm.value.bomCode,
      productCode: registerForm.value.productCode,
      productName: prod ? prod.text : '',
      spec: registerForm.value.spec,
      materials: registerForm.value.materials
    }
    if (selectedBomCode.value) {
      await axios.put(`/bom/${selectedBomCode.value}`, bomData)
      alert('BOM이 수정되었습니다!')
    } else {
      await axios.post('/bom', bomData)
      alert('새 BOM이 저장되었습니다!')
    }
    await fetchBomList()
    resetForm()
  } catch (error) {
    console.error('BOM 저장 실패:', error)
    alert('BOM 저장에 실패했습니다.')
  }
}

// BOM 삭제
async function deleteBOM(bomCode: string) {
  if (!confirm('정말로 이 BOM을 삭제하시겠습니까?')) return
  try {
    await axios.delete(`/bom/${bomCode}`)
    alert('BOM이 삭제되었습니다!')
    await fetchBomList()
    resetForm()
  } catch (error) {
    console.error('BOM 삭제 실패:', error)
    alert('BOM 삭제에 실패했습니다.')
  }
}

// 그 외 함수 동일 (기존 로직 그대로)
function getRowClass(item: BomItem) {
  return selectedBomCode.value === item.bomCode ? 'selected-row' : ''
}
function removeSelectedMaterials() {
  if (!selectedMaterials.value || selectedMaterials.value.length === 0) {
    alert('제거할 자재를 선택해주세요.')
    return
  }
  const removeCount = selectedMaterials.value.length
  const selectedCodes = selectedMaterials.value.map(m => m.materialCode)
  registerForm.value.materials = registerForm.value.materials.filter(
    m => !selectedCodes.includes(m.materialCode)
  )
  selectedMaterials.value = []
  alert(`${removeCount}개의 자재가 투입자재에서 제거되었습니다.`)
}
function addSelectedMaterialsToBom() {
  if (!selectedSearchMaterials.value || selectedSearchMaterials.value.length === 0) {
    alert('추가할 자재를 선택해주세요.')
    return
  }
  let addedCount = 0
  let duplicateCount = 0
  selectedSearchMaterials.value.forEach(mat => {
    const existingMaterial = registerForm.value.materials.find(m => m.materialCode === mat.materialCode)
    if (!existingMaterial) {
      registerForm.value.materials.push({ ...mat, usage: '1' })
      addedCount++
    } else {
      duplicateCount++
    }
  })
  selectedSearchMaterials.value = []
  if (addedCount > 0 && duplicateCount > 0) {
    alert(`${addedCount}개의 자재가 추가되었습니다. ${duplicateCount}개는 이미 존재하여 제외되었습니다.`)
  } else if (addedCount > 0) {
    alert(`${addedCount}개의 자재가 투입자재에 추가되었습니다.`)
  } else {
    alert('선택한 자재가 모두 이미 투입자재에 존재합니다.')
  }
}
function onProductRowClick(row: BomItem) {
  if (selectedBomCode.value === row.bomCode) {
    selectedBomCode.value = null
    resetForm()
    return
  }
  selectedBomCode.value = row.bomCode
  registerForm.value = {
    bomCode: row.bomCode,
    productCode: row.productCode,
    spec: row.spec,
    materials: row.materials.map(m => ({ ...m })),
  }
  selectedMaterials.value = []
  selectedSearchMaterials.value = []
}
watch(selectedProduct, (prodCode) => {
  if (!prodCode) {
    bomList.value = [...allBomList.value]
  } else {
    bomList.value = allBomList.value.filter(b => b.productCode === prodCode)
  }
  selectedBomCode.value = null
  resetForm()
})
function resetForm() {
  registerForm.value = {
    bomCode: '',
    productCode: '',
    spec: '',
    materials: []
  }
  selectedMaterials.value = []
  selectedSearchMaterials.value = []
  selectedBomCode.value = null
  materialSearchResults.value = []
  searchMaterialCode.value = ''
  searchMaterialName.value = ''
}
onMounted(async () => {
  await fetchProducts()
  await fetchBomList()
  await searchMaterials()
})
</script>

<style scoped>
.bom-page {
  width: 1060px;
  height: 739px;
  min-width: 1060px;
  max-width: 1060px;
  min-height: 739px;
  max-height: 739px;
  display: grid;
  grid-template-columns: 1.1fr 1.7fr;
  gap: 20px;
  background: none;
  margin: 0;
  padding: 0;
}

.bom-list {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 0 12px #0001;
  height: 739px;
  padding: 20px 12px 10px 12px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.bom-register {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 0 12px #0001;
  height: 739px;
  padding: 20px 16px 10px 16px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.bom-select {
  width: 175px;
}

.search-btn {
  min-width: 56px;
  height: 32px;
}

.table-area, .material-table {
  flex: 1;
  min-height: 0;
}

.fieldset {
  border: 1px solid #c2c2c2;
  border-radius: 8px;
  margin-bottom: 10px;
  padding: 12px 10px 8px 10px;
}

.input-short {
  width: 165px;
  margin-right: 10px;
}

.material-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 8px;
}

.remove-btn {
  min-width: 56px;
  height: 28px;
  font-size: 12px;
}

.material-search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0 5px 0;
}

.search-btn, .add-btn {
  min-width: 56px;
  height: 32px;
  font-size: 14px;
  padding: 0 12px;
}

.form-buttons {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.action-btn {
  min-width: 62px;
  height: 32px;
  font-size: 15px;
}

.bom-table,
.material-table {
  font-size: 14px;
  margin-bottom: 0;
}

/* 선택된 행 하이라이트 스타일 */
:deep(.selected-row) {
  background-color: #e3f2fd !important;
  border-left: 4px solid #2196f3 !important;
}

:deep(.selected-row:hover) {
  background-color: #e3f2fd !important;
}

/* 행 호버 효과 */
:deep(.va-data-table tbody tr:hover) {
  background-color: #f5f5f5;
  cursor: pointer;
}
</style>