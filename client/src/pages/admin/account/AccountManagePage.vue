<template>
  <div class="account-page-container">
    <!-- 좌측: 거래처 목록 -->
    <div class="account-list-panel">
      <h1 class="page-title">거래처 관리</h1>
      
      <!-- 검색 및 필터 영역 -->
      <div class="search-filter-area">
        <div class="search-bar">
          <va-input 
            v-model="searchText" 
            placeholder="거래처명, 사업자 번호로 검색..."
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
            <label>거래처명</label>
            <va-select
              v-model="filters.accountName"
              :options="accountNameOptions"
              placeholder="전체"
              clearable
            />
          </div>
          <div class="filter-item">
            <label>사업자 번호</label>
            <va-select
              v-model="filters.businessNo"
              :options="businessNoOptions"
              placeholder="전체"
              clearable
            />
          </div>
          <div class="filter-item">
            <label>담당자</label>
            <va-select
              v-model="filters.manager"
              :options="managerOptions"
              placeholder="전체"
              clearable
            />
          </div>
          <div class="filter-item">
            <label>연락처</label>
            <va-select
              v-model="filters.phone"
              :options="phoneOptions"
              placeholder="전체"
              clearable
            />
          </div>
        </div>
      </div>

      <!-- 액션 버튼 -->
      <div class="action-buttons">
        <va-button 
          preset="secondary" 
          icon="delete_outline"
          @click="deleteSelected"
          :disabled="selectedIds.length === 0"
        >
          삭제
        </va-button>
        <va-button 
          preset="secondary"
          icon="download"
          @click="exportExcel"
        >
          엑셀
        </va-button>
      </div>

      <!-- 거래처 목록 테이블 -->
      <div class="table-container">
        <table class="account-table">
          <thead>
            <tr>
              <th width="40">
                <va-checkbox v-model="selectAll" @update:model-value="handleSelectAll" />
              </th>
              <th width="60">번호</th>
              <th>거래처명</th>
              <th>사업자 번호</th>
              <th>담당자</th>
              <th>연락처</th>
              <th>주소</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(account, index) in paginatedAccounts" 
              :key="account.account_id"
              @click="selectAccount(account)"
              :class="{ 'selected': selectedAccount?.account_id === account.account_id }"
            >
              <td @click.stop>
                <va-checkbox v-model="selectedIds" :array-value="account.account_id" />
              </td>
              <td>{{ startIndex + index + 1 }}</td>
              <td>{{ account.account_name }}</td>
              <td>{{ formatBusinessNo(account.business_no) }}</td>
              <td>{{ account.charger_name }}</td>
              <td>{{ account.phone }}</td>
              <td class="address-cell">{{ account.address }}</td>
            </tr>
          </tbody>
        </table>
        
        <!-- 데이터 없을 때 표시 -->
        <div v-if="filteredAccounts.length === 0" class="no-data">
          검색 결과가 없습니다.
        </div>
      </div>

      <!-- 페이지네이션 -->
      <div class="pagination-area">
        <div class="page-info">
          {{ startIndex + 1 }}-{{ Math.min(currentPage * itemsPerPage, filteredAccounts.length) }} of {{ filteredAccounts.length }}
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

    <!-- 우측: 거래처 등록/수정 -->
    <div class="account-detail-panel">
      <div class="detail-header">
        <h2>거래처 등록/수정</h2>
        <div class="action-buttons">
          <va-button preset="secondary" @click="resetForm">초기화</va-button>
          <va-button @click="saveAccount">
            {{ selectedAccount ? '수정' : '저장' }}
          </va-button>
        </div>
      </div>

      <div class="detail-form">
        <!-- 거래처명 -->
        <div class="form-row">
          <div class="form-group">
            <label>거래처명 <span class="required">*</span></label>
            <va-input 
              v-model="form.accountName" 
              placeholder="거래처명을 입력하세요"
              :error="errors.accountName"
              :error-messages="errors.accountName ? '거래처명은 필수입니다' : ''"
            />
          </div>
        </div>

        <!-- 사업자 번호 -->
        <div class="form-row">
          <div class="form-group">
            <label>사업자 번호 <span class="required">*</span></label>
            <va-input 
              v-model="form.businessNo" 
              placeholder="123-45-67890"
              @input="handleBusinessNoInput"
              :error="errors.businessNo"
              :error-messages="errors.businessNo ? '올바른 사업자번호를 입력하세요' : ''"
              maxlength="12"
            />
          </div>
        </div>

        <!-- 담당자 -->
        <div class="form-row">
          <div class="form-group">
            <label>담당자 <span class="required">*</span></label>
            <va-input 
              v-model="form.chargerName" 
              placeholder="담당자명"
              :error="errors.chargerName"
              :error-messages="errors.chargerName ? '담당자명은 필수입니다' : ''"
            />
          </div>
        </div>

        <!-- 연락처 -->
        <div class="form-row">
          <div class="form-group">
            <label>연락처 <span class="required">*</span></label>
            <va-input 
              v-model="form.phone" 
              placeholder="010-1234-5678"
              @input="handlePhoneInput"
              :error="errors.phone"
              :error-messages="errors.phone ? '올바른 연락처를 입력하세요' : ''"
              maxlength="13"
            />
          </div>
        </div>

        <!-- 주소 -->
        <div class="form-row">
          <div class="form-group">
            <label>주소</label>
            <div class="address-input-group">
              <va-input 
                v-model="form.address" 
                placeholder="주소를 입력하세요"
              />
              <va-button 
                preset="secondary"
                @click="searchAddress"
              >
                주소 검색
              </va-button>
            </div>
          </div>
        </div>

        <!-- 상세주소 -->
        <div class="form-row">
          <div class="form-group">
            <label>상세주소</label>
            <va-input 
              v-model="form.addressDetail" 
              placeholder="상세주소를 입력하세요"
            />
          </div>
        </div>

        <!-- 구분 -->
        <div class="form-row">
          <div class="form-group">
            <label>구분</label>
            <div class="radio-group">
              <va-radio v-model="form.accountType" option="customer">
                <template #label>
                  <span class="radio-label">고객사</span>
                </template>
              </va-radio>
              <va-radio v-model="form.accountType" option="supplier">
                <template #label>
                  <span class="radio-label">공급사</span>
                </template>
              </va-radio>
            </div>
          </div>
        </div>

        <!-- 사용여부 -->
        <div class="form-row">
          <div class="form-group">
            <label>사용여부</label>
            <div class="radio-group">
              <va-radio v-model="form.useYn" option="Y">
                <template #label>
                  <span class="radio-label">여</span>
                </template>
              </va-radio>
              <va-radio v-model="form.useYn" option="N">
                <template #label>
                  <span class="radio-label">부</span>
                </template>
              </va-radio>
            </div>
          </div>
        </div>

        <!-- 이메일 -->
        <div class="form-row">
          <div class="form-group">
            <label>이메일</label>
            <va-input 
              v-model="form.email" 
              placeholder="example@company.com"
              type="email"
            />
          </div>
        </div>

        <!-- 비고 -->
        <div class="form-row">
          <div class="form-group full-width">
            <label>비고</label>
            <va-textarea 
              v-model="form.remarks" 
              placeholder="비고사항을 입력하세요"
              :min-rows="3"
              :max-rows="5"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

