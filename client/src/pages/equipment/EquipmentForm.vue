<template>
  <div class="equipment-form-page">
    <h1 class="va-h3 mb-6">{{ pageTitle }}</h1>
    
    <VaForm ref="formRef" :key="formKey" v-slot="{ isValid }" class="max-w-5xl mx-auto p-6 flex flex-col gap-6 bg-white shadow rounded">

      <!-- 파일 미리보기 + 파일 선택 버튼 -->
      <div class="flex flex-col items-center gap-2">
        <div class="w-40 h-40 border rounded flex items-center justify-center bg-gray-100 overflow-hidden">
          <img v-if="previewUrl" :src="previewUrl" class="object-contain max-w-full max-h-full" />
          <span v-else class="text-gray-500">이미지 미리보기</span>
        </div>
        <VaFileUpload ref="fileUploadRef" type="single" hide-file-list @update:modelValue="onImageSelected">
          <template #default>
            <VaButton size="small">파일 선택</VaButton>
          </template>
        </VaFileUpload>
      </div>

      <!-- 설비 ID -->
      <VaInput
        v-model="formData.id"
        label="설비 번호"
        readonly
        placeholder="등록 시 자동 생성됩니다"
        :inputClass="'bg-gray-100'"
        class="va-label-lg"
      />

      <!-- 설비명 (드롭다운) -->
      <VaSelect 
        v-model="formData.baseName" 
        label="설비명" 
        :options="codeOptions.eq_base_name" 
        :rules="[requiredRule]" 
        value-by="value"
        text-by="label"
        class="va-label-lg"
        @update:modelValue="onBaseNameChange"
      />

      <!-- 설비 분류 / 설비 유형 / 도입 유형 -->
      <div class="grid grid-cols-3 gap-4 va-label-lg">
        <VaSelect 
          v-model="formData.category" 
          label="설비 분류" 
          :options="codeOptions.eq_group" 
          :rules="[requiredRule]" 
          value-by="value"
          text-by="label"
        />
        <VaSelect 
          v-model="formData.type" 
          label="설비 세부 유형" 
          :options="filteredEqTypes" 
          :rules="[requiredRule]" 
          value-by="value"
          text-by="label"
          :disabled="!formData.baseName"
          placeholder="설비명을 먼저 선택해주세요"
        />
        <VaSelect 
          v-model="formData.installType" 
          label="도입 유형" 
          :options="codeOptions.eq_import" 
          :rules="[requiredRule]" 
          value-by="value"
          text-by="label"
        />
      </div>

      <!-- 포장 설비전용 라인 -->
      <VaSelect
        v-if="formData.category === 'e3'"
        v-model="formData.line"
        label="생산 라인"
        :options="codeOptions.line"
        :rules="[requiredRule]"
        value-by="value"
        text-by="label"
        class="va-label-lg"
      />

      <!-- 공장 / 층 / 공정실 -->
      <div class="grid grid-cols-3 gap-4 va-label-lg">
        <VaSelect 
          v-model="formData.factory" 
          label="공장" 
          :options="codeOptions.factory" 
          :rules="[requiredRule]" 
          value-by="value"
          text-by="label"
        />
        <VaSelect 
          v-if="formData.factory" 
          v-model="formData.floor" 
          label="층" 
          :options="codeOptions.floor" 
          :rules="[requiredRule]" 
          value-by="value"
          text-by="label"
        />
        <VaSelect 
          v-if="formData.floor" 
          v-model="formData.room" 
          label="공정실" 
          :options="codeOptions.room" 
          :rules="[requiredRule]" 
          value-by="value"
          text-by="label"
        />
      </div>

      <!-- 설비 제조일 / 등록일 -->
      <div class="grid grid-cols-2 gap-4 va-label-lg">
        <VaDateInput v-model="formData.manufactureDate" label="설비 제조일" :rules="[requiredRule]" clearable />
        <VaInput v-model="formData.registerDate" label="설비 등록일" readonly :inputClass="'bg-gray-100'" />
      </div>

      <!-- 제조사 / 모델명 -->
      <div class="grid grid-cols-2 gap-4 va-label-lg">
        <VaInput v-model="formData.maker" label="제조사" :rules="[requiredRule]" />
        <VaInput v-model="formData.model" label="모델명" :rules="[requiredRule]" />
      </div>

      <!-- 제조번호 / 전력 -->
      <div class="grid grid-cols-2 gap-4 va-label-lg">
        <VaInput v-model="formData.serial" label="제조번호 (Serial No.)" :rules="[requiredRule]" />
        <VaInput v-model="formData.power" label="정격 전력" :rules="[requiredRule]" />
      </div>

      <!-- 최대 가동 시간 / 정기 점검 주기 -->
      <div class="grid grid-cols-2 gap-4 va-label-lg">
        <div class="relative">
          <VaInput v-model="formData.maxRuntime" label="최대 가동 시간" :rules="[requiredRule]" :inputClass="'pr-12'" class="w-full" />
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">시간</span>
        </div>
        <div class="relative">
          <VaInput v-model="formData.maintenanceCycle" label="정기 점검 주기" :rules="[requiredRule]" :inputClass="'pr-12'" class="w-full" />
          <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">일</span>
        </div>
      </div>

      <!-- 비고 -->
      <VaTextarea v-model="formData.note" label="비고" placeholder="특이사항이 있다면 입력해 주세요" class="va-label-lg" />

      <!-- 버튼 -->
      <div class="flex justify-center gap-4 mt-6">
        <VaButton 
          :disabled="!isValid" 
          :color="mode === 'edit' ? 'warning' : 'primary'"
          @click="handleSubmit"
        >
          {{ mode === 'edit' ? '수정' : '등록' }}
        </VaButton>
        <VaButton color="secondary" @click="handleReset">초기화</VaButton>
      </div>
    </VaForm>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

