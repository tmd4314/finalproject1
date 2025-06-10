<template>
  <div class="package-line-container">
    <!-- 1단계: 포장 타입 선택 -->
    <div v-if="currentStep === 'package-type-selection'" class="package-type-selection">
      <nav class="breadcrumb">
        <span class="breadcrumb-item">Home</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">포장</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">포장 직접 수행</span>
      </nav>

      <div class="header-section">
        <h1>포장 라인 선택</h1>
        <p>작업할 포장 유형을 선택해주세요</p>
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
          </div>
          <button v-else class="selection-button available">
            선택 가능
          </button>
        </div>
        
        <!-- 외포장 카드 -->
        <div class="package-type-card"
            :class="{ completed: completedSteps.includes('OUTER'), disabled: !completedSteps.includes('INNER') }"
            @click="selectPackageType('OUTER')">
          <div class="card-icon">
            <span class="material-icons">inventory_2</span>
          </div>
          <h3>외포장</h3>
          <p>내포장된 제품을 박스에 포장하는 작업</p>
          <div v-if="completedSteps.includes('OUTER')" class="completion-badge">
            ✅ 작업완료
          </div>
          <button v-else-if="completedSteps.includes('INNER')" class="selection-button available">
            선택 가능
          </button>
          <button v-else class="selection-button disabled">
            내포장 완료 후 선택 가능
          </button>
        </div>
      </div>
      
      <!-- 완료된 작업 요약 -->
      <div v-if="completedSteps.length > 0" class="completion-summary">
        <h4>완료된 작업</h4>
        <div class="completed-items">
          <div v-if="completedSteps.includes('INNER')" class="completed-item">
            <span class="icon">💊</span>
            <span>내포장 완료</span>
            <span class="time">{{ formatTime(innerCompletionTime) }}</span>
          </div>
          <div v-if="completedSteps.includes('OUTER')" class="completed-item">
            <span class="icon">📦</span>
            <span>외포장 완료</span>
            <span class="time">{{ formatTime(outerCompletionTime) }}</span>
          </div>
        </div>
        
        <!-- 모든 작업 완료시 -->
        <div v-if="completedSteps.includes('INNER') && completedSteps.includes('OUTER')" class="all-complete-section">
          <div class="all-complete-message">
            🎉 모든 포장 작업이 완료되었습니다!
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
        <span class="breadcrumb-item">Home</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">포장</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">포장 라인 선택</span>
      </nav>
      
      <div class="header-section">
        <h1>{{ getLineTypeText(selectedPackageType) }} 라인 선택</h1>
        <p>사용 가능한 {{ getLineTypeText(selectedPackageType) }} 라인을 선택하여 작업을 시작하세요</p>
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
            stopped: line.line_status === 'STOPPED'
          }"
        >
          <div class="line-header">
            <h3 class="line-name">{{ line.line_name }}</h3>
            <div class="line-type-icon">
              <span class="material-icons" v-if="line.line_type === 'INNER'">medication</span>
              <span class="material-icons" v-else>inventory_2</span>
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
            <div v-if="line.work_no" class="detail-row">
              <span class="label">작업번호:</span>
              <span class="value">{{ line.work_no }}</span>
            </div>
          </div>
          
          <div class="line-actions">
            <button
              v-if="line.line_status === 'AVAILABLE'"
              class="action-btn start"
              @click="startPackagingWork(line)"
            >
              ▶ 작업 시작
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
      </div>
    </div>

    <!-- 작업 시작 확인 모달 -->
    <div v-if="showStartModal" class="modal-overlay" @click="closeStartModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>작업 시작 확인</h3>
          <button @click="closeStartModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="line-info">
            <h4>{{ selectedLineForStart?.line_name }}</h4>
            <p><strong>라인 ID:</strong> {{ selectedLineForStart?.line_id }}</p>
            <p><strong>타입:</strong> {{ getLineTypeText(selectedLineForStart?.line_type) }}</p>
          </div>
          <p class="confirmation-text">이 라인에서 포장 작업을 시작하시겠습니까?</p>
        </div>
        <div class="modal-actions">
          <button @click="closeStartModal" class="btn-cancel">취소</button>
          <button @click="confirmStartWork" class="btn-confirm">작업 시작</button>
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

