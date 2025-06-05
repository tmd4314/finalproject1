 <template>
  <div class="product-page">
    <div class="product-container">
      <div>
        <!-- 제품 등록 폼 -->
        <div class="product-form">
          <h3 class="form-title">불량품기준 등록</h3>
          <va-input v-model="form.name" label="제품명" />
          <va-input v-model="form.code" label="작업지시서번호" />
          <va-input v-model="form.processStage" label="공정단계" />
          <va-input v-model="form.faultyType" label="불량유형" />
          <va-input v-model="form.faultyQuantity" label="불량수량" />
          <va-input v-model="form.occurDate" label="발생일자" type="date" />
          <va-input v-model="form.detail" label="상세설명" />

          <va-radio-group v-model="form.judgment" row class="judgment-radio-group">
            <va-radio label="폐기" name="click" value="delete" />
            <va-radio label="재포장" name="click" value="replace" />
            <va-radio label="대기" name="click" value="wait" />
          </va-radio-group>





          <div class="form-buttons">
            <va-button @click="registerProduct" color="primary">등록</va-button>
            <va-button @click="resetForm">취소</va-button>
          </div>

          <div class="form-buttons">
            <va-button @click="updateProduct" color="warning">수정</va-button>
            <va-button @click="deleteProduct" color="danger">삭제</va-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const form = ref({
  name: '',
  code: '',
  processStage: '',
  faultyType: '',
  faultyQuantity: '',
  occurDate: '',
  detail: '',
  judgment: '',
})

function resetForm() {
  form.value = {
    name: '', code: '', processStage: '', faultyType: '', faultyQuantity: '',
    occurDate: '', detail: '', judgment: ''
  }
}

function registerProduct() {
  if (!form.value.code || !form.value.name) return alert('필수값 누락')
  alert(`등록된 제품: ${form.value.name} (${form.value.code})`)
  resetForm()
}

function updateProduct() {
  alert('수정 기능은 아직 구현되지 않았습니다.')
}

function deleteProduct() {
  alert('삭제 기능은 아직 구현되지 않았습니다.')
}
</script>

<style scoped>
.product-page {
  padding: 1.5rem;
  display: flex;
  justify-content: center;
  height: 739px;
}

.product-container {
  width: 1060px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.product-form {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
  padding: 1rem;
}

.form-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.va-input {
  margin-bottom: 0.5rem;
}

.form-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.judgment-radio-group {
  display: flex;
  justify-content: center; /* 가운데 정렬 */
  margin-bottom: 0.5rem;
}

</style>
