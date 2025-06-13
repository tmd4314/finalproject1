<template>
  <div class="package-line-management">
    <!-- 헤더 -->
    <div class="page-header">
      <nav class="breadcrumb">
        <span class="breadcrumb-item">Home</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">포장</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">라인 관리</span>
      </nav>
      
      <div class="header-content">
        <div class="header-info">
          <h1>포장 라인 관리</h1>
          <p>포장 라인을 등록, 수정, 삭제할 수 있습니다.</p>
        </div>
        <button @click="openModal()" class="btn-primary btn-add">
          <span class="material-icons">add</span>
          라인 등록
        </button>
      </div>
    </div>

    <!-- API 연결 상태 표시 -->
    <div v-if="apiStatus" class="api-status" :class="apiStatus.type">
      <span class="material-icons">{{ apiStatus.icon }}</span>
      <span>{{ apiStatus.message }}</span>
      <button v-if="apiStatus.type === 'error'" @click="retryConnection" class="retry-btn">
        재시도
      </button>
    </div>

    <!-- 필터 및 검색 -->
    <div class="filter-section">
      <div class="filter-row">
        <div class="filter-group search-group">
          <label>검색</label>
          <div class="search-input-wrapper">
            <span class="material-icons search-icon">search</span>
            <input
              v-model="searchText"
              type="text"
              placeholder="라인명, 라인ID, 설비명으로 검색"
              class="search-input"
            />
          </div>
        </div>
        
        <div class="filter-group">
          <label>라인 타입</label>
          <select v-model="typeFilter" class="filter-select">
            <option value="">전체</option>
            <option value="INNER">내포장</option>
            <option value="OUTER">외포장</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>상태</label>
          <select v-model="statusFilter" class="filter-select">
            <option value="">전체</option>
            <option value="AVAILABLE">사용가능</option>
            <option value="WORKING">작업중</option>
            <option value="MAINTENANCE">점검중</option>
            <option value="STOPPED">정지</option>
          </select>
        </div>
        
        <button @click="clearFilters" class="btn-filter-reset">
          <span class="material-icons">filter_list_off</span>
        </button>
      </div>

      <!-- 실시간 연결 상태 -->
      <div class="connection-status">
        <span class="status-dot" :class="{ active: isConnected }"></span>
        <span class="status-text">
          {{ isConnected ? 'API 연결됨' : 'API 연결 끊김' }}
        </span>
        <span class="last-updated" v-if="lastUpdated">
          마지막 업데이트: {{ formatDateTime(lastUpdated) }}
        </span>
      </div>
    </div>

    <!-- 라인 목록 -->
    <div class="content-section">
      <div class="section-header">
        <h3>
          라인 목록 
          <span class="count-badge">({{ filteredLines.length }}/{{ totalLines }})</span>
        </h3>
        <div class="header-actions">
          <button @click="refreshData" class="btn-refresh" :disabled="loading">
            <span class="material-icons" :class="{ spinning: loading }">refresh</span>
            새로고침
          </button>
          <button 
            v-if="selectedLines.length > 0" 
            @click="deleteSelectedLines" 
            class="btn-danger btn-bulk"
          >
            <span class="material-icons">delete</span>
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
        <span class="material-icons error-icon">error_outline</span>
        <h4>데이터를 불러올 수 없습니다</h4>
        <p>{{ error }}</p>
        <div class="error-actions">
          <button @click="retryConnection" class="btn-primary retry-btn">
            <span class="material-icons">refresh</span>
            다시 시도
          </button>
          <button @click="checkApiHealth" class="btn-secondary">
            <span class="material-icons">health_and_safety</span>
            API 상태 확인
          </button>
        </div>
      </div>
      
      <!-- 빈 상태 -->
      <div v-else-if="filteredLines.length === 0 && !loading" class="empty-state">
        <span class="material-icons empty-icon">search_off</span>
        <h4>{{ lines.length === 0 ? '등록된 라인이 없습니다' : '조건에 맞는 라인이 없습니다' }}</h4>
        <p>{{ lines.length === 0 ? '새로운 라인을 등록해주세요.' : '검색 조건을 변경해주세요.' }}</p>
        <button v-if="lines.length === 0" @click="openModal()" class="btn-primary">
          첫 번째 라인 등록하기
        </button>
      </div>
      
      <!-- 라인 테이블 -->
      <div v-else class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="checkbox-col">
                <input 
                  type="checkbox" 
                  v-model="selectAll"
                  @change="toggleSelectAll"
                  class="checkbox"
                />
              </th>
              <th class="number-col">번호</th>
              <th @click="sort('line_name')" class="sortable line-name-col">
                <div class="th-content">
                  라인명
                  <span class="sort-icon" :class="getSortClass('line_name')">
                    <span class="material-icons">unfold_more</span>
                  </span>
                </div>
              </th>
              <th @click="sort('line_type')" class="sortable type-col">
                <div class="th-content">
                  분류
                  <span class="sort-icon" :class="getSortClass('line_type')">
                    <span class="material-icons">unfold_more</span>
                  </span>
                </div>
              </th>
              <th class="eq-name-col">설비</th>
              <th @click="sort('line_status')" class="sortable status-col">
                <div class="th-content">
                  상태
                  <span class="sort-icon" :class="getSortClass('line_status')">
                    <span class="material-icons">unfold_more</span>
                  </span>
                </div>
              </th>
              <th class="capacity-col">생산능력</th>
              <th class="action-col">관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in sortedLines" :key="line.line_id" class="table-row">
              <td class="checkbox-col">
                <input 
                  type="checkbox" 
                  v-model="selectedLines"
                  :value="line.line_id"
                  class="checkbox"
                />
              </td>
              <td class="number-col">{{ index + 1 }}</td>
              <td class="line-name-col">
                <div class="line-info">
                  <div class="line-name">{{ line.line_name }}</div>
                  <div class="line-id">ID: {{ line.line_id }}</div>
                </div>
              </td>
              <td class="type-col">
                <span class="type-badge" :class="line.line_type.toLowerCase()">
                  {{ getLineTypeText(line.line_type) }}
                </span>
              </td>
              <td class="eq-name-col">{{ line.eq_name || '-' }}</td>
              <td class="status-col">
                <div class="status-badge" :class="line.line_status.toLowerCase()">
                  <span class="material-icons status-icon">{{ getStatusIcon(line.line_status) }}</span>
                  <span class="status-text">{{ getStatusText(line.line_status) }}</span>
                </div>
              </td>
              <td class="capacity-col">
                <div class="capacity-info">
                  <div class="capacity-main">{{ formatNumber(line.max_capacity) }}정/시간</div>
                  <div class="capacity-sub">현재: {{ line.current_speed || 0 }}정/초</div>
                </div>
              </td>
              <td class="action-col">
                <div class="action-buttons">
                  <button @click="viewLineDetails(line)" class="btn-icon" title="상세보기">
                    <span class="material-icons">visibility</span>
                  </button>
                  <button @click="openModal(line)" class="btn-icon btn-edit" title="수정">
                    <span class="material-icons">edit</span>
                  </button>
                  <button @click="deleteLine(line.line_id)" class="btn-icon btn-delete" title="삭제">
                    <span class="material-icons">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 등록/수정 모달 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingLine ? '라인 수정' : '라인 등록' }}</h3>
          <button @click="closeModal" class="modal-close">
            <span class="material-icons">close</span>
          </button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="saveLine" class="line-form">
            <!-- 라인 타입 선택 -->
            <div class="line-type-selector">
              <h4>라인 타입 선택</h4>
              <div class="type-options">
                <label class="type-option" :class="{ active: formData.line_type === 'INNER' }">
                  <input 
                    type="radio" 
                    v-model="formData.line_type" 
                    value="INNER" 
                    @change="updateLineTypeSettings"
                  />
                  <div class="type-card">
                    <div class="type-icon">💊</div>
                    <div class="type-name">내포장</div>
                    <div class="type-desc">블리스터, PTP 포장 등</div>
                  </div>
                </label>
                
                <label class="type-option" :class="{ active: formData.line_type === 'OUTER' }">
                  <input 
                    type="radio" 
                    v-model="formData.line_type" 
                    value="OUTER" 
                    @change="updateLineTypeSettings"
                  />
                  <div class="type-card">
                    <div class="type-icon">📦</div>
                    <div class="type-name">외포장</div>
                    <div class="type-desc">카톤, 라벨링 등</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="form-grid">
              <!-- 라인 ID -->
              <div class="form-group">
                <label class="form-label required">라인 ID</label>
                <select
                  v-model="formData.line_id"
                  :disabled="!!editingLine"
                  :class="['form-select', { 'error': errors.line_id, 'disabled': !!editingLine }]"
                >
                  <option value="">라인 선택</option>
                  <option v-if="editingLine" :value="editingLine.line_id">
                    {{ editingLine.line_id }}라인
                  </option>
                  <option v-else v-for="id in availableLineIds" :key="id" :value="id">
                    {{ id }}라인
                  </option>
                </select>
                <div v-if="errors.line_id" class="error-message">{{ errors.line_id }}</div>
              </div>

              <!-- 라인명 (자동 생성) -->
              <div class="form-group">
                <label class="form-label">라인명</label>
                <input
                  :value="generateLineName"
                  type="text"
                  class="form-input disabled"
                  disabled
                />
                <div class="form-help">라인 ID와 타입에 따라 자동 생성됩니다</div>
              </div>

              <!-- 설비명 -->
              <div class="form-group">
                <label class="form-label required">설비명</label>
                <select
                  v-model="formData.eq_name"
                  :class="['form-select', { 'error': errors.eq_name }]"
                >
                  <option value="">설비 선택</option>
                  <option v-for="eq in getEquipmentOptions" :key="eq" :value="eq">
                    {{ eq }}
                  </option>
                </select>
                <div v-if="errors.eq_name" class="error-message">{{ errors.eq_name }}</div>
              </div>

              <!-- 상태 -->
              <div class="form-group">
                <label class="form-label">상태</label>
                <select v-model="formData.line_status" class="form-select">
                  <option value="AVAILABLE">사용가능</option>
                  <option value="WORKING">작업중</option>
                  <option value="MAINTENANCE">점검중</option>
                  <option value="STOPPED">정지</option>
                </select>
              </div>

              <!-- 최대 생산능력 -->
              <div class="form-group">
                <label class="form-label required">최대 생산능력 (개/시간)</label>
                <input
                  v-model.number="formData.max_capacity"
                  type="number"
                  min="1"
                  :placeholder="getCapacityPlaceholder"
                  :class="['form-input', { 'error': errors.max_capacity }]"
                />
                <div v-if="errors.max_capacity" class="error-message">{{ errors.max_capacity }}</div>
              </div>

              <!-- 현재 속도 -->
              <div class="form-group">
                <label class="form-label required">현재 속도 (개/분)</label>
                <input
                  v-model.number="formData.current_speed"
                  type="number"
                  min="0"
                  :placeholder="getSpeedPlaceholder"
                  :class="['form-input', { 'error': errors.current_speed }]"
                />
                <div v-if="errors.current_speed" class="error-message">{{ errors.current_speed }}</div>
              </div>

              <!-- 담당자 -->
              <div class="form-group">
                <label class="form-label">담당자</label>
                <input
                  v-model="formData.employee_name"
                  type="text"
                  placeholder="예: 김포장"
                  class="form-input"
                />
              </div>

              <!-- 설명 -->
              <div class="form-group full-width">
                <label class="form-label">설명</label>
                <textarea
                  v-model="formData.description"
                  rows="3"
                  placeholder="라인에 대한 상세 설명을 입력하세요"
                  class="form-textarea"
                ></textarea>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-actions">
          <button @click="closeModal" class="btn-cancel">취소</button>
          <button @click="saveLine" :disabled="saving" class="btn-save">
            <span v-if="saving" class="loading-spinner small"></span>
            <span class="material-icons" v-else>save</span>
            {{ editingLine ? '수정' : '등록' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 삭제 확인 모달 -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content small" @click.stop>
        <div class="modal-header">
          <h3>라인 삭제 확인</h3>
        </div>
        <div class="modal-body">
          <div class="delete-confirmation">
            <span class="material-icons warning-icon">warning</span>
            <h4>정말로 이 라인을 삭제하시겠습니까?</h4>
            <p><strong>{{ lineToDelete?.line_name }}</strong> ({{ lineToDelete?.line_id }})</p>
            <p class="warning-text">삭제된 라인은 복구할 수 없습니다.</p>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="cancelDelete" class="btn-cancel">취소</button>
          <button @click="confirmDelete" :disabled="deleting" class="btn-delete">
            <span v-if="deleting" class="loading-spinner small"></span>
            삭제
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'

// ====== API 설정 ======
const API_BASE_URL = '/lines'  // 백엔드 라우터 경로와 일치
const API_TIMEOUT = 10000

// axios 기본 설정
axios.defaults.timeout = API_TIMEOUT
axios.defaults.headers.common['Content-Type'] = 'application/json'

// ====== 상태 관리 ======
const lines = ref([])
const totalLines = computed(() => lines.value.length)
const searchText = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const loadingMessage = ref('데이터를 불러오는 중...')

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
const showModal = ref(false)
const showDeleteModal = ref(false)
const editingLine = ref(null)
const lineToDelete = ref(null)

// 폼 데이터 - 백엔드 API 구조에 맞춤
const formData = ref({
  line_id: '',
  line_type: 'INNER',
  eq_name: '',
  line_status: 'AVAILABLE',
  max_capacity: 1000,
  current_speed: 30,
  employee_name: '',
  description: ''
})

// 유효성 검사 에러
const errors = ref({})

// 사용 가능한 라인 ID 목록
const availableLineIds = ref([])

// ====== 계산된 속성 ======

// 자동 생성되는 라인명
const generateLineName = computed(() => {
  if (!formData.value.line_id || !formData.value.line_type) return ''
  
  const typeText = formData.value.line_type === 'INNER' ? '내포장' : '외포장'
  return `${formData.value.line_id}라인 ${typeText}`
})

// 라인 타입에 따른 설비 옵션
const getEquipmentOptions = computed(() => {
  if (formData.value.line_type === 'INNER') {
    return [
      '10정용 블리스터 포장기',
      '30정용 블리스터 포장기',
      '30정용 블리스터 포장기'
    ]
  } else {
    return [
      '소형 카톤 포장기',
      '중형 카톤 포장기',
      '대형 카톤 포장기'
    ]
  }
})

// 생산능력 플레이스홀더
const getCapacityPlaceholder = computed(() => {
  return formData.value.line_type === 'INNER' ? '1000 (내포장 기준)' : '800 (외포장 기준)'
})

// 현재속도 플레이스홀더
const getSpeedPlaceholder = computed(() => {
  return formData.value.line_type === 'INNER' ? '30 (내포장 기준)' : '25 (외포장 기준)'
})

// 필터링된 라인 목록
const filteredLines = computed(() => {
  let filtered = [...lines.value]
  
  // 검색어 필터
  if (searchText.value.trim()) {
    const search = searchText.value.toLowerCase().trim()
    filtered = filtered.filter(line => 
      (line.line_name && line.line_name.toLowerCase().includes(search)) ||
      (line.line_id && line.line_id.toLowerCase().includes(search)) ||
      (line.eq_name && line.eq_name.toLowerCase().includes(search))
    )
  }
  
  // 상태 필터
  if (statusFilter.value) {
    filtered = filtered.filter(line => line.line_status === statusFilter.value)
  }
  
  // 타입 필터
  if (typeFilter.value) {
    filtered = filtered.filter(line => line.line_type === typeFilter.value)
  }
  
  return filtered
})

// 정렬된 라인 목록
const sortedLines = computed(() => {
  if (!sortField.value) return filteredLines.value
  
  return [...filteredLines.value].sort((a, b) => {
    const aVal = a[sortField.value]
    const bVal = b[sortField.value]
    
    let comparison = 0
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal, 'ko-KR')
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal
    } else {
      comparison = String(aVal || '').localeCompare(String(bVal || ''), 'ko-KR')
    }
    
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})

// ====== 라이프사이클 ======
onMounted(() => {
  console.log('🚀 포장 라인 관리 컴포넌트 마운트')
  loadLines()
  loadAvailableLineIds()
})

// 체크박스 전체 선택/해제 감지
watch([selectedLines, sortedLines], () => {
  if (sortedLines.value.length === 0) {
    selectAll.value = false
  } else {
    selectAll.value = selectedLines.value.length === sortedLines.value.length
  }
}, { deep: true })

// ====== API 함수들 ======

// API 상태 설정
function setApiStatus(type, message, icon = '') {
  apiStatus.value = {
    type,
    message,
    icon: icon || (type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info')
  }
  
  // 3초 후 자동 숨김 (success인 경우)
  if (type === 'success') {
    setTimeout(() => {
      apiStatus.value = null
    }, 3000)
  }
}

// API 상태 확인
async function checkApiHealth() {
  try {
    console.log('🏥 API 상태 확인 중...')
    setApiStatus('info', 'API 상태를 확인하는 중...', 'health_and_safety')
    
    const response = await axios.get(`${API_BASE_URL}/list`)
    console.log('✅ API 상태 정상:', response.status)
    
    isConnected.value = true
    setApiStatus('success', 'API 연결이 정상입니다')
    
  } catch (error) {
    console.error('❌ API 상태 확인 실패:', error)
    isConnected.value = false
    
    if (error.code === 'ERR_NETWORK') {
      setApiStatus('error', 'API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.')
    } else if (error.response?.status === 404) {
      setApiStatus('error', 'API 엔드포인트를 찾을 수 없습니다. 라우터 설정을 확인해주세요.')
    } else {
      setApiStatus('error', `API 연결 실패: ${error.message}`)
    }
  }
}

// 라인 목록 로드
async function loadLines() {
  loading.value = true
  loadingMessage.value = '라인 목록을 불러오는 중...'
  error.value = ''
  
  try {
    console.log('📋 라인 목록 로드 시작...')
    console.log('🔗 API URL:', `${API_BASE_URL}/list`)
    
    const response = await axios.get(`${API_BASE_URL}/list`)
    
    console.log('✅ 라인 목록 API 응답:', response.status, response.data)
    
    // 백엔드 응답 구조에 맞춤: { success: true, data: [...], total: n }
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      lines.value = response.data.data
      lastUpdated.value = new Date()
      isConnected.value = true
      
      console.log(`✅ ${lines.value.length}개의 라인을 로드했습니다.`)
      
      if (lines.value.length > 0) {
        console.log('📄 첫 번째 라인 데이터:', lines.value[0])
      }
      
      setApiStatus('success', `${lines.value.length}개의 라인을 불러왔습니다`)
      
    } else {
      console.warn('⚠️ 예상과 다른 응답 형식:', response.data)
      lines.value = []
      error.value = '데이터 형식이 올바르지 않습니다'
      setApiStatus('error', '데이터 형식 오류가 발생했습니다')
    }
    
  } catch (error) {
    console.error('❌ 라인 목록 로드 실패:', error)
    isConnected.value = false
    
    // 상세한 에러 메시지 설정
    if (error.code === 'ERR_NETWORK') {
      const errorMsg = 'API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.'
      error.value = errorMsg
      setApiStatus('error', errorMsg)
    } else if (error.response?.status === 404) {
      const errorMsg = `API 엔드포인트를 찾을 수 없습니다: ${API_BASE_URL}/list`
      error.value = errorMsg
      setApiStatus('error', errorMsg)
    } else if (error.response?.status >= 500) {
      const errorMsg = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
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

// 사용 가능한 라인 ID 로드
async function loadAvailableLineIds() {
  try {
    console.log('🔤 사용 가능한 라인 ID 로드 중...')
    
    const response = await axios.get(`${API_BASE_URL}/available-ids`)
    
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      availableLineIds.value = response.data.data
      console.log('✅ 사용 가능한 라인 ID:', availableLineIds.value)
    } else {
      // 서버에서 사용 가능한 ID를 제공하지 않는 경우 로컬에서 계산
      const allIds = Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i))
      const usedIds = lines.value.map(line => line.line_id)
      availableLineIds.value = allIds.filter(id => !usedIds.includes(id))
      console.log('📝 로컬에서 계산한 사용 가능한 라인 ID:', availableLineIds.value)
    }
    
  } catch (error) {
    console.warn('⚠️ 사용 가능한 라인 ID 로드 실패:', error)
    // 에러 시 전체 알파벳에서 사용 중인 것 제외
    const allIds = Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i))
    const usedIds = lines.value.map(line => line.line_id)
    availableLineIds.value = allIds.filter(id => !usedIds.includes(id))
  }
}

