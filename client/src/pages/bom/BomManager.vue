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
          :selected="selectedBomCode"
          primary-key="bomCode"
        />
      </div>
    </div>

    <!-- 우측: BOM 등록/수정 -->
    <div class="bom-register">
      <form @submit.prevent="saveBOM">
        <fieldset class="fieldset">
          <legend>제품 기본 정보</legend>
          <va-select v-model="registerForm.productCode" :options="productOptions" label="제품명" class="input-short" style="width: 165px; margin-right:10px;"/>
          <va-input v-model="registerForm.bomCode" label="BOM 코드" class="input-short" />
          <va-input v-model="registerForm.spec" label="규격" class="input-short" />
        </fieldset>
        <fieldset class="fieldset">
          <legend>
            투입 자재
          </legend>
          <va-data-table
            :items="registerForm.materials"
            :columns="materialColumns"
            dense
            selectable
            v-model:selected="selectedMaterials"
            class="material-table"
            primary-key="materialCode"
          >
            <template #cell-usage="{ row, rowIndex }">
              <va-input
                v-model="registerForm.materials[rowIndex].usage"
                style="width:60px;"
                placeholder="투입량"
              />
            </template>
          </va-data-table>
          <va-button
            color="danger"
            @click="removeSelectedMaterials"
            class="remove-btn"
            :disabled="selectedMaterials.length === 0"
            style="float:right;margin-top:-7px;"
          >제거</va-button>
        </fieldset>
        <fieldset class="fieldset">
          <legend>자재 검색 및 추가</legend>
          <div class="material-search-row">
            <va-input v-model="searchMaterialCode" label="자재코드" class="input-short" />
            <va-input v-model="searchMaterialName" label="자재명" class="input-short" />
            <va-button color="primary" @click="searchMaterials" size="small" class="search-btn">검색</va-button>
            <va-button
              color="primary"
              @click="addSelectedMaterialsToBom"
              class="add-btn"
              size="small"
              :disabled="selectedSearchMaterials.length === 0">추가</va-button>
          </div>
          <va-data-table
            :items="materialSearchResults"
            :columns="materialColumns"
            dense
            selectable
            v-model:selected="selectedSearchMaterials"
            class="material-table"
            primary-key="materialCode"
          >
            <template #cell-usage>
              <span>-</span>
            </template>
          </va-data-table>
        </fieldset>
        <div class="form-buttons">
          <va-button @click="saveBOM" color="primary" class="action-btn">저장</va-button>
          <va-button @click="resetForm" color="secondary" class="action-btn">초기화</va-button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'

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

// 제품/자재 더미 데이터
const productOptions = [
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

const bomList = ref<BomItem[]>([...allBomList.value])
const selectedProduct = ref<string>('')

// 단일 row 하이라이트(클릭 선택)
const selectedBomCode = ref<string | null>(null)

// 우측 등록폼
const registerForm = ref<{
  bomCode: string
  productCode: string
  spec: string
  materials: Material[]
}>({ bomCode: '', productCode: '', spec: '', materials: [] })

// 투입자재(체크박스)
const selectedMaterials = ref<string[]>([])

function removeSelectedMaterials() {
  registerForm.value.materials = registerForm.value.materials.filter(
    m => !selectedMaterials.value.includes(m.materialCode)
  )
  selectedMaterials.value = []
}

// 자재 검색(체크박스)
const searchMaterialCode = ref<string>('')
const searchMaterialName = ref<string>('')
const materialSearchResults = ref<Material[]>([])
const selectedSearchMaterials = ref<string[]>([])

function searchMaterials() {
  materialSearchResults.value = materialMaster.filter(mat =>
    (!searchMaterialCode.value || mat.materialCode.includes(searchMaterialCode.value)) &&
    (!searchMaterialName.value || mat.materialName.includes(searchMaterialName.value))
  )
}

function addSelectedMaterialsToBom() {
  const selected = materialSearchResults.value.filter(mat =>
    selectedSearchMaterials.value.includes(mat.materialCode)
  )
  selected.forEach(mat => {
    if (!registerForm.value.materials.find(m => m.materialCode === mat.materialCode)) {
      registerForm.value.materials.push({ ...mat, usage: '' })
    }
  })
  selectedSearchMaterials.value = []
}

// 좌측 row 클릭 시 오른쪽 자동 입력
function onProductRowClick(row: BomItem) {
  selectedBomCode.value = row.bomCode
  registerForm.value = {
    bomCode: row.bomCode,
    productCode: row.productCode,
    spec: row.spec,
    materials: row.materials.map(m => ({ ...m })),
  }
}

// 제품 드롭다운 선택 시 동작
watch(selectedProduct, (prodCode) => {
  if (!prodCode) {
    bomList.value = [...allBomList.value]
    registerForm.value = { bomCode: '', productCode: '', spec: '', materials: [] }
    selectedBomCode.value = null
    return
  }
  bomList.value = allBomList.value.filter(b => b.productCode === prodCode)
  const item = bomList.value[0]
  if (item) {
    selectedBomCode.value = item.bomCode
    registerForm.value = {
      bomCode: item.bomCode,
      productCode: item.productCode,
      spec: item.spec,
      materials: item.materials.map(m => ({ ...m })),
    }
  } else {
    selectedBomCode.value = null
    registerForm.value = { bomCode: '', productCode: prodCode, spec: '', materials: [] }
  }
})

function saveBOM() {
  const idx = allBomList.value.findIndex(b => b.productCode === registerForm.value.productCode)
  const prod = productOptions.find(p => p.value === registerForm.value.productCode)
  if (idx !== -1) {
    allBomList.value[idx] = {
      bomCode: registerForm.value.bomCode,
      productCode: registerForm.value.productCode,
      productName: prod ? prod.text : '',
      spec: registerForm.value.spec,
      materials: registerForm.value.materials.map(m => ({ ...m })),
    }
  } else {
    allBomList.value.push({
      bomCode: registerForm.value.bomCode,
      productCode: registerForm.value.productCode,
      productName: prod ? prod.text : '',
      spec: registerForm.value.spec,
      materials: registerForm.value.materials.map(m => ({ ...m })),
    })
  }
  if (selectedProduct.value) {
    bomList.value = allBomList.value.filter(b => b.productCode === selectedProduct.value)
  } else {
    bomList.value = [...allBomList.value]
  }
  alert('저장되었습니다!')
  resetForm()
}

function resetForm() {
  if (selectedProduct.value) {
    registerForm.value = { bomCode: '', productCode: selectedProduct.value, spec: '', materials: [] }
  } else {
    registerForm.value = { bomCode: '', productCode: '', spec: '', materials: [] }
  }
  selectedMaterials.value = []
  selectedSearchMaterials.value = []
  selectedBomCode.value = null
}
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
.material-section {
  margin-top: 4px;
}
.material-title-row {
  display: flex;
  align-items: center;
  font-size: 14px;
  margin-bottom: 6px;
}
.material-search-row {
  display: flex;
  gap: 10px;
  margin: 10px 0 5px 0;
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
</style>
