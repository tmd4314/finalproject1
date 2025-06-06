<template>
  <div class="order-page-container">
    <!-- 좌측: 주문 목록 + 검색 -->
    <div class="order-list-panel">
      <h1 class="page-title">주문 조회</h1>
      <div class="order-search-bar">
        <va-input v-model="search" placeholder="주문번호, 거래처명 검색..." />
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
            <va-chip size="small" :color="getStatusColor(selectedOrder.status)" class="ml-2">
              {{ selectedOrder.status }}
            </va-chip>
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

interface OrderItem {
  name: string
  spec: string
  code: string
  total: string
  stock: string
}

interface Order {
  id: number
  customer: string
  phone: string
  manager: string
  address: string
  date: string
  dueDate: string
  status: string
  writer: string
  items: OrderItem[]
}

const search = ref('')
const orders = ref<Order[]>([])
const selectedOrder = ref<Order | null>(null)

// 주문 목록 테이블 컬럼
const columns = [
  { key: 'id', label: '주문번호' },
  { key: 'customer', label: '거래처명' },
  { key: 'date', label: '주문일' },
  { key: 'status', label: '상태' }
]

// 주문 품목 테이블 컬럼
const itemColumns = [
  { key: 'name', label: '제품명' },
  { key: 'spec', label: '규격' },
  { key: 'code', label: '제품코드' },
  { key: 'total', label: '출고 필요량' },
  { key: 'stock', label: '현재 재고' }
]

// 페이지 진입 시 주문 목록 불러오기
onMounted(async () => {
  try {
    const res = await axios.get('/api/orders')
    console.log('res.data 내용 확인: ', res.data)
    orders.value = res.data.map((o: any) => ({
      id: o.order_id,
      customer: o.account_name,
      date: o.order_date,
      status: o.status
    }))
    if (orders.value.length > 0) {
      await selectOrder(orders.value[0])
    }
  } catch (err) {
    console.error('주문 목록 불러오기 실패:', err);
  }
})

// 주문 선택 → 상세정보 및 품목 불러오기
async function selectOrder(orderRow: any) {
  try {
    const res = await axios.get(`/api/orders/${orderRow.id}/details`)
    const { order, items } = res.data
    selectedOrder.value = {
      id: order.order_id,
      customer: order.account_name,
      phone: order.phone,
      manager: order.charger_name,
      address: order.address,
      date: order.order_date,
      dueDate: order.delivery_date,
      status: order.status,
      writer: order.created_by,
      items: items.map((item: any) => ({
        name: item.product_name,
        spec: item.spec,
        code: item.product_code,
        total: item.order_qty,
        stock: item.stock
      }))
    }
  } catch (err) {
    console.error('상세 정보 불러오기 실패:', err)
  }
}

// 검색 기능
function onSearch() {
  if (filteredOrders.value.length > 0) {
    selectOrder(filteredOrders.value[0])
  } else {
    selectedOrder.value = null
  }
}

const filteredOrders = computed(() =>
  orders.value.filter(o =>
    o.id.toString().includes(search.value) ||
    o.customer.includes(search.value)
  )
)

// 상태에 따라 칩 색상 지정
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
