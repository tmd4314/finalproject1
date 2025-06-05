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

    <!-- 설비 코드 (회색 배경) -->
    <VaInput
      v-model="formData.code"
      label="설비 코드"
      readonly
      placeholder="등록 시 자동 생성됩니다"
      :inputClass="'bg-gray-100'"
      class="va-label-lg"
    />

    <!-- 설비명 -->
    <VaInput v-model="formData.name" label="설비명" :rules="[requiredRule]" class="va-label-lg" />

    <!-- 설비 분류 / 설비 유형 / 도입 유형 -->
    <div class="grid grid-cols-3 gap-4 va-label-lg">
      <VaSelect v-model="formData.category" label="설비 분류" :options="['생산 설비', '품질관리 설비', '포장 설비']" :rules="[requiredRule]" />
      <VaSelect v-model="formData.type" label="설비 유형" :options="['고속 혼합기', '습식 과립기']" :rules="[requiredRule]" />
      <VaSelect v-model="formData.installType" label="도입 유형" :options="['신규', '이전 설치']" :rules="[requiredRule]" />
    </div>

    <!-- 포장 설비 전용 라인 -->
    <VaSelect
      v-if="formData.category === '포장 설비'"
      v-model="formData.line"
      label="라인"
      :options="['A라인', 'B라인']"
      :rules="[requiredRule]"
      class="va-label-lg"
    />

    <!-- 공장 / 층 / 공정실 -->
    <div class="grid grid-cols-3 gap-4 va-label-lg">
      <VaSelect v-model="formData.factory" label="공장" :options="factoryOptions" :rules="[requiredRule]" />
      <VaSelect
        v-if="formData.factory"
        v-model="formData.floor"
        label="층"
        :options="floorOptions[formData.factory] || []"
        :rules="[requiredRule]"
      />
      <VaSelect
        v-if="formData.floor"
        v-model="formData.room"
        label="공정실"
        :options="roomOptions[formData.floor] || []"
        :rules="[requiredRule]"
      />
    </div>

    <!-- 설비 제조일 / 등록일 -->
    <div class="grid grid-cols-2 gap-4 va-label-lg">
      <VaDateInput v-model="formData.manufactureDate" label="설비 제조일" :rules="[requiredRule]" clearable />
      <VaInput
        v-model="formData.registerDate"
        label="설비 등록일"
        readonly
        :inputClass="'bg-gray-100'"
      />
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
      <VaButton color="secondary" @click="$emit('cancel')">취소</VaButton>
      <VaButton :disabled="!isValid" @click="handleSubmit">
        {{ props.mode === 'edit' ? '수정' : '등록' }}
      </VaButton>
    </div>
  </VaForm>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  mode: 'register' | 'edit'
  initialData?: any
}>()

const emit = defineEmits(['save', 'cancel'])

const formRef = ref()
const previewUrl = ref('')

const requiredRule = (v: any) => !!v || '필수 입력 항목입니다'

const formData = ref({
  image: [],
  code: '',
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

const factoryOptions = ['1공장', '2공장']
const floorOptions: Record<string, string[]> = {
  '1공장': ['1층', '2층'],
  '2공장': ['1층', '2층'],
}
const roomOptions: Record<string, string[]> = {
  '1층': ['혼합실', '포장실'],
  '2층': ['검사실', '코팅실'],
}

watch(
  () => props.initialData,
  (data) => {
    if (props.mode === 'edit' && data) {
      formData.value = { ...formData.value, ...data }
    }
  },
  { immediate: true }
)

watch(
  () => formData.value.image,
  (files) => {
    const file = Array.isArray(files) ? files[0] : files
    if (file instanceof File) {
      previewUrl.value = URL.createObjectURL(file)
    } else {
      previewUrl.value = ''
    }
  }
)

const handleSubmit = () => {
  if (formRef.value?.validate()) {
    emit('save', formData.value)
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
