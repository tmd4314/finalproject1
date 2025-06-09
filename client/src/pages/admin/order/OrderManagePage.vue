<template>
  <div class="order-management-container">
    <h1 class="page-title">주문 관리</h1>
    
    <!-- 상단: 주문 목록 -->
    <div class="order-list-section">
      <!-- 검색 및 필터 영역 -->
      <div class="search-filter-area">
        <div class="search-bar">
          <va-input 
            v-model="searchText" 
            placeholder="주문번호 또는 거래처명 검색..."
            class="search-input"
          >
            <template #prepend>
              <va-icon name="search" />
            </template>
          </va-input>
          <va-button @click="handleSearch">조회</va-button>
        </div>
        
        <!-- 필터 드롭다운들 -->
        <div class="filter-row">
          <div class="filter-item">
            <label>주문번호</label>
            <va-select
              v-model="filters.orderId"
              :options="orderIdOptions"
              placeholder="전체"
              clearable
            />
          </div>
          <div class="filter-item">
            <label>거래처명</label>
            <va-select
              v-model="filters.customer"
              :options="customerOptions"
              placeholder="전체"
              clearable
            />
          </div>
          <div class="filter-item">
            <label>주문일</label>
            <va-date-input
              v-model="filters.orderDate"
              placeholder="날짜 선택"
              clearable
            />
          </div>
          <div class="filter-item">
            <label>납기일</label>
            <va-date-input
              v-model="filters.deliveryDate"
              placeholder="날짜 선택"
              clearable
            />
          </div>
          <div class="filter-item">
            <label>제품명</label>
            <va-select
              v-model="filters.product"
              :options="productOptions"
              placeholder="전체"
              clearable
            />
          </div>
          <div class="filter-item">
            <label>규격</label>
            <va-select
              v-model="filters.spec"
              :options="specOptions"
              placeholder="전체"
              clearable
            />
          </div>
          <div class="filter-item">
            <label>제품코드</label>
            <va-select
              v-model="filters.productCode"
              :options="productCodeOptions"
              placeholder="전체"
              clearable
            />
          </div>
          <div class="filter-item">
            <label>상태</label>
            <va-select
              v-model="filters.status"
              :options="statusOptions"
              placeholder="전체"
              clearable
            />
          </div>
        </div>
      </div>

      <!-- 주문 목록 테이블 -->
      <div class="order-table-container">
        <table class="order-table">
          <thead>
            <tr>
              <th width="40">
                <va-checkbox v-model="selectAll" @update:model-value="handleSelectAll" />
              </th>
              <th>주문번호</th>
              <th>거래처명</th>
              <th>주문일</th>
              <th>납기일</th>
              <th>제품명</th>
              <th>규격</th>
              <th>주문량</th>
              <th>제품코드</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            <!-- 각 주문별로 그룹핑 -->
            <template v-for="orderGroup in paginatedOrders" :key="orderGroup.orderId">
              <!-- 첫 번째 제품 행 (클릭 시 펼치기/접기) -->
              <tr 
                @click="toggleOrder(orderGroup.orderId)"
                :class="{ 'selected': selectedOrder?.order_id === orderGroup.orderId }"
                class="main-row"
              >
                <td @click.stop>
                  <va-checkbox v-model="selectedIds" :array-value="orderGroup.orderId" />
                </td>
                <td>{{ orderGroup.orderId }}</td>
                <td>{{ orderGroup.customerName }}</td>
                <td>{{ formatDate(orderGroup.orderDate) }}</td>
                <td>{{ formatDate(orderGroup.deliveryDate) }}</td>
                <td>{{ orderGroup.items[0].productName }}</td>
                <td>{{ orderGroup.items[0].spec }}</td>
                <td>{{ orderGroup.items[0].quantity }}</td>
                <td>{{ orderGroup.items[0].productCode }}</td>
                <td>
                  <va-chip :color="getStatusColor(orderGroup.status)" size="small">
                    {{ orderGroup.status }}
                  </va-chip>
                </td>
              </tr>
              
              <!-- 추가 제품들 (펼쳤을 때만 표시) -->
              <tr 
                v-for="(item, index) in orderGroup.items.slice(1)" 
                :key="`${orderGroup.orderId}-${index}`"
                v-show="expandedOrders.includes(orderGroup.orderId)"
                class="sub-row"
              >
                <td colspan="5"></td>
                <td>{{ item.productName }}</td>
                <td>{{ item.spec }}</td>
                <td>{{ item.quantity }}</td>
                <td>{{ item.productCode }}</td>
                <td></td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- 페이지네이션 -->
      <div class="pagination-area">
        <div class="page-info">
          {{ startIndex + 1 }}-{{ Math.min(currentPage * itemsPerPage, groupedOrders.length) }} of {{ groupedOrders.length }}
        </div>
        <div class="page-controls">
          <span>Rows per page: </span>
          <va-select
            v-model="itemsPerPage"
            :options="[10, 20, 50]"
            class="rows-select"
          />
          <va-pagination
            v-model="currentPage"
            :pages="totalPages"
            :visible-pages="5"
            buttons-preset="secondary"
            rounded
            gapped
            border-color="primary"
            class="ml-3"
          />
        </div>
      </div>
    </div>

    <!-- 하단: 주문 등록/수정 폼 -->
    <div class="order-form-section">
      <div class="form-header">
        <h2>{{ selectedOrder ? '주문 수정' : '주문 등록' }}</h2>
        <div class="form-info">
          <span v-if="selectedOrder">주문번호: {{ selectedOrder.order_id }}</span>
        </div>
      </div>

      <div class="form-content">
        <!-- 기본 정보 -->
        <div class="form-row">
          <div class="form-group">
            <label>거래처 <span class="required">*</span></label>
            <va-select
              v-model="form.customerId"
              :options="customerSelectOptions"
              placeholder="거래처를 선택하세요"
              text-by="label"
              value-by="value"
            />
          </div>
          <div class="form-group">
            <label>주문일 <span class="required">*</span></label>
            <va-date-input
              v-model="form.orderDate"
              placeholder="주문일 선택"
            />
          </div>
          <div class="form-group">
            <label>납기일 <span class="required">*</span></label>
            <va-date-input
              v-model="form.deliveryDate"
              placeholder="납기일 선택"
            />
          </div>
          <div class="form-group">
            <label>작성자</label>
            <va-input
              v-model="form.createdBy"
              placeholder="작성자명"
            />
          </div>
        </div>

        <!-- 제품 정보 -->
        <div class="products-section">
          <div class="section-header">
            <h3>제품 정보</h3>
            <va-button 
              preset="secondary" 
              size="small" 
              icon="add"
              @click="addProduct"
            >
              제품 추가
            </va-button>
          </div>

          <div class="products-table">
            <table>
              <thead>
                <tr>
                  <th>제품명 <span class="required">*</span></th>
                  <th>규격</th>
                  <th>출하 필요량 <span class="required">*</span></th>
                  <th>제품코드</th>
                  <th width="60">삭제</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(product, index) in form.products" :key="index">
                  <td>
                    <va-select
                      v-model="product.productId"
                      :options="productSelectOptions"
                      placeholder="제품 선택"
                      text-by="label"
                      value-by="value"
                      @update:model-value="(value) => onProductSelect(value, index)"
                    />
                  </td>
                  <td>
                    <va-input
                      v-model="product.spec"
                      placeholder="규격"
                      disabled
                    />
                  </td>
                  <td>
                    <va-input
                      v-model.number="product.quantity"
                      type="number"
                      placeholder="수량"
                      min="1"
                    />
                  </td>
                  <td>
                    <va-input
                      v-model="product.productCode"
                      placeholder="제품코드"
                      disabled
                    />
                  </td>
                  <td>
                    <va-button
                      preset="plain"
                      color="danger"
                      icon="delete"
                      size="small"
                      @click="removeProduct(index)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 비고 -->
        <div class="form-row">
          <div class="form-group full-width">
            <label>비고</label>
            <va-textarea
              v-model="form.remarks"
              placeholder="비고사항을 입력하세요"
              :min-rows="2"
              :max-rows="4"
            />
          </div>
        </div>

        <!-- 버튼 영역 -->
        <div class="form-actions">
          <va-button preset="secondary" @click="resetForm">초기화</va-button>
          <va-button @click="saveOrder">
            {{ selectedOrder ? '수정' : '저장' }}
          </va-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

