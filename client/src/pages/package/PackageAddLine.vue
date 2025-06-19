<template>
  <div class="package-line-management">
    <!-- 인증 헤더 -->
    <div class="auth-header">
      <div v-if="authStore.isLoggedIn" class="user-info">
        <span>{{ authStore.user?.employee_name || '사용자' }}님</span>
        <span class="department-info">({{ authStore.userRole }})</span>
      </div>
      <div v-else class="guest-info">
        <span class="guest-text">조회 모드 (로그인이 필요합니다)</span>
      </div>
    </div>

    <!-- 페이지 헤더 -->
    <div class="page-header">
      <div class="breadcrumb">
      </div>
      <div class="header-content">
        <div class="header-info">
          <h1>포장 라인 관리</h1>
          <p v-if="authStore.canManageLines">포장 라인을 등록, 수정, 삭제할 수 있습니다.</p>
          <p v-else>포장 라인 목록을 조회할 수 있습니다.</p>
        </div>
        
        <!-- 포장 부서 권한이 있는 경우만 등록 버튼 표시 -->
        <button 
          v-if="authStore.canManageLines"
          @click="openDualModal()" 
          class="btn-register"
        >
          라인 등록
        </button>
        <!-- 권한이 없는 경우 안내 메시지 -->
        <div v-else-if="authStore.isLoggedIn" class="permission-notice">
          {{ authStore.getPermissionMessage('line_manage') }}
        </div>
        <!-- 로그인이 필요한 경우 -->
        <div v-else class="login-required-notice">
          라인 등록은 로그인 후 이용 가능합니다
        </div>
      </div>
    </div>

    <!-- API 연결 상태 -->
    <div v-if="apiStatus" class="api-status" :class="apiStatus.type">
      <span>{{ apiStatus.message }}</span>
      <button v-if="apiStatus.type === 'error'" @click="retryConnection" class="retry-btn">
        재시도
      </button>
    </div>

    <!-- 검색 및 필터 -->
    <div class="filter-section">
      <div class="search-bar">
        <input
          v-model="searchText"
          type="text"
          placeholder="라인명, 라인ID, 설비명으로 검색"
          class="search-input"
        />
        <button @click="refreshData" class="search-btn">검색</button>
      </div>
      
      <div class="filter-row">
        <select v-model="typeFilter" class="filter-select">
          <option value="">전체 타입</option>
          <option value="INNER">내포장</option>
          <option value="OUTER">외포장</option>
        </select>
        
        <select v-model="statusFilter" class="filter-select">
          <option value="">전체 상태</option>
          <option value="가동 중">가동 중</option>
          <option value="가동대기 중">가동대기 중</option>
          <option value="가동정지">가동정지</option>
        </select>
        
        <button @click="clearFilters" class="filter-reset-btn">초기화</button>
      </div>
    </div>

    <!-- 라인 목록 테이블 -->
    <div class="content-section">
      <div class="section-header">
        <h3>라인 목록 ({{ filteredLines.length }}/{{ totalLines }})</h3>
        <div class="header-actions">
          <button @click="refreshData" class="btn-refresh" :disabled="loading">
            새로고침
          </button>
          <!-- 포장 부서 권한이 있는 경우만 수정/삭제 버튼 표시 -->
          <button 
            v-if="authStore.canManageLines && selectedLines.length > 0" 
            @click="editSelectedLines" 
            class="btn-edit"
          >
            선택 수정 ({{ selectedLines.length }})
          </button>
          <button 
            v-if="authStore.canManageLines && selectedLines.length > 0" 
            @click="deleteSelectedLines" 
            class="btn-delete"
          >
            선택 삭제 ({{ selectedLines.length }})
          </button>
        </div>
      </div>
      
      <!-- 로딩 상태 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <span>{{ loadingMessage }}</span>
      </div>
      
      <!-- 에러 상태 -->
      <div v-else-if="error" class="error-state">
        <h4>데이터를 불러올 수 없습니다</h4>
        <p>{{ error }}</p>
        <button @click="retryConnection" class="btn-retry">다시 시도</button>
      </div>
      
      <!-- 빈 상태 -->
      <div v-else-if="filteredLines.length === 0 && !loading" class="empty-state">
        <h4>{{ lines.length === 0 ? '등록된 라인이 없습니다' : '조건에 맞는 라인이 없습니다' }}</h4>
        <p>{{ lines.length === 0 ? '새로운 라인을 등록해주세요.' : '검색 조건을 변경해주세요.' }}</p>
        <button 
          v-if="lines.length === 0 && authStore.canManageLines" 
          @click="openDualModal()" 
          class="btn-register"
        >
          첫 번째 라인 등록하기
        </button>
      </div>
      
      <!-- 라인 테이블 -->
      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <!-- 포장 부서 권한이 있는 경우만 체크박스 표시 -->
              <th v-if="authStore.canManageLines" class="checkbox-col">
                <input 
                  type="checkbox" 
                  v-model="selectAll"
                  @change="toggleSelectAll"
                />
              </th>
              <th>번호</th>
              <th>라인명</th>
              <th>분류</th>
              <th>설비명</th>
              <th>상태</th>
              <th>생산능력</th>
              <th>담당자</th>
              <th>제품코드</th>
              <th>작업정보</th>
              <!-- 포장 부서 권한이 있는 경우만 작업 열 표시 -->
              <th v-if="authStore.canManageLines">작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in sortedLines" :key="`${line.line_id}-${line.line_type}`">
              <td v-if="authStore.canManageLines" class="checkbox-col">
                <input 
                  type="checkbox" 
                  v-model="selectedLines"
                  :value="`${line.line_id}-${line.line_type}`"
                />
              </td>
              <td>{{ index + 1 }}</td>
              <td>
                <div class="line-info">
                  <div class="line-name">{{ line.line_name }}</div>
                  <div class="line-id">ID: {{ line.line_id }}</div>
                </div>
              </td>
              <td>
                {{ getLineTypeText(line.line_type) }}
              </td>
              <td>{{ line.eq_name || '-' }}</td>
              <td>
                <!-- 상태 변경 가능한 셀렉트박스 (권한 있는 경우) -->
                <div v-if="authStore.canManageLines" class="status-control">
                  <select 
                    :value="line.line_state" 
                    @change="changeLineStatus(line, $event.target.value)"
                    class="status-select"
                    :class="getStatusClass(line.line_status)"
                  >
                    <option value="s1">가동 중</option>
                    <option value="s2">가동대기 중</option>
                    <option value="s3">가동정지</option>
                  </select>
                </div>
                <!-- 권한 없는 경우 읽기 전용 뱃지 -->
                <span v-else class="status-badge" :class="getStatusClass(line.line_status)">
                  {{ line.line_status || '가동대기 중' }}
                </span>
              </td>
              <td>
                <div class="capacity-info">
                  <div class="capacity-main">{{ formatNumber(line.max_capacity) }}정</div>
                  <div class="capacity-sub">현재: {{ line.current_speed || 0 }}정/초</div>
                </div>
              </td>
              <td>{{ line.employee_name || '-' }}</td>
              <td>
                <div class="product-info">
                  <div class="product-code">{{ line.product_code || '-' }}</div>
                  <div v-if="line.product_name" class="product-name">{{ line.product_name }}</div>
                </div>
              </td>
              <td>
                <div class="work-info">
                  <div v-if="line.current_work_number" class="work-order">작업번호: {{ line.current_work_number }}</div>
                  <div v-if="line.work_start_time" class="work-time">시작: {{ formatDateTime(line.work_start_time) }}</div>
                  <div v-if="!line.current_work_number" class="no-work">미작업</div>
                </div>
              </td>
              <!-- 포장 부서 권한이 있는 경우만 작업 버튼 표시 -->
              <td v-if="authStore.canManageLines">
                <div class="action-buttons">
                  <button @click="openEditModal(line)" class="btn-edit-single">
                    수정
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 수정 모달 -->
    <div v-if="showEditModal && authStore.canManageLines" class="modal-overlay" @click="closeEditModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>라인 수정</h3>
          <button @click="closeEditModal" class="modal-close">×</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="saveLine" class="line-form">
            <div class="form-row">
              <div class="form-group">
                <label>라인 ID</label>
                <input :value="editingLine?.line_id" type="text" disabled />
              </div>
              <div class="form-group">
                <label>제품코드</label>
                <select v-model="editFormData.product_code">
                  <option value="">제품코드 선택</option>
                  <option v-for="product in availableProducts" :key="product.product_code" :value="product.product_code">
                    {{ product.product_code }} - {{ product.product_name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>라인 타입</label>
                <input :value="getLineTypeText(editingLine?.line_type)" type="text" disabled />
              </div>
              <div class="form-group">
                <label>설비명 *</label>
                <select v-model="editFormData.eq_name" :class="{ error: editErrors.eq_name }">
                  <option value="">설비 선택</option>
                  <option v-for="eq in getEditEquipmentOptions" :key="eq" :value="eq">{{ eq }}</option>
                </select>
                <div v-if="editErrors.eq_name" class="error-message">{{ editErrors.eq_name }}</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>상태</label>
                <select v-model="editFormData.line_state">
                  <option value="s1">가동 중</option>
                  <option value="s2">가동대기 중</option>
                  <option value="s3">가동정지</option>
                </select>
              </div>
              <div class="form-group">
                <label>지시수량 (정) *</label>
                <input
                  v-model.number="editFormData.max_capacity"
                  type="number"
                  min="1"
                  :class="{ error: editErrors.max_capacity }"
                />
                <div v-if="editErrors.max_capacity" class="error-message">{{ editErrors.max_capacity }}</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>현재 속도 (정/초) *</label>
                <input
                  v-model.number="editFormData.current_speed"
                  type="number"
                  min="0"
                  :class="{ error: editErrors.current_speed }"
                />
                <div v-if="editErrors.current_speed" class="error-message">{{ editErrors.current_speed }}</div>
              </div>
              <div class="form-group">
                <label>담당자 *</label>
                <select v-model="editFormData.employee_id" :class="{ error: editErrors.employee_id }">
                  <option value="">담당자 선택</option>
                  <option v-for="emp in availableEmployees" :key="emp.employee_id" :value="emp.employee_id">
                    {{ emp.employee_name }}
                  </option>
                </select>
                <div v-if="editErrors.employee_id" class="error-message">{{ editErrors.employee_id }}</div>
              </div>
            </div>

            <div class="form-group full-width">
              <label>설명</label>
              <textarea
                v-model="editFormData.description"
                rows="3"
                placeholder="라인에 대한 상세 설명을 입력하세요"
              ></textarea>
            </div>
          </form>
        </div>
        
        <div class="modal-actions">
          <button @click="closeEditModal" class="btn-cancel">취소</button>
          <button @click="saveLine" :disabled="saving" class="btn-save">
            {{ saving ? '저장중...' : '수정' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 라인 등록 모달 -->
    <div v-if="showDualModal && authStore.canManageLines" class="modal-overlay" @click="closeDualModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>라인 등록</h3>
          <button @click="closeDualModal" class="modal-close">×</button>
        </div>
        
        <div class="modal-body">
          <div class="register-info">
            <h4>내포장/외포장 동시 등록</h4>
            <p>선택한 라인 ID로 <strong>내포장</strong>과 <strong>외포장</strong> 라인이 동시에 등록됩니다.</p>
            <p><strong>담당자:</strong> 각 포장 유형별로 담당자를 선택할 수 있습니다.</p>
            <p><strong>제품코드:</strong> 공정흐름도에 따라 자동으로 처리됩니다.</p>
          </div>

          <form @submit.prevent="dualRegisterLine" class="line-form">
            <div class="form-row">
              <div class="form-group">
                <label>라인 ID *</label>
                <select v-model="dualFormData.line_id" :class="{ error: dualErrors.line_id }">
                  <option value="">라인 선택</option>
                  <option v-for="id in availableLineIds" :key="id" :value="id">{{ id }}라인</option>
                </select>
                <div v-if="dualErrors.line_id" class="error-message">{{ dualErrors.line_id }}</div>
              </div>
              <div class="form-group">
                <label>제품코드</label>
                <select v-model="dualFormData.product_code">
                  <option value="">제품코드 선택</option>
                  <option v-for="product in availableProducts" :key="product.product_code" :value="product.product_code">
                    {{ product.product_code }} - {{ product.product_name }}
                  </option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>내포장 설비명 *</label>
                <select v-model="dualFormData.inner_eq_name" :class="{ error: dualErrors.inner_eq_name }">
                  <option value="">설비 선택</option>
                  <option v-for="eq in innerEquipments" :key="eq.eq_name" :value="eq.eq_name">
                    {{ eq.eq_name }}
                  </option>
                </select>
                <div v-if="dualErrors.inner_eq_name" class="error-message">{{ dualErrors.inner_eq_name }}</div>
              </div>
              <div class="form-group">
                <label>외포장 설비명 *</label>
                <select v-model="dualFormData.outer_eq_name" :class="{ error: dualErrors.outer_eq_name }">
                  <option value="">설비 선택</option>
                  <option v-for="eq in outerEquipments" :key="eq.eq_name" :value="eq.eq_name">
                    {{ eq.eq_name }}
                  </option>
                </select>
                <div v-if="dualErrors.outer_eq_name" class="error-message">{{ dualErrors.outer_eq_name }}</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>내포장 지시수량 (정) *</label>
                <input
                  v-model.number="dualFormData.inner_capacity"
                  type="number"
                  min="1"
                  placeholder="1000"
                  :class="{ error: dualErrors.inner_capacity }"
                />
                <div v-if="dualErrors.inner_capacity" class="error-message">{{ dualErrors.inner_capacity }}</div>
              </div>
              <div class="form-group">
                <label>외포장 지시수량 (정) *</label>
                <input
                  v-model.number="dualFormData.outer_capacity"
                  type="number"
                  min="1"
                  placeholder="800"
                  :class="{ error: dualErrors.outer_capacity }"
                />
                <div v-if="dualErrors.outer_capacity" class="error-message">{{ dualErrors.outer_capacity }}</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>내포장 현재속도 (정/초) *</label>
                <input
                  v-model.number="dualFormData.inner_speed"
                  type="number"
                  min="0"
                  placeholder="30"
                  :class="{ error: dualErrors.inner_speed }"
                />
                <div v-if="dualErrors.inner_speed" class="error-message">{{ dualErrors.inner_speed }}</div>
              </div>
              <div class="form-group">
                <label>외포장 현재속도 (정/초) *</label>
                <input
                  v-model.number="dualFormData.outer_speed"
                  type="number"
                  min="0"
                  placeholder="30"
                  :class="{ error: dualErrors.outer_speed }"
                />
                <div v-if="dualErrors.outer_speed" class="error-message">{{ dualErrors.outer_speed }}</div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>내포장 담당자 *</label>
                <select v-model="dualFormData.inner_employee_id" :class="{ error: dualErrors.inner_employee_id }">
                  <option value="">담당자 선택</option>
                  <option v-for="emp in availableEmployees" :key="emp.employee_id" :value="emp.employee_id">
                    {{ emp.employee_name }}
                  </option>
                </select>
                <div v-if="dualErrors.inner_employee_id" class="error-message">{{ dualErrors.inner_employee_id }}</div>
              </div>
              <div class="form-group">
                <label>외포장 담당자 *</label>
                <select v-model="dualFormData.outer_employee_id" :class="{ error: dualErrors.outer_employee_id }">
                  <option value="">담당자 선택</option>
                  <option v-for="emp in availableEmployees" :key="emp.employee_id" :value="emp.employee_id">
                    {{ emp.employee_name }}
                  </option>
                </select>
                <div v-if="dualErrors.outer_employee_id" class="error-message">{{ dualErrors.outer_employee_id }}</div>
              </div>
            </div>

            <div class="form-group full-width">
              <label>설명</label>
              <textarea
                v-model="dualFormData.description"
                rows="3"
                placeholder="라인에 대한 상세 설명을 입력하세요"
              ></textarea>
            </div>
          </form>
        </div>
        
        <div class="modal-actions">
          <button @click="closeDualModal" class="btn-cancel">취소</button>
          <button @click="dualRegisterLine" :disabled="saving" class="btn-save">
            {{ saving ? '등록중...' : '등록' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 권한 알림 모달 -->
    <div v-if="showPermissionModal" class="modal-overlay" @click="closePermissionModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>접근 권한 없음</h3>
          <button @click="closePermissionModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="permission-notice-modal">
            <h4>{{ permissionMessage }}</h4>
            <p v-if="authStore.userPermissionSummary">
              현재 부서: <strong>{{ authStore.userPermissionSummary.departmentName }}부서</strong><br>
              부서 권한: {{ authStore.userPermissionSummary.description }}
            </p>
            <p>포장 라인 관리는 <strong>포장부서</strong> 직원만 사용할 수 있습니다.</p>
            <div class="available-actions">
              <h5>사용 가능한 기능:</h5>
              <ul>
                <li v-if="authStore.canViewLines">포장 라인 목록 조회</li>
                <li v-if="authStore.canManageProduction">생산 관리</li>
                <li v-if="authStore.canManageMaterial">자재 관리</li>
                <li v-if="authStore.canManageQuality">품질 관리</li>
                <li v-if="authStore.canManageLogistics">물류 관리</li>
                <li v-if="authStore.canManageAdmin">관리자 기능</li>
                <li v-if="authStore.canManageSales">영업 관리</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closePermissionModal" class="btn-cancel">확인</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()

// API 설정 - 프록시 활용 (vite.config.ts의 proxy 설정 사용)
axios.defaults.timeout = 10000
axios.defaults.headers.common['Content-Type'] = 'application/json'

// 상태 관리
const lines = ref([])
const totalLines = computed(() => lines.value.length)
const searchText = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const loading = ref(false)
const saving = ref(false)
const statusChanging = ref(false)
const loadingMessage = ref('데이터를 불러오는 중...')

const currentEmployee = ref(null)

// 연결 상태
const isConnected = ref(false)
const lastUpdated = ref(null)
const apiStatus = ref(null)
const error = ref('')

// 정렬 상태
const sortField = ref('')
const sortDirection = ref('asc')

// 선택 상태
const selectAll = ref(false)
const selectedLines = ref([])

// 모달 상태
const showEditModal = ref(false)
const showDualModal = ref(false)
const showPermissionModal = ref(false)
const editingLine = ref(null)
const permissionMessage = ref('')

// 제품코드 목록 추가
const availableProducts = ref([])

// 담당자 목록 추가
const availableEmployees = ref([])

// 설비명 목록 추가
const availableEquipments = ref([])
const innerEquipments = ref([])
const outerEquipments = ref([])

// 폼 데이터
const editFormData = ref({
  eq_name: '',
  line_state: 's2',
  max_capacity: 1000,
  current_speed: 30,
  product_code: '',
  target_qty: 0,
  employee_id: '',
  description: ''
})

// dualFormData 초기화
const dualFormData = ref({
  line_id: '',
  product_code: '',
  inner_eq_name: '',
  outer_eq_name: '',
  inner_capacity: 1000,
  outer_capacity: 800,
  inner_speed: 30,
  outer_speed: 30,
  inner_employee_id: '',
  outer_employee_id: '',
  description: ''
})

// 유효성 검사 에러
const editErrors = ref({})
const dualErrors = ref({})

// 사용 가능한 라인 ID 목록
const availableLineIds = ref([])

// 계산된 속성
const getEditEquipmentOptions = computed(() => {
  if (!editingLine.value) return []
  
  if (editingLine.value.line_type === 'INNER') {
    return innerEquipments.value.map(eq => eq.eq_name)
  } else {
    return outerEquipments.value.map(eq => eq.eq_name)
  }
})

// 필터링된 라인 목록
const filteredLines = computed(() => {
  let filtered = [...lines.value]
  
  if (searchText.value.trim()) {
    const search = searchText.value.toLowerCase().trim()
    filtered = filtered.filter(line => 
      (line.line_name && line.line_name.toLowerCase().includes(search)) ||
      (line.line_id && line.line_id.toLowerCase().includes(search)) ||
      (line.eq_name && line.eq_name.toLowerCase().includes(search))
    )
  }
  
  if (statusFilter.value) {
    filtered = filtered.filter(line => line.line_status === statusFilter.value)
  }
  
  if (typeFilter.value) {
    filtered = filtered.filter(line => line.line_type === typeFilter.value)
  }
  
  return filtered
})

// 정렬된 라인 목록
const sortedLines = computed(() => {
  return filteredLines.value
})

// 라이프사이클
onMounted(async () => {
  await authStore.initialize()
  await loadCurrentEmployee()
  await loadLines()
  await loadAvailableLineIds()
  await loadAvailableProducts()
  await loadAvailableEmployees()
  await loadAvailableEquipments()
})

// 체크박스 감시
watch([selectedLines, sortedLines], () => {
  if (sortedLines.value.length === 0) {
    selectAll.value = false
  } else {
    selectAll.value = selectedLines.value.length === sortedLines.value.length
  }
}, { deep: true })

// 인증 관련 함수들
async function handleLogout() {
  try {
    await authStore.logout(router)
    setApiStatus('info', '로그아웃되었습니다.')
  } catch (error) {
    console.error('로그아웃 실패:', error)
    setApiStatus('error', '로그아웃 처리 중 오류가 발생했습니다.')
  }
}

function goToLogin() {
  router.push({ name: 'login' })
}

// 권한 체크 함수
function checkPackagingPermission(action = '이 작업') {
  if (!authStore.isLoggedIn) {
    permissionMessage.value = '로그인이 필요합니다.'
    showPermissionModal.value = true
    return false
  }
  
  if (!authStore.canManageLines) {
    permissionMessage.value = authStore.getPermissionMessage('line_manage')
    showPermissionModal.value = true
    return false
  }
  
  return true
}

function closePermissionModal() {
  showPermissionModal.value = false
  permissionMessage.value = ''
}

// 상태 변경 함수
async function changeLineStatus(line, newStatus) {
  if (!checkPackagingPermission('상태 변경')) return
  
  const statusText = getStatusText(newStatus)
  const currentStatusText = line.line_status || '알 수 없음'
  
  if (!confirm(`${line.line_name}의 상태를 '${currentStatusText}'에서 '${statusText}'로 변경하시겠습니까?`)) {
    return
  }
  
  statusChanging.value = true
  
  try {
    setApiStatus('info', `${line.line_name} 상태를 변경하는 중...`)
    
    const updateData = {
      line_state: newStatus,
      line_type: line.line_type,
      eq_name: line.eq_name,
      max_capacity: line.max_capacity,
      current_speed: line.current_speed,
      product_code: line.product_code,
      target_qty: line.target_qty,
      description: line.description,
      employee_id: line.employee_id
    }
    
    const response = await axios.put(`/lines/${line.line_id}`, updateData)
    
    if (response.data.success) {
      setApiStatus('success', `${line.line_name} 상태가 '${statusText}'로 변경되었습니다.`)
      await loadLines()
    } else {
      throw new Error(response.data.message || '상태 변경에 실패했습니다')
    }
  } catch (error) {
    console.error('상태 변경 실패:', error)
    setApiStatus('error', error.response?.data?.message || `상태 변경 실패: ${error.message}`)
    await loadLines()
  } finally {
    statusChanging.value = false
  }
}

function getStatusText(status) {
  const statusMap = {
    's1': '가동 중',
    's2': '가동대기 중',
    's3': '가동정지'
  }
  return statusMap[status] || '알 수 없음'
}

// API 함수들
async function loadCurrentEmployee() {
  try {
    if (authStore.isLoggedIn && authStore.user) {
      currentEmployee.value = {
        employee_name: authStore.user.employee_name,
        employee_id: authStore.user.employee_id
      }
      return
    }
    
    const response = await axios.get('/lines/current-employee')
    
    if (response.data && response.data.success) {
      currentEmployee.value = response.data.data
    } else {
      currentEmployee.value = { employee_name: '로그인 필요', employee_id: null }
    }
  } catch (error) {
    console.error('사용자 정보 로드 실패:', error)
    currentEmployee.value = { employee_name: '로그인 필요', employee_id: null }
    
    if (error.response?.status === 401) {
      setApiStatus('error', '로그인이 필요합니다.')
    } else {
      setApiStatus('error', '사용자 정보를 불러올 수 없습니다.')
    }
  }
}

async function loadAvailableProducts() {
  try {
    const response = await axios.get('/lines/available-products')
    
    if (response.data && response.data.success) {
      availableProducts.value = response.data.data
      console.log('제품코드 목록 로드 성공:', availableProducts.value.length, '건')
    } else {
      availableProducts.value = []
    }
  } catch (error) {
    console.error('제품코드 목록 로드 실패:', error)
    availableProducts.value = [
      { product_code: 'BJA-DR-10', product_name: '10정 블리스터 포장' },
      { product_code: 'BJA-DR-30', product_name: '30정 블리스터 포장' },
      { product_code: 'BJA-DR-60', product_name: '60정 블리스터 포장' },
      { product_code: 'BJA-BT-100', product_name: '100정 병 포장' }
    ]
  }
}

async function loadAvailableEmployees() {
  try {
    const response = await axios.get('/lines/available-employees')
    
    if (response.data && response.data.success) {
      availableEmployees.value = response.data.data
      console.log('담당자 목록 로드 성공:', availableEmployees.value.length, '명')
    } else {
      availableEmployees.value = []
    }
  } catch (error) {
    console.error('담당자 목록 로드 실패:', error)
    availableEmployees.value = [
      { employee_id: 2, employee_name: '김홍인' },
      { employee_id: 3, employee_name: '김다산' },
      { employee_id: 4, employee_name: '최현석' },
      { employee_id: 5, employee_name: '이승민' }
    ]
  }
}

async function loadAvailableEquipments() {
  try {
    const response = await axios.get('/lines/available-equipments')
    
    if (response.data && response.data.success) {
      availableEquipments.value = response.data.data
      
      innerEquipments.value = availableEquipments.value.filter(eq => 
        eq.line_type === 'INNER' || eq.eq_type === 'INNER'
      )
      outerEquipments.value = availableEquipments.value.filter(eq => 
        eq.line_type === 'OUTER' || eq.eq_type === 'OUTER'
      )
      
      console.log('설비명 목록 로드 성공:', availableEquipments.value.length, '개')
    } else {
      setDefaultEquipments()
    }
  } catch (error) {
    console.error('설비명 목록 로드 실패:', error)
    setDefaultEquipments()
  }
}

function setDefaultEquipments() {
  innerEquipments.value = [
    { eq_name: '10정용 블리스터 포장기', line_type: 'INNER' },
    { eq_name: '30정용 블리스터 포장기', line_type: 'INNER' },
    { eq_name: '60정용 블리스터 포장기', line_type: 'INNER' },
    { eq_name: '병 모노블럭', line_type: 'INNER'},
  ]
  outerEquipments.value = [
    { eq_name: '소형 카톤 포장기', line_type: 'OUTER' },
    { eq_name: '중형 카톤 포장기', line_type: 'OUTER' },
    { eq_name: '대형 카톤 포장기', line_type: 'OUTER' }
  ]
}

function setApiStatus(type, message) {
  apiStatus.value = { type, message }
  
  if (type === 'success') {
    setTimeout(() => {
      apiStatus.value = null
    }, 3000)
  }
}

async function loadLines() {
  loading.value = true
  loadingMessage.value = '라인 목록을 불러오는 중...'
  error.value = ''
  
  try {
    const response = await axios.get('/lines/list')
    
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      lines.value = response.data.data
      lastUpdated.value = new Date()
      isConnected.value = true
      setApiStatus('success', `${lines.value.length}개의 라인을 불러왔습니다`)
    } else {
      lines.value = []
      error.value = '데이터 형식이 올바르지 않습니다'
      setApiStatus('error', '데이터 형식 오류가 발생했습니다')
    }
  } catch (error) {
    console.error('라인 목록 로드 실패:', error)
    isConnected.value = false
    
    if (error.code === 'ERR_NETWORK') {
      const errorMsg = 'API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.'
      error.value = errorMsg
      setApiStatus('error', errorMsg)
    } else {
      const errorMsg = `라인 목록 로드 실패: ${error.response?.data?.message || error.message}`
      error.value = errorMsg
      setApiStatus('error', errorMsg)
    }
    
    lines.value = []
  } finally {
    loading.value = false
  }
}

async function loadAvailableLineIds() {
  try {
    const usedIds = lines.value.map(line => line.line_id).filter(id => id)
    const allIds = Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i))
    availableLineIds.value = allIds.filter(id => !usedIds.includes(id))
  } catch (error) {
    console.warn('사용 가능한 라인 ID 계산 실패:', error)
    availableLineIds.value = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
  }
}

async function saveLine() {
  if (!checkPackagingPermission('라인 수정')) return
  if (!validateEditForm()) return
  
  saving.value = true
  editErrors.value = {}
  
  try {
    const updateData = {
      line_id: editingLine.value.line_id,
      line_type: editingLine.value.line_type,
      eq_name: editFormData.value.eq_name,
      line_state: editFormData.value.line_state,
      max_capacity: editFormData.value.max_capacity,
      current_speed: editFormData.value.current_speed,
      product_code: editFormData.value.product_code,
      target_qty: editFormData.value.target_qty,
      description: editFormData.value.description,
      employee_id: editFormData.value.employee_id,
      employee_name: availableEmployees.value.find(emp => emp.employee_id == editFormData.value.employee_id)?.employee_name || ''
    }
    
    const response = await axios.put(`/lines/${editingLine.value.line_id}`, updateData)
    
    if (response.data.success) {
      setApiStatus('success', response.data.message || '라인이 성공적으로 수정되었습니다')
      closeEditModal()
      await loadLines()
      await loadAvailableProducts()
    } else {
      throw new Error(response.data.message || '수정에 실패했습니다')
    }
  } catch (error) {
    console.error('라인 수정 실패:', error)
    setApiStatus('error', error.response?.data?.message || `라인 수정 실패: ${error.message}`)
  } finally {
    saving.value = false
  }
}

// 수정된 라인 등록 함수 - dual API 사용
async function dualRegisterLine() {
  if (!checkPackagingPermission('라인 등록')) return
  if (!validateDualForm()) return
  
  saving.value = true
  dualErrors.value = {}
  
  try {
    setApiStatus('info', '내포장/외포장 라인을 등록하는 중...')
    
    const requestData = {
      line_id: dualFormData.value.line_id,
      product_code: dualFormData.value.product_code,
      inner_eq_name: dualFormData.value.inner_eq_name,
      outer_eq_name: dualFormData.value.outer_eq_name,
      inner_capacity: dualFormData.value.inner_capacity,
      outer_capacity: dualFormData.value.outer_capacity,
      inner_speed: dualFormData.value.inner_speed,
      outer_speed: dualFormData.value.outer_speed,
      inner_employee_id: dualFormData.value.inner_employee_id,
      outer_employee_id: dualFormData.value.outer_employee_id,
      description: dualFormData.value.description
    }
    
    console.log('동시 등록 요청 데이터:', requestData)
    
    const response = await axios.post('/lines/dual', requestData)
    
    if (response.data.success) {
      setApiStatus('success', response.data.message || '내포장/외포장 라인이 성공적으로 등록되었습니다')
      closeDualModal()
      await loadLines()
      await loadAvailableLineIds()
      await loadAvailableProducts()
      await loadAvailableEmployees()
      await loadAvailableEquipments()
    } else {
      throw new Error(response.data.message || '동시 등록에 실패했습니다')
    }
    
  } catch (error) {
    console.error('동시 등록 실패:', error)
    
    // 에러 메시지 개선
    let errorMessage = '동시 등록에 실패했습니다'
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    // 중복 에러인 경우 특별 처리
    if (errorMessage.includes('이미 존재하는 라인')) {
      errorMessage = `${dualFormData.value.line_id}라인이 이미 존재합니다. 다른 라인 ID를 선택해주세요.`
    }
    
    setApiStatus('error', errorMessage)
  } finally {
    saving.value = false
  }
}

function editSelectedLines() {
  if (!checkPackagingPermission('라인 수정')) return
  if (selectedLines.value.length === 0) return
  
  if (selectedLines.value.length === 1) {
    const selectedValue = selectedLines.value[0]
    const [lineId, lineType] = selectedValue.split('-')
    const line = lines.value.find(l => l.line_id === lineId && l.line_type === lineType)
    if (line) {
      openEditModal(line)
    }
  } else {
    alert(`${selectedLines.value.length}개의 라인이 선택되었습니다.\n일괄 수정 기능은 준비 중입니다.`)
  }
}

async function deleteSelectedLines() {
  if (!checkPackagingPermission('라인 삭제')) return
  if (selectedLines.value.length === 0) return
  
  const selectedCount = selectedLines.value.length
  const confirmMessage = `선택된 ${selectedCount}개의 라인을 삭제하시겠습니까?\n삭제된 라인은 복구할 수 없습니다.`
  
  if (confirm(confirmMessage)) {
    try {
      setApiStatus('info', '선택된 라인들을 삭제하는 중...')
      
      const deletePromises = selectedLines.value.map(lineId => 
        axios.delete(`/lines/${lineId}`)
      )
      
      const results = await Promise.allSettled(deletePromises)
      
      let successCount = 0
      let failCount = 0
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data.success) {
          successCount++
        } else {
          failCount++
          console.error(`라인 삭제 실패 (${selectedLines.value[index]}):`, result.reason)
        }
      })
      
      selectedLines.value = []
      selectAll.value = false
      
      if (failCount === 0) {
        setApiStatus('success', `${successCount}개의 라인이 삭제되었습니다`)
      } else {
        setApiStatus('warning', `${successCount}개 삭제 완료, ${failCount}개 실패`)
      }
      
      await loadLines()
      await loadAvailableLineIds()
      await loadAvailableProducts()
      
    } catch (error) {
      console.error('일괄 삭제 실패:', error)
      setApiStatus('error', '라인 삭제 중 오류가 발생했습니다')
    }
  }
}

