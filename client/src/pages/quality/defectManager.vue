<template>

<h2>불량유형 등록</h2>





</template>

<script lang="ts" setup></script>

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

.product-title {
  font-size: 1.25rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 2.5rem;
}

.product-table {
  grid-column: span 2 / span 2;
}

.product-filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.filter-input {
  width: 33.333%;
}

.filter-spec-input {
  width: 25%;
}

.product-form {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
  padding: 1rem;
}

.form-title {
  font-size: 1.125rem;
  font-weight: 1000;
  width: 100px;
  margin-bottom: 1rem;
}

.va-input {
  margin-bottom: 0.5rem;
}

.form-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
}

.image-preview img {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
  border: 1px solid #ccc;
  padding: 4px;
  border-radius: 4px;
}
</style>