// 라인 저장
async function saveLine() {
  if (!validateForm()) return
  
  // 라인명 자동 생성
  formData.value.line_name = generateLineName.value
  
  saving.value = true
  error.value = ''
  
  try {
    console.log('💾 라인 저장 시작:', editingLine.value ? '수정' : '등록')
    console.log('📤 저장할 데이터:', formData.value)
    
    let response
    
    if (editingLine.value) {
      // 수정 - PUT 요청
      const updateUrl = `${API_BASE_URL}/${editingLine.value.line_id}`
      console.log('📝 PUT 요청 URL:', updateUrl)
      
      response = await axios.put(updateUrl, formData.value)
      console.log('✅ 라인 수정 API 응답:', response.data)
      
    } else {
      // 신규 등록 - POST 요청
      console.log('📝 POST 요청 URL:', API_BASE_URL)
      
      response = await axios.post(API_BASE_URL, formData.value)
      console.log('✅ 라인 등록 API 응답:', response.data)
    }
    
    if (response.data.success) {
      console.log('✅ 라인 저장 성공')
      setApiStatus('success', response.data.message || '라인이 성공적으로 저장되었습니다')
      
      closeModal()
      
      // 목록 새로고침
      await loadLines()
      await loadAvailableLineIds()
      
    } else {
      throw new Error(response.data.message || '저장에 실패했습니다')
    }
    
  } catch (error) {
    console.error('❌ 라인 저장 실패:', error)
    
    if (error.code === 'ERR_NETWORK') {
      setApiStatus('error', 'API 서버에 연결할 수 없습니다')
    } else if (error.response?.status === 409) {
      const errorMsg = error.response.data.message || '이미 존재하는 라인 ID입니다'
      errors.value.line_id = errorMsg
      setApiStatus('error', errorMsg)
    } else if (error.response?.status === 400) {
      const errorMsg = error.response.data.message || '입력 데이터가 올바르지 않습니다'
      setApiStatus('error', errorMsg)
      
      if (error.response.data?.errors) {
        errors.value = { ...errors.value, ...error.response.data.errors }
      }
    } else if (error.response?.status >= 500) {
      setApiStatus('error', error.response.data.message || '서버 오류가 발생했습니다')
    } else {
      setApiStatus('error', error.response?.data?.message || `라인 저장 실패: ${error.message}`)
    }
    
  } finally {
    saving.value = false
  }
}