interface CodeOption {
  label: string
  value: string
}

interface FormData {
  image: File[]
  id: string
  baseName: string // 설비 기본명 (프론트엔드에서만 사용)
  name: string // 실제 등록될 설비명 (혼합기1, 혼합기2 형태)
  category: string
  line: string
  type: string
  factory: string
  floor: string
  room: string
  installType: string
  manufactureDate: string | null
  registerDate: string
  maker: string
  model: string
  serial: string
  power: string
  maxRuntime: string
  maintenanceCycle: string
  note: string
}

interface ApiResponse {
  isSuccessed: boolean
  data?: any
  message?: string
}

interface CommonCodesResponse {
  [key: string]: CodeOption[]
}

const route = useRoute()
const router = useRouter()

const formRef = ref<any>()
const fileUploadRef = ref<any>()
const previewUrl = ref<string>('')
const existingImage = ref<string>('')

// 설비 세부 유형 매핑
const equipmentTypeMapping: Record<string, string[]> = {
  'a1': ['t1'], // 혼합기 -> 고속 혼합기
  'a2': ['t2'], // 과립기 -> 습식 과립기
  'a3': ['t3'], // 건조기 -> 유동층 건조기
  'a4': ['t4'], // 압축기 -> 정제 압축기
  'a5': ['t5'], // 코팅기 -> 정제 코팅기
  'a6': ['t7'], // 자동 정제 검사기 -> 물리적 검사 장비
  'a7': ['t7'], // 경도 측정기 -> 물리적 검사 장비
  'a8': ['t7'], // 칭량저울 -> 물리적 검사 장비
  'a9': ['t8'], // HPLC -> 분석 장비
  'a10': ['t8'], // 용출 시험기 -> 분석 장비
  'a11': ['t8'], // 수분 분석기 -> 분석 장비
  'a12': ['t8'], // 입도 분석기 -> 분석 장비
  'a13': ['t6'], // 10정용 블리스터 포장기 -> 자동 포장기
  'a14': ['t6'], // 30정용 블리스터 포장기 -> 자동 포장기
  'a15': ['t6'], // 60정용 블리스터 포장기 -> 자동 포장기
  'a16': ['t6'], // 병 모노블럭 -> 자동 포장기
  'a17': ['t6'], // 소형 카톤포장기 -> 자동 포장기
  'a18': ['t6'], // 대형 카톤포장기 -> 자동 포장기
  'a19': ['t6']  // 라벨러 -> 자동 포장기
}

// 모드 결정: route params의 id가 있거나, query에 mode=edit이고 eq_id가 있으면 수정모드
const mode = computed(() => {
  return route.params.id || (route.query.mode === 'edit' && route.query.eq_id) ? 'edit' : 'register'
})

const equipmentId = computed(() => {
  return route.params.id as string || route.query.eq_id as string
})

const pageTitle = computed(() => {
  return mode.value === 'edit' ? '설비 수정' : '설비 등록'
})

// 설비명 선택에 따른 설비 세부 유형 필터링
const filteredEqTypes = computed(() => {
  if (!formData.value.baseName) return []
  
  const allowedTypes = equipmentTypeMapping[formData.value.baseName] || []
  return codeOptions.value.eq_type.filter(option => 
    allowedTypes.includes(option.value)
  )
})

const requiredRule = (v: any): string | boolean => {
  return !!v || '필수 입력 항목입니다'
}

