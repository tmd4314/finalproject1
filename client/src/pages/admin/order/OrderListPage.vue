<template>
  <div class="order-page-container">
    <!-- 좌측: 주문 목록 + 검색 -->
    <div class="order-list-panel">
      <h1 class="page-title">주문 조회</h1>
      <div class="order-search-bar">
        <va-input v-model="search" placeholder="주문번호, 제품명, 거래처명 검색..." />
        <va-button @click="onSearch">조회</va-button>
      </div>
      <va-data-table
        :items="filteredOrders"
        :columns="columns"
        @row-click="selectOrder"
        class="order-table"
        :striped="true"
        style="min-width: 480px"
      >
        <template #cell-status="slotProps">
          <va-chip :color="getStatusColor(slotProps.row.status)">
            {{ slotProps.row.status }}
          </va-chip>
        </template>
      </va-data-table>
    </div>

    <!-- 우측: 주문 상세 정보 -->
    <div class="order-detail-panel" v-if="selectedOrder">
      <h2 class="detail-title">주문 상세 조회</h2>
      <div class="order-detail-section">
        <h4>[주문 기본 정보]</h4>
        <div class="order-detail-info">
          <div>
            <b>주문번호:</b> {{ selectedOrder.id }}
            <va-chip size="small" :color="getStatusColor(selectedOrder.status)" class="ml-2">{{ selectedOrder.status }}</va-chip>
          </div>
          <div><b>거래처:</b> {{ selectedOrder.customer }}</div>
          <div><b>연락처:</b> {{ selectedOrder.phone }}</div>
          <div><b>담당자:</b> {{ selectedOrder.manager }}</div>
          <div><b>주소:</b> {{ selectedOrder.address }}</div>
          <div><b>주문일:</b> {{ selectedOrder.date }}</div>
          <div><b>납기일:</b> {{ selectedOrder.dueDate }}</div>
          <div><b>작성자:</b> {{ selectedOrder.writer }}</div>
        </div>
      </div>
      <div class="order-detail-section">
        <h4>[주문 품목 정보]</h4>
        <va-data-table
          :items="selectedOrder.items"
          :columns="itemColumns"
          class="item-table"
          :striped="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'


const search = ref('')
const orders = ref([
  {
    id: 10001,
    customer: '셀트리온',
    date: '2025-01-01',
    status: '진행중',
    phone: '032-850-5000',
    manager: '홍길동',
    address: '인천광역시 연수구 아카데미로 23',
    dueDate: '2025-06-07',
    writer: '김홍인',
    items: [
      { name: '베아제정', spec: '10정', code: 'BJA-STD-10', total: '300 BOX', stock: '2000 BOX'},
      { name: '타이레놀 500mg', spec: '10정', code: 'TN-500-10', total: '200 BOX', stock: '1000 BOX'},
      { name: '이브정', spec: '30정', code: 'EG6-EVE-30', total: '100 BOX', stock: '800 BOX'},
      { name: '훼스탈플러스정', spec: '10정', code: 'FST-PLUS-10', total: '500 BOX', stock: '300 BOX'}
    ]
  },
  // ... (다른 더미 주문 데이터 추가)
])
const columns = [
  { key: 'id', label: '주문번호' },
  { key: 'customer', label: '거래처명' },
  { key: 'date', label: '주문일' },
  { key: 'status', label: '상태' }
]
const itemColumns = [
  { key: 'name', label: '제품명' },
  { key: 'spec', label: '규격' },
  { key: 'code', label: '제품코드' },
  { key: 'total', label: '출고 필요량' },
  { key: 'stock', label: '현재 재고' }
]

const selectedOrder = ref(orders.value[0] || null)

function selectOrder(row: any) {
  selectedOrder.value = row
}

function onSearch() {
  // 간단한 검색 기능
  selectedOrder.value = filteredOrders.value[0] || null
}
const filteredOrders = computed(() =>
  orders.value.filter(o =>
    o.id.toString().includes(search.value)
    || o.customer.includes(search.value)
  )
)

function getStatusColor(status: string) {
  switch (status) {
    case '진행중': return 'info'
    case '완료': return 'success'
    case '지연': return 'danger'
    case '대기': return 'warning'
    case '취소': return 'secondary'
    case '확정': return 'primary'
    default: return 'secondary'
  }
}
</script>

<style scoped>

.order-page-container {
  display: flex;
  gap: 32px;
  margin: 32px;
}
.order-list-panel {
  flex: 1.2;
  min-width: 480px;
  max-width: 520px;
}
.order-detail-panel {
  flex: 1.6;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 16px #0001;
  padding: 32px;
  min-width: 480px;
}
.order-search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.order-detail-section + .order-detail-section {
  margin-top: 32px;
}
.order-detail-info > div {
  margin-bottom: 4px;
}
.detail-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 20px;
}
</style>
