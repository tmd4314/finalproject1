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
          :row-class="getRowClass"
        >
          <template #body="slotProps">
            <tbody>
              <tr
                v-for="(row, rowIndex) in slotProps.rows"
                :key="rowIndex"
                :class="getRowClass(row.item)"
              >
                <td 
                  v-for="col in bomColumns" 
                  :key="col.key"
                  @click="onProductRowClick(row.item, rowIndex, $event)"
                  class="clickable-cell"
                >
                  {{ row.item[col.key] }}
                </td>
              </tr>
            </tbody>
          </template>
        </va-data-table>
      </div>
    </div>
    <!-- 우측: BOM 등록/수정 -->
    <div class="bom-register">
      <form @submit.prevent="saveBOM">
        <fieldset class="fieldset">
          <legend>제품 기본 정보</legend>
          <va-select
            v-model="registerForm.product_code"
            :options="productOptions"
            label="제품명"
            class="input-short"
            style="width: 165px; margin-right:10px;"
            :disabled="!!selectedBomCode"
          />
          <va-input
            v-model="registerForm.bom_code"
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
            class="material-table material-table-limit"
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
            class="material-table add-material"
            select-mode="multiple"
            :selected-color="'primary'"
          />
        </fieldset>
        <div class="form-buttons">
          <va-button @click="saveBOM" color="primary" class="action-btn" size="small">
            {{ selectedBomCode ? '수정' : '저장' }}
          </va-button>
          <va-button @click="resetForm" color="secondary" class="action-btn" size="small">초기화</va-button>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import axios from 'axios'
import { ref, watch, onMounted } from 'vue'

interface BomItem {
  bom_code: string
  product_code: string
  product_name: string
  spec: string
  materials: Material[]
}

interface Material {
  material_code: string
  material_name: string
  material_pay?: string
  material_cls?: string
  material_stand?: string
  material_unit?: string
  material_safty?: string
  usage?: string
}

interface ProductOption {
  text: string
  value: string
  spec: string
  bom_code?: string
}

const productOptions = ref<ProductOption[]>([])
const allBomList = ref<BomItem[]>([])
const bomList = ref<BomItem[]>([])
const selectedProduct = ref<string>('')
const selectedBomCode = ref<string | null>(null)

const registerForm = ref({
  bom_code: '',
  product_code: '',
  spec: '',
  materials: [] as Material[],
})

const selectedMaterials = ref<Material[]>([])
const searchMaterialCode = ref<string>('')
const searchMaterialName = ref<string>('')
const materialSearchResults = ref<Material[]>([])
const selectedSearchMaterials = ref<Material[]>([])

const bomColumns = [
  { key: 'bom_code', label: 'BOM코드' },
  { key: 'product_code', label: '제품코드' },
  { key: 'product_name', label: '제품명' },
  { key: 'spec', label: '규격' },
]

const materialColumns = [
  { key: 'material_code', label: '자재코드' },
  { key: 'material_name', label: '자재명' },
  { key: 'material_cls', label: '분류' },
  { key: 'material_unit', label: '단위' },
  { key: 'material_stand', label: '규격' },
  { key: 'usage', label: '투입량' },
]

const materialSearchColumns = [
  { key: 'material_code', label: '자재코드' },
  { key: 'material_name', label: '자재명' },
  { key: 'material_cls', label: '분류' },
  { key: 'material_unit', label: '단위' },
  { key: 'material_stand', label: '규격' },
]

// -----------------------------
// 주요 로직
// -----------------------------

async function fetchProduct() {
  try {
    const response = await axios.get('/product');
    const seen = new Set();
    productOptions.value = response.data
      .filter((product: any) => {
        if (seen.has(product.product_name)) return false;
        seen.add(product.product_name);
        return true;
      })
      .map((product: any) => ({
        text: product.product_name,
        value: product.product_name,
        spec: product.product_stand ?? '',
        bom_code: product.bom_code ?? '',
      }));
  } catch (error) {
    console.error('제품 목록 조회 실패:', error);
    alert('제품 목록을 불러오는데 실패했습니다.');
  }
}

async function fetchBomList() {
  try {
    const response = await axios.get('/bom');
    allBomList.value = response.data;
    bomList.value = [...allBomList.value];
  } catch (error) {
    console.error('BOM 목록 조회 실패:', error);
    alert('BOM 목록을 불러오는데 실패했습니다.');
  }
}

async function searchMaterials() {
  try {
    const params = {
      material_code: searchMaterialCode.value,
      material_name: searchMaterialName.value,
    }
    const response = await axios.get('/material', { params });
    materialSearchResults.value = response.data;
  } catch (error) {
    console.error('자재 검색 실패:', error);
    alert('자재 검색에 실패했습니다.');
  }
}

async function fetchAllMaterials() {
  try {
    const response = await axios.get('/material');
    materialSearchResults.value = response.data;
  } catch (error) {
    console.error('자재 전체 조회 실패:', error);
    alert('자재 전체 목록을 불러오는데 실패했습니다.');
  }
}