// URL 파라미터에서 작업 완료 정보 확인
onBeforeMount(() => {
  // 작업 완료 후 돌아온 경우 처리
  if (route.query.work_completed) {
    const completedType = route.query.completed_type
    if (completedType && !completedSteps.value.includes(completedType)) {
      completedSteps.value.push(completedType)
      
      if (completedType === 'INNER') {
        innerCompletionTime.value = new Date()
      } else if (completedType === 'OUTER') {
        outerCompletionTime.value = new Date()
      }
    }
    
    // URL 파라미터 정리
    router.replace({ query: {} })
  }
})

// DB에서 라인 목록 가져오기
async function fetchLines() {
  loading.value = true
  error.value = ''
  try {
    // 실제 API 호출 (예시 URL: /lines/list)
    const res = await axios.get('/lines/list')
    packageLines.value = res.data // 서버에서 받은 라인 목록으로 교체

    // 혹시 서버 응답이 배열이 아닐 경우 확인 필요
    // ex: packageLines.value = res.data.lines
  } catch (err) {
    error.value = '라인 목록을 불러오지 못했습니다.'
    console.error('Error fetching lines:', err)
  } finally {
    loading.value = false
  }
}

onMounted(fetchLines)

// 필터링된 라인 목록
const filteredLines = computed(() => {
  return packageLines.value.filter(line => {
    const matchType = !lineTypeFilter.value || line.line_type === lineTypeFilter.value
    const matchStatus = !lineStatusFilter.value || line.line_status === lineStatusFilter.value
    const matchSearch = !searchText.value || line.line_name?.toLowerCase().includes(searchText.value.toLowerCase())

    return matchType && matchStatus && matchSearch
  })
})

// 포장 타입 선택
function selectPackageType(type) {
  if (type === 'OUTER' && !completedSteps.value.includes('INNER')) {
    alert('내포장 작업을 먼저 완료해주세요.')
    return
  }
  
  selectedPackageType.value = type
  currentStep.value = 'line-selection'
  
  // 선택한 타입으로 필터 자동 설정
  lineTypeFilter.value = type
  lineStatusFilter.value = ''
  searchText.value = ''
}

// 포장 타입 선택으로 돌아가기
function goBackToPackageTypeSelection() {
  currentStep.value = 'package-type-selection'
  selectedPackageType.value = null
  clearAllFilters()
}

// 모든 단계 초기화
function resetAllSteps() {
  completedSteps.value = []
  innerCompletionTime.value = null
  outerCompletionTime.value = null
  currentStep.value = 'package-type-selection'
  selectedPackageType.value = null
  clearAllFilters()
}

// 필터 초기화
function clearAllFilters() {
  lineTypeFilter.value = selectedPackageType.value || ''
  lineStatusFilter.value = ''
  searchText.value = ''
}

// 작업 시작 버튼 클릭
function startPackagingWork(line) {
  selectedLineForStart.value = line
  showStartModal.value = true
}

// 작업 계속 버튼 클릭
function continuePackagingWork(line) {
  // 이미 작업 중인 라인의 작업을 계속하는 경우
  navigateToWorkPage(line)
}

// 작업 시작 확인
async function confirmStartWork() {
  if (!selectedLineForStart.value) return
  
  try {
    // 라인 상태를 WORKING으로 변경하는 API 호출 (실제로는 서버에서 처리)
    // await axios.post(`/api/lines/${selectedLineForStart.value.line_id}/start`)
    
    // 작업 수행 페이지로 이동
    navigateToWorkPage(selectedLineForStart.value)
    
  } catch (err) {
    console.error('Error starting work:', err)
    alert('작업 시작 중 오류가 발생했습니다.')
  } finally {
    closeStartModal()
  }
}

// 작업 수행 페이지로 이동
function navigateToWorkPage(line) {
  // localStorage에 현재 상태 저장 (새로고침 대비)
  localStorage.setItem('packageLineState', JSON.stringify({
    completedSteps: completedSteps.value,
    innerCompletionTime: innerCompletionTime.value,
    outerCompletionTime: outerCompletionTime.value,
    selectedPackageType: selectedPackageType.value
  }))
  
  // Vue Router를 사용하는 경우
  if (router) {
    // 같은 SPA 내에서 라우팅
    router.push({
      name: 'package_work', // 라우터에 정의된 이름
      query: {
        line_id: line.line_id,
        line_name: line.line_name,
        line_type: line.line_type,
        work_no: line.work_no || '',
        // 돌아올 때 필요한 정보
        return_to: 'package_line',
        current_package_type: selectedPackageType.value
      }
    })
  } else {
    // 일반 페이지 이동 (HTML 기반)
    const params = new URLSearchParams({
      line_id: line.line_id,
      line_name: line.line_name,
      line_type: line.line_type,
      work_no: line.work_no || '',
      return_to: 'package_line',
      current_package_type: selectedPackageType.value
    })
    
    // 포장 작업 수행 페이지로 이동
    window.location.href = `/packaging/work?${params.toString()}`
  }
}