// UI 함수들
function toggleSelectAll() {
  if (!authStore.canManageLines) return
  
  if (selectAll.value) {
    selectedLines.value = sortedLines.value.map(line => `${line.line_id}-${line.line_type}`)
  } else {
    selectedLines.value = []
  }
}

function validateEditForm() {
  const newErrors = {}
  
  if (!editFormData.value.eq_name) {
    newErrors.eq_name = '설비명을 선택해주세요.'
  }
  
  if (!editFormData.value.max_capacity || editFormData.value.max_capacity <= 0) {
    newErrors.max_capacity = '최대 생산능력을 입력해주세요.'
  }
  
  if (editFormData.value.current_speed === null || editFormData.value.current_speed === undefined || editFormData.value.current_speed < 0) {
    newErrors.current_speed = '현재 속도를 입력해주세요.'
  }
  
  if (!editFormData.value.employee_id) {
    newErrors.employee_id = '담당자를 선택해주세요.'
  }
  
  editErrors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function validateDualForm() {
  const newErrors = {}
  
  if (!dualFormData.value.line_id) {
    newErrors.line_id = '라인 ID를 선택해주세요.'
  }
  
  if (!dualFormData.value.inner_eq_name) {
    newErrors.inner_eq_name = '내포장 설비명을 선택해주세요.'
  }
  
  if (!dualFormData.value.outer_eq_name) {
    newErrors.outer_eq_name = '외포장 설비명을 선택해주세요.'
  }
  
  if (!dualFormData.value.inner_capacity || dualFormData.value.inner_capacity <= 0) {
    newErrors.inner_capacity = '내포장 지시수량을 입력해주세요.'
  }
  
  if (!dualFormData.value.outer_capacity || dualFormData.value.outer_capacity <= 0) {
    newErrors.outer_capacity = '외포장 지시수량을 입력해주세요.'
  }
  
  if (dualFormData.value.inner_speed === null || dualFormData.value.inner_speed === undefined || dualFormData.value.inner_speed < 0) {
    newErrors.inner_speed = '내포장 현재 속도를 입력해주세요.'
  }
  
  if (dualFormData.value.outer_speed === null || dualFormData.value.outer_speed === undefined || dualFormData.value.outer_speed < 0) {
    newErrors.outer_speed = '외포장 현재 속도를 입력해주세요.'
  }
  
  if (!dualFormData.value.inner_employee_id) {
    newErrors.inner_employee_id = '내포장 담당자를 선택해주세요.'
  }
  
  if (!dualFormData.value.outer_employee_id) {
    newErrors.outer_employee_id = '외포장 담당자를 선택해주세요.'
  }
  
  dualErrors.value = newErrors
  return Object.keys(newErrors).length === 0
}

function openEditModal(line) {
  if (!checkPackagingPermission('라인 수정')) return
  
  editingLine.value = line
  
  editFormData.value = {
    eq_name: line.eq_name || '',
    line_state: line.line_state || 's2',
    max_capacity: line.max_capacity || 1000,
    current_speed: line.current_speed || 30,
    product_code: line.product_code || '',
    target_qty: line.target_qty || 0,
    employee_id: line.employee_id || '',
    description: line.description || ''
  }
  
  editErrors.value = {}
  loadAvailableEmployees()
  loadAvailableEquipments()
  showEditModal.value = true
}

async function openDualModal() {
  if (!checkPackagingPermission('라인 등록')) return
  
  dualFormData.value = {
    line_id: '',
    product_code: '',
    inner_eq_name: '',
    outer_eq_name: '',
    inner_capacity: 1000,
    outer_capacity: 800,
    inner_speed: 30,
    outer_speed: 30,
    inner_employee_id: '',
    outer_employee_id: '',
    description: ''
  }
  
  dualErrors.value = {}
  
  await loadAvailableLineIds()
  await loadAvailableEmployees()
  await loadAvailableProducts()
  await loadAvailableEquipments()
  showDualModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editingLine.value = null
  editErrors.value = {}
  editFormData.value = {
    eq_name: '',
    line_state: 's2',
    max_capacity: 1000,
    current_speed: 30,
    product_code: '',
    target_qty: 0,
    employee_id: '',
    description: ''
  }
}

function closeDualModal() {
  showDualModal.value = false
  dualErrors.value = {}
  dualFormData.value = {
    line_id: '',
    product_code: '',
    inner_eq_name: '',
    outer_eq_name: '',
    inner_capacity: 1000,
    outer_capacity: 800,
    inner_speed: 30,
    outer_speed: 30,
    inner_employee_id: '',
    outer_employee_id: '',
    description: ''
  }
}

function clearFilters() {
  searchText.value = ''
  statusFilter.value = ''
  typeFilter.value = ''
}

async function refreshData() {
  await loadLines()
  await loadAvailableLineIds()
  await loadAvailableProducts()
  await loadAvailableEmployees()
  await loadAvailableEquipments()
}

async function retryConnection() {
  error.value = ''
  apiStatus.value = null
  await loadLines()
}

// 헬퍼 함수들
function getLineTypeText(type) {
  return type === 'INNER' ? '내포장' : '외포장'
}

function getStatusClass(status) {
  const statusMap = {
    '가동 중': 'working',
    '가동대기 중': 'available',
    '가동정지': 'stopped'
  }
  return statusMap[status] || 'available'
}

function formatNumber(num) {
  return num?.toLocaleString() || '0'
}

function formatDateTime(dateTime) {
  if (!dateTime) return ''
  
  try {
    return new Date(dateTime).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return dateTime
  }
}

defineOptions({
  name: 'PackageLineManagement'
})
</script>

<style scoped>
/* 포장 라인 관리 CSS - 아이콘 제거 버전 */

.package-line-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 인증 헤더 */
.auth-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #e1e5e9;
  margin-bottom: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #374151;
  font-weight: 500;
}