const getInitialFormState = (): FormData => ({
  image: [],
  id: '',
  baseName: '',
  name: '',
  category: '',
  line: '',
  type: '',
  factory: '',
  floor: '',
  room: '',
  installType: '',
  manufactureDate: null,
  registerDate: new Date().toISOString().slice(0, 10),
  maker: '',
  model: '',
  serial: '',
  power: '',
  maxRuntime: '',
  maintenanceCycle: '',
  note: '',
})

const formData = ref<FormData>(getInitialFormState())
const formKey = ref(0)

const codeOptions = ref({
  factory: [] as CodeOption[],
  floor: [] as CodeOption[],
  room: [] as CodeOption[],
  eq_group: [] as CodeOption[],
  eq_type: [] as CodeOption[],
  eq_import: [] as CodeOption[],
  eq_base_name: [] as CodeOption[], // 설비 기본명 (0A)
  line: [] as CodeOption[]
})

// 설비명 변경 시 처리
const onBaseNameChange = (newBaseName: string) => {
  // 설비 세부 유형 초기화
  formData.value.type = ''
  
  // 설비 분류 자동 설정
  if (newBaseName) {
    const selectedBaseName = codeOptions.value.eq_base_name.find(option => option.value === newBaseName)
    if (selectedBaseName) {
      // 설비명에 따른 분류 자동 설정
      if (['a1', 'a2', 'a3', 'a4', 'a5'].includes(newBaseName)) {
        formData.value.category = 'e1' // 생산설비
      } else if (['a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12'].includes(newBaseName)) {
        formData.value.category = 'e2' // 품질관리설비
      } else if (['a13', 'a14', 'a15', 'a16', 'a17', 'a18', 'a19'].includes(newBaseName)) {
        formData.value.category = 'e3' // 포장설비
      }
      
      // 설비 세부 유형 자동 설정 (매핑된 유형이 하나인 경우)
      const allowedTypes = equipmentTypeMapping[newBaseName] || []
      if (allowedTypes.length === 1) {
        formData.value.type = allowedTypes[0]
      }
    }
  }
}

const onImageSelected = (files: any) => {
  const file = Array.isArray(files) ? files[0] : files
  if (file instanceof File) {
    formData.value.image = [file]
    previewUrl.value = URL.createObjectURL(file)
    console.log('이미지 선택됨:', file.name)
  } else {
    console.warn('File 객체 아님:', file)
  }
}

const loadCommonCodes = async () => {
  try {
    const { data: codes }: { data: CommonCodesResponse } = await axios.get('/common-codes?groups=0F,0L,0M,0E,0T,0I,0A,line')
    codeOptions.value = {
      factory: codes['0F'] || [],
      floor: codes['0L'] || [],
      room: codes['0M'] || [],
      eq_group: codes['0E'] || [],
      eq_type: codes['0T'] || [],
      eq_import: codes['0I'] || [],
      eq_base_name: codes['0A'] || [], // 설비 기본명
      line: codes.line || []
    }
  } catch (error: any) {
    console.error('공통코드 로드 실패:', error)
  }
}

const loadEquipmentData = async (equipmentId: string) => {
  try {
    const response = await axios.get(`/equipments/${equipmentId}`)
    if (response.data.isSuccessed && response.data.data) {
      const equipment = response.data.data
      
      // 기존 설비명에서 기본명 추출 (숫자 제거)
      const extractedBaseName = equipment.eq_name?.replace(/\d+$/, '') || ''
      // 기본명으로 코드 찾기
      const baseNameOption = codeOptions.value.eq_base_name.find(option => option.label === extractedBaseName)
      
      // 폼 데이터 설정
      formData.value = {
        image: [],
        id: equipment.eq_id || '',
        baseName: baseNameOption?.value || '',
        name: equipment.eq_name || '',
        category: equipment.eq_group_code || '',
        line: equipment.line_id || '',
        type: equipment.eq_type_code || '',
        factory: equipment.eq_factory_code || '',
        floor: equipment.eq_floor_code || '',
        room: equipment.eq_room_code || '',
        installType: equipment.eq_import_code || '',
        manufactureDate: equipment.eq_manufacture_date || null,
        registerDate: equipment.eq_registration_date || new Date().toISOString().slice(0, 10),
        maker: equipment.eq_manufacturer || '',
        model: equipment.eq_model || '',
        serial: equipment.eq_serial_number || '',
        power: equipment.eq_power_spec || '',
        maxRuntime: equipment.eq_max_operation_time?.toString() || '',
        maintenanceCycle: equipment.eq_inspection_cycle?.toString() || '',
        note: equipment.eq_remark || ''
      }
      
      // 이미지 미리보기 설정
      if (equipment.eq_image) {
        existingImage.value = equipment.eq_image
        previewUrl.value = `/uploads/equipment/${equipment.eq_image}`
      }
    }
  } catch (error) {
    console.error('설비 데이터 로드 실패:', error)
    alert('설비 정보를 불러오는데 실패했습니다.')
    router.push('/facility/management')
  }
}

