<template>
  <div class="bom-manager">
    <div class="container-fluid">
      <div class="row">
        <!-- 좌측 BOM 리스트 -->
        <div class="col-md-3">
          <div class="card">
            <div class="card-header">
              <h5>제품명</h5>
              <select v-model="selectedProductFilter" @change="filterBomList" class="form-select">
                <option value="">제품명 선택</option>
                <option v-for="product in products" :key="product.product_code" :value="product.product_name">
                  {{ product.product_name }}
                </option>
              </select>
            </div>
            <div class="card-body">
              <div class="tabs">
                <button class="tab-btn active">BOM코드</button>
                <button class="tab-btn">제품코드</button>
                <button class="tab-btn">제품명</button>
                <button class="tab-btn">규격</button>
              </div>
              <div class="bom-list">
                <div v-if="filteredBomList.length === 0" class="no-items">
                  No items
                </div>
                <div v-for="bom in filteredBomList" :key="bom.bom_code" 
                     class="bom-item" 
                     :class="{ active: selectedBom?.bom_code === bom.bom_code }"
                     @click="selectBom(bom)">
                  <div class="bom-code">{{ bom.bom_code }}</div>
                  <div class="product-name">{{ bom.product_name }}</div>
                  <div class="product-stand">{{ bom.product_stand }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 우측 BOM 관리 폼 -->
        <div class="col-md-9">
          <!-- 제품 기본 정보 -->
          <div class="card mb-3">
            <div class="card-header">
              <h5>제품 기본 정보</h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-3">
                  <label>제품명</label>
                  <select v-model="bomForm.product_code" @change="onProductChange" class="form-select">
                    <option value="">제품명 선택</option>
                    <option v-for="product in products" :key="product.product_code" :value="product.product_code">
                      {{ product.product_name }}
                    </option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label>BOM 코드</label>
                  <input v-model="bomForm.bom_code" type="text" class="form-control" placeholder="BOM 코드">
                </div>
                <div class="col-md-3">
                  <label>규격</label>
                  <select v-model="bomForm.product_stand" class="form-select">
                    <option value="">규격 선택</option>
                    <option v-for="stand in productStandards" :key="stand" :value="stand">
                      {{ stand }}
                    </option>
                  </select>
                </div>
                <div class="col-md-3">
                  <button @click="addBom" class="btn btn-danger" :disabled="!canSave">저장</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 투입 자재 -->
          <div class="card mb-3">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5>투입 자재</h5>
              <button @click="removeBomMaterials" class="btn btn-danger btn-sm" :disabled="selectedBomMaterials.length === 0">
                제거
              </button>
            </div>
            <div class="card-body">
              <div v-if="bomMaterials.length === 0" class="no-items text-center">
                No items
              </div>
              <table v-else class="table table-striped">
                <thead>
                  <tr>
                    <th><input type="checkbox" @change="toggleAllBomMaterials" ref="bomMaterialsCheckAll"></th>
                    <th>자재코드</th>
                    <th>자재명</th>
                    <th>분류</th>
                    <th>단위</th>
                    <th>규격</th>
                    <th>투입량</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="material in bomMaterials" :key="material.material_code">
                    <td>
                      <input type="checkbox" 
                             v-model="selectedBomMaterials" 
                             :value="material.material_code">
                    </td>
                    <td>{{ material.material_code }}</td>
                    <td>{{ material.material_name }}</td>
                    <td>{{ material.material_cls }}</td>
                    <td>{{ material.material_unit }}</td>
                    <td>{{ material.material_stand }}</td>
                    <td>
                      <input type="number" 
                             v-model="material.usage_qty" 
                             class="form-control form-control-sm" 
                             min="0" 
                             step="0.01">
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 자재 검색 및 추가 -->
          <div class="card">
            <div class="card-header">
              <h5>자재 검색 및 추가</h5>
              <div class="row mt-2">
                <div class="col-md-4">
                  <input v-model="materialSearchCode" 
                         @input="searchMaterials" 
                         type="text" 
                         class="form-control" 
                         placeholder="자재코드">
                </div>
                <div class="col-md-4">
                  <input v-model="materialSearchName" 
                         @input="searchMaterials" 
                         type="text" 
                         class="form-control" 
                         placeholder="자재명">
                </div>
                <div class="col-md-2">
                  <button @click="addMaterialsToBom" class="btn btn-primary" :disabled="selectedMaterials.length === 0">
                    추가
                  </button>
                </div>
                <div class="col-md-2">
                  <button @click="resetForm" class="btn btn-secondary">초기화</button>
                </div>
              </div>
            </div>
            <div class="card-body">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th><input type="checkbox" @change="toggleAllMaterials" ref="materialsCheckAll"></th>
                    <th>자재코드</th>
                    <th>자재명</th>
                    <th>분류</th>
                    <th>단위</th>
                    <th>규격</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="material in filteredMaterials" :key="material.material_code">
                    <td>
                      <input type="checkbox" 
                             v-model="selectedMaterials" 
                             :value="material.material_code">
                    </td>
                    <td>{{ material.material_code }}</td>
                    <td>{{ material.material_name }}</td>
                    <td>{{ material.material_cls }}</td>
                    <td>{{ material.material_unit }}</td>
                    <td>{{ material.material_stand }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import bomService from '@/services/bomService'

export default {
  name: 'BomManager',
  data() {
    return {
      // BOM 리스트 관련
      bomList: [],
      filteredBomList: [],
      selectedBom: null,
      selectedProductFilter: '',
      
      // 제품 관련
      products: [],
      productStandards: [],
      
      // 자재 관련
      materials: [],
      filteredMaterials: [],
      selectedMaterials: [],
      materialSearchCode: '',
      materialSearchName: '',
      
      // BOM 폼 데이터
      bomForm: {
        bom_code: '',
        product_code: '',
        product_name: '',
        product_stand: ''
      },
      
      // BOM 투입 자재
      bomMaterials: [],
      selectedBomMaterials: [],
      
      // 편집 모드
      isEditMode: false
    }
  },
  computed: {
    canSave() {
      return this.bomForm.product_code && 
             this.bomForm.bom_code && 
             this.bomForm.product_stand && 
             this.bomMaterials.length > 0
    }
  },
  async mounted() {
    await this.loadInitialData()
  },
  methods: {
    async loadInitialData() {
      try {
        // 제품, 자재, BOM 리스트 로드
        const [products, materials, bomList] = await Promise.all([
          bomService.getProducts(),
          bomService.getMaterials(),
          bomService.getBomList()
        ])
        
        this.products = products
        this.materials = materials
        this.filteredMaterials = materials
        this.bomList = bomList
        this.filteredBomList = bomList
      } catch (error) {
        console.error('초기 데이터 로드 실패:', error)
        alert('데이터 로드에 실패했습니다.')
      }
    },
    
    // 제품 변경 시 규격 업데이트
    onProductChange() {
      const selectedProduct = this.products.find(p => p.product_code === this.bomForm.product_code)
      if (selectedProduct) {
        this.bomForm.product_name = selectedProduct.product_name
        // 해당 제품의 사용 가능한 규격들을 가져와야 함
        this.productStandards = [selectedProduct.product_stand] // 임시로 현재 제품 규격만
      }
    },
    
    // BOM 리스트 필터링
    filterBomList() {
      if (!this.selectedProductFilter) {
        this.filteredBomList = this.bomList
      } else {
        this.filteredBomList = this.bomList.filter(bom => 
          bom.product_name === this.selectedProductFilter
        )
      }
    },
    
    // BOM 선택
    async selectBom(bom) {
      this.selectedBom = bom
      this.isEditMode = true
      
      // 폼에 데이터 설정
      this.bomForm = {
        bom_code: bom.bom_code,
        product_code: bom.product_code,
        product_name: bom.product_name,
        product_stand: bom.product_stand
      }
      
      // BOM 투입 자재 로드
      try {
        this.bomMaterials = await bomService.getBomMaterials(bom.bom_code)
      } catch (error) {
        console.error('BOM 자재 로드 실패:', error)
      }
    },
    
    // 자재 검색
    searchMaterials() {
      let filtered = this.materials
      
      if (this.materialSearchCode) {
        filtered = filtered.filter(m => 
          m.material_code.toLowerCase().includes(this.materialSearchCode.toLowerCase())
        )
      }
      
      if (this.materialSearchName) {
        filtered = filtered.filter(m => 
          m.material_name.toLowerCase().includes(this.materialSearchName.toLowerCase())
        )
      }
      
      this.filteredMaterials = filtered
    },
    
    // 자재를 BOM에 추가
    addMaterialsToBom() {
      const materialsToAdd = this.materials.filter(m => 
        this.selectedMaterials.includes(m.material_code) &&
        !this.bomMaterials.some(bm => bm.material_code === m.material_code)
      )
      
      materialsToAdd.forEach(material => {
        this.bomMaterials.push({
          ...material,
          usage_qty: 1 // 기본 투입량
        })
      })
      
      this.selectedMaterials = []
      this.$refs.materialsCheckAll.checked = false
    },
    
    // BOM에서 자재 제거
    removeBomMaterials() {
      this.bomMaterials = this.bomMaterials.filter(m => 
        !this.selectedBomMaterials.includes(m.material_code)
      )
      this.selectedBomMaterials = []
      this.$refs.bomMaterialsCheckAll.checked = false
    },
    
    // 전체 선택/해제 (자재)
    toggleAllMaterials(event) {
      if (event.target.checked) {
        this.selectedMaterials = this.filteredMaterials.map(m => m.material_code)
      } else {
        this.selectedMaterials = []
      }
    },
    
    // 전체 선택/해제 (BOM 자재)
    toggleAllBomMaterials(event) {
      if (event.target.checked) {
        this.selectedBomMaterials = this.bomMaterials.map(m => m.material_code)
      } else {
        this.selectedBomMaterials = []
      }
    },
    
    // BOM 저장
    async addBom() {
      try {
        const bomData = {
          ...this.bomForm,
          materials: this.bomMaterials.map(m => ({
            material_code: m.material_code,
            usage_qty: m.usage_qty || 1
          }))
        }
        
        if (this.isEditMode) {
          await bomService.updateBom(this.bomForm.bom_code, bomData)
          alert('BOM이 수정되었습니다.')
        } else {
          await bomService.createBom(bomData)
          alert('BOM이 저장되었습니다.')
        }
        
        // 데이터 새로고침
        await this.loadInitialData()
        this.resetForm()
        
      } catch (error) {
        console.error('BOM 저장 실패:', error)
        alert('BOM 저장에 실패했습니다.')
      }
    },
    
    // 폼 초기화
    resetForm() {
      this.bomForm = {
        bom_code: '',
        product_code: '',
        product_name: '',
        product_stand: ''
      }
      this.bomMaterials = []
      this.selectedBomMaterials = []
      this.selectedMaterials = []
      this.selectedBom = null
      this.isEditMode = false
      this.materialSearchCode = ''
      this.materialSearchName = ''
      this.filteredMaterials = this.materials
      
      // 체크박스 초기화
      if (this.$refs.materialsCheckAll) this.$refs.materialsCheckAll.checked = false
      if (this.$refs.bomMaterialsCheckAll) this.$refs.bomMaterialsCheckAll.checked = false
    }
  }
}
</script>

<style scoped>
.bom-manager {
  padding: 20px;
}

.card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 20px;
}

.card-header {
  background-color: #f8f9fa;
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.card-header h5 {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
}

.card-body {
  padding: 15px;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 15px;
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab-btn.active {
  border-bottom-color: #007bff;
  color: #007bff;
}

.bom-list {
  max-height: 400px;
  overflow-y: auto;
}

.bom-item {
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.bom-item:hover {
  background-color: #f8f9fa;
}

.bom-item.active {
  background-color: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.bom-code {
  font-weight: 600;
  font-size: 14px;
}

.product-name {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.product-stand {
  font-size: 11px;
  color: #999;
}

.no-items {
  text-align: center;
  color: #999;
  padding: 40px;
  font-style: italic;
}

.form-select, .form-control {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
}

.form-control-sm {
  padding: 4px 8px;
  font-size: 12px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table th,
.table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.table th {
  background-color: #f8f9fa;
  font-weight: 600;
}

.table-striped tbody tr:nth-of-type(odd) {
  background-color: #f9f9f9;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  font-size: 14px;
}

.d-flex {
  display: flex;
}

.justify-content-between {
  justify-content: space-between;
}

.align-items-center {
  align-items: center;
}

.text-center {
  text-align: center;
}

.mt-2 {
  margin-top: 0.5rem;
}

.mb-3 {
  margin-bottom: 1rem;
}
</style>