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
import { ref, watch, computed, nextTick } from 'vue'

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

// 제품/자재 더미 데이터
const productOptions: ProductOption[] = [
  { text: '타이레놀', value: 'BJA-STD-10', spec: '100정', bomCode: 'MK-70' },
  { text: '우먼스정', value: 'FST-PLUS-10', spec: '80정', bomCode: 'MK-71' },
]

const materialMaster: Material[] = [
  { materialCode: 'PM1000', materialName: '아세트아미노펜', unit: 'mg', spec: '25kg/1포', usage: '' },
  { materialCode: 'PM1001', materialName: '유당', unit: 'mg', spec: '25kg/1포', usage: '' },
  { materialCode: 'PM1002', materialName: '말토덱스트린', unit: 'mg', spec: '25kg/1포', usage: '' },
  { materialCode: 'PM1003', materialName: 'PVP(폴리비닐피롤리돈)', unit: 'mg', spec: '25kg/1포', usage: '' },
]

const allBomList = ref<BomItem[]>([
  {
    bomCode: 'MK-70',
    productCode: 'BJA-STD-10',
    productName: '타이레놀',
    spec: '100정',
    materials: [
      { materialCode: 'PM1000', materialName: '아세트아미노펜', unit: 'mg', spec: '25kg/1포', usage: '100' },
      { materialCode: 'PM1001', materialName: '유당', unit: 'mg', spec: '25kg/1포', usage: '50' },
    ],
  },
  {
    bomCode: 'MK-71',
    productCode: 'FST-PLUS-10',
    productName: '우먼스정',
    spec: '80정',
    materials: [
      { materialCode: 'PM1002', materialName: '말토덱스트린', unit: 'mg', spec: '25kg/1포', usage: '80' },
    ],
  },
])

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

// 검색용 테이블에는 투입량 컬럼 제외
const materialSearchColumns = [
  { key: 'materialCode', label: '자재코드' },
  { key: 'materialName', label: '자재명' },
  { key: 'unit', label: '단위' },
  { key: 'spec', label: '규격' },
]

const bomList = ref<BomItem[]>([...allBomList.value])
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

// 투입자재(체크박스) - 객체 배열로 변경
const selectedMaterials = ref<Material[]>([])

// 자재 검색(체크박스) - 객체 배열로 변경
const searchMaterialCode = ref<string>('')
const searchMaterialName = ref<string>('')
const materialSearchResults = ref<Material[]>([])
const selectedSearchMaterials = ref<Material[]>([])

// 행 클릭 시 선택된 행에 하이라이트 클래스 적용
function getRowClass(item: BomItem) {
  return selectedBomCode.value === item.bomCode ? 'selected-row' : ''
}

function removeSelectedMaterials() {
  console.log('선택된 제거 자재들:', selectedMaterials.value)
  
  if (!selectedMaterials.value || selectedMaterials.value.length === 0) {
    alert('제거할 자재를 선택해주세요.')
    return
  }
  
  const removeCount = selectedMaterials.value.length
  const selectedCodes = selectedMaterials.value.map(m => m.materialCode)
  
  registerForm.value.materials = registerForm.value.materials.filter(
    m => !selectedCodes.includes(m.materialCode)
  )
  
  // 제거 후 선택 상태 초기화
  selectedMaterials.value = []
  
  // 성공 메시지
  alert(`${removeCount}개의 자재가 투입자재에서 제거되었습니다.`)
}

function searchMaterials() {
  const codeFilter = searchMaterialCode.value.toLowerCase()
  const nameFilter = searchMaterialName.value.toLowerCase()
  
  materialSearchResults.value = materialMaster.filter(mat =>
    (!codeFilter || mat.materialCode.toLowerCase().includes(codeFilter)) &&
    (!nameFilter || mat.materialName.toLowerCase().includes(nameFilter))
  )
}

function addSelectedMaterialsToBom() {
  console.log('선택된 자재들:', selectedSearchMaterials.value)
  
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
  
  // 추가 후 선택 상태 초기화
  selectedSearchMaterials.value = []
  
  // 성공 메시지
  if (addedCount > 0 && duplicateCount > 0) {
    alert(`${addedCount}개의 자재가 추가되었습니다. ${duplicateCount}개는 이미 존재하여 제외되었습니다.`)
  } else if (addedCount > 0) {
    alert(`${addedCount}개의 자재가 투입자재에 추가되었습니다.`)
  } else {
    alert('선택한 자재가 모두 이미 투입자재에 존재합니다.')
  }
}

// 좌측 BOM 리스트 행 클릭 시 우측 폼에 데이터 자동 입력
function onProductRowClick(row: BomItem) {
  console.log('클릭된 BOM 항목:', row)
  
  // 같은 행을 다시 클릭하면 선택 해제
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
    materials: row.materials.map(m => ({ ...m })), // 깊은 복사로 투입자재도 포함
  }
  
  // 선택 상태 초기화
  selectedMaterials.value = []
  selectedSearchMaterials.value = []
  
  console.log('폼에 설정된 데이터:', registerForm.value)
}

// 좌측 제품 드롭다운 필터링 (검색 전용)
watch(selectedProduct, (prodCode) => {
  if (!prodCode) {
    // 전체 목록 표시
    bomList.value = [...allBomList.value]
  } else {
    // 선택된 제품에 해당하는 BOM만 필터링
    bomList.value = allBomList.value.filter(b => b.productCode === prodCode)
  }
  
  // 선택된 BOM 초기화 (필터링 시 이전 선택 해제)
  selectedBomCode.value = null
  resetForm()
})

function saveBOM() {
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
  
  // 투입량 검사
  const invalidMaterials = registerForm.value.materials.filter(m => !m.usage || parseFloat(m.usage) <= 0)
  if (invalidMaterials.length > 0) {
    alert('모든 자재의 투입량을 올바르게 입력해주세요.')
    return
  }
  
  const idx = allBomList.value.findIndex(b => b.bomCode === registerForm.value.bomCode)
  const prod = productOptions.find(p => p.value === registerForm.value.productCode)
  
  const bomItem: BomItem = {
    bomCode: registerForm.value.bomCode,
    productCode: registerForm.value.productCode,
    productName: prod ? prod.text : '',
    spec: registerForm.value.spec,
    materials: registerForm.value.materials.map(m => ({ ...m })),
  }
  
  if (idx !== -1) {
    // 기존 BOM 수정
    allBomList.value[idx] = bomItem
    alert('BOM이 수정되었습니다!')
  } else {
    // 새 BOM 추가
    allBomList.value.push(bomItem)
    alert('새 BOM이 저장되었습니다!')
  }
  
  // 목록 갱신 - 전체 목록을 다시 로드하여 새로 추가된 항목도 포함
  bomList.value = [...allBomList.value]
  
  // 현재 필터가 적용되어 있다면 필터 재적용
  if (selectedProduct.value) {
    bomList.value = allBomList.value.filter(b => b.productCode === selectedProduct.value)
  }
  
  resetForm()
}

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

// 초기 자료 검색 실행
searchMaterials()
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