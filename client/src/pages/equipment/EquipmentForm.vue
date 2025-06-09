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
      <VaSelect v-model="formData.category" label="설비 분류" :options="codeOptions.eq_group" :rules="[requiredRule]" value-by="value" />
      <VaSelect v-model="formData.type" label="설비 세부 유형" :options="codeOptions.eq_type" :rules="[requiredRule]" value-by="value" />
      <VaSelect v-model="formData.installType" label="도입 유형" :options="codeOptions.eq_import" :rules="[requiredRule]" value-by="value" />
    </div>

    <!-- 포장 설비 전용 라인 -->
    <VaSelect
      v-if="formData.category === 'e3'"
      v-model="formData.line"
      label="생산 라인"
      :options="codeOptions.line"
      :rules="[requiredRule]"
      value-by="value"
      class="va-label-lg"
    />

    <!-- 공장 / 층 / 공정실 -->
    <div class="grid grid-cols-3 gap-4 va-label-lg">
      <VaSelect v-model="formData.factory" label="공장" :options="codeOptions.factory" :rules="[requiredRule]" value-by="value" />
      <VaSelect v-if="formData.factory" v-model="formData.floor" label="층" :options="codeOptions.floor" :rules="[requiredRule]" value-by="value" />
      <VaSelect v-if="formData.floor" v-model="formData.room" label="공정실" :options="codeOptions.room" :rules="[requiredRule]" value-by="value" />
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

const props = defineProps<{ mode: 'register' | 'edit', initialData?: any }>()
const emit = defineEmits(['save', 'cancel'])

const formRef = ref()
const previewUrl = ref('')
const requiredRule = (v: any) => !!v || '필수 입력 항목입니다'

const initialFormState = {
  image: [], id: '', name: '', category: '', line: '',
  type: '', factory: '', floor: '', room: '', installType: '',
  manufactureDate: null,
  registerDate: new Date().toISOString().slice(0, 10),
  maker: '', model: '', serial: '', power: '',
  maxRuntime: '', maintenanceCycle: '', note: '',
}
const formData = ref({ ...initialFormState })

const codeOptions = ref<Record<string, { label: string, value: string }[]>>({
  factory: [], floor: [], room: [], eq_group: [], eq_type: [], eq_import: [], line: []
})

// 포장설비인지 확인하는 computed 속성
const isPackagingEquipment = computed(() => {
  return formData.value.category === 'e3'
})

onMounted(async () => {
  try {
    const { data: codes } = await axios.get('/common-codes?groups=0F,0L,0M,0E,0T,0I,line')
    console.log('=== API 응답 전체 구조 ===')
    console.log('codeOptions API 응답:', codes)
    
    // 각 그룹별 데이터 구조 확인
    Object.keys(codes).forEach(key => {
      console.log(`${key}:`, codes[key])
      // 설비 그룹(0E) 데이터 특별히 확인
      if (key === '0E') {
        console.log('=== 설비 그룹 상세 ===')
        codes[key]?.forEach((item, index) => {
          console.log(`${index}:`, item)
          console.log(`  value: "${item.value}" (타입: ${typeof item.value})`)
          console.log(`  label: "${item.label}"`)
        })
      }
    })
    
    codeOptions.value = {
      factory: codes['0F'] || [],
      floor: codes['0L'] || [],
      room: codes['0M'] || [],
      eq_group: codes['0E'] || [],
      eq_type: codes['0T'] || [],
      eq_import: codes['0I'] || [],
      line: codes.line || []
    }
    
    console.log('=== 최종 codeOptions.eq_group ===')
    console.log(codeOptions.value.eq_group)
  } catch (err) {
    console.error('공통코드 불러오기 실패: ', err)
    console.error('에러 상세:', err.response?.data || err.message)
  }
})

watch(() => props.initialData, (data) => {
  console.log('initialData:', data)
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

watch(() => formData.value.image, (files) => {
  const file = Array.isArray(files) ? files[0] : files
  previewUrl.value = file instanceof File ? URL.createObjectURL(file) : ''
})

// 설비 분류가 변경될 때 라인 값 초기화
watch(() => formData.value.category, (newCategory) => {
  console.log('=== 설비 분류 디버깅 ===')
  console.log(`선택된 값: "${newCategory}"`)
  console.log(`값의 타입: ${typeof newCategory}`)
  console.log(`값의 길이: ${newCategory?.length}`)
  console.log(`'e3'와 비교: ${newCategory === 'e3'}`)
  console.log(`포장설비 옵션들:`, codeOptions.value.eq_group)
  console.log('=====================')
  
  // 포장설비가 아닌 경우 라인 값을 초기화
  if (newCategory !== 'e3') {
    formData.value.line = ''
  }
})

const handleSubmit = async () => {
  if (!confirm(`${props.mode === 'edit' ? '수정' : '등록'}하시겠습니까?`)) return
  if (!formRef.value?.validate()) return

  const url = props.mode === 'edit' ? `/equipments/${formData.value.id}` : '/equipments'
  const method = props.mode === 'edit' ? 'put' : 'post'

  try {
    const res = await axios[method](url, formData.value)
    if (res.data.isSuccessed) {
      alert('성공!')
      if (props.mode === 'register') {
        formData.value = { ...initialFormState }
        previewUrl.value = ''
      }
    } else {
      alert('실패했습니다.')
    }
  } catch (err) {
    console.error(err)
    alert('에러 발생!')
  }
}

const handleReset = () => {
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