// 타입 정의
interface OrderItem {
  productId: string
  productName: string
  productCode: string
  spec: string
  quantity: number
}

interface OrderGroup {
  orderId: string
  customerName: string
  orderDate: string
  deliveryDate: string
  status: string
  items: OrderItem[]
}

interface Order {
  order_id: string
  account_name: string
  order_date: string
  delivery_date: string
  status: string
  created_by: string
}

interface Product {
  product_id: string
  product_name: string
  product_code: string
  spec: string
  stock: number
}

interface FormProduct {
  productId: string
  productName: string
  productCode: string
  spec: string
  quantity: number
}

// 상태 관리
const searchText = ref('')
const selectedIds = ref<string[]>([])
const selectAll = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(10)
const expandedOrders = ref<string[]>([])
const selectedOrder = ref<Order | null>(null)

// 전체 주문 데이터 (그룹화 전)
const allOrders = ref<any[]>([])
// 제품 목록
const products = ref<Product[]>([])
// 거래처 목록
const customers = ref<any[]>([])

// 필터 상태
const filters = ref({
  orderId: '',
  customer: '',
  orderDate: null,
  deliveryDate: null,
  product: '',
  spec: '',
  productCode: '',
  status: ''
})

// 폼 데이터
const form = ref({
  customerId: '',
  orderDate: new Date(),
  deliveryDate: new Date(),
  createdBy: '',
  products: [
    {
      productId: '',
      productName: '',
      productCode: '',
      spec: '',
      quantity: 1
    }
  ],
  remarks: ''
})

