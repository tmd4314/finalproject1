<template>
  <VaForm ref="formRef" :key="formKey" v-slot="{ isValid }" class="max-w-5xl mx-auto p-6 flex flex-col gap-6 bg-white shadow rounded">
    <!-- 이미지 미리보기 + 파일 선택 버튼 -->
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
      <VaSelect v-model="formData.category" label="설비 분류" :options="codeOptions.eq_group" :rules="[requiredRule]" value-by="value" text-by="label" />
      <VaSelect v-model="formData.type" label="설비 세부 유형" :options="codeOptions.eq_type" :rules="[requiredRule]" value-by="value" text-by="label" />
      <VaSelect v-model="formData.installType" label="도입 유형" :options="codeOptions.eq_import" :rules="[requiredRule]" value-by="value" text-by="label" />
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
      <VaSelect v-model="formData.factory" label="공장" :options="codeOptions.factory" :rules="[requiredRule]" value-by="value" text-by="label" />
      <VaSelect v-if="formData.factory" v-model="formData.floor" label="층" :options="codeOptions.floor" :rules="[requiredRule]" value-by="value" text-by="label" />
      <VaSelect v-if="formData.floor" v-model="formData.room" label="공정실" :options="codeOptions.room" :rules="[requiredRule]" value-by="value" text-by="label" />
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
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()

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

interface Props {
  mode: 'register' | 'edit'
  initialData?: Partial<FormData & { eq_image?: string }>
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'register',
  initialData: undefined
})

const emit = defineEmits<{ save: [data: FormData] }>()

const formRef = ref<any>()
const fileUploadRef = ref<any>()
const previewUrl = ref<string>('')
const formKey = ref(0)

const requiredRule = (v: any): string | boolean => !!v || '필수 입력 항목입니다'

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
  }
}

const loadCommonCodes = async () => {
  const { data } = await axios.get('/common-codes?groups=0F,0L,0M,0E,0T,0I,line')
  codeOptions.value = {
    factory: data['0F'] || [],
    floor: data['0L'] || [],
    room: data['0M'] || [],
    eq_group: data['0E'] || [],
    eq_type: data['0T'] || [],
    eq_import: data['0I'] || [],
    line: data['line'] || [],
  }
}

const resetForm = async () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  formData.value = getInitialFormState()
  formKey.value += 1
  await nextTick()
  if (fileUploadRef.value?.reset) fileUploadRef.value.reset()
}

onMounted(async () => {
  await loadCommonCodes()

  if (props.mode === 'edit') {
    if (props.initialData) {
      formData.value = {
        ...getInitialFormState(),
        ...props.initialData,
        image: [],
      }
      if (props.initialData.eq_image) {
        previewUrl.value = `/uploads/${props.initialData.eq_image}`
      }
    } else if (route.params.id) {
      const res = await axios.get(`/equipments/${route.params.id}`)
      if (res.data.isSuccessed) {
        const data = res.data.data
        formData.value = {
          ...getInitialFormState(),
          ...data,
          image: [],
        }
        if (data.eq_image) {
          previewUrl.value = `/uploads/${data.eq_image}`
        }
      }
    }
  }
})

watch(() => formData.value.category, (val) => {
  if (val !== 'e3') {
    formData.value.line = ''
  }
})

const handleSubmit = async () => {
  if (!confirm(`${props.mode === 'edit' ? '수정' : '등록'}하시겠습니까?`)) return
  if (!formRef.value?.validate()) return

  const url = props.mode === 'edit' ? `/equipments/${formData.value.id}` : '/equipments'
  const method = props.mode === 'edit' ? 'put' : 'post'

  const submitFormData = new FormData()
  Object.entries(formData.value).forEach(([key, value]) => {
    if (key !== 'image' && value) {
      submitFormData.append(key, String(value))
    }
  })

  if (formData.value.image?.[0] instanceof File) {
    submitFormData.append('image', formData.value.image[0])
  } else if (props.mode === 'edit' && route.params.id && previewUrl.value) {
    submitFormData.append('existingImage', previewUrl.value.split('/').pop())
  }

  const res = await axios[method](url, submitFormData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  if (res.data.isSuccessed) {
    alert(`설비 ${props.mode === 'edit' ? '수정' : '등록'} 완료`)
    emit('save', formData.value)
    if (props.mode === 'register') await resetForm()
  } else {
    alert(`실패: ${res.data.message || '에러'}`)
  }
}

const handleReset = async () => {
  if (confirm('초기화하시겠습니까?')) {
    await resetForm()
  }
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
