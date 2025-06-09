<template>
  <VaForm ref="formRef" v-slot="{ isValid }" class="max-w-5xl mx-auto p-6 flex flex-col gap-6 bg-white shadow rounded">


    <!-- 이미지 미리보기 + 파일 선택 버튼 -->
    <div class="flex flex-col items-center gap-2">
      <div class="w-40 h-40 border rounded flex items-center justify-center bg-gray-100 overflow-hidden">
        <img v-if="previewUrl" :src="previewUrl" class="object-contain max-w-full max-h-full" />
        <span v-else class="text-gray-500">이미지 미리보기</span>
      </div>
      <VaFileUpload v-model="formData.image" type="single" hide-file-list>
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

    <!-- 포장 설비 전용 라인 -->
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
      <VaButton :disabled="!isValid" @click="handleSubmit">
        {{ props.mode === 'edit' ? '수정' : '등록' }}
      </VaButton>
      <VaButton color="secondary" @click="handleReset">초기화</VaButton>
    </div>
  </VaForm>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'

// 타입 정의
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

// Props 및 Emits 타입 정의
interface Props {
  mode: 'register' | 'edit'
  initialData?: Partial<FormData>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  save: [data: FormData]
  cancel: []
}>()

// Refs
const formRef = ref<any>()
const previewUrl = ref<string>('')

// 유효성 검사 규칙
const requiredRule = (v: any): string | boolean => {
  return !!v || '필수 입력 항목입니다'
}

// 초기 폼 상태
const initialFormState: FormData = {
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
}

const formData = ref<FormData>({ ...initialFormState })

const codeOptions = ref<{
  factory: CodeOption[]
  floor: CodeOption[]
  room: CodeOption[]
  eq_group: CodeOption[]
  eq_type: CodeOption[]
  eq_import: CodeOption[]
  line: CodeOption[]
}>({
  factory: [],
  floor: [],
  room: [],
  eq_group: [],
  eq_type: [],
  eq_import: [],
  line: []
})

// 공통코드 로드 함수
const loadCommonCodes = async () => {
  try {
    console.log('공통코드 로드 시작')
    
    const { data: codes }: { data: CommonCodesResponse } = await axios.get('/common-codes?groups=0F,0L,0M,0E,0T,0I,line')
    console.log('공통코드 API 응답:', codes)
    
    codeOptions.value = {
      factory: codes['0F'] || [],
      floor: codes['0L'] || [],
      room: codes['0M'] || [],
      eq_group: codes['0E'] || [],
      eq_type: codes['0T'] || [],
      eq_import: codes['0I'] || [],
      line: codes.line || []
    }
    
    console.log('공통코드 로드 완료')
    
  } catch (error: any) {
    console.error('공통코드 로드 실패:', error)
  }
}



// 포장설비인지 확인하는 computed 속성
const isPackagingEquipment = computed(() => {
  return formData.value.category === 'e3'
})

// 컴포넌트 마운트 시 공통코드 로드
onMounted(async () => {
  await loadCommonCodes()
})

// Props의 initialData 변경 감지
watch(() => props.initialData, (data: Partial<FormData> | undefined) => {
  console.log('initialData 감지:', data)
  if (props.mode === 'edit' && data) {
    formData.value = {
      ...formData.value,
      ...data,
      category: data.category ? String(data.category) : '',
      type: data.type ? String(data.type) : '',
      installType: data.installType ? String(data.installType) : '',
      factory: data.factory ? String(data.factory) : '',
      floor: data.floor ? String(data.floor) : '',
      room: data.room ? String(data.room) : '',
      line: data.line ? String(data.line) : ''
    }
  }
}, { immediate: true })

// 이미지 파일 변경 감지
watch(() => formData.value.image, (files: File[]) => {
  const file = Array.isArray(files) ? files[0] : files
  previewUrl.value = file instanceof File ? URL.createObjectURL(file) : ''
})

// 설비 분류가 변경될 때 라인 값 초기화
watch(() => formData.value.category, (newCategory: string) => {
  console.log('=== 설비 분류 변경 감지 ===')
  console.log(`새로운 값: "${newCategory}"`)
  console.log(`값의 타입: ${typeof newCategory}`)
  console.log(`'e3'와 비교: ${newCategory === 'e3'}`)
  
  if (newCategory !== 'e3') {
    formData.value.line = ''
  }
})

// 폼 제출 처리
const handleSubmit = async (): Promise<void> => {
  if (!confirm(`${props.mode === 'edit' ? '수정' : '등록'}하시겠습니까?`)) return
  if (!formRef.value?.validate()) return

  const url = props.mode === 'edit' ? `/equipments/${formData.value.id}` : '/equipments'
  const method = props.mode === 'edit' ? 'put' : 'post'

  try {
    // FormData 객체 생성
    const formDataToSend = new FormData()
    
    // 일반 필드들 추가
    Object.keys(formData.value).forEach(key => {
      if (key !== 'image') {
        const value = formData.value[key as keyof FormData]
        if (value !== null && value !== undefined && value !== '') {
          formDataToSend.append(key, String(value))
        }
      }
    })
    
    // 이미지 파일 추가
    if (formData.value.image && formData.value.image.length > 0) {
      const imageFile = Array.isArray(formData.value.image) ? formData.value.image[0] : formData.value.image
      if (imageFile instanceof File) {
        formDataToSend.append('image', imageFile)
      }
    }

    console.log('전송할 FormData 내용:')
    for (let [key, value] of formDataToSend.entries()) {
      console.log(`${key}:`, value)
    }

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }

    const res: { data: ApiResponse } = await axios[method](url, formDataToSend, config)
    
    if (res.data.isSuccessed) {
      alert(`설비 ${props.mode === 'edit' ? '수정' : '등록'}에 성공했습니다!`)
      emit('save', formData.value)
      if (props.mode === 'register') {
        formData.value = { ...initialFormState }
        previewUrl.value = ''
      }
    } else {
      alert(`설비 ${props.mode === 'edit' ? '수정' : '등록'}에 실패했습니다: ${res.data.message}`)
    }
  } catch (err: any) {
    console.error('설비 저장 에러:', err)
    if (err.response?.data?.message) {
      alert(`에러 발생: ${err.response.data.message}`)
    } else {
      alert('에러 발생!')
    }
  }
}

// 폼 초기화
const handleReset = (): void => {
  if (!confirm('정말 초기화하시겠습니까?')) return
  formRef.value?.reset()
  formData.value = { ...initialFormState }
  previewUrl.value = ''
}
</script>

<style scoped>
.va-label-lg :deep(.va-input__label),
.va-label-lg :deep(.va-select__label),
.va-label-lg :deep(.va-date-input__label),
.va-label-lg :deep(.va-textarea__label) {
  font-size: 1.125rem;
  font-weight: 600;
}
</style>