// 필터 옵션들
const orderIdOptions = ref<string[]>([])
const customerOptions = ref<string[]>([])
const productOptions = ref<string[]>([])
const specOptions = ref<string[]>([])
const productCodeOptions = ref<string[]>([])
const statusOptions = ref(['진행중', '완료', '지연', '대기', '취소'])

// 선택 옵션들 (value, label 형태)
const customerSelectOptions = computed(() => 
  customers.value.map(c => ({
    value: c.account_id,
    label: c.account_name
  }))
)

const productSelectOptions = computed(() =>
  products.value.map(p => ({
    value: p.product_id,
    label: p.product_name
  }))
)

// 주문 데이터를 그룹화 (주문번호별로)
const groupedOrders = computed(() => {
  const grouped: { [key: string]: OrderGroup } = {}
  
  allOrders.value.forEach(order => {
    if (!grouped[order.order_id]) {
      grouped[order.order_id] = {
        orderId: order.order_id,
        customerName: order.account_name,
        orderDate: order.order_date,
        deliveryDate: order.delivery_date,
        status: order.status,
        items: []
      }
    }
    
    grouped[order.order_id].items.push({
      productId: order.product_id,
      productName: order.product_name,
      productCode: order.product_code,
      spec: order.spec,
      quantity: order.order_qty
    })
  })
  
  // 필터링 적용
  return Object.values(grouped).filter(orderGroup => {
    const matchesSearch = !searchText.value || 
      orderGroup.orderId.includes(searchText.value) ||
      orderGroup.customerName.includes(searchText.value)
    
    const matchesFilters = 
      (!filters.value.orderId || orderGroup.orderId === filters.value.orderId) &&
      (!filters.value.customer || orderGroup.customerName === filters.value.customer) &&
      (!filters.value.status || orderGroup.status === filters.value.status)
    
    return matchesSearch && matchesFilters
  })
})

// 페이지네이션
const totalPages = computed(() => 
  Math.ceil(groupedOrders.value.length / itemsPerPage.value)
)

const startIndex = computed(() => 
  (currentPage.value - 1) * itemsPerPage.value
)

const paginatedOrders = computed(() => {
  const start = startIndex.value
  const end = start + itemsPerPage.value
  return groupedOrders.value.slice(start, end)
})

// 라이프사이클
onMounted(async () => {
  await fetchOrders()
  await fetchProducts()
  await fetchCustomers()
  setupFilterOptions()
})

// API 함수들
async function fetchOrders() {
  try {
    const response = await axios.get('/api/orders/with-items')
    allOrders.value = response.data
  } catch (error) {
    console.error('주문 목록 로드 실패:', error)
    // Mock 데이터
    allOrders.value = [
      {
        order_id: 'ORD001',
        account_name: '셀트리온',
        order_date: '2024-01-15',
        delivery_date: '2024-01-20',
        product_name: '타이레놀 500mg',
        spec: '500mg x 10정',
        order_qty: 100,
        product_code: 'TYL-500',
        status: '진행중'
      },
      {
        order_id: 'ORD001',
        account_name: '셀트리온',
        order_date: '2024-01-15',
        delivery_date: '2024-01-20',
        product_name: '아스피린 100mg',
        spec: '100mg x 30정',
        order_qty: 200,
        product_code: 'ASP-100',
        status: '진행중'
      },
      {
        order_id: 'ORD002',
        account_name: '한미약품',
        order_date: '2024-01-16',
        delivery_date: '2024-01-22',
        product_name: '이부프로펜 200mg',
        spec: '200mg x 20정',
        order_qty: 150,
        product_code: 'IBU-200',
        status: '완료'
      }
    ]
  }
}

