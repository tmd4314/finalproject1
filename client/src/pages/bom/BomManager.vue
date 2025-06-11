<template>
  <div class="max-w-[1060px] h-[739px] mx-auto p-4 bg-gray-50 overflow-hidden">
    <!-- 상단 타이틀 -->
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-800 mb-2">BOM 관리</h1>
    </div>

    <div class="grid grid-cols-2 gap-4 h-[calc(100%-80px)]">
      <!-- 좌측: BOM 리스트 -->
      <div class="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="mb-4">
          <label class="block text-xs font-medium text-blue-600 mb-2">제품명</label>
          <select 
            v-model="selectedProduct" 
            @change="filterBomList" 
            class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-xs"
          >
            <option value="">제품명 선택</option>
            <option v-for="prod in uniqueProductOptions" :key="prod.product_name" :value="prod.product_name">
              {{ prod.product_name }}
            </option>
          </select>
        </div>

        <div class="h-[550px] overflow-auto border border-gray-200 rounded">
          <table class="w-full text-sm border-collapse bg-white">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700 text-xs">BOM코드</th>
                <th class="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700 text-xs">제품코드</th>
                <th class="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700 text-xs">제품명</th>
                <th class="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700 text-xs">규격</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="bom in filteredBoms" 
                :key="bom.bom_code" 
                @click="selectBom(bom)" 
                class="hover:bg-blue-50 cursor-pointer transition-colors duration-150"
              >
                <td class="border border-gray-200 px-3 py-2 text-xs">{{ bom.bom_code }}</td>
                <td class="border border-gray-200 px-3 py-2 text-xs">{{ bom.product_code }}</td>
                <td class="border border-gray-200 px-3 py-2 text-xs">{{ bom.product_name }}</td>
                <td class="border border-gray-200 px-3 py-2 text-xs">{{ bom.product_stand }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 우측: BOM 상세 -->
      <div class="flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <!-- 기본 정보 -->
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label class="block text-xs font-medium text-blue-600 mb-2">제품명</label>
            <div class="relative">
              <select 
                v-if="!isEditMode"
                v-model="form.product_name" 
                class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-xs"
                @change="onProductNameChange"
              >
                <option value="">제품명 선택</option>
                <option v-for="product in uniqueProductNames" :key="product" :value="product">
                  {{ product }}
                </option>
              </select>
              <input 
                v-else
                v-model="form.product_name" 
                class="w-full px-2 py-1.5 border border-gray-300 rounded-md bg-gray-100 text-gray-600 text-xs"
                readonly
              />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-blue-600 mb-2">BOM 코드</label>
            <input 
              v-model="form.bom_code" 
              class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs" 
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-blue-600 mb-2">규격</label>
            <select 
              v-model="form.product_stand" 
              class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-xs"
              @change="updateProductCode"
              :disabled="!form.product_name"
            >
              <option value="">규격 선택</option>
              <option v-for="spec in availableSpecs" :key="spec" :value="spec">
                {{ spec }}
              </option>
            </select>
          </div>
        </div>

        <!-- 투입 자재 -->
        <div class="mb-3 flex flex-col h-60">
          <div class="flex justify-between items-center mb-2">
            <label class="text-xs font-medium text-blue-600">투입 자재</label>
            <button 
              @click="removeSelectedMaterials" 
              class="px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed" 
              :disabled="!hasSelectedMaterials"
            >
              제거
            </button>
          </div>
          <div class="flex-1 overflow-auto border border-gray-200 rounded">
            <table class="w-full text-xs border-collapse bg-white">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th class="border border-gray-200 px-2 py-0.5 text-center font-medium text-gray-700">#</th>
                  <th class="border border-gray-200 px-2 py-0.5 text-left font-medium text-gray-700">자재코드</th>
                  <th class="border border-gray-200 px-2 py-0.5 text-left font-medium text-gray-700">자재명</th>
                  <th class="border border-gray-200 px-2 py-0.5 text-left font-medium text-gray-700">분류</th>
                  <th class="border border-gray-200 px-2 py-0.5 text-left font-medium text-gray-700">단위</th>
                  <th class="border border-gray-200 px-2 py-0.5 text-left font-medium text-gray-700">규격</th>
                  <th class="border border-gray-200 px-2 py-0.5 text-left font-medium text-gray-700">투입량</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(mat, index) in form.materials" :key="mat.material_code || index" class="hover:bg-gray-50">
                  <td class="border border-gray-200 px-2 py-0.5 text-center">
                    <input type="checkbox" v-model="mat.selected" class="rounded w-3 h-3" />
                  </td>
                  <td class="border border-gray-200 px-2 py-0.5">{{ mat.material_code }}</td>
                  <td class="border border-gray-200 px-2 py-0.5">{{ mat.material_name }}</td>
                  <td class="border border-gray-200 px-2 py-0.5">{{ mat.material_type || '-' }}</td>
                  <td class="border border-gray-200 px-2 py-0.5">{{ mat.material_unit }}</td>
                  <td class="border border-gray-200 px-2 py-0.5">{{ mat.material_stand }}</td>
                  <td class="border border-gray-200 px-2 py-0.5">
                    <input 
                      v-model.number="mat.usage_qty" 
                      type="number" 
                      step="0.01" 
                      class="w-14 px-1 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 자재 검색 및 추가 -->
        <div class="mb-3">
          <label class="text-xs font-medium text-blue-600 mb-2 block">자재 검색 및 추가</label>
          <div class="flex gap-2 mb-2">
            <input 
              v-model="searchMaterial" 
              placeholder="자재코드 또는 자재명" 
              class="flex-1 px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs" 
              @keyup.enter="searchMaterials" 
            />
            <button 
              @click="addMaterialsToBom" 
              class="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors duration-150"
            >
              추가
            </button>
          </div>
          <div class="h-[200px] overflow-y-auto border border-gray-200 rounded">
            <table class="w-full text-xs border-collapse bg-white">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th class="border border-gray-200 px-2 py-0.5 text-center font-medium text-gray-700">#</th>
                  <th class="border border-gray-200 px-2 py-0.5 text-left font-medium text-gray-700">자재코드</th>
                  <th class="border border-gray-200 px-2 py-0.5 text-left font-medium text-gray-700">자재명</th>
                  <th class="border border-gray-200 px-2 py-0.5 text-left font-medium text-gray-700">분류</th>
                  <th class="border border-gray-200 px-2 py-0.5 text-left font-medium text-gray-700">단위</th>
                  <th class="border border-gray-200 px-2 py-0.5 text-left font-medium text-gray-700">규격</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="mat in filteredMaterials" :key="mat.material_code" class="hover:bg-gray-50">
                  <td class="border border-gray-200 px-2 py-0.5 text-center">
                    <input type="checkbox" :value="mat" v-model="selectedMaterials" class="rounded w-3 h-3" />
                  </td>
                  <td class="border border-gray-200 px-2 py-0.5">{{ mat.material_code }}</td>
                  <td class="border border-gray-200 px-2 py-0.5">{{ mat.material_name }}</td>
                  <td class="border border-gray-200 px-2 py-0.5">{{ mat.material_type }}</td>
                  <td class="border border-gray-200 px-2 py-0.5">{{ mat.material_unit }}</td>
                  <td class="border border-gray-200 px-2 py-0.5">{{ mat.material_stand }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 저장/초기화 버튼 -->
        <div class="flex gap-3 justify-center mt-2">
          <button 
            @click="saveBom" 
            class="px-5 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed font-medium" 
            :disabled="!canSave"
          >
            {{ isEditMode ? '수정' : '저장' }}
          </button>
          <button 
            @click="resetForm" 
            class="px-5 py-1.5 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors duration-150 font-medium"
          >
            초기화
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const bomList = ref([])
const productOptions = ref([])
const materialList = ref([])

const selectedProduct = ref('')
const selectedMaterials = ref([])
const searchMaterial = ref('')
const isEditMode = ref(false)

const form = ref({
  bom_code: '',
  product_code: '',
  product_name: '',
  product_stand: '',
  materials: [],
  deletedMaterials: [], // 삭제할 자재 목록
})

// BOM 목록을 고유하게 변환 (중복 제거)
const uniqueBomList = computed(() => {
  const bomMap = new Map()
  bomList.value.forEach(bom => {
    if (!bomMap.has(bom.bom_code)) {
      bomMap.set(bom.bom_code, {
        bom_code: bom.bom_code,
        product_code: bom.product_code,
        product_name: bom.product_name,
        product_stand: bom.product_stand
      })
    }
  })
  return Array.from(bomMap.values())
})

// 제품명 중복 제거하여 드롭다운 옵션 생성 (왼쪽 필터용)
const uniqueProductOptions = computed(() => {
  const productNameSet = new Set()
  const uniqueProducts = []
  
  uniqueBomList.value.forEach(bom => {
    if (!productNameSet.has(bom.product_name)) {
      productNameSet.add(bom.product_name)
      uniqueProducts.push({
        product_name: bom.product_name
      })
    }
  })
  
  return uniqueProducts
})

// 중복 제거된 제품명 목록 (드롭다운용)
const uniqueProductNames = computed(() => {
  const productNames = new Set()
  productOptions.value.forEach(product => {
    if (product.product_name) {
      productNames.add(product.product_name)
    }
  })
  return Array.from(productNames).sort()
})

// 선택된 제품명에 따른 사용 가능한 규격 목록
const availableSpecs = computed(() => {
  if (!form.value.product_name) return []
  
  const specs = new Set()
  productOptions.value
    .filter(product => product.product_name === form.value.product_name)
    .forEach(product => {
      if (product.product_stand) {
        specs.add(product.product_stand)
      }
    })
  
  return Array.from(specs).sort()
})

// 우측 폼에서 사용할 제품 옵션 (중복 제거 없이 모든 제품 표시)
const availableProductOptions = computed(() => {
  return productOptions.value
})

// 선택된 제품명으로 BOM 목록 필터링
const filteredBoms = computed(() => {
  if (!selectedProduct.value) return uniqueBomList.value
  return uniqueBomList.value.filter(bom => 
    bom.product_name.includes(selectedProduct.value)
  )
})

const filteredMaterials = computed(() => {
  if (!searchMaterial.value) return materialList.value.slice(0, 50)
  const keyword = searchMaterial.value.toLowerCase()
  return materialList.value.filter(mat => {
    return (
      mat.material_code.toLowerCase().includes(keyword) ||
      mat.material_name.toLowerCase().includes(keyword)
    )
  }).slice(0, 50)
})

const hasSelectedMaterials = computed(() => {
  return form.value.materials.some(material => material.selected)
})

const canSave = computed(() => {
  return form.value.bom_code && form.value.product_name && form.value.product_stand && form.value.materials.length > 0
})

// 제품명 선택 시 처리
const onProductNameChange = () => {
  // 제품명이 변경되면 규격 초기화
  form.value.product_stand = ''
  form.value.product_code = ''
  updateProductCode()
}

// 제품명과 규격 기반으로 제품코드 업데이트
const updateProductCode = () => {
  if (!isEditMode.value && form.value.product_name && form.value.product_stand) {
    console.log('매칭 시도:', form.value.product_name, form.value.product_stand)
    
    // 제품명과 규격이 일치하는 제품 찾기
    const matchingProduct = productOptions.value.find(product => 
      product.product_name === form.value.product_name && 
      product.product_stand === form.value.product_stand
    )
    
    if (matchingProduct) {
      form.value.product_code = matchingProduct.product_code
      console.log(`✅ 매칭된 제품: ${form.value.product_name} ${form.value.product_stand} -> ${matchingProduct.product_code}`)
    } else {
      form.value.product_code = ''
      console.log(`❌ 매칭되는 제품을 찾을 수 없습니다: ${form.value.product_name} ${form.value.product_stand}`)
    }
  }
}

const filterBomList = () => {
  // 필터링은 computed에서 처리되므로 빈 함수
}

const selectBom = async (bom) => {
  try {
    const res = await axios.get(`/bom/detail/${bom.bom_code}`)
    if (res.data && res.data.length > 0) {
      const bomData = res.data[0]
      
      form.value = {
        bom_code: bomData.bom_code,
        product_code: bomData.product_code,
        product_name: bom.product_name,
        product_stand: bomData.product_stand || '',
        materials: res.data.map(item => {
          // 자재 목록에서 해당 자재의 상세 정보 찾기
          const materialDetail = materialList.value.find(mat => mat.material_code === item.material_code)
          
          return {
            material_code: item.material_code,
            material_name: item.material_name,
            material_type: materialDetail?.material_type || item.material_type || item.material_category || '',
            material_unit: item.material_unit,
            material_stand: item.material_stand,
            usage_qty: item.usage_qty,
            bom_unit: item.bom_unit,
            selected: false,
            status: 'existing'
          }
        }),
        deletedMaterials: []
      }
      isEditMode.value = true
    }
  } catch (err) {
    console.error('BOM 상세 조회 오류:', err)
    alert('BOM 상세 정보를 불러오는데 실패했습니다.')
  }
}

const addMaterialsToBom = () => {
  selectedMaterials.value.forEach(mat => {
    if (!form.value.materials.find(d => d.material_code === mat.material_code)) {
      form.value.materials.push({
        material_code: mat.material_code,
        material_name: mat.material_name,
        material_type: mat.material_type || mat.material_category || '',
        material_unit: mat.material_unit,
        material_stand: mat.material_stand,
        usage_qty: 0,
        bom_unit: mat.material_unit,
        selected: false,
        status: 'new'
      })
    }
  })
  selectedMaterials.value = []
}

const removeSelectedMaterials = () => {
  const selectedMaterialsToDelete = form.value.materials.filter(material => material.selected)
  
  if (selectedMaterialsToDelete.length === 0) {
    alert('삭제할 자재를 선택해주세요.')
    return
  }

  // 기존 자재(DB에 있는 자재)는 삭제 목록에 추가
  const existingMaterialsToDelete = selectedMaterialsToDelete.filter(mat => mat.status === 'existing')
  if (existingMaterialsToDelete.length > 0) {
    form.value.deletedMaterials = form.value.deletedMaterials || []
    existingMaterialsToDelete.forEach(material => {
      form.value.deletedMaterials.push({
        material_code: material.material_code,
        bom_code: form.value.bom_code
      })
    })
  }
  
  // UI에서 선택된 자재들 제거
  form.value.materials = form.value.materials.filter(material => !material.selected)
}

const saveBom = async () => {
  if (!canSave.value) {
    alert('BOM 코드, 제품명, 규격, 자재를 모두 입력해주세요.')
    return
  }

  try {
    let finalProductCode = form.value.product_code

    // 신규 등록 시 제품코드가 없으면 제품명과 규격으로 찾기
    if (!isEditMode.value && !finalProductCode) {
      const matchingProduct = productOptions.value.find(product => 
        product.product_name === form.value.product_name && 
        product.product_stand === form.value.product_stand
      )
      
      if (matchingProduct) {
        finalProductCode = matchingProduct.product_code
      } else {
        alert('선택한 제품명과 규격에 해당하는 제품을 찾을 수 없습니다.')
        return
      }
    }

    const payload = {
      bom_code: form.value.bom_code,
      product_code: finalProductCode,
      product_name: form.value.product_name,
      product_stand: form.value.product_stand,
      materials: form.value.materials.map(mat => ({
        material_code: mat.material_code,
        usage_qty: mat.usage_qty,
        bom_unit: mat.bom_unit,
        status: mat.status || 'new'
      })),
      // 삭제할 자재 목록 추가 (편집 모드일 때만)
      deletedMaterials: isEditMode.value ? (form.value.deletedMaterials || []) : []
    }

    if (isEditMode.value) {
      await axios.put('/bom', payload)
      alert('BOM 수정 완료')
    } else {
      await axios.post('/bom', payload)
      alert('BOM 등록 완료')
    }
    
    await fetchBomList()
    resetForm()
  } catch (err) {
    console.error('BOM 저장 오류:', err)
    alert('BOM 저장에 실패했습니다.')
  }
}

const resetForm = () => {
  form.value = { 
    bom_code: '', 
    product_code: '', 
    product_name: '', 
    product_stand: '', 
    materials: [],
    deletedMaterials: [] // 삭제된 자재 목록 초기화
  }
  isEditMode.value = false
  selectedMaterials.value = []
}

const fetchBomList = async () => {
  try {
    const res = await axios.get('/bom/list')
    bomList.value = res.data || []
  } catch (err) {
    console.error('BOM 목록 조회 오류:', err)
  }
}

const fetchProductList = async () => {
  try {
    const res = await axios.get('/bom/products')
    productOptions.value = res.data || []
    console.log('불러온 제품 목록:', productOptions.value)
  } catch (err) {
    console.error('제품 목록 조회 오류:', err)
  }
}

const fetchMaterialList = async () => {
  try {
    const res = await axios.get('/bom/materials')
    materialList.value = res.data || []
  } catch (err) {
    console.error('자재 목록 조회 오류:', err)
  }
}

const searchMaterials = () => {
  // Enter 키 입력 시 자동으로 filteredMaterials가 업데이트됨
}

onMounted(() => {
  fetchBomList()
  fetchProductList()
  fetchMaterialList()
})
</script>

<style scoped>
input, select {
  transition: all 0.15s ease-in-out;
}

input:focus, select:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 스크롤바 스타일링 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f8fafc;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>