<template>
  <div class="package-line-container">
    <!-- 1단계: 포장 타입 선택 -->
    <div v-if="currentStep === 'package-type-selection'" class="package-type-selection">
      <nav class="breadcrumb">
        <span class="breadcrumb-item">홈</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">포장</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">포장 직접 수행</span>
      </nav>

      <div class="header-section">
        <h1>포장 라인 선택</h1>
        <p>작업할 포장 유형을 선택해주세요</p>
        
        <!-- 현재 로그인 사용자 표시 -->
        <div v-if="currentEmployee" class="current-user-info">
          <span class="material-icons">account_circle</span>
          <span>{{ currentEmployee.employee_name }}님으로 로그인됨</span>
        </div>
        
        <!-- 🔥 동적 완료 알림 메시지 -->
        <div v-if="showCompletionMessage" class="completion-alert" :class="completionMessageType">
          {{ completionMessage }}
        </div>
      </div>
      
      <div class="package-type-cards">
        <!-- 내포장 카드 -->
        <div class="package-type-card"
            :class="{ completed: completedSteps.includes('INNER') }"
            @click="selectPackageType('INNER')">
          <div class="card-icon">
            <span class="material-icons">medication</span>
          </div>
          <h3>내포장</h3>
          <p>정제를 PTP/병에 포장하는 작업</p>
          <div v-if="completedSteps.includes('INNER')" class="completion-badge">
            ✅ 작업완료
            <div class="completion-time">{{ formatTime(innerCompletionTime) }}</div>
          </div>
          <button v-else class="selection-button available" @click.stop="selectPackageType('INNER')">
            선택 가능
          </button>
        </div>
        
        <!-- 외포장 카드 -->
        <div class="package-type-card"
            :class="{ 
              completed: completedSteps.includes('OUTER'), 
              disabled: !completedSteps.includes('INNER'),
              highlighted: completedSteps.includes('INNER') && !completedSteps.includes('OUTER')
            }"
            @click="selectPackageType('OUTER')">
          <div class="card-icon">
            <span class="material-icons">inventory_2</span>
          </div>
          <h3>외포장</h3>
          <p>내포장된 제품을 박스에 포장하는 작업</p>
          <div v-if="completedSteps.includes('OUTER')" class="completion-badge">
            ✅ 작업완료
            <div class="completion-time">{{ formatTime(outerCompletionTime) }}</div>
          </div>
          <button v-else-if="completedSteps.includes('INNER')" 
                  class="selection-button available highlighted"
                  @click.stop="selectPackageType('OUTER')">
            ✨ 선택 가능 ✨
          </button>
          <button v-else class="selection-button disabled" disabled>
            내포장 완료 후 선택 가능
          </button>
        </div>
      </div>
      
      <div class="navigation-actions">
        <button @click="goBackToLineAdd" class="back-btn secondary">
          🔧 라인 관리로 이동
        </button>
      </div>
      
      <!-- 완료된 작업 요약 -->
      <div v-if="completedSteps.length > 0" class="completion-summary">
        <h4>완료된 작업</h4>
        <div class="completed-items">
          <div v-if="completedSteps.includes('INNER')" class="completed-item">
            <span class="icon">💊</span>
            <div class="item-content">
              <span class="item-title">내포장 완료</span>
              <span class="item-work">작업번호: {{ innerWorkNo || '작업번호없음' }}</span>
            </div>
            <span class="time">{{ formatTime(innerCompletionTime) }}</span>
          </div>
          <div v-if="completedSteps.includes('OUTER')" class="completed-item">
            <span class="icon">📦</span>
            <div class="item-content">
              <span class="item-title">외포장 완료</span>
              <span class="item-work">작업번호: {{ outerWorkNo || '작업번호없음' }}</span>
            </div>
            <span class="time">{{ formatTime(outerCompletionTime) }}</span>
          </div>
        </div>
        
        <!-- 모든 작업 완료시 -->
        <div v-if="completedSteps.includes('INNER') && completedSteps.includes('OUTER')" class="all-complete-section">
          <div class="all-complete-message">
            🎉 모든 포장 작업이 완료되었습니다!
          </div>
          <div class="complete-summary-info">
            <p>총 작업시간: {{ getTotalWorkTime() }}</p>
            <p>처리된 작업: 내포장({{ innerWorkNo }}) + 외포장({{ outerWorkNo }})</p>
          </div>
          <button @click="resetAllSteps" class="reset-btn">
            새 작업 시작하기
          </button>
        </div>
      </div>
    </div>

    <!-- 2단계: 라인 선택 -->
    <div v-if="currentStep === 'line-selection'" class="line-selection">
      <nav class="breadcrumb">
        <span class="breadcrumb-item">홈</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">포장</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item" @click="goBackToPackageTypeSelection" style="cursor: pointer; color: #3b82f6;">
          포장 타입 선택
        </span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">{{ getLineTypeText(selectedPackageType) }} 라인 선택</span>
      </nav>
      
      <div class="header-section">
        <h1>{{ getLineTypeText(selectedPackageType) }} 라인 선택</h1>
        <p>사용 가능한 {{ getLineTypeText(selectedPackageType) }} 라인을 선택하여 작업을 시작하세요</p>
        
        <!-- 현재 로그인 사용자 표시 -->
        <div v-if="currentEmployee" class="current-user-info">
          <span class="material-icons">account_circle</span>
          <span>{{ currentEmployee.employee_name }}님으로 로그인됨</span>
        </div>
        
        <!-- 🔥 단계별 진행 표시 -->
        <div class="workflow-progress">
          <div class="progress-step" :class="{ completed: completedSteps.includes('INNER'), active: selectedPackageType === 'INNER' }">
            <div class="step-icon">💊</div>
            <div class="step-text">내포장</div>
          </div>
          <div class="progress-arrow">→</div>
          <div class="progress-step" :class="{ completed: completedSteps.includes('OUTER'), active: selectedPackageType === 'OUTER' }">
            <div class="step-icon">📦</div>
            <div class="step-text">외포장</div>
          </div>
        </div>
        
        <!-- 내포장 완료 시 외포장 안내 -->
        <div v-if="selectedPackageType === 'OUTER' && completedSteps.includes('INNER')" class="next-step-guide">
          <div class="guide-icon">🎯</div>
          <div class="guide-content">
            <h4>내포장 작업이 완료되었습니다!</h4>
            <p>이제 외포장 라인을 선택하여 최종 포장 작업을 진행해주세요.</p>
            <div class="guide-details">
              <span>완료된 내포장 작업: {{ innerWorkNo }}</span>
              <span>완료 시간: {{ formatTime(innerCompletionTime) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 필터 및 검색 -->
      <div class="filter-section">
        <div class="filter-row">
          <div class="filter-group">
            <label>라인 타입</label>
            <select v-model="lineTypeFilter" class="filter-select">
              <option value="">전체</option>
              <option value="INNER">내포장</option>
              <option value="OUTER">외포장</option>
            </select>
          </div>
          <div class="filter-group">
            <label>라인 상태</label>
            <select v-model="lineStatusFilter" class="filter-select">
              <option value="">전체</option>
              <option value="AVAILABLE">사용 가능</option>
              <option value="WORKING">작업 중</option>
              <option value="MAINTENANCE">점검 중</option>
              <option value="STOPPED">정지</option>
            </select>
          </div>
          <div class="filter-group">
            <label>검색</label>
            <input v-model="searchText" type="text" placeholder="라인명으로 검색" class="filter-input" />
          </div>
          <button @click="clearAllFilters" class="filter-reset-btn">
            필터 초기화
          </button>
        </div>
      </div>

      <!-- 로딩 및 에러 상태 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>라인 정보를 불러오는 중...</p>
      </div>
      
      <div v-else-if="error" class="error-state">
        <div class="error-icon">⚠️</div>
        <p>{{ error }}</p>
        <button @click="fetchLines" class="retry-btn">다시 시도</button>
      </div>
      
      <!-- 라인 목록 -->
      <div v-else-if="filteredLines.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>조건에 맞는 라인이 없습니다</h3>
        <p>필터 조건을 변경해 주세요</p>
        <button @click="clearAllFilters" class="retry-btn">필터 초기화</button>
      </div>
      
      <div v-else class="lines-grid">
        <div v-for="line in filteredLines" :key="line.line_id"
          class="line-card"
          :class="{
            available: line.line_status === 'AVAILABLE',
            working: line.line_status === 'WORKING',
            maintenance: line.line_status === 'MAINTENANCE',
            stopped: line.line_status === 'STOPPED',
            recommended: isRecommendedLine(line)
          }"
        >
          <div class="line-header">
            <h3 class="line-name">{{ line.line_name }}</h3>
            <div class="line-type-icon">
              <span class="material-icons" v-if="line.line_type === 'INNER'">medication</span>
              <span class="material-icons" v-else>inventory_2</span>
            </div>
            <div v-if="isRecommendedLine(line)" class="recommended-badge">
              ⭐ 추천
            </div>
          </div>
          
          <div class="line-status">
            <span class="status-badge" :class="line.line_status.toLowerCase()">
              <span class="status-icon">{{ getStatusIcon(line.line_status) }}</span>
              {{ getStatusText(line.line_status) }}
            </span>
          </div>
          
          <div class="line-details">
            <div class="detail-row">
              <span class="label">타입:</span>
              <span class="value">{{ getLineTypeText(line.line_type) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">라인 ID:</span>
              <span class="value">{{ line.line_id }}</span>
            </div>
            <div class="detail-row">
              <span class="label">설비명:</span>
              <span class="value">{{ line.eq_name }}</span>
            </div>
            <div v-if="line.work_no" class="detail-row">
              <span class="label">작업번호:</span>
              <span class="value">{{ line.work_no }}</span>
            </div>
          </div>
          
          <div class="line-actions">
            <button
              v-if="line.line_status === 'AVAILABLE'"
              class="action-btn start"
              :class="{ recommended: isRecommendedLine(line) }"
              @click="startPackagingWork(line)"
            >
              {{ isRecommendedLine(line) ? '⭐ 작업 시작' : '▶ 작업 시작' }}
            </button>
            <button
              v-else-if="line.line_status === 'WORKING'"
              class="action-btn continue"
              @click="continuePackagingWork(line)"
            >
              🔄 작업 계속
            </button>
            <button
              v-else-if="line.line_status === 'MAINTENANCE'"
              disabled
              class="action-btn maintenance"
            >
              🔧 점검 중
            </button>
            <button
              v-else
              disabled
              class="action-btn stopped"
            >
              ⏹ 정지
            </button>
          </div>
        </div>
      </div>
      
      <!-- 뒤로가기 -->
      <div class="navigation-actions">
        <button @click="goBackToPackageTypeSelection" class="back-btn">
          ← 포장 타입 선택으로 돌아가기
        </button>
        <button @click="goBackToLineAdd" class="back-btn secondary">
          🔧 라인 관리로 이동
        </button>
      </div>
    </div>

    <!-- 작업 시작 확인 모달 -->
    <div v-if="showStartModal" class="modal-overlay" @click="closeStartModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ getWorkStartTitle() }}</h3>
          <button @click="closeStartModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="line-info">
            <h4>{{ selectedLineForStart?.line_name }}</h4>
            <p><strong>라인 ID:</strong> {{ selectedLineForStart?.line_id }}</p>
            <p><strong>타입:</strong> {{ getLineTypeText(selectedLineForStart?.line_type) }}</p>
          </div>
          
          <!-- 🔥 워크플로우 정보 표시 -->
          <div v-if="selectedPackageType === 'OUTER' && completedSteps.includes('INNER')" class="workflow-info">
            <div class="workflow-step completed">
              <span class="step-icon">✅</span>
              <div class="step-details">
                <strong>내포장 완료</strong>
                <div class="step-meta">작업번호: {{ innerWorkNo }} • {{ formatTime(innerCompletionTime) }}</div>
              </div>
            </div>
            <div class="workflow-arrow">⬇️</div>
            <div class="workflow-step current">
              <span class="step-icon">🔄</span>
              <div class="step-details">
                <strong>외포장 진행</strong>
                <div class="step-meta">{{ selectedLineForStart?.line_name }}</div>
              </div>
            </div>
          </div>
          
          <p class="confirmation-text">이 라인에서 {{ getLineTypeText(selectedLineForStart?.line_type) }} 작업을 시작하시겠습니까?</p>
        </div>
        <div class="modal-actions">
          <button @click="closeStartModal" class="btn-cancel">취소</button>
          <button @click="confirmStartWork" class="btn-confirm">
            {{ getWorkStartButtonText() }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeMount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

// 상태 관리
const currentStep = ref('package-type-selection')
const selectedPackageType = ref(null)
const completedSteps = ref([])
const innerCompletionTime = ref(null)
const outerCompletionTime = ref(null)
const innerWorkNo = ref('')
const outerWorkNo = ref('')

// 🔥 동적 완료 메시지 시스템
const showCompletionMessage = ref(false)
const completionMessage = ref('')
const completionMessageType = ref('success')

// 현재 로그인한 사용자 정보
const currentEmployee = ref(null)

// 필터 상태
const lineTypeFilter = ref('')
const lineStatusFilter = ref('')
const searchText = ref('')

// 데이터 상태
const packageLines = ref([])
const loading = ref(false)
const error = ref('')

// 모달 상태
const showStartModal = ref(false)
const selectedLineForStart = ref(null)

// 필터링된 라인 목록
const filteredLines = computed(() => {
  let lines = packageLines.value || []
  
  // 라인 타입 필터
  if (lineTypeFilter.value) {
    lines = lines.filter(line => line.line_type === lineTypeFilter.value)
  }
  
  // 라인 상태 필터
  if (lineStatusFilter.value) {
    lines = lines.filter(line => line.line_status === lineStatusFilter.value)
  }
  
  // 검색어 필터
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    lines = lines.filter(line => 
      line.line_name?.toLowerCase().includes(search) ||
      line.eq_name?.toLowerCase().includes(search) ||
      line.line_id?.toString().includes(search)
    )
  }
  
  return lines
})

// 🔥 URL 파라미터 처리 (개선된 버전)
onBeforeMount(() => {
  console.log('🚀 포장 라인 페이지 로드')
  console.log('📍 URL 파라미터:', route.query)
  
  // Case 1: 내포장 완료 후 외포장으로 자동 이동
  if (route.query.inner_completed === 'true' || route.query.completed_inner === 'true') {
    console.log('✅ 내포장 완료 → 외포장 자동 활성화')
    
    completedSteps.value = ['INNER']
    innerCompletionTime.value = new Date()
    innerWorkNo.value = route.query.prev_work || route.query.completed_work || '내포장완료'
    
    selectedPackageType.value = 'OUTER'
    currentStep.value = 'line-selection'
    lineTypeFilter.value = 'OUTER'
    
    // 완료 메시지 표시
    if (route.query.message) {
      showCompletionMessage.value = true
      completionMessage.value = route.query.message
      completionMessageType.value = 'success'
      
      setTimeout(() => {
        showCompletionMessage.value = false
      }, 5000)
    }
    
    setTimeout(() => router.replace({ query: {} }), 100)
    return
  }
  
  // Case 2: 외포장 완료 후 돌아온 경우
  if (route.query.outer_completed === 'true') {
    console.log('✅ 외포장 완료 → 전체 완료')
    
    completedSteps.value = ['INNER', 'OUTER']
    innerCompletionTime.value = new Date(Date.now() - 3600000) // 1시간 전
    outerCompletionTime.value = new Date()
    innerWorkNo.value = route.query.prev_inner_work || '내포장완료'
    outerWorkNo.value = route.query.prev_work || route.query.completed_work || '외포장완료'
    
    currentStep.value = 'package-type-selection'
    selectedPackageType.value = null
    
    // 전체 완료 메시지
    showCompletionMessage.value = true
    completionMessage.value = '🎉 모든 포장 작업이 완료되었습니다!'
    completionMessageType.value = 'success'
    
    setTimeout(() => {
      showCompletionMessage.value = false
    }, 8000)
    
    setTimeout(() => router.replace({ query: {} }), 100)
    return
  }
  
  // Case 3: 작업 수행 중 다른 라인으로 돌아온 경우
  if (route.query.from_work === 'true') {
    const maintainType = route.query.maintain_type
    console.log(`✅ ${maintainType} 작업에서 돌아옴`)
    
    selectedPackageType.value = maintainType
    currentStep.value = 'line-selection'
    lineTypeFilter.value = maintainType
    
    if (maintainType === 'OUTER') {
      completedSteps.value = ['INNER']
      innerCompletionTime.value = new Date(Date.now() - 1800000) // 30분 전
      innerWorkNo.value = route.query.prev_work || '내포장완료'
    }
    
    setTimeout(() => router.replace({ query: {} }), 100)
    return
  }
  
  // Case 4: 일반 진입
  console.log('📝 일반 진입 - 처음부터 시작')
  currentStep.value = 'package-type-selection'
  selectedPackageType.value = null
  completedSteps.value = []
})

// 컴포넌트 마운트 시 라인 목록 로드
onMounted(() => {
  console.log('🔄 컴포넌트 마운트 - 라인 목록 로드 시작')
  loadCurrentEmployee()
  fetchLines()
})

// ====== API 함수들 ======

// 현재 로그인한 사용자 정보 로드
async function loadCurrentEmployee() {
  try {
    console.log('👤 현재 사용자 정보 로드 시작...')
    const response = await axios.get('/lines/current-employee')
    
    if (response.data && response.data.success) {
      currentEmployee.value = response.data.data
      console.log('✅ 현재 사용자 정보 로드 성공:', currentEmployee.value)
    } else {
      console.warn('⚠️ 사용자 정보 응답이 올바르지 않습니다:', response.data)
      currentEmployee.value = { employee_name: '로그인 필요', employee_id: null }
    }
  } catch (error) {
    console.error('❌ 현재 사용자 정보 로드 실패:', error)
    currentEmployee.value = { employee_name: '로그인 필요', employee_id: null }
  }
}

// 라인 목록 가져오기
async function fetchLines() {
  loading.value = true
  error.value = ''
  try {
    const res = await axios.get('/lines/list')
    
    if (res.data && res.data.success && Array.isArray(res.data.data)) {
      packageLines.value = res.data.data
      console.log('✅ 라인 목록 로드 완료:', res.data.data.length, '개')
    } else {
      packageLines.value = []
      error.value = '데이터 형식이 올바르지 않습니다'
    }
  } catch (err) {
    console.error('❌ 라인 목록 로드 실패:', err)
    error.value = '라인 목록을 불러오지 못했습니다.'
    packageLines.value = []
  } finally {
    loading.value = false
  }
}

// 🔥 포장 타입 선택 (워크플로우 개선)
function selectPackageType(type) {
  console.log('🎯 포장 타입 선택:', type)
  console.log('현재 완료된 단계:', completedSteps.value)
  
  if (type === 'OUTER' && !completedSteps.value.includes('INNER')) {
    alert('내포장 작업을 먼저 완료해주세요.')
    return
  }
  
  selectedPackageType.value = type
  currentStep.value = 'line-selection'
  lineTypeFilter.value = type
  lineStatusFilter.value = ''
  searchText.value = ''
  
  console.log(`✅ ${type === 'INNER' ? '내포장' : '외포장'} 라인 선택 화면으로 이동`)
}

// 포장 타입 선택으로 돌아가기
function goBackToPackageTypeSelection() {
  currentStep.value = 'package-type-selection'
  selectedPackageType.value = null
  lineTypeFilter.value = ''
  lineStatusFilter.value = ''
  searchText.value = ''
}

// 라인 관리로 이동
function goBackToLineAdd() {
  console.log('🔧 포장 라인 관리로 이동')
  try {
    router.push({ name: 'package_add_line' })
  } catch (err) {
    console.warn('라우터를 통한 이동 실패:', err)
    window.location.href = '/faq/package_add_line'
  }
}

// 🔥 모든 단계 초기화 (개선된 버전)
function resetAllSteps() {
  if (confirm('모든 작업 내역이 초기화됩니다. 정말 새 작업을 시작하시겠습니까?')) {
    currentStep.value = 'package-type-selection'
    selectedPackageType.value = null
    completedSteps.value = []
    innerCompletionTime.value = null
    outerCompletionTime.value = null
    innerWorkNo.value = ''
    outerWorkNo.value = ''
    showCompletionMessage.value = false
    lineTypeFilter.value = ''
    lineStatusFilter.value = ''
    searchText.value = ''
    console.log('🔄 모든 단계 초기화 완료')
  }
}

// 필터 초기화
function clearAllFilters() {
  if (currentStep.value === 'line-selection' && selectedPackageType.value) {
    lineTypeFilter.value = selectedPackageType.value
  } else {
    lineTypeFilter.value = ''
  }
  lineStatusFilter.value = ''
  searchText.value = ''
}

// 🔥 추천 라인 판별 (외포장 시 특정 라인 추천)
function isRecommendedLine(line) {
  if (selectedPackageType.value === 'OUTER' && completedSteps.value.includes('INNER')) {
    // 외포장 시 특정 조건의 라인을 추천
    return line.line_status === 'AVAILABLE' && 
           line.line_type === 'OUTER' && 
           (line.line_name.includes('A') || line.line_name.includes('1'))
  }
  return false
}

// 작업 시작 버튼 클릭
function startPackagingWork(line) {
  selectedLineForStart.value = line
  showStartModal.value = true
}

// 작업 계속 버튼 클릭
function continuePackagingWork(line) {
  navigateToWorkPage(line)
}

// 🔥 작업 시작 확인 (개선된 버전)
async function confirmStartWork() {
  if (!selectedLineForStart.value) return
  
  try {
    console.log('🚀 작업 시작:', selectedLineForStart.value)
    navigateToWorkPage(selectedLineForStart.value)
  } catch (err) {
    console.error('❌ 작업 시작 중 오류:', err)
    alert('작업 시작 중 오류가 발생했습니다.')
  } finally {
    closeStartModal()
  }
}

// 🔥 작업 수행 페이지로 이동 (워크플로우 상태 전달)
function navigateToWorkPage(line) {
  console.log('🚀 작업 페이지로 이동:', line)
  
  const queryParams = {
    line_id: line.line_id,
    line_name: line.line_name,
    line_type: line.line_type,
    work_no: line.work_no || '',
    return_to: 'package_line',
    current_package_type: selectedPackageType.value,
    employee_id: currentEmployee.value?.employee_id || '',
    employee_name: currentEmployee.value?.employee_name || ''
  }
  
  // 🔥 워크플로우 상태 정보 추가
  if (selectedPackageType.value === 'OUTER' && completedSteps.value.includes('INNER')) {
    queryParams.workflow_step = 'OUTER'
    queryParams.inner_completed = 'true'
    queryParams.inner_work_no = innerWorkNo.value
    queryParams.inner_completion_time = innerCompletionTime.value?.toISOString()
    queryParams.auto_start_guide = 'true' // 외포장 자동 안내 활성화
  } else if (selectedPackageType.value === 'INNER') {
    queryParams.workflow_step = 'INNER'
    queryParams.next_step = 'OUTER'
  }
  
  try {
    router.push({
      name: 'package_work',
      query: queryParams
    })
    console.log('✅ 작업 페이지로 이동 성공')
  } catch (routerError) {
    console.error('❌ 라우터 이동 실패:', routerError)
    
    const params = new URLSearchParams(queryParams)
    window.location.href = `/packaging/work?${params.toString()}`
  }
}

// 모달 닫기
function closeStartModal() {
  showStartModal.value = false
  selectedLineForStart.value = null
}

// 🔥 워크플로우 관련 텍스트 함수들
function getWorkStartTitle() {
  if (selectedPackageType.value === 'OUTER' && completedSteps.value.includes('INNER')) {
    return '외포장 작업 시작 확인'
  }
  return '작업 시작 확인'
}

function getWorkStartButtonText() {
  if (selectedPackageType.value === 'OUTER' && completedSteps.value.includes('INNER')) {
    return '✨ 외포장 작업 시작'
  }
  return '작업 시작'
}

function getTotalWorkTime() {
  if (innerCompletionTime.value && outerCompletionTime.value) {
    const diff = outerCompletionTime.value.getTime() - innerCompletionTime.value.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}시간 ${minutes}분`
  }
  return '-'
}

// 헬퍼 함수들
function getLineTypeText(type) {
  return type === 'INNER' ? '내포장' : '외포장'
}

function getStatusText(status) {
  const map = {
    'AVAILABLE': '사용 가능',
    'WORKING': '작업 중',
    'MAINTENANCE': '점검 중',
    'STOPPED': '정지'
  }
  return map[status] || status
}

function getStatusIcon(status) {
  const icons = {
    'AVAILABLE': '✅',
    'WORKING': '▶',
    'MAINTENANCE': '🔧',
    'STOPPED': '⏹'
  }
  return icons[status] || '❓'
}

function formatTime(date) {
  if (!date) return ''
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

// 컴포넌트 함수들을 export
defineExpose({
  selectPackageType,
  goBackToPackageTypeSelection,
  goBackToLineAdd,
  resetAllSteps
})
</script>

<style scoped>
.package-line-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #ffffff, #f8fafc);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 🔥 동적 완료 메시지 스타일 */
.completion-alert {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 16px 24px;
  border-radius: 12px;
  margin: 20px auto;
  max-width: 600px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
  animation: slideInFromTop 0.6s ease-out;
}

.completion-alert.warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
}

.completion-alert.info {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

@keyframes slideInFromTop {
  0% {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 🔥 워크플로우 진행 표시 */
.workflow-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin: 20px auto;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  border: 2px solid #e2e8f0;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
  opacity: 0.5;
}

.progress-step.completed {
  background: #f0fdf4;
  border: 2px solid #10b981;
  opacity: 1;
}

.progress-step.active {
  background: #eff6ff;
  border: 2px solid #3b82f6;
  opacity: 1;
  animation: pulse 2s infinite;
}

.step-icon {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.step-text {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.progress-arrow {
  font-size: 20px;
  color: #9ca3af;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateX(0);
  }
  40% {
    transform: translateX(5px);
  }
  60% {
    transform: translateX(3px);
  }
}

/* 🔥 다음 단계 안내 */
.next-step-guide {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border: 2px solid #0ea5e9;
  border-radius: 12px;
  padding: 20px;
  margin: 20px auto;
  max-width: 700px;
}

.guide-icon {
  font-size: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.2);
}

.guide-content h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: #0c4a6e;
}

.guide-content p {
  margin: 0 0 12px 0;
  color: #0c4a6e;
  line-height: 1.5;
}

.guide-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  color: #075985;
}

/* 현재 사용자 정보 표시 스타일 */
.current-user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px auto 0;
  padding: 12px 20px;
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border: 2px solid #0ea5e9;
  border-radius: 12px;
  font-size: 14px;
  color: #0c4a6e;
  max-width: 300px;
  justify-content: center;
  font-weight: 600;
}

.current-user-info .material-icons {
  font-size: 18px;
  color: #0ea5e9;
}

/* 브레드크럼 */
.breadcrumb {
  padding: 16px 24px;
  background: white;
  border-bottom: 2px solid #e2e8f0;
  font-size: 14px;
  color: #64748b;
}

.breadcrumb-item.active {
  color: #1e293b;
  font-weight: 600;
}

.breadcrumb-separator {
  margin: 0 8px;
}

/* 헤더 */
.header-section {
  text-align: center;
  padding: 60px 24px;
  background: linear-gradient(135deg, #ffffff, #f8fafc);
}

.header-section h1 {
  font-size: 36px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
}

.header-section p {
  font-size: 18px;
  color: #475569;
  font-weight: 500;
}

/* 포장 타입 선택 */
.package-type-selection {
  padding: 0 24px 60px;
}

.package-type-cards {
  display: flex;
  justify-content: center;
  gap: 40px;
  max-width: 800px;
  margin: 0 auto 60px;
}

.package-type-card {
  background: white;
  border-radius: 16px;
  padding: 40px 32px;
  width: 320px;
  text-align: center;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 3px solid #e2e8f0;
}

.package-type-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 35px rgba(0, 0, 0, 0.15);
  border-color: #3b82f6;
}

.package-type-card.completed {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-color: #059669;
}

.package-type-card.disabled {
  background: #f8fafc;
  color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.6;
}

.package-type-card.disabled:hover {
  transform: none;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #e2e8f0;
}

/* 외포장 활성화 시 강조 */
.package-type-card.highlighted {
  border-color: #10b981;
  box-shadow: 0 12px 30px rgba(16, 185, 129, 0.25);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 12px 30px rgba(16, 185, 129, 0.25);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 16px 40px rgba(16, 185, 129, 0.35);
  }
}

.card-icon {
  margin-bottom: 24px;
}

.card-icon .material-icons {
  font-size: 56px;
  color: #3b82f6;
  display: block;
}

.package-type-card.completed .card-icon .material-icons {
  color: white;
}

.package-type-card.disabled .card-icon .material-icons {
  color: #94a3b8;
}

.package-type-card.highlighted .card-icon .material-icons {
  color: #10b981;
}

.package-type-card h3 {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
}

.package-type-card p {
  font-size: 16px;
  margin-bottom: 24px;
  opacity: 0.8;
  line-height: 1.5;
}

.selection-button {
  padding: 14px 28px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.selection-button.available {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.selection-button.available:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
}

/* 외포장 활성화 시 강조 버튼 */
.selection-button.highlighted {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  animation: shimmer 1.5s infinite;
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

@keyframes shimmer {
  0%, 100% {
    background: linear-gradient(135deg, #10b981, #059669);
  }
  50% {
    background: linear-gradient(135deg, #059669, #047857);
  }
}

.selection-button.disabled {
  background: #e2e8f0;
  color: #64748b;
  cursor: not-allowed;
}

.completion-badge {
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.completion-time {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 4px;
}

/* 🔥 완료 요약 개선 */
.completion-summary {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border: 3px solid #3b82f6;
}

.completion-summary h4 {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 20px;
  text-align: center;
}

.completed-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.completed-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
}

.completed-item .icon {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.item-work {
  font-size: 14px;
  color: #64748b;
}

.completed-item .time {
  font-size: 12px;
  color: #64748b;
  font-family: monospace;
}

.all-complete-section {
  border-top: 2px solid #e2e8f0;
  padding-top: 20px;
  text-align: center;
}

.all-complete-message {
  font-size: 22px;
  font-weight: 700;
  color: #059669;
  margin-bottom: 16px;
}

.complete-summary-info {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 2px solid #bbf7d0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.complete-summary-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #166534;
  font-weight: 500;
}

.reset-btn {
  padding: 14px 28px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.reset-btn:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
}

/* 라인 선택 */
.line-selection {
  padding: 0 24px 60px;
}

.filter-section {
  max-width: 1200px;
  margin: 0 auto 32px;
}

.filter-row {
  display: flex;
  gap: 20px;
  align-items: flex-end;
  background: white;
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border: 2px solid #e2e8f0;
}

.filter-group {
  flex: 1;
}

.filter-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.filter-select,
.filter-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  background: white;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.filter-reset-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  font-weight: 600;
}

.filter-reset-btn:hover {
  background: linear-gradient(135deg, #4b5563, #374151);
  transform: translateY(-1px);
}

/* 상태 화면들 */
.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 60px 24px;
  background: white;
  border-radius: 16px;
  margin: 0 auto;
  max-width: 600px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border: 2px solid #e2e8f0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-icon,
.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-state p,
.empty-state p {
  color: #64748b;
  margin: 8px 0 16px;
}

.empty-state h3 {
  color: #1e293b;
  margin-bottom: 8px;
}

.retry-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
}

.retry-btn:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
}

/* 🔥 라인 그리드 개선 */
.lines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.line-card {
  background: white;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border: 3px solid #e2e8f0;
  transition: all 0.3s ease;
  position: relative;
}

.line-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 35px rgba(0, 0, 0, 0.15);
}

.line-card.available {
  border-color: #10b981;
}

.line-card.available:hover {
  border-color: #059669;
  box-shadow: 0 16px 35px rgba(16, 185, 129, 0.2);
}

.line-card.working {
  border-color: #3b82f6;
}

.line-card.maintenance {
  border-color: #f59e0b;
}

.line-card.stopped {
  border-color: #ef4444;
}

/* 🔥 추천 라인 스타일 */
.line-card.recommended {
  border-color: #10b981;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  box-shadow: 0 12px 30px rgba(16, 185, 129, 0.25);
  animation: recommendedPulse 3s infinite;
}

@keyframes recommendedPulse {
  0%, 100% {
    box-shadow: 0 12px 30px rgba(16, 185, 129, 0.25);
  }
  50% {
    box-shadow: 0 16px 40px rgba(16, 185, 129, 0.4);
  }
}

.line-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  position: relative;
}

.line-name {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.line-type-icon .material-icons {
  font-size: 24px;
  color: #64748b;
}

.recommended-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  animation: bounce 2s infinite;
}

.line-status {
  margin-bottom: 16px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.status-badge.available {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #166534;
}

.status-badge.working {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1d4ed8;
}

.status-badge.maintenance {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #a16207;
}

.status-badge.stopped {
  background: linear-gradient(135deg, #fecaca, #fca5a5);
  color: #dc2626;
}

.line-details {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.detail-row .label {
  color: #64748b;
  font-weight: 500;
}

.detail-row .value {
  color: #1e293b;
  font-weight: 600;
}

.line-actions {
  margin-top: auto;
}

.action-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.start {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.action-btn.start:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
}

.action-btn.start.recommended {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
}

.action-btn.start.recommended:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-2px);
}

.action-btn.continue {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.action-btn.continue:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-1px);
}

.action-btn.maintenance {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #a16207;
  cursor: not-allowed;
}

.action-btn.stopped {
  background: linear-gradient(135deg, #fecaca, #fca5a5);
  color: #dc2626;
  cursor: not-allowed;
}

/* 🔥 모달 개선 */
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
  backdrop-filter: blur(4px);
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  animation: modalSlideIn 0.3s ease-out;
  border: 2px solid #e2e8f0;
}

@keyframes modalSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  border-bottom: 2px solid #e2e8f0;
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
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.modal-close:hover {
  background: #f1f5f9;
}

.modal-body {
  padding: 28px;
}

.line-info {
  background: #f8fafc;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  border: 2px solid #e2e8f0;
}

.line-info h4 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.line-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #64748b;
}

/* 🔥 워크플로우 정보 표시 */
.workflow-info {
  background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
  border: 2px solid #0ea5e9;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.workflow-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.workflow-step.completed {
  opacity: 0.8;
}

.workflow-step.current {
  font-weight: 600;
}

.workflow-step .step-icon {
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.step-details strong {
  display: block;
  color: #0c4a6e;
  margin-bottom: 4px;
}

.step-meta {
  font-size: 12px;
  color: #075985;
}

.workflow-arrow {
  text-align: center;
  font-size: 16px;
  color: #0ea5e9;
  margin: 8px 0;
}

.confirmation-text {
  font-size: 16px;
  color: #1e293b;
  margin: 0;
  text-align: center;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 24px 28px;
  border-top: 2px solid #e2e8f0;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f1f5f9;
  color: #64748b;
  border: 2px solid #e2e8f0;
}

.btn-cancel:hover {
  background: #e2e8f0;
  transform: translateY(-1px);
}

.btn-confirm {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.btn-confirm:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-1px);
}

/* 네비게이션 */
.navigation-actions {
  text-align: center;
  margin-top: 40px;
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.back-btn {
  padding: 14px 24px;
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 15px rgba(107, 114, 128, 0.3);
}

.back-btn:hover {
  background: linear-gradient(135deg, #4b5563, #374151);
  transform: translateY(-1px);
}

.back-btn.secondary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
}

.back-btn.secondary:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}

/* 반응형 */
@media (max-width: 1024px) {
  .package-type-cards {
    flex-direction: column;
    align-items: center;
  }
  
  .lines-grid {
    grid-template-columns: 1fr;
  }
  
  .filter-row {
    flex-direction: column;
    gap: 16px;
  }

  .workflow-progress {
    gap: 12px;
  }

  .next-step-guide {
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 768px) {
  .header-section {
    padding: 40px 24px;
  }
  
  .header-section h1 {
    font-size: 28px;
  }
  
  .package-type-card {
    width: 100%;
    max-width: 320px;
  }
  
  .line-selection {
    padding: 0 16px 40px;
  }
  
  .filter-section {
    margin: 0 0 24px;
  }
  
  .lines-grid {
    gap: 16px;
  }

  .modal-content {
    width: 95%;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .navigation-actions {
    flex-direction: column;
    align-items: center;
  }

  .workflow-progress {
    flex-direction: column;
    gap: 8px;
  }

  .progress-arrow {
    transform: rotate(90deg);
  }

  .completed-item {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }

  .next-step-guide {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .completion-alert {
    margin: 16px;
    padding: 12px 16px;
    font-size: 14px;
  }

  .workflow-info {
    padding: 16px;
  }

  .guide-details {
    font-size: 12px;
  }
}

/* 접근성 개선 */
@media (prefers-reduced-motion: reduce) {
  .package-type-card.highlighted,
  .line-card.recommended,
  .recommended-badge,
  .progress-arrow {
    animation: none;
  }
}

/* 인쇄 스타일 */
@media print {
  .navigation-actions,
  .modal-overlay,
  .filter-section {
    display: none !important;
  }
  
  .package-type-cards,
  .lines-grid {
    break-inside: avoid;
  }
  
  .completion-summary {
    break-inside: avoid;
  }
}
</style>