async function fetchProducts() {
  try {
    const response = await axios.get('/api/products')
    products.value = response.data
  } catch (error) {
    console.error('제품 목록 로드 실패:', error)
    // Mock 데이터
    products.value = [
      { product_id: 'P001', product_name: '타이레놀 500mg', product_code: 'TYL-500', spec: '500mg x 10정', stock: 1000 },
      { product_id: 'P002', product_name: '아스피린 100mg', product_code: 'ASP-100', spec: '100mg x 30정', stock: 2000 },
      { product_id: 'P003', product_name: '이부프로펜 200mg', product_code: 'IBU-200', spec: '200mg x 20정', stock: 1500 }
    ]
  }
}

async function fetchCustomers() {
  try {
    const response = await axios.get('/api/customers')
    customers.value = response.data
  } catch (error) {
    console.error('거래처 목록 로드 실패:', error)
    // Mock 데이터
    customers.value = [
      { account_id: 'C001', account_name: '셀트리온' },
      { account_id: 'C002', account_name: '한미약품' },
      { account_id: 'C003', account_name: '종근당' }
    ]
  }
}

// 필터 옵션 설정
function setupFilterOptions() {
  // 중복 제거하여 옵션 생성
  orderIdOptions.value = [...new Set(allOrders.value.map(o => o.order_id))]
  customerOptions.value = [...new Set(allOrders.value.map(o => o.account_name))]
  productOptions.value = [...new Set(allOrders.value.map(o => o.product_name))]
  specOptions.value = [...new Set(allOrders.value.map(o => o.spec))]
  productCodeOptions.value = [...new Set(allOrders.value.map(o => o.product_code))]
}

// 메서드들
function handleSearch() {
  currentPage.value = 1
}

function handleSelectAll(value: boolean) {
  if (value) {
    selectedIds.value = paginatedOrders.value.map(order => order.orderId)
  } else {
    selectedIds.value = []
  }
}

function toggleOrder(orderId: string) {
  const index = expandedOrders.value.indexOf(orderId)
  if (index > -1) {
    expandedOrders.value.splice(index, 1)
  } else {
    expandedOrders.value.push(orderId)
  }
  
  // 주문 선택 및 폼 데이터 로드
  loadOrderForEdit(orderId)
}

async function loadOrderForEdit(orderId: string) {
  try {
    // 실제로는 API에서 상세 정보를 가져와야 함
    const orderData = groupedOrders.value.find(o => o.orderId === orderId)
    if (!orderData) return
    
    selectedOrder.value = {
      order_id: orderId,
      account_name: orderData.customerName,
      order_date: orderData.orderDate,
      delivery_date: orderData.deliveryDate,
      status: orderData.status,
      created_by: '김철수' // API에서 가져와야 함
    }
    
    // 폼에 데이터 채우기
    const customer = customers.value.find(c => c.account_name === orderData.customerName)
    form.value = {
      customerId: customer?.account_id || '',
      orderDate: new Date(orderData.orderDate),
      deliveryDate: new Date(orderData.deliveryDate),
      createdBy: selectedOrder.value.created_by,
      products: orderData.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        spec: item.spec,
        quantity: item.quantity
      })),
      remarks: ''
    }
  } catch (error) {
    console.error('주문 정보 로드 실패:', error)
  }
}

function addProduct() {
  form.value.products.push({
    productId: '',
    productName: '',
    productCode: '',
    spec: '',
    quantity: 1
  })
}

function removeProduct(index: number) {
  if (form.value.products.length > 1) {
    form.value.products.splice(index, 1)
  }
}

function onProductSelect(productId: string, index: number) {
  const product = products.value.find(p => p.product_id === productId)
  if (product) {
    form.value.products[index] = {
      productId: product.product_id,
      productName: product.product_name,
      productCode: product.product_code,
      spec: product.spec,
      quantity: form.value.products[index].quantity || 1
    }
  }
}

