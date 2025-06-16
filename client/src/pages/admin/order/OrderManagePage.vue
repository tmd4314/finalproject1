<template>
  <div class="order-management">
    <h1>주문 관리</h1>
    
    <!-- 검색 영역 -->
    <div class="search-area">
      <va-input 
        v-model="searchText" 
        placeholder="주문번호, 거래처명 검색"
        style="width: 300px"
      />
      <va-button @click="handleSearch">검색</va-button>
    </div>

    <!-- 주문 목록 테이블 -->
    <div class="table-section">
      <table class="order-table">
        <thead>
          <tr>
            <th>주문번호</th>
            <th>거래처명</th>
            <th>주문일</th>
            <th>납기일</th>
            <th>제품명</th>
            <th>규격</th>
            <th>수량</th>
            <th>제품코드</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="orders.length === 0">
            <td colspan="8" class="no-data">데이터가 없습니다.</td>
          </tr>
          <tr v-for="order in filteredOrders" :key="order.order_id">
            <td>{{ order.order_id }}</td>
            <td>{{ order.account_name }}</td>
            <td>{{ formatDate(order.order_date) }}</td>
            <td>{{ formatDate(order.delivery_date) }}</td>
            <td>{{ order.product_name }}</td>
            <td>{{ order.product_stand }}</td>
            <td>{{ order.order_qty }}</td>
            <td>{{ order.product_code }}</td>
            <td>
              <va-chip :color="getStatusColor(order.status)" size="small">
                {{ order.status }}
              </va-chip>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 주문 등록/수정 폼 -->
    <div class="form-section">
      <h2>{{ editMode ? '주문 수정' : '주문 등록' }}</h2>
      
      <!-- 기본 정보 -->
      <div class="form-row">

      <div class="form-group" style="width: 240px;">
        <label>거래처 <span class="required">*</span></label>
        <va-select
          v-model="form.customerId"
          :options="customerOptions"
          placeholder="거래처를 선택하세요"
          style="width: 240px"
        />
      </div>

        <div class="form-group">
          <label>주문일 <span class="required">*</span></label>
          <va-date-input v-model="form.orderDate" />
        </div>
        <div class="form-group">
          <label>납기일 <span class="required">*</span></label>
          <va-date-input v-model="form.deliveryDate" />
        </div>
      

        <div class="form-group">
          <label>작성자</label> 
          <va-input v-model="form.createdBy" placeholder="작성자명" style="width: 250px;"/>
        </div>
      </div>
      <!-- 제품 정보 -->
      <div class="products-section">
        <div class="section-header">
          <h3>제품 정보</h3>
          <va-button size="small" @click="addProduct">제품 추가</va-button>
        </div>
        
        <table class="product-table">
          <thead>
            <tr>
              <th style="width: 186px;">제품명</th>
              <th style="width: 120px;">규격 (정)</th>
              <th>수량 (box)</th>
              <th>제품코드</th>
              <th>단가 (원)</th>
              <th>주문가격 (원)</th>
              <th style="width: 50px; text-align: center;">삭제</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in form.products" :key="index">
              <!-- 제품명 -->
              <td>
                <va-select
                  v-model="item.productName"
                  :options="uniqueProductName"
                  placeholder="제품 선택"
                  @update:model-value="(val) => updateProduct(val, index)"
                />
              </td>
              <!-- 규격 -->
              <td>
                <va-select
                  v-model="item.productStand"
                  :options="getProductStandOptions(item.productName)"
                  placeholder="규격 선택"
                  @update:model-value="(val) => updateProductByProductStand(item.productName, val, index)"
                  :disabled="!item.productName"
                />
              </td>
              <!-- 수량 -->
              <td>
                <va-input 
                  v-model.number="item.quantity" 
                  type="number"
                  min="1"
                  @input="onQuantityInput(index)"
                />
              </td>

              <td>{{ item.productCode }}</td>
              <!-- 단가 -->
              <td>
                  {{ item.unitPrice }}
              </td>
              <!-- 주문가격 -->
              <td>
                {{ computedOrderPrices[index] }}
              </td>
              <td style="text-align: center;">
                <va-button 
                  icon="delete" 
                  preset="plain" 
                  size="medium"
                  color="danger"
                  @click="removeProduct(index)"
                />
              </td>
              
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 버튼 -->
      <div class="form-actions">
        <va-button preset="secondary" @click="cancelForm">취소</va-button>
        <va-button @click="saveOrder">{{ editMode ? '수정' : '저장' }}</va-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// 데이터
const orders = ref<any[]>([])
const customers = ref<any[]>([])
const products = ref<any[]>([])

// 상태
const searchText = ref('')
const showForm = ref(false)
const editMode = ref(false)
const selectedOrderId = ref<string | null>(null)