// 선택된 라인들 일괄 삭제
async function deleteSelectedLines() {
  if (selectedLines.value.length === 0) return
  
  const selectedCount = selectedLines.value.length
  const confirmMessage = `선택된 ${selectedCount}개의 라인을 삭제하시겠습니까?\n삭제된 라인은 복구할 수 없습니다.`
  
  if (confirm(confirmMessage)) {
    try {
      console.log('🗑️ 선택된 라인들 일괄 삭제 시작:', selectedLines.value)
      
      const response = await axios.delete(`${API_BASE_URL}/bulk/delete`, {
        data: { lineIds: selectedLines.value }
      })
      
      console.log('✅ 일괄 삭제 API 응답:', response.data)
      
      if (response.data.success) {
        const result = response.data.data
        
        selectedLines.value = []
        selectAll.value = false
        
        if (result.errors && result.errors.length > 0) {
          setApiStatus('warning', `${result.deletedCount}개 삭제 완료, ${result.errors.length}개 실패`)
        } else {
          setApiStatus('success', `${result.deletedCount}개의 라인이 삭제되었습니다`)
        }
        
        // 목록 새로고침
        await loadLines()
        await loadAvailableLineIds()
      }
      
    } catch (error) {
      console.error('❌ 일괄 삭제 실패:', error)
      
      if (error.code === 'ERR_NETWORK') {
        setApiStatus('error', 'API 서버에 연결할 수 없습니다')
      } else if (error.response?.status >= 500) {
        setApiStatus('error', error.response.data.message || '서버 오류가 발생했습니다')
      } else {
        setApiStatus('error', error.response?.data?.message || `일괄 삭제 실패: ${error.message}`)
      }
    }
  }
}

