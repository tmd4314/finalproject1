<template>
   <!-- <div class="equipment-inquiry-page">
    <h1 class="va-h3 mb-6">설비 점검</h1>

    검색 영역
    <VaCard class="mb-6">
      <VaCardContent>
        <h2 class="va-h5 mb-4">검색 조건</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <VaInput
            v-model="searchParams.equipmentCode"
            label="설비번호"
            placeholder="설비번호를 입력하세요"
            clearable
            @input="onSearchInput"
          >
            <template #appendInner>
              <VaIcon name="search" color="secondary" />
            </template>
          </VaInput>
          <VaInput
            v-model="searchParams.equipmentName"
            label="설비명"
            placeholder="설비명을 입력하세요"
            clearable
            @input="onSearchInput"
          >
            <template #appendInner>
              <VaIcon name="search" color="secondary" />
            </template>
          </VaInput>
          <VaSelect
            v-model="searchParams.category"
            label="설비분류"
            :options="categoryOptions"
            text-by="label"
            value-by="value"
            clearable
            placeholder="전체"
            @update:model-value="onSearchInput"
          />
          <VaSelect
            v-model="searchParams.status"
            label="설비상태"
            :options="statusOptions"
            text-by="label"
            value-by="value"
            clearable
            placeholder="전체"
            @update:model-value="onSearchInput"
          />
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <VaButton 
            color="secondary"
            @click="resetSearch"
          >
            <div class="flex items-center">
              <VaIcon name="refresh" size="16px" class="mr-1" />
              <span>초기화</span>
            </div>
          </VaButton>
        </div>
      </VaCardContent>
    </VaCard> -->

</template>

<script setup lang="ts">
</script>