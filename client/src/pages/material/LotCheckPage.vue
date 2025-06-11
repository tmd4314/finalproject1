<template>
  <div class="material-inquiry-page">
    <h2>자재 입고 조회</h2>

    <div class="search-area">
      <select v-model="filters.material_code">
        <option value="">자재코드</option>
        <option v-for="code in uniqueCodes('material_code')" :key="code">{{ code }}</option>
      </select>

      <select v-model="filters.material_name">
        <option value="">자재명</option>
        <option v-for="name in uniqueCodes('material_name')" :key="name">{{ name }}</option>
      </select>

      <select v-model="filters.received_date">
        <option value="">입고일자</option>
        <option v-for="date in uniqueCodes('received_date')" :key="date">{{ date }}</option>
      </select>

      <select v-model="filters.material_unit">
        <option value="">단위</option>
        <option v-for="unit in uniqueCodes('material_unit')" :key="unit">{{ unit }}</option>
      </select>

      <select v-model="filters.material_cls">
        <option value="">분류</option>
        <option v-for="cat in uniqueCodes('material_cls')" :key="cat">{{ cat }}</option>
      </select>

      <button class="btn" @click="resetFilters">초기화</button>
    </div>

    <table class="material-table">
      <thead>
        <tr>
          <th style="min-width: 180px;">LOT번호</th>
          <th>자재코드</th>
          <th>자재명</th>
          <th>입고 수량</th>
          <th>단위</th>
          <th>분류</th>
          <th>입고일자</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in filteredList" :key="item.lot_number">
          <td>{{ item.lot_number }}</td>
          <td>{{ item.material_code }}</td>
          <td>{{ item.material_name }}</td>
          <td>{{ item.quantity }}</td>
          <td>{{ item.material_unit }}</td>
          <td>{{ item.material_cls }}</td>
          <td>{{ item.received_date }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref, computed, onMounted } from 'vue'

interface MaterialLot {
  lot_number: string
  material_code: string
  material_name: string
  quantity: number
  material_unit: string
  material_cls: string
  received_date: string
}

const lotList = ref<MaterialLot[]>([])
const filters = ref({
  material_code: '',
  material_name: '',
  received_date: '',
  material_unit: '',
  material_cls: ''
})

const uniqueCodes = (key: keyof MaterialLot): string[] => {
  return [...new Set(lotList.value.map(item => String(item[key])))]
}

const filteredList = computed(() => {
  return lotList.value.filter(item =>
    (!filters.value.material_code || item.material_code === filters.value.material_code) &&
    (!filters.value.material_name || item.material_name === filters.value.material_name) &&
    (!filters.value.received_date || item.received_date === filters.value.received_date) &&
    (!filters.value.material_unit || item.material_unit === filters.value.material_unit) &&
    (!filters.value.material_cls || item.material_cls === filters.value.material_cls)
  )
})

const resetFilters = () => {
  filters.value = {
    material_code: '',
    material_name: '',
    received_date: '',
    material_unit: '',
    material_cls: ''
  }
}

const fetchMaterialsLot = async () => {
  try {
    const res = await axios.get('/materialLotList')
    lotList.value = res.data
    console.log(res.data);
  } catch (err) {
    console.log('❌ 발주 목록 조회 실패:', err);
  }
}

onMounted(() =>{
  fetchMaterialsLot()
})
</script>

<style scoped>
.material-inquiry-page {
  padding: 24px;
  font-family: 'Pretendard', sans-serif;
  background-color: #fff;
}
h2 {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
}
.btn{
  padding: 6px 12px;
  background-color: #575a5f;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.search-area {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.search-area select, .search-area button {
  padding: 6px 10px;
  font-size: 14px;
}
.material-table {
  width: 100%;
  border-collapse: collapse;
}
.material-table th, .material-table td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: center;
}
.material-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}
</style>