.department-info {
  color: #6b7280;
  font-size: 14px;
}

.guest-info .guest-text {
  color: #ef4444;
  font-weight: 500;
}

/* 페이지 헤더 */
.page-header {
  margin-bottom: 30px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.header-info h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.header-info p {
  margin: 0;
  color: #6b7280;
  font-size: 16px;
}

/* 버튼 스타일 */
.btn-register, .btn-refresh, .btn-edit, .btn-delete, .btn-save, .btn-cancel, .btn-edit-single, .btn-retry {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-register, .btn-save {
  background-color: #3b82f6;
  color: white;
}

.btn-register:hover, .btn-save:hover {
  background-color: #2563eb;
}

.btn-refresh {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-refresh:hover {
  background-color: #e5e7eb;
}

.btn-edit, .btn-edit-single {
  background-color: #f59e0b;
  color: white;
}

.btn-edit:hover, .btn-edit-single:hover {
  background-color: #d97706;
}

.btn-delete {
  background-color: #ef4444;
  color: white;
}

.btn-delete:hover {
  background-color: #dc2626;
}

.btn-cancel {
  background-color: #6b7280;
  color: white;
}

.btn-cancel:hover {
  background-color: #4b5563;
}

.btn-retry {
  background-color: #10b981;
  color: white;
}

.btn-retry:hover {
  background-color: #059669;
}

.btn-register:disabled, .btn-save:disabled, .btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 권한 안내 */
.permission-notice, .login-required-notice {
  padding: 12px 16px;
  border-radius: 6px;
  font-size: 14px;
  color: #b45309;
  background-color: #fef3c7;
  border: 1px solid #f59e0b;
}

/* API 연결 상태 */
.api-status {
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 500;
}

.api-status.success {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #10b981;
}

.api-status.error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #ef4444;
}

.api-status.info {
  background-color: #dbeafe;
  color: #1e40af;
  border: 1px solid #3b82f6;
}

.retry-btn {
  padding: 6px 12px;
  font-size: 12px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

/* 검색 및 필터 */
.filter-section {
  background-color: #f9fafb;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-btn {
  padding: 10px 20px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.search-btn:hover {
  background-color: #2563eb;
}

.filter-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
}

.filter-reset-btn {
  padding: 8px 16px;
  background-color: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.filter-reset-btn:hover {
  background-color: #4b5563;
}

/* 콘텐츠 섹션 */
.content-section {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* 상태 표시 */
.loading-state, .error-state, .empty-state {
  padding: 60px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state h4 {
  color: #ef4444;
  margin-bottom: 8px;
}

.empty-state h4 {
  color: #6b7280;
  margin-bottom: 8px;
}

/* 테이블 */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table th {
  background-color: #f9fafb;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.data-table td {
  padding: 12px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.data-table tr:hover {
  background-color: #f9fafb;
}

.checkbox-col {
  width: 50px;
  text-align: center;
}

/* 라인 정보 */
.line-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.line-name {
  font-weight: 600;
  color: #111827;
}

.line-id {
  font-size: 12px;
  color: #6b7280;
}

/* 상태 배지 */
.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  min-width: 80px;
  display: inline-block;
}

.status-badge.working {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge.available {
  background-color: #dbeafe;
  color: #1e40af;
}

.status-badge.stopped {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-control .status-select {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  min-width: 100px;
}

/* 용량 정보 */
.capacity-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.capacity-main {
  font-weight: 600;
  color: #111827;
}

.capacity-sub {
  font-size: 12px;
  color: #6b7280;
}

/* 제품 정보 */
.product-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.product-code {
  font-weight: 500;
  color: #111827;
}

.product-name {
  font-size: 12px;
  color: #6b7280;
}

/* 작업 정보 */
.work-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.work-order {
  font-weight: 500;
  color: #111827;
}

.work-time {
  font-size: 12px;
  color: #6b7280;
}

.no-work {
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
}

/* 액션 버튼 */
.action-buttons {
  display: flex;
  gap: 4px;
}

/* 모달 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.modal-close {
  padding: 8px 12px;
  background-color: #6b7280;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

/* 폼 스타일 */
.line-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-group input, .form-group select, .form-group textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input:disabled {
  background-color: #f3f4f6;
  color: #6b7280;
}

.form-group input.error, .form-group select.error {
  border-color: #ef4444;
}

.error-message {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
}

/* 등록 안내 */
.register-info {
  background-color: #f0f9ff;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #0ea5e9;
  margin-bottom: 20px;
}

.register-info h4 {
  margin: 0 0 8px 0;
  color: #0c4a6e;
  font-size: 16px;
}

.register-info p {
  margin: 4px 0;
  color: #0c4a6e;
  font-size: 14px;
}

/* 권한 안내 모달 */
.permission-notice-modal {
  text-align: center;
}

.permission-notice-modal h4 {
  color: #ef4444;
  margin-bottom: 16px;
}

.available-actions {
  text-align: left;
  margin-top: 20px;
  padding: 16px;
  background-color: #f9fafb;
  border-radius: 6px;
}

.available-actions h5 {
  margin: 0 0 8px 0;
  color: #374151;
}

.available-actions ul {
  margin: 0;
  padding-left: 20px;
}

.available-actions li {
  color: #6b7280;
  margin-bottom: 4px;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .package-line-management {
    padding: 15px;
  }
  
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .header-actions {
    flex-wrap: wrap;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .data-table {
    font-size: 12px;
  }
  
  .data-table th, .data-table td {
    padding: 8px;
  }
}
</style>