// 타입 정의
interface Account {
  account_id: string
  account_name: string
  business_no: string
  charger_name: string
  phone: string
  address: string
  address_detail?: string
  account_type: 'customer' | 'supplier'
  use_yn: 'Y' | 'N'
  email?: string
  remarks?: string
}

interface Form {
  accountName: string
  businessNo: string
  chargerName: string
  phone: string
  address: string
  addressDetail: string
  accountType: 'customer' | 'supplier'
  useYn: 'Y' | 'N'
  email: string
  remarks: string
}

// 상태 관리
const searchText = ref('')
const selectedIds = ref<string[]>([])
const selectAll = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(10)
const accounts = ref<Account[]>([])
const selectedAccount = ref<Account | null>(null)
const loading = ref(false)

// 필터 상태
const filters = ref({
  accountName: '',
  businessNo: '',
  manager: '',
  phone: ''
})

// 폼 데이터
const form = ref<Form>({
  accountName: '',
  businessNo: '',
  chargerName: '',
  phone: '',
  address: '',
  addressDetail: '',
  accountType: 'customer',
  useYn: 'Y',
  email: '',
  remarks: ''
})

// 폼 검증 에러
const errors = ref({
  accountName: false,
  businessNo: false,
  chargerName: false,
  phone: false
})