// 폼 데이터
const form = ref({
  customerId: '',
  orderDate: new Date(),
  deliveryDate: new Date(),
  createdBy: '',

  products: [
    { 
      productCode: '', 
      productName: '', 
      productStand: '', 
      quantity: 1,
      unitPrice: 0
    }
  ]
})

// computed
const filteredOrders = computed(() => {
  if (!searchText.value) return orders.value
  
  const search = searchText.value.toLowerCase()
  return orders.value.filter(order => 
    order.order_id.toLowerCase().includes(search) ||
    order.account_name.toLowerCase().includes(search)
  )
})

const customerOptions = computed(() => 
  customers.value.map(c => ({
    value: c.account_id,
    text: c.account_name
  }))
)

// const productOptions = computed(() =>
//   products.value.map(p => ({
//     value: p.product_id,
//     text: p.product_name
//   }))
// )

const uniqueProductName = computed(() => {
// 제품명 중복제거
  const uniqueNames = [...new Set(products.value.map(p => p.product_name))]
  return uniqueNames
})

// 제품 규격 선택
function getProductStandOptions(productName: string) {
  console.log('getProductStandOptions 실행!')
  console.log('입력된 productName: ', productName)
  console.log('productName 타입: ', typeof productName)
  if (!productName) {
    console.log('제품명이 비어있음') 
    return []
  }
  
  return products.value
    .filter(p => p.product_name === productName)
    .map(p => (p.product_stand))
}

// 수량 마이너스 선택 못하게!
function onQuantityInput(index: number) {
  const q = form.value.products[index].quantity
  if(q<1 || isNaN(q)) {
    form.value.products[index].quantity = 1
  }
}



// 주문 가격 computed!!!!
const computedOrderPrices = computed(() => {
  return form.value.products.map(item => item.unitPrice * item.quantity)
})


// 초기 데이터 로드
onMounted(() => {
  console.log('컴포넌트 마운트됨')
  fetchOrders()
  fetchCustomers()
  fetchProducts()
})

// API 함수들
async function fetchOrders() {
  try {
    const response = await axios.get('http://localhost:3000/api/orders/with-items')
    console.log('주문 데이터:', response.data)
    orders.value = response.data || []
  } catch (error) {
    console.error('주문 조회 실패:', error)
    // Mock 데이터
    orders.value = [
      {
        order_id: 'ORD001',
        account_name: '셀트리온',
        order_date: '2024-01-15',
        delivery_date: '2024-01-20',
        product_name: '타이레놀 500mg',
        order_qty: 100,
        status: '진행중'
      },
      {
        order_id: 'ORD002',
        account_name: '한미약품',
        order_date: '2024-01-16',
        delivery_date: '2024-01-22',
        product_name: '아스피린 100mg',
        order_qty: 200,
        status: '완료'
      }
    ]
  }
}

async function fetchCustomers() {
  try {
    const response = await axios.get('http://localhost:3000/account')
    console.log('거래처 데이터:', response.data)
    customers.value = response.data || []
  } catch (error) {
    console.error('거래처 조회 실패:', error)
  }
}

async function fetchProducts() {
  try {
    const response = await axios.get('http://localhost:3000/product')
    console.log('제품 데이터:', response.data)
    products.value = response.data || []
  } catch (error) {
    console.error('제품 조회 실패:', error)
  }
}



// 검색
function handleSearch() {
  // filteredOrders computed가 자동으로 처리
}

// 주문 수정
async function editOrder(order: any) {
  console.log('주문 수정:', order)
  showForm.value = true
  editMode.value = true
  selectedOrderId.value = order.order_id
  
  try {
    const response = await axios.get(`http://localhost:3000/api/orders/${order.order_id}/details`)
    const { order: orderInfo, items } = response.data
    
    // 거래처 ID 찾기
    const customer = customers.value.find(c => c.account_name === order.account_name)
    
    form.value = {
      customerId: customer?.account_id || '',
      orderDate: new Date(orderInfo.order_date),
      deliveryDate: new Date(orderInfo.delivery_date),
      createdBy: orderInfo.created_by || '',
      products: items.map((item: any) => ({
        productName: item.product_name,
        productStand: item.productStand,
        quantity: item.order_qty,
        productCode: item.product_code
      }))
    }
  } catch (error) {
    console.error('주문 상세 조회 실패:', error)
  }
}

// 주문 삭제
async function deleteOrder(order: any) {
  if (!confirm('정말 삭제하시겠습니까?')) return
  
  try {
    await axios.delete(`http://localhost:3000/api/orders/${order.order_id}`)
    alert('삭제되었습니다.')
    fetchOrders()
  } catch (error) {
    console.error('삭제 실패:', error)
    alert('삭제에 실패했습니다.')
  }
}