async function saveBOM() {
  if (!registerForm.value.bom_code.trim()) {
    alert('BOM 코드를 입력해주세요.');
    return;
  }
  if (!registerForm.value.product_code) {
    alert('제품을 선택해주세요.');
    return;
  }
  if (registerForm.value.materials.length === 0) {
    alert('투입 자재를 추가해주세요.');
    return;
  }
  const invalidMaterials = registerForm.value.materials.filter(
    m => !m.usage || parseFloat(m.usage) <= 0
  );
  if (invalidMaterials.length > 0) {
    alert('모든 자재의 투입량을 올바르게 입력해주세요.');
    return;
  }

  try {
    const prod = productOptions.value.find(
      p => p.value === registerForm.value.product_code
    );
    const bomData = {
      bom_code: registerForm.value.bom_code,
      product_code: registerForm.value.product_code,
      product_name: prod ? prod.text : '',
      spec: registerForm.value.spec,
      materials: registerForm.value.materials.map(m => ({
        material_code: m.material_code,
        usage: m.usage,
        material_unit: m.material_unit || ''
      }))
    };

    if (selectedBomCode.value) {
      await axios.put(`/bom/${selectedBomCode.value}`, bomData);
      alert('BOM이 수정되었습니다!');
    } else {
      await axios.post('/bom', bomData);
      alert('새 BOM이 저장되었습니다!');
    }

    await fetchBomList();
    resetForm();
  } catch (error) {
    console.error('BOM 저장 실패:', error);
    alert('BOM 저장에 실패했습니다.');
  }
}

function getRowClass(item: BomItem) {
  return selectedBomCode.value === item.bom_code ? 'selected-row' : '';
}

function removeSelectedMaterials() {
  if (!selectedMaterials.value || selectedMaterials.value.length === 0) {
    alert('제거할 자재를 선택해주세요.');
    return;
  }
  const selectedCodes = selectedMaterials.value.map(m => m.material_code);
  registerForm.value.materials = registerForm.value.materials.filter(
    m => !selectedCodes.includes(m.material_code)
  );
  selectedMaterials.value = [];
}

function addSelectedMaterialsToBom() {
  if (!selectedSearchMaterials.value || selectedSearchMaterials.value.length === 0) {
    alert('추가할 자재를 선택해주세요.');
    return;
  }
  selectedSearchMaterials.value.forEach(mat => {
    const existingMaterial = registerForm.value.materials.find(m => m.material_code === mat.material_code);
    if (!existingMaterial) {
      registerForm.value.materials.push({ ...mat, usage: '1' });
    }
  });
  selectedSearchMaterials.value = [];
}

function onProductRowClick(row: BomItem, rowIndex: number, event: MouseEvent) {
  if (selectedBomCode.value === row.bom_code) {
    selectedBomCode.value = null;
    resetForm();
    return;
  }
  selectedBomCode.value = row.bom_code;
  registerForm.value.bom_code = row.bom_code;
  registerForm.value.product_code = row.product_code;
  registerForm.value.spec = row.spec;
  registerForm.value.materials = row.materials.map(m => ({ ...m }));
  selectedMaterials.value = [];
  selectedSearchMaterials.value = [];
}

watch(selectedProduct, (selectedValue) => {
  let productName = '';
  if (typeof selectedValue === 'object' && selectedValue !== null) {
    productName = selectedValue['text'] || selectedValue['value'] || selectedValue['label'] || selectedValue['name'] || '';
    if (!productName) {
      const keys = Object.keys(selectedValue);
      if (keys.length > 0) {
        const textKey = keys.find(key => key === 'text') || keys[0];
        productName = selectedValue[textKey];
      }
    }
  } else if (typeof selectedValue === 'string') {
    productName = selectedValue;
  }

  if (!productName) {
    bomList.value = [...allBomList.value];
  } else {
    bomList.value = allBomList.value.filter(bom => bom.product_name === productName);
  }

  selectedBomCode.value = null;
  resetForm();
});

function resetForm() {
  registerForm.value = {
    bom_code: '',
    product_code: '',
    spec: '',
    materials: [],
  };
  selectedMaterials.value = [];
  selectedSearchMaterials.value = [];
  selectedBomCode.value = null;
  materialSearchResults.value = [];
  searchMaterialCode.value = '';
  searchMaterialName.value = '';
}

onMounted(() => {
  fetchProduct();
  fetchBomList();
  fetchAllMaterials();
});
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
.table-area,
.material-table {
  flex: 1;
  min-height: 0;
}
.material-table-limit {
  max-height: 140px;
  overflow-y: auto;
}
.add-material {
  max-height: 240px;   
  overflow-y: auto;
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
.search-btn,
.add-btn {
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

/* 클릭 가능한 셀 스타일 */
.clickable-cell {
  cursor: pointer;
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
}
/* 셀 호버 효과 */
.clickable-cell:hover {
  background-color: #f0f0f0;
}
</style>