function resetForm() {
  selectedOrder.value = null
  form.value = {
    customerId: '',
    orderDate: new Date(),
    deliveryDate: new Date(),
    createdBy: '',
    products: [{
      productId: '',
      productName: '',
      productCode: '',
      spec: '',
      quantity: 1
    }],
    remarks: ''
  }
}

async function saveOrder() {
  try {
    // 유효성 검사
    if (!form.value.customerId) {
      alert('거래처를 선택해주세요.')
      return
    }
    
    if (form.value.products.some(p => !p.productId || !p.quantity)) {
      alert('제품 정보를 모두 입력해주세요.')
      return
    }
    
    const orderData = {
      customerId: form.value.customerId,
      orderDate: form.value.orderDate,
      deliveryDate: form.value.deliveryDate,
      createdBy: form.value.createdBy,
      products: form.value.products,
      remarks: form.value.remarks
    }
    
    if (selectedOrder.value) {
      // 수정
      await axios.put(`/api/orders/${selectedOrder.value.order_id}`, orderData)
      alert('주문이 수정되었습니다.')
    } else {
      // 신규 등록
      await axios.post('/api/orders', orderData)
      alert('주문이 등록되었습니다.')
    }
    
    // 목록 새로고침
    await fetchOrders()
    resetForm()
  } catch (error) {
    console.error('주문 저장 실패:', error)
    alert('주문 저장에 실패했습니다.')
  }
}

function formatDate(dateString: string) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR').replace(/\. /g, '-').replace(/\./g, '')
}

function getStatusColor(status: string) {
  const colorMap: Record<string, string> = {
    '진행중': 'info',
    '완료': 'success',
    '지연': 'danger',
    '대기': 'warning',
    '취소': 'secondary'
  }
  return colorMap[status] || 'secondary'
}

// 감시자
watch(filters, () => {
  currentPage.value = 1
}, { deep: true })
</script>

<style scoped>
/* 전체 컨테이너 */
.order-management-container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #333;
}

/* 상단 주문 목록 섹션 */
.order-list-section {
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* 검색 및 필터 */
.search-filter-area {
  margin-bottom: 20px;
}

.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  max-width: 400px;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-item label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

/* 테이블 */
.order-table-container {
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.order-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1200px;
}

.order-table th {
  background-color: #f5f5f5;
  padding: 12px 8px;
  text-align: left;
  font-weight: 500;
  font-size: 14px;
  border-bottom: 1px solid #e0e0e0;
  white-space: nowrap;
}

.order-table td {
  padding: 12px 8px;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.order-table .main-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.order-table .main-row:hover {
  background-color: #f8f8f8;
}

.order-table .main-row.selected {
  background-color: #e3f2fd;
}

.order-table .sub-row {
  background-color: #fafafa;
  font-size: 13px;
}

/* 페이지네이션 */
.pagination-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.page-info {
  font-size: 14px;
  color: #666;
}

.page-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rows-select {
  width: 80px;
}

/* 하단 주문 폼 섹션 */
.order-form-section {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.form-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.form-info {
  font-size: 14px;
  color: #666;
}

/* 폼 콘텐츠 */
.form-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.required {
  color: #e74c3c;
}

/* 제품 섹션 */
.products-section {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 16px;
  background-color: #fafafa;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

/* 제품 테이블 */
.products-table {
  overflow-x: auto;
}

.products-table table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
}

.products-table th {
  background-color: #f5f5f5;
  padding: 10px;
  text-align: left;
  font-weight: 500;
  font-size: 14px;
  border-bottom: 1px solid #e0e0e0;
}

.products-table td {
  padding: 10px;
  border-bottom: 1px solid #f0f0f0;
}

/* 폼 액션 버튼 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e0e0e0;
}

/* 유틸리티 클래스 */
.ml-3 { margin-left: 12px; }

/* 반응형 */
@media (max-width: 1200px) {
  .filter-row {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }
  
  .order-table {
    font-size: 13px;
  }
  
  .order-table th,
  .order-table td {
    padding: 8px 4px;
  }
}

@media (max-width: 768px) {
  .order-management-container {
    padding: 12px;
  }
  
  .order-list-section,
  .order-form-section {
    padding: 16px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>