// 필터 옵션들
const accountNameOptions = ref<string[]>([])
const businessNoOptions = ref<string[]>([])
const managerOptions = ref<string[]>([])
const phoneOptions = ref<string[]>([])

// 필터링된 거래처 목록
const filteredAccounts = computed(() => {
  return accounts.value.filter(account => {
    // 검색어 필터
    const matchesSearch = !searchText.value || 
      account.account_name.toLowerCase().includes(searchText.value.toLowerCase()) ||
      account.business_no.includes(searchText.value)
    
    // 드롭다운 필터
    const matchesFilters = 
      (!filters.value.accountName || account.account_name === filters.value.accountName) &&
      (!filters.value.businessNo || account.business_no === filters.value.businessNo) &&
      (!filters.value.manager || account.charger_name === filters.value.manager) &&
      (!filters.value.phone || account.phone === filters.value.phone)
    
    return matchesSearch && matchesFilters
  })
})

// 페이지네이션
const totalPages = computed(() => Math.ceil(filteredAccounts.value.length / itemsPerPage.value))
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
const paginatedAccounts = computed(() => {
  const start = startIndex.value
  const end = start + itemsPerPage.value
  return filteredAccounts.value.slice(start, end)
})

// 라이프사이클
onMounted(async () => {
  await fetchAccounts()
  setupFilterOptions()
})

// API 함수들
async function fetchAccounts() {
  try {
    loading.value = true
    const response = await axios.get('/account')
    accounts.value = response.data
  } catch (error) {
    console.error('거래처 목록 로드 실패:', error)
    // Mock 데이터
    accounts.value = [
      {
        account_id: 'ACC001',
        account_name: '셀트리온',
        business_no: '111-11-11111',
        charger_name: '홍길동',
        phone: '02-1234-5678',
        address: '인천광역시 연수구 아카데미로 23',
        account_type: 'customer',
        use_yn: 'Y'
      },
      {
        account_id: 'ACC002',
        account_name: '한미약품',
        business_no: '222-22-22222',
        charger_name: '김철수',
        phone: '02-9876-5432',
        address: '서울특별시 송파구 위례성대로 14',
        account_type: 'customer',
        use_yn: 'Y'
      },
      {
        account_id: 'ACC003',
        account_name: '종근당',
        business_no: '333-33-33333',
        charger_name: '이영희',
        phone: '02-5555-1234',
        address: '서울특별시 용산구 청파로 383',
        account_type: 'supplier',
        use_yn: 'Y'
      }
    ]
  } finally {
    loading.value = false
  }
}

// 필터 옵션 설정
function setupFilterOptions() {
  accountNameOptions.value = [...new Set(accounts.value.map(a => a.account_name))]
  businessNoOptions.value = [...new Set(accounts.value.map(a => a.business_no))]
  managerOptions.value = [...new Set(accounts.value.map(a => a.charger_name))]
  phoneOptions.value = [...new Set(accounts.value.map(a => a.phone))]
}