const resetForm = async () => {
  try {
    if (previewUrl.value && !existingImage.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
    previewUrl.value = ''
    existingImage.value = ''
    
    formData.value = getInitialFormState()
    formKey.value += 1
    
    await nextTick()
    
    if (fileUploadRef.value && fileUploadRef.value.reset) {
      fileUploadRef.value.reset()
    }
    
    // 수정 모드인 경우 다시 데이터 로드
    if (mode.value === 'edit' && equipmentId.value) {
      await loadEquipmentData(equipmentId.value)
    }
    
    console.log('폼이 초기화되었습니다.')
  } catch (error) {
    console.error('폼 초기화 중 오류:', error)
  }
}

onMounted(async () => {
  await loadCommonCodes()
  
  // 수정 모드인 경우 설비 데이터 로드
  if (mode.value === 'edit' && equipmentId.value) {
    await loadEquipmentData(equipmentId.value)
  }
})

// route 변경 감지
watch([() => route.params.id, () => route.query], async ([paramId, query]) => {
  const id = paramId as string || query.eq_id as string
  if (mode.value === 'edit' && id) {
    await loadEquipmentData(id)
  } else if (!id) {
    // 등록 모드로 변경된 경우 폼 초기화
    formData.value = getInitialFormState()
    previewUrl.value = ''
    existingImage.value = ''
  }
}, { deep: true })

watch(() => formData.value.category, (newCategory: string) => {
  if (newCategory !== 'e3') {
    formData.value.line = ''
  }
})

const handleSubmit = async (): Promise<void> => {
  if (!confirm(`${mode.value === 'edit' ? '수정' : '등록'}하시겠습니까?`)) return
  if (!formRef.value?.validate()) return

  const url = mode.value === 'edit' ? `/equipments/${formData.value.id}` : '/equipments'
  const method = mode.value === 'edit' ? 'put' : 'post'

  try {
    const submitFormData = new FormData()

    // 선택된 기본명을 실제 설비명으로 변환해서 전송
    const selectedBaseNameOption = codeOptions.value.eq_base_name.find(option => option.value === formData.value.baseName)
    const submitData = {
      ...formData.value,
      name: selectedBaseNameOption?.label || formData.value.baseName // 서버에서 자동으로 번호 부여
    }

    Object.entries(submitData).forEach(([key, value]) => {
      if (key !== 'image' && key !== 'baseName') {
        if (value !== null && value !== undefined && value !== '' && !Array.isArray(value)) {
          submitFormData.append(key, String(value))
        }
      }
    })

    // 새 이미지가 선택된 경우
    if (formData.value.image && formData.value.image.length > 0) {
      const imageFile = formData.value.image[0]
      if (imageFile instanceof File) {
        submitFormData.append('image', imageFile)
      }
    } else if (mode.value === 'edit' && existingImage.value) {
      // 수정 모드에서 기존 이미지를 유지하는 경우
      submitFormData.append('existingImage', existingImage.value)
    }

    const config = { headers: { 'Content-Type': 'multipart/form-data' } }
    const res: { data: ApiResponse } = await axios[method](url, submitFormData, config)

    if (res.data.isSuccessed) {
      alert(`설비 ${mode.value === 'edit' ? '수정' : '등록'}에 성공했습니다!`)
      
      if (mode.value === 'register') {
        await resetForm()
      } else {
        // 수정 완료 후 목록으로 이동
        router.push('/facility/management')
      }
    } else {
      alert(`실패: ${res.data.message}`)
    }
  } catch (err: any) {
    console.error('설비 저장 에러:', err)
    alert('에러 발생!')
  }
}

const handleReset = async (): Promise<void> => {
  if (!confirm('정말 초기화하시겠습니까?')) return
  await resetForm()
}

</script>

<style scoped>
.equipment-form-page {
  padding: 1.5rem;
}

.va-label-lg :deep(.va-input__label),
.va-label-lg :deep(.va-select__label),
.va-label-lg :deep(.va-date-input__label),
.va-label-lg :deep(.va-textarea__label) {
  font-size: 1.125rem;
  font-weight: 600;
}
</style>