// 라인 삭제 확인
async function confirmDelete() {
  if (!lineToDelete.value) return
  
  deleting.value = true
  
  try {
    console.log('🗑️ 라인 삭제 시작:', lineToDelete.value.line_id)
    
    const deleteUrl = `${API_BASE_URL}/${lineToDelete.value.line_id}`
    console.log('🗑️ DELETE 요청 URL:', deleteUrl)
    
    const response = await axios.delete(deleteUrl)
    console.log('✅ 라인 삭제 API 응답:', response.data)
    
    if (response.data.success) {
      console.log('✅ 라인 삭제 완료:', lineToDelete.value.line_name)
      setApiStatus('success', response.data.message || '라인이 삭제되었습니다')
      
      // 목록 새로고침
      await loadLines()
      await loadAvailableLineIds()
    }
    
  } catch (error) {
    console.error('❌ 라인 삭제 실패:', error)
    
    if (error.code === 'ERR_NETWORK') {
      setApiStatus('error', 'API 서버에 연결할 수 없습니다')
    } else if (error.response?.status === 404) {
      setApiStatus('error', error.response.data.message || '삭제할 라인을 찾을 수 없습니다')
    } else if (error.response?.status === 409) {
      setApiStatus('error', error.response.data.message || '사용 중인 라인은 삭제할 수 없습니다')
    } else if (error.response?.status >= 500) {
      setApiStatus('error', error.response.data.message || '서버 오류가 발생했습니다')
    } else {
      setApiStatus('error', error.response?.data?.message || `라인 삭제 실패: ${error.message}`)
    }
    
  } finally {
    deleting.value = false
    cancelDelete()
  }
}

