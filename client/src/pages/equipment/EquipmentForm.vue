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

      <!-- 설비명 -->
      <VaInput v-model="formData.name" label="설비명" :rules="[requiredRule]" class="va-label-lg" />

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
          :options="codeOptions.eq_type" 
          :rules="[requiredRule]" 
          value-by="value"
          text-by="label"
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
  name: string
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

const requiredRule = (v: any): string | boolean => {
  return !!v || '필수 입력 항목입니다'
}

const getInitialFormState = (): FormData => ({
  image: [],
  id: '',
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
  line: [] as CodeOption[]
})

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
    const { data: codes }: { data: CommonCodesResponse } = await axios.get('/common-codes?groups=0F,0L,0M,0E,0T,0I,line')
    codeOptions.value = {
      factory: codes['0F'] || [],
      floor: codes['0L'] || [],
      room: codes['0M'] || [],
      eq_group: codes['0E'] || [],
      eq_type: codes['0T'] || [],
      eq_import: codes['0I'] || [],
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
      
      // 폼 데이터 설정
      formData.value = {
        image: [],
        id: equipment.eq_id || '',
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

    Object.entries(formData.value).forEach(([key, value]) => {
      if (key !== 'image') {
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