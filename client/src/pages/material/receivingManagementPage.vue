<template>
  <div class="material-receipt-page">
    <!-- 발주 리스트 영역 (수령 전용) -->
    <h2>발주 리스트</h2>
    <div class="plan-table-wrapper">
      <table class="plan-table">
        <thead>
          <tr>
            <th>발주코드</th>
            <th>자재코드</th>
            <th>자재명</th>
            <th>단위</th>
            <th>발주 수량</th>
            <th>발주일</th>
            <th>수령</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in orderCheckList" :key="index">
            <td>{{ item.purchase_order_id }}</td>
            <td>{{ item.material_code }}</td>
            <td>{{ item.material_name }}</td>
            <td>{{ item.material_unit }}</td>
            <td>{{ item.purchase_order_quantity }}</td>
            <td>{{ item.purchase_order_date }}</td>
            <td><button @click="handleReceive(item)" class="btn">수령</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 자재 입고 등록 영역 -->
    <h2>자재 입고 등록</h2>
    <table class="material-table">
      <thead>
        <tr>
          <th>발주코드</th>
          <th>자재코드</th>
          <th>자재명</th>
          <th>입고 수량</th>
          <th>단위</th>
          <th>유통기한</th>
          <th>LOT번호</th>
          <th>입고</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in materialOrderList" :key="index">
          <td>{{ item.purchase_order_id }}</td>
          <td>{{ item.material_code }}</td>
          <td>{{ item.material_name }}</td>
          <td>{{ item.purchase_order_quantity }}</td>
          <td>{{ item.material_unit }}</td>
          <td><input type="date" v-model="item.expiry_date" /></td>
          <td><input type="text" v-model="item.lot_number" placeholder="예: TEMP-LOT001" /></td>
          <td><button @click="saveMaterialLot(item)" class="btn">입고</button></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios'
import { ref, onMounted } from 'vue'

interface MaterialReceipt {
  purchase_order_id: string
  material_code: string
  material_name: string
  purchase_order_quantity: number
  material_unit: string
  mat_qual_test_status: string
  lot_number: string
  expiry_date: string
  purchase_order_date: string
}

const materialOrderList = ref<MaterialReceipt[]>([])
const orderCheckList = ref<MaterialReceipt[]>([])

const fetchMaterialsOrder = async () => {
  try {
    const res = await axios.get('/materialLot')
    materialOrderList.value = res.data
    console.log(res.data);
  } catch (err) {
    console.log('❌ 발주 목록 조회 실패:', err);
  }
}

const fetchOrder = async () => {
  try {
    const res = await axios.get('/orderCheck')
    orderCheckList.value = res.data
    console.log(res.data);
  } catch (err) {
    console.log('❌ 발주 목록 조회 실패:', err);
  }
}

const saveMaterialLot = async (item: MaterialReceipt): Promise<void> => {

  const payload = {
    lot_number: item.lot_number,
    material_code: item.material_code,
    expiry_date: item.expiry_date,
    quantity: item.purchase_order_quantity,
    purchase_order_id: item.purchase_order_id
  }
  
  console.log('입고 데이터:', payload);

  try {
    const res = await axios.post(`/materialLot`, payload);
    const res2 = await axios.put(`/materialLot/${payload.purchase_order_id}`);
    console.log(res.data.isSuccessed);
    console.log(res2.data.isUpdated);
    if (res.data.isSuccessed && res2.data.isUpdated) {
      alert('LOT 등록 완료!')
      await fetchMaterialsOrder()
    } else {
      alert('등록 실패')
    }
  } catch(err){
    console.error('등록 실패:', err)
    alert('서버 오류 발생!')
  }
 
}

const handleReceive = (item: MaterialReceipt) => {
  alert(`${item.material_name} (${item.material_code}) 수령 완료`)
  // 수령된 항목은 리스트에서 제거하고 싶다면 아래 코드 사용
  // receiveOrderList.value = receiveOrderList.value.filter(el => el.purchase_order_id !== item.purchase_order_id)
}
onMounted(() =>{
  fetchMaterialsOrder()
  fetchOrder()
})
</script>

<style scoped>
.material-receipt-page {
  padding: 24px;
  background-color: #fff;
  font-family: 'Pretendard', sans-serif;
}

.plan-table-wrapper {
  margin-bottom: 30px;
  background-color: #f9f9f9;
  padding: 16px;
  border-radius: 12px;
}

.plan-table,
.material-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.plan-table th,
.plan-table td,
.material-table th,
.material-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: center;
  font-size: 14px;
}

.plan-table th,
.material-table th {
  background-color: #f0f0f0;
  font-weight: bold;
}

.btn {
  padding: 6px 12px;
  background-color: #2f80ed;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