// ====== UI 함수들 ======

// 체크박스 전체 선택/해제
function toggleSelectAll() {
  if (selectAll.value) {
    selectedLines.value = sortedLines.value.map(line => line.line_id)
  } else {
    selectedLines.value = []
  }
}

// 라인 상세보기
function viewLineDetails(line) {
  console.log('🔍 라인 상세보기:', line)
  const details = [
    `라인 ID: ${line.line_id}`,
    `라인명: ${line.line_name}`,
    `타입: ${getLineTypeText(line.line_type)}`,
    `설비: ${line.eq_name || '없음'}`,
    `상태: ${getStatusText(line.line_status)}`,
    `생산능력: ${formatNumber(line.max_capacity)}개/시간`,
    `현재속도: ${line.current_speed || 0}개/분`,
    `담당자: ${line.employee_name || '없음'}`,
    `설명: ${line.description || '없음'}`,
    `등록일: ${formatDate(line.reg_date)}`
  ].join('\n')
  
  alert(`${line.line_name} 상세 정보\n\n${details}`)
}

// 정렬 기능
function sort(field) {
  if (sortField.value === field) {
    if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc'
    } else {
      sortField.value = ''
      sortDirection.value = 'asc'
    }
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

// 정렬 아이콘 클래스 반환
function getSortClass(field) {
  if (sortField.value !== field) return ''
  return sortDirection.value === 'asc' ? 'sort-asc' : 'sort-desc'
}

// 라인 타입 변경 시 설정 업데이트
function updateLineTypeSettings() {
  formData.value.eq_name = ''
  
  if (formData.value.line_type === 'INNER') {
    formData.value.max_capacity = 1000
    formData.value.current_speed = 30
  } else {
    formData.value.max_capacity = 800
    formData.value.current_speed = 25
  }
}

// 유효성 검사
function validateForm() {
  const newErrors = {}
  
  if (!formData.value.line_id) {
    newErrors.line_id = '라인 ID를 선택해주세요.'
  }
  
  if (!formData.value.eq_name) {
    newErrors.eq_name = '설비명을 선택해주세요.'
  }
  
  if (!formData.value.max_capacity || formData.value.max_capacity <= 0) {
    newErrors.max_capacity = '최대 생산능력을 입력해주세요.'
  }
  
  if (formData.value.current_speed === null || formData.value.current_speed === undefined || formData.value.current_speed < 0) {
    newErrors.current_speed = '현재 속도를 입력해주세요.'
  }
  
  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

// 라인 삭제
function deleteLine(lineId) {
  const line = lines.value.find(l => l.line_id === lineId)
  if (line) {
    lineToDelete.value = line
    showDeleteModal.value = true
  }
}

// 삭제 취소
function cancelDelete() {
  showDeleteModal.value = false
  lineToDelete.value = null
  deleting.value = false
}

// 모달 열기
async function openModal(line = null) {
  editingLine.value = line
  
  if (line) {
    // 수정 모드
    formData.value = {
      line_id: line.line_id,
      line_type: line.line_type,
      eq_name: line.eq_name || '',
      line_status: line.line_status,
      max_capacity: line.max_capacity || 1000,
      current_speed: line.current_speed || 0,
      employee_name: line.employee_name || '',
      description: line.description || ''
    }
  } else {
    // 신규 등록 모드
    formData.value = {
      line_id: '',
      line_type: 'INNER',
      eq_name: '',
      line_status: 'AVAILABLE',
      max_capacity: 1000,
      current_speed: 30,
      employee_name: '',
      description: ''
    }
    
    // 사용 가능한 라인 ID 새로고침
    await loadAvailableLineIds()
  }
  
  errors.value = {}
  showModal.value = true
}

// 모달 닫기
function closeModal() {
  showModal.value = false
  editingLine.value = null
  errors.value = {}
}

// 필터 초기화
function clearFilters() {
  searchText.value = ''
  statusFilter.value = ''
  typeFilter.value = ''
}

// 데이터 새로고침
async function refreshData() {
  await loadLines()
  await loadAvailableLineIds()
}

// 연결 재시도
async function retryConnection() {
  error.value = ''
  apiStatus.value = null
  await loadLines()
}

// ====== 헬퍼 함수들 ======
function getLineTypeText(type) {
  return type === 'INNER' ? '내포장' : '외포장'
}

function getStatusText(status) {
  const statusMap = {
    'AVAILABLE': '사용가능',
    'WORKING': '작업중',
    'MAINTENANCE': '점검중',
    'STOPPED': '정지'
  }
  return statusMap[status] || status
}

function getStatusIcon(status) {
  const iconMap = {
    'AVAILABLE': 'check_circle',
    'WORKING': 'play_circle',
    'MAINTENANCE': 'build_circle',
    'STOPPED': 'stop_circle'
  }
  return iconMap[status] || 'help'
}

function formatNumber(num) {
  return num?.toLocaleString() || '0'
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('ko-KR')
}

function formatDateTime(date) {
  if (!date) return ''
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 컴포넌트명 정의
defineOptions({
  name: 'PackageLineManagement'
})
</script>

<style scoped>
/* 기본 스타일 */
.package-line-management {
  min-height: 100vh;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* API 상태 표시 */
.api-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  margin: 0 24px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  animation: fadeInDown 0.3s ease-out;
}

.api-status.success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.api-status.error {
  background: #fecaca;
  color: #dc2626;
  border: 1px solid #fca5a5;
}

.api-status.info {
  background: #dbeafe;
  color: #1d4ed8;
  border: 1px solid #93c5fd;
}

.api-status.warning {
  background: #fef3c7;
  color: #a16207;
  border: 1px solid #fde68a;
}

.retry-btn {
  margin-left: auto;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid currentColor;
  border-radius: 4px;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: rgba(255, 255, 255, 1);
}

@keyframes fadeInDown {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 헤더 */
.page-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 0 24px 0;
}

.breadcrumb {
  padding: 16px 24px;
  font-size: 14px;
  color: #64748b;
  border-bottom: 1px solid #f1f5f9;
}

.breadcrumb-item.active {
  color: #1e293b;
  font-weight: 500;
}

.breadcrumb-separator {
  margin: 0 8px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
}

.header-info h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.header-info p {
  color: #64748b;
  font-size: 16px;
  margin: 0;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
}

/* 연결 상태 */
.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 12px;
  color: #64748b;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ef4444;
  transition: background-color 0.3s;
}

.status-dot.active {
  background: #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-weight: 500;
}

.last-updated {
  margin-left: auto;
  font-style: italic;
}

/* 필터 섹션 */
.filter-section {
  padding: 0 24px 24px;
}

.filter-row {
  display: flex;
  gap: 20px;
  align-items: flex-end;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.filter-group {
  flex: 1;
  min-width: 160px;
}

.search-group {
  flex: 2;
  min-width: 300px;
}

.filter-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.search-input-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 20px;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 44px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.filter-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  transition: border-color 0.2s;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.btn-filter-reset {
  padding: 10px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 8px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-filter-reset:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

/* 컨텐츠 섹션 */
.content-section {
  margin: 0 24px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.section-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  background: #3b82f6;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-refresh {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

.btn-bulk {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

/* 로딩, 에러, 빈 상태 */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top: 3px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-spinner.small {
  width: 16px;
  height: 16px;
  border-width: 2px;
  margin: 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 48px;
  color: #9ca3af;
  margin-bottom: 16px;
}

.error-state h4,
.empty-state h4 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.error-state p,
.empty-state p {
  color: #64748b;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

/* 테이블 */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: #f8fafc;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #374151;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

.data-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.data-table th.sortable:hover {
  background: #f1f5f9;
}

.th-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-icon {
  opacity: 0.5;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.sort-icon .material-icons {
  font-size: 16px;
}

.sort-icon.sort-asc {
  opacity: 1;
  color: #3b82f6;
}

.sort-icon.sort-asc .material-icons::before {
  content: 'keyboard_arrow_up';
}

.sort-icon.sort-desc {
  opacity: 1;
  color: #3b82f6;
}

.sort-icon.sort-desc .material-icons::before {
  content: 'keyboard_arrow_down';
}

.data-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  font-size: 14px;
}

.table-row:hover {
  background: #f8fafc;
}

.table-row:last-child td {
  border-bottom: none;
}

/* 테이블 컬럼 */
.checkbox-col {
  width: 50px;
  text-align: center;
}

.number-col {
  width: 60px;
  text-align: center;
  font-weight: 600;
  color: #1e293b;
}

.line-name-col {
  width: 200px;
}

.type-col {
  width: 100px;
  text-align: center;
}

.eq-name-col {
  width: 220px;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-col {
  width: 120px;
  text-align: center;
}

.capacity-col {
  width: 160px;
}

.action-col {
  width: 120px;
  text-align: center;
}

/* 체크박스 */
.checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #3b82f6;
}

/* 라인 정보 */
.line-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.line-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.line-id {
  font-size: 12px;
  color: #64748b;
}

/* 타입 배지 */
.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 600;
  min-width: 60px;
  justify-content: center;
}

.type-badge.inner {
  background: #dbeafe;
  color: #1d4ed8;
}

.type-badge.outer {
  background: #fef3c7;
  color: #a16207;
}

/* 상태 배지 */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  min-width: 80px;
}

.status-badge.available {
  background: #dcfce7;
  color: #166534;
}

.status-badge.working {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-badge.maintenance {
  background: #fef3c7;
  color: #a16207;
}

.status-badge.stopped {
  background: #fecaca;
  color: #dc2626;
}

.status-icon {
  font-size: 14px;
}

.status-text {
  white-space: nowrap;
}

/* 생산능력 정보 */
.capacity-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.capacity-main {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.capacity-sub {
  font-size: 11px;
  color: #64748b;
}

/* 액션 버튼들 */
.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
}

.btn-icon {
  padding: 6px;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
}

.btn-icon .material-icons {
  font-size: 16px;
}

.btn-icon:hover {
  background: #f1f5f9;
}

.btn-icon:first-child {
  color: #3b82f6;
}

.btn-icon:first-child:hover {
  background: #eff6ff;
}

.btn-edit {
  color: #10b981;
}

.btn-edit:hover {
  background: #f0fdf4;
}

.btn-delete {
  color: #ef4444;
}

.btn-delete:hover {
  background: #fef2f2;
}

/* 모달 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.25);
}

.modal-content.small {
  max-width: 480px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.modal-body {
  padding: 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 24px;
  border-top: 1px solid #e2e8f0;
}

/* 라인 타입 선택기 */
.line-type-selector {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.line-type-selector h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.type-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.type-option {
  cursor: pointer;
  transition: all 0.2s;
}

.type-option input[type="radio"] {
  display: none;
}

.type-card {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: all 0.2s;
}

.type-option:hover .type-card {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.type-option.active .type-card {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.type-icon {
  font-size: 32px;
  margin-bottom: 12px;
}

.type-name {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.type-desc {
  font-size: 12px;
  color: #64748b;
}

/* 폼 */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.form-label.required::after {
  content: ' *';
  color: #ef4444;
}

.form-input,
.form-select,
.form-textarea {
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input.error,
.form-select.error,
.form-textarea.error {
  border-color: #ef4444;
}

.form-input.disabled {
  background: #f9fafb;
  color: #6b7280;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-help {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
  font-style: italic;
}

.error-message {
  font-size: 12px;
  color: #ef4444;
  margin-top: 4px;
}

/* 버튼 */
.btn-primary,
.btn-secondary,
.btn-cancel,
.btn-save,
.btn-delete {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background: #4b5563;
}

.btn-cancel {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #d1d5db;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-save {
  background: #10b981;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #059669;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-delete {
  background: #ef4444;
  color: white;
}

.btn-delete:hover:not(:disabled) {
  background: #dc2626;
}

.btn-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 삭제 확인 모달 */
.delete-confirmation {
  text-align: center;
  padding: 20px 0;
}

.warning-icon {
  font-size: 48px;
  color: #f59e0b;
  margin-bottom: 16px;
}

.delete-confirmation h4 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
}

.delete-confirmation p {
  color: #64748b;
  margin: 8px 0;
}

.warning-text {
  color: #ef4444;
  font-weight: 500;
}

/* 반응형 */
@media (max-width: 1024px) {
  .filter-row {
    flex-wrap: wrap;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .type-options {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .filter-row {
    flex-direction: column;
    gap: 16px;
  }
  
  .search-group,
  .filter-group {
    min-width: auto;
  }
  
  .data-table {
    font-size: 12px;
  }
  
  .data-table th,
  .data-table td {
    padding: 8px 12px;
  }
  
  .modal-overlay {
    padding: 16px;
  }
  
  .modal-content {
    max-height: 95vh;
  }
  
  .modal-header,
  .modal-body,
  .modal-actions {
    padding: 20px;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .error-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>