// 작업 완료 후 돌아오는 함수 (PackageWork에서 호출)
function handleWorkCompleted(workType) {
  if (!completedSteps.value.includes(workType)) {
    completedSteps.value.push(workType)
    
    if (workType === 'INNER') {
      innerCompletionTime.value = new Date()
    } else if (workType === 'OUTER') {
      outerCompletionTime.value = new Date()
    }
  }
  
  // 포장 타입 선택 화면으로 돌아가기
  currentStep.value = 'package-type-selection'
  selectedPackageType.value = null
}

// 전역에 함수 노출 (다른 컴포넌트에서 접근 가능)
window.handlePackageWorkCompleted = handleWorkCompleted

// 모달 닫기
function closeStartModal() {
  showStartModal.value = false
  selectedLineForStart.value = null
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

// 컴포넌트명을 전역에 노출
defineOptions({
  name: 'PackageLine'
})
</script>

<style scoped>
.package-line-container {
  min-height: 100vh;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 브레드크럼 */
.breadcrumb {
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
  color: #64748b;
}

.breadcrumb-item.active {
  color: #1e293b;
  font-weight: 500;
}

.breadcrumb-separator {
  margin: 0 8px;
}

/* 헤더 */
.header-section {
  text-align: center;
  padding: 60px 24px;
}

.header-section h1 {
  font-size: 36px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
}

.header-section p {
  font-size: 18px;
  color: #64748b;
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
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid #e2e8f0;
}

.package-type-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.package-type-card.completed {
  background: #10b981;
  color: white;
  border-color: #059669;
}

.package-type-card.disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.6;
}

.package-type-card.disabled:hover {
  transform: none;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border-color: #e2e8f0;
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
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.selection-button.available {
  background: #3b82f6;
  color: white;
}

.selection-button.available:hover {
  background: #2563eb;
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
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* 완료 요약 */
.completion-summary {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 2px solid #3b82f6;
}

.completion-summary h4 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
  text-align: center;
}

.completed-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.completed-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.completed-item .icon {
  font-size: 20px;
}

.completed-item .time {
  margin-left: auto;
  font-size: 12px;
  color: #64748b;
}

.all-complete-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
  text-align: center;
}

.all-complete-message {
  font-size: 18px;
  font-weight: 600;
  color: #059669;
  margin-bottom: 16px;
}

.reset-btn {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reset-btn:hover {
  background: #2563eb;
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
  align-items: flex-end;   /* ← 이렇게 수정 */
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.filter-group {
  flex: 1;
}

.filter-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.filter-select,
.filter-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.filter-reset-btn {
  padding: 10px 20px;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s;
}

.filter-reset-btn:hover {
  background: #4b5563;
}

/* 상태 화면들 */
.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 60px 24px;
  background: white;
  border-radius: 12px;
  margin: 0 auto;
  max-width: 600px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
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
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-btn:hover {
  background: #2563eb;
}

/* 라인 그리드 */
.lines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.line-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.line-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.line-card.available {
  border-color: #10b981;
}

.line-card.available:hover {
  border-color: #059669;
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);
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

.line-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.line-name {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.line-type-icon .material-icons {
  font-size: 24px;
  color: #64748b;
}

.line-status {
  margin-bottom: 16px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
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
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.start {
  background: #3b82f6;
  color: white;
}

.action-btn.start:hover {
  background: #2563eb;
}

.action-btn.continue {
  background: #10b981;
  color: white;
}

.action-btn.continue:hover {
  background: #059669;
}

.action-btn.maintenance {
  background: #fef3c7;
  color: #a16207;
  cursor: not-allowed;
}

.action-btn.stopped {
  background: #fecaca;
  color: #dc2626;
  cursor: not-allowed;
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
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  font-size: 18px;
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
  padding: 24px;
}

.line-info {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.line-info h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.line-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #64748b;
}

.confirmation-text {
  font-size: 16px;
  color: #1e293b;
  margin: 0;
  text-align: center;
}

.modal-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f1f5f9;
  color: #64748b;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-confirm {
  background: #3b82f6;
  color: white;
}

.btn-confirm:hover {
  background: #2563eb;
}

/* 네비게이션 */
.navigation-actions {
  text-align: center;
  margin-top: 40px;
}

.back-btn {
  padding: 12px 20px;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background: #4b5563;
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
}
</style>