// 메서드들
function handleSearch() {
  currentPage.value = 1
}

function handleSelectAll(value: boolean) {
  if (value) {
    selectedIds.value = paginatedAccounts.value.map(account => account.account_id)
  } else {
    selectedIds.value = []
  }
}

function selectAccount(account: Account) {
  selectedAccount.value = account
  // 폼에 데이터 채우기
  form.value = {
    accountName: account.account_name,
    businessNo: account.business_no,
    chargerName: account.charger_name,
    phone: account.phone,
    address: account.address,
    addressDetail: account.address_detail || '',
    accountType: account.account_type,
    useYn: account.use_yn,
    email: account.email || '',
    remarks: account.remarks || ''
  }
  // 에러 초기화
  resetErrors()
}

function resetForm() {
  selectedAccount.value = null
  form.value = {
    accountName: '',
    businessNo: '',
    chargerName: '',
    phone: '',
    address: '',
    addressDetail: '',
    accountType: 'customer',
    useYn: 'Y',
    email: '',
    remarks: ''
  }
  resetErrors()
}

function resetErrors() {
  errors.value = {
    accountName: false,
    businessNo: false,
    chargerName: false,
    phone: false
  }
}

// 폼 검증
function validateForm() {
  resetErrors()
  let isValid = true
  
  if (!form.value.accountName.trim()) {
    errors.value.accountName = true
    isValid = false
  }
  
  if (!form.value.businessNo || !isValidBusinessNo(form.value.businessNo)) {
    errors.value.businessNo = true
    isValid = false
  }
  
  if (!form.value.chargerName.trim()) {
    errors.value.chargerName = true
    isValid = false
  }
  
  if (!form.value.phone || !isValidPhone(form.value.phone)) {
    errors.value.phone = true
    isValid = false
  }
  
  return isValid
}

// 사업자번호 유효성 검사
function isValidBusinessNo(businessNo: string) {
  const regex = /^\d{3}-\d{2}-\d{5}$/
  return regex.test(businessNo)
}

// 전화번호 유효성 검사
function isValidPhone(phone: string) {
  const regex = /^0\d{1,2}-\d{3,4}-\d{4}$/
  return regex.test(phone)
}

// 저장
async function saveAccount() {
  if (!validateForm()) {
    return
  }
  
  try {
    const accountData = {
      account_name: form.value.accountName,
      business_no: form.value.businessNo,
      charger_name: form.value.chargerName,
      phone: form.value.phone,
      address: form.value.address,
      address_detail: form.value.addressDetail,
      account_type: form.value.accountType,
      use_yn: form.value.useYn,
      email: form.value.email,
      remarks: form.value.remarks
    }
    
    if (selectedAccount.value) {
      // 수정
      await axios.put(`/account/${selectedAccount.value.account_id}`, accountData)
      alert('거래처가 수정되었습니다.')
    } else {
      // 신규 등록
      await axios.post('/account', accountData)
      alert('거래처가 등록되었습니다.')
    }
    
    // 목록 새로고침
    await fetchAccounts()
    resetForm()
  } catch (error) {
    console.error('거래처 저장 실패:', error)
    alert('거래처 저장에 실패했습니다.')
  }
}

// 선택 삭제
async function deleteSelected() {
  if (selectedIds.value.length === 0) return
  
  if (!confirm(`선택한 ${selectedIds.value.length}개의 거래처를 삭제하시겠습니까?`)) {
    return
  }
  
  try {
    // 여러 개 삭제 API 호출
    await axios.post('/account/delete-multiple', {
      ids: selectedIds.value
    })
    
    alert('선택한 거래처가 삭제되었습니다.')
    await fetchAccounts()
    selectedIds.value = []
  } catch (error) {
    console.error('거래처 삭제 실패:', error)
    alert('거래처 삭제에 실패했습니다.')
  }
}