// 제품 추가/삭제
function addProduct() {
  form.value.products.push({
    productName: '',
    productStand: '',
    quantity: 1,
    productCode: '',
    unitPrice: 0
  })
}

function removeProduct(index: number) {
  if (form.value.products.length > 1) {
    form.value.products.splice(index, 1)
  }
}

// 제품 선택 시 정보 업데이트
function updateProduct(productName: string, index: number) {
  const product = products.value.find(p => p.product_name == productName)
  if (product) {
    

    form.value.products[index] = {
      productCode: '',
      productName: product.product_name,
      productStand: '',
      quantity: 1,
      unitPrice: 0
    }
  }
}
// 제품명, 규격 선택 시 나머지 데이터 자동입력
function updateProductByProductStand(productName: string, productStand: string, index: number){
  console.log('규격 업데이트 됨!!!!!!!!!!!!')
  const product = products.value.find(
    p => p.product_name === productName && p.product_stand === productStand
  )
  if (product){
    const quantity = form.value.products[index].quantity
    const unitPrice = product.product_pay
    const orderPrice = unitPrice * quantity

    form.value.products[index] = {
    productCode: product.product_code,
    productName: product.product_name,
    productStand: product.product_stand,
    quantity: form.value.products[index].quantity || 1,
    unitPrice: unitPrice
   }
  }
  console.log(productStand)
}

// 폼 초기화
function resetForm() {
  form.value = {
    customerId: '',
    orderDate: new Date(),
    deliveryDate: new Date(),
    createdBy: '',
    products: [
      { productName: '', 
      productStand: '', 
      quantity: 1, 
      productCode: '',
      unitPrice:0 }
    ]
  }
}

// 저장
async function saveOrder() {
  // 유효성 검사
  if (!form.value.customerId) {
    alert('거래처를 선택하세요.')
    return
  }
  
  if (form.value.products.some(p => !p.productCode)) {
    alert('제품 정보를 모두 입력하세요.')
    return
  }
  
  
    const orderData = {
      customerId: form.value.customerId,
      orderDate: form.value.orderDate,
      deliveryDate: form.value.deliveryDate,
      createdBy: form.value.createdBy || '관리자',
      products: form.value.products.map((p, index) => ({
        productCode: p.productCode,
        quantity: p.quantity,
        orderPrice: computedOrderPrices.value[index]
      }))
    }
    
    console.log('저장할 데이터:', orderData)
    try {
    if (editMode.value) {
      // 수정모드
      await axios.put(`http://localhost:3000/api/orders/${selectedOrderId.value}`, orderData)
      alert('수정되었습니다.')
      // 등록모드
    } else {
      await axios.post('http://localhost:3000/api/orders', orderData)
      alert('등록되었습니다.')
    }
    
    showForm.value = false
    fetchOrders()
  } catch (error) {
    console.error('저장 실패:', error)
    alert('저장에 실패했습니다.')
  }
}

// 취소
function cancelForm() {
  showForm.value = false
  resetForm()
}

// 날짜 포맷
function formatDate(dateString: string) {
  if (!dateString) return '-'
  return dateString.split('T')[0]
}

// 상태별 색상
function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    '진행중': 'info',
    '완료': 'success',
    '지연': 'danger',
    '대기': 'warning',
    '취소': 'secondary'
  }
  return colors[status] || 'secondary'
}
</script>

<style scoped>
.order-management {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 20px;
}

/* 검색 영역 */
.search-area {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
}

/* 테이블 섹션 */
.table-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow-x: auto;
}

.order-table {
  width: 100%;
  border-collapse: collapse;
}

.order-table th {
  background: #f5f5f5;
  padding: 12px;
  text-align: left;
  font-weight: 500;
  border-bottom: 2px solid #e0e0e0;
}

.order-table td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.order-table tr:hover {
  background: #f8f8f8;
}

.no-data {
  text-align: center;
  color: #999;
}

/* 폼 섹션 */
.form-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  max-width: 1200px;
  margin: 0 auto;
}

.form-section h2 {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 16px;
}

.required {
  color: red;
}

/* 제품 섹션 */
.products-section {
  margin: 20px 0;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
}

.product-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.product-table th {
  background: #f5f5f5;
  padding: 8px;
  text-align: left;
  font-weight: 500;
  border: 1px solid #e0e0e0;
}

.product-table td {
  padding: 8px;
  border: 1px solid #e0e0e0;
}

/* 버튼 영역 */
.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* 반응형 */
@media (max-width: 1420px) {
  .form-row {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .search-area {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 1180px) {
  .form-row {
    grid-template-columns: 1fr 1fr;
  }

  .search-area {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .search-area {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>