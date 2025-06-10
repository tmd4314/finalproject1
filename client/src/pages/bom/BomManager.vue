<template>
  <div class="grid grid-cols-2 gap-4 p-4">
    <!-- 좌측: BOM 리스트 -->
    <div class="border rounded p-4">
      <label class="block font-semibold mb-2">제품명</label>
      <select v-model="selectedProduct" @change="filterBomList" class="w-full border p-1 rounded mb-4">
        <option value="">제품명 선택</option>
        <option v-for="prod in uniqueProductOptions" :key="prod.product_name" :value="prod.product_name">
          {{ prod.product_name }}
        </option>
      </select>

      <table class="w-full border text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="border p-1">BOM코드</th>
            <th class="border p-1">제품코드</th>
            <th class="border p-1">제품명</th>
            <th class="border p-1">규격</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bom in filteredBoms" :key="bom.bom_code" @click="selectBom(bom)" class="hover:bg-gray-50 cursor-pointer">
            <td class="border p-1">{{ bom.bom_code }}</td>
            <td class="border p-1">{{ bom.product_code }}</td>
            <td class="border p-1">{{ bom.product_name }}</td>
            <td class="border p-1">{{ bom.product_stand }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 우측: BOM 상세 -->
    <div class="border rounded p-4">
      <div class="grid grid-cols-3 gap-2 mb-4">
        <div>
          <label class="block text-sm font-medium">제품명</label>
          <div class="relative">
            <!-- 편집 모드가 아닐 때는 직접 입력 가능한 텍스트 필드 -->
            <input 
              v-if="!isEditMode"
              v-model="form.product_name" 
              placeholder="제품명을 입력하세요"
              class="w-full border p-1 rounded"
              @input="onProductNameInput"
            />
            <!-- 편집 모드일 때는 읽기 전용 텍스트 필드 -->
            <input 
              v-else
              v-model="form.product_name" 
              class="w-full border p-1 rounded bg-gray-100"
              readonly
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium">BOM 코드</label>
          <input v-model="form.bom_code" class="w-full border p-1 rounded" />
        </div>
        <div>
          <label class="block text-sm font-medium">규격</label>
          <input 
            v-model="form.product_stand" 
            placeholder="규격을 입력하세요"
            class="w-full border p-1 rounded"
          />
        </div>
      </div>

      <!-- 투입 자재 -->
      <div class="mb-4">
        <label class="font-semibold mb-1 block">투입 자재</label>
        <table class="w-full text-sm border">
          <thead class="bg-gray-100">
            <tr>
              <th class="border px-2">#</th>
              <th class="border px-2">자재코드</th>
              <th class="border px-2">자재명</th>
              <th class="border px-2">분류</th>
              <th class="border px-2">단위</th>
              <th class="border px-2">규격</th>
              <th class="border px-2">투입량</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(mat, index) in form.materials" :key="mat.material_code || index">
              <td class="border px-2"><input type="checkbox" v-model="mat.selected" /></td>
              <td class="border px-2">{{ mat.material_code }}</td>
              <td class="border px-2">{{ mat.material_name }}</td>
              <td class="border px-2">{{ mat.material_type || '-' }}</td>
              <td class="border px-2">{{ mat.material_unit }}</td>
              <td class="border px-2">{{ mat.material_stand }}</td>
              <td class="border px-2">
                <input v-model.number="mat.usage_qty" type="number" step="0.01" class="w-20 border p-1 rounded" />
              </td>
            </tr>
          </tbody>
        </table>
        <button @click="removeSelectedMaterials" class="mt-2 bg-red-500 text-white px-3 py-1 rounded" :disabled="!hasSelectedMaterials">
          제거
        </button>
      </div>

      <!-- 자재 검색 및 추가 -->
      <div class="mb-4">
        <label class="font-semibold mb-1 block">자재 검색 및 추가</label>
        <div class="flex gap-2 mb-2">
          <input v-model="searchMaterial" placeholder="자재코드 또는 자재명" class="flex-1 border p-1 rounded" @keyup.enter="searchMaterials" />
          <button @click="addMaterialsToBom" class="bg-green-600 text-white px-3 py-1 rounded">추가</button>
        </div>
        <table class="w-full text-sm border max-h-48 overflow-y-auto">
          <thead class="bg-gray-100">
            <tr>
              <th class="border px-2">#</th>
              <th class="border px-2">자재코드</th>
              <th class="border px-2">자재명</th>
              <th class="border px-2">분류</th>
              <th class="border px-2">단위</th>
              <th class="border px-2">규격</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="mat in filteredMaterials" :key="mat.material_code">
              <td class="border px-2"><input type="checkbox" :value="mat" v-model="selectedMaterials" /></td>
              <td class="border px-2">{{ mat.material_code }}</td>
              <td class="border px-2">{{ mat.material_name }}</td>
              <td class="border px-2">{{ mat.material_type }}</td>
              <td class="border px-2">{{ mat.material_unit }}</td>
              <td class="border px-2">{{ mat.material_stand }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 저장/초기화 버튼 -->
      <div class="flex gap-2">
        <button @click="saveBom" class="bg-blue-600 text-white px-4 py-2 rounded" :disabled="!canSave">
          {{ isEditMode ? '수정' : '저장' }}
        </button>
        <button @click="resetForm" class="bg-gray-500 text-white px-4 py-2 rounded">초기화</button>
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

// 우측 폼에서 사용할 제품 옵션 (중복 제거된 상태로 표시)
const availableProductOptions = computed(() => {
  const productMap = new Map()
  
  productOptions.value.forEach(prod => {
    if (!productMap.has(prod.product_name)) {
      productMap.set(prod.product_name, prod)
    }
  })
  
  return Array.from(productMap.values())
})

// 규격 옵션 (DB에서 가져온 데이터만 사용)
const availableStandOptions = computed(() => {
  const standSet = new Set()
  
  productOptions.value.forEach(prod => {
    if (prod.product_stand) {
      standSet.add(prod.product_stand)
    }
  })
  
  return Array.from(standSet).sort()
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

// 제품명 입력 시 처리 (신규 등록 모드에서만)
const onProductNameInput = () => {
  if (!isEditMode.value) {
    // 신규 등록 모드에서는 제품코드를 임시로 생성하거나 비워둠
    form.value.product_code = ''
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
        })
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
    const payload = {
      bom_code: form.value.bom_code,
      product_code: form.value.product_code || form.value.bom_code,
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
  border: 1px solid #ccc;
  padding: 4px;
  border-radius: 4px;
}
</style>