// 엑셀 내보내기
function exportExcel() {
  // 실제로는 서버에서 엑셀 파일 생성하여 다운로드
  console.log('엑셀 내보내기')
  alert('엑셀 내보내기 기능은 준비 중입니다.')
}

// 주소 검색 (다음 주소 API 등)
function searchAddress() {
  // 실제로는 다음 주소 API 팝업 호출
  console.log('주소 검색')
  alert('주소 검색 기능은 준비 중입니다.')
}

// 사업자번호 자동 포맷팅
function handleBusinessNoInput(value: string) {
  // 숫자만 추출
  const numbers = value.replace(/[^0-9]/g, '')
  
  // 포맷팅
  if (numbers.length <= 3) {
    form.value.businessNo = numbers
  } else if (numbers.length <= 5) {
    form.value.businessNo = `${numbers.slice(0, 3)}-${numbers.slice(3)}`
  } else if (numbers.length <= 10) {
    form.value.businessNo = `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`
  }
}

// 전화번호 자동 포맷팅
function handlePhoneInput(value: string) {
  // 숫자만 추출
  const numbers = value.replace(/[^0-9]/g, '')
  
  // 포맷팅
  if (numbers.length <= 3) {
    form.value.phone = numbers
  } else if (numbers.length <= 7) {
    form.value.phone = `${numbers.slice(0, 3)}-${numbers.slice(3)}`
  } else if (numbers.length <= 11) {
    form.value.phone = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
  }
}

// 사업자번호 포맷팅 (표시용)
function formatBusinessNo(businessNo: string) {
  if (!businessNo) return '-'
  return businessNo
}

// 감시자
watch(filters, () => {
  currentPage.value = 1
}, { deep: true })

watch(itemsPerPage, () => {
  currentPage.value = 1
})
</script>

<style scoped>
/* 전체 컨테이너 */
.account-page-container {
  display: flex;
  gap: 20px;
  padding: 20px;
  height: calc(100vh - 80px);
  background-color: #f5f5f5;
}

/* 좌측 패널 */
.account-list-panel {
  flex: 1.5;
  background: white;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 20px;
}

/* 검색 및 필터 영역 */
.search-filter-area {
  margin-bottom: 16px;
}

.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
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

/* 액션 버튼 */
.action-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

/* 테이블 */
.table-container {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.account-table {
  width: 100%;
  border-collapse: collapse;
}

.account-table th {
  background-color: #f5f5f5;
  padding: 12px 8px;
  text-align: left;
  font-weight: 500;
  font-size: 14px;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 0;
  z-index: 1;
}

.account-table td {
  padding: 12px 8px;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
}

.account-table tbody tr {
  cursor: pointer;
  transition: background-color 0.2s;
}

.account-table tbody tr:hover {
  background-color: #f8f8f8;
}

.account-table tbody tr.selected {
  background-color: #e3f2fd;
}

.address-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #999;
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

/* 우측 패널 */
.account-detail-panel {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow-y: auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.detail-header h2 {
  font-size: 20px;
  font-weight: 600;
}

/* 폼 스타일 */
.detail-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-group {
  flex: 1;
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

.radio-group {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 8px 0;
}

.radio-label {
  font-size: 14px;
  color: #333;
}

.address-input-group {
  display: flex;
  gap: 8px;
}

.address-input-group .va-input {
  flex: 1;
}

/* 유틸리티 클래스 */
.ml-3 { margin-left: 12px; }

/* 반응형 */
@media (max-width: 1400px) {
  .filter-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1200px) {
  .account-page-container {
    flex-direction: column;
  }
  
  .account-list-panel,
  .account-detail-panel {
    flex: 1;
    max-width: none;
  }
}

@media (max-width: 768px) {
  .filter-row {
    grid-template-columns: 1fr;
  }
  
  .account-table {
    font-size: 12px;
  }
  
  .account-table th,
  .account-table td {
    padding: 8px 4px;
  }
}
</style>