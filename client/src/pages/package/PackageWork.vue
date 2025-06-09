<template>
  <div class="package-work-container">
    <!-- 헤더 -->
    <div class="work-header">
      <nav class="breadcrumb">
        <span class="breadcrumb-item">Home</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">포장</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">포장 라인 선택</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">포장 작업 수행</span>
      </nav>
      
      <div class="header-info">
        <div class="header-left">
          <h1>{{ workInfo.lineName }} - 포장 작업 수행</h1>
          <div class="header-meta">
            <span class="line-type-badge" :class="workInfo.lineType.toLowerCase()">
              {{ workInfo.lineType === 'INNER' ? '내포장' : '외포장' }}
            </span>
            <span class="work-status-badge" :class="workStatus.toLowerCase()">
              {{ getWorkStatusText(workStatus) }}
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button @click="goBackToLineSelection" class="btn-back">
            ← 라인 선택으로 돌아가기
          </button>
        </div>
      </div>
    </div>

    <!-- 메인 컨텐츠 -->
    <div class="work-content">
      <div class="work-layout">
        <!-- 좌측: 작업 제어 및 진행 상황 -->
        <div class="work-main">
          <!-- 작업 제어 패널 -->
          <div class="control-panel">
            <h3>작업 제어</h3>
            
            <!-- 작업 선택 -->
            <div class="control-section">
              <div class="control-row">
                <div class="control-group">
                  <label class="control-label">작업번호 선택</label>
                  <select v-model="selectedWorkOrder" @change="onWorkOrderChange" class="control-select">
                    <option value="">작업을 선택하세요</option>
                    <option v-for="order in availableWorkOrders" :key="order.workNo" :value="order.workNo">
                      {{ order.workNo }} - {{ order.productName }} ({{ order.progressRate }}%)
                    </option>
                  </select>
                </div>
                <div class="control-group">
                  <label class="control-label">투입수량</label>
                  <input 
                    v-model.number="inputQuantity" 
                    type="number" 
                    class="control-input" 
                    placeholder="500"
                    :disabled="!selectedWorkOrder || isWorking"
                  >
                </div>
              </div>
            </div>

            <!-- 작업 버튼들 -->
            <div class="control-buttons">
              <button 
                @click="startWork" 
                :disabled="!canStartWork"
                class="btn-primary"
                :class="{ disabled: !canStartWork }"
              >
                {{ isWorking ? '⏸ 작업 일시정지' : '▶ 작업 시작' }}
              </button>
              <button 
                @click="completeProduction" 
                :disabled="!isWorking"
                class="btn-success"
                :class="{ disabled: !isWorking }"
              >
                ✅ 생산 완료
              </button>
              <button 
                @click="stopWork" 
                :disabled="!isWorking"
                class="btn-warning"
                :class="{ disabled: !isWorking }"
              >
                ⏹ 작업 종료
              </button>
            </div>
          </div>

          <!-- 실시간 진행 상황 -->
          <div class="progress-panel">
            <h3>실시간 진행 상황</h3>
            
            <div class="progress-cards">
              <div class="progress-card">
                <div class="card-header">
                  <span class="card-title">투입수량</span>
                  <span class="card-icon">📥</span>
                </div>
                <div class="card-value">{{ formatNumber(currentWork.inputQuantity) }}</div>
                <div class="card-unit">개</div>
              </div>
              
              <div class="progress-card">
                <div class="card-header">
                  <span class="card-title">생산수량</span>
                  <span class="card-icon">⚙️</span>
                </div>
                <div class="card-value">{{ formatNumber(currentWork.producedQuantity) }}</div>
                <div class="card-unit">개</div>
              </div>
              
              <div class="progress-card success">
                <div class="card-header">
                  <span class="card-title">합격수량</span>
                  <span class="card-icon">✅</span>
                </div>
                <div class="card-value">{{ formatNumber(currentWork.passedQuantity) }}</div>
                <div class="card-unit">개</div>
              </div>
              
              <div class="progress-card danger">
                <div class="card-header">
                  <span class="card-title">불량수량</span>
                  <span class="card-icon">❌</span>
                </div>
                <div class="card-value">{{ formatNumber(currentWork.defectQuantity) }}</div>
                <div class="card-unit">개</div>
              </div>
            </div>

            <!-- 진행률 바 -->
            <div class="progress-section">
              <div class="progress-header">
                <span>전체 진행률</span>
                <span class="progress-percent">{{ currentWork.progressRate }}%</span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: currentWork.progressRate + '%' }"
                ></div>
              </div>
            </div>
          </div>

          <!-- 작업 로그 -->
          <div class="log-panel">
            <h3>작업 로그</h3>
            <div class="log-container">
              <div 
                v-for="log in workLogs" 
                :key="log.id" 
                class="log-item"
                :class="log.type"
              >
                <div class="log-time">{{ formatDateTime(log.timestamp) }}</div>
                <div class="log-content">{{ log.message }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 우측: 작업 정보 및 품질 관리 -->
        <div class="work-sidebar">
          <!-- 현재 작업 정보 -->
          <div class="info-panel">
            <h3>현재 작업 정보</h3>
            
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">작업번호</span>
                <span class="info-value">{{ currentWork.workNo || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">제품명</span>
                <span class="info-value">{{ currentWork.productName || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">포장형태</span>
                <span class="info-value">{{ currentWork.packageType || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">지시수량</span>
                <span class="info-value">{{ formatNumber(currentWork.orderQuantity) || '-' }}</span>
              </div>
            </div>

            <div class="info-section">
              <h4>품질 정보</h4>
              <div class="info-row">
                <span class="info-label">합격률</span>
                <span class="info-value quality-rate" :class="getQualityRateClass(currentWork.passRate)">
                  {{ currentWork.passRate }}%
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">불량률</span>
                <span class="info-value defect-rate">{{ currentWork.defectRate }}%</span>
              </div>
            </div>

            <div class="info-section">
              <h4>작업 정보</h4>
              <div class="info-row">
                <span class="info-label">담당자</span>
                <span class="info-value">{{ currentWork.operator || '김포장' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">작업시간</span>
                <span class="info-value">{{ workElapsedTime }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">시작시간</span>
                <span class="info-value">{{ formatTime(currentWork.startTime) }}</span>
              </div>
            </div>
          </div>

          <!-- 불량 등록 -->
          <div class="defect-panel">
            <h3>불량 등록</h3>
            
            <div class="defect-form">
              <div class="form-group">
                <label>불량 유형</label>
                <select v-model="defectForm.type" class="form-select">
                  <option value="">불량 유형 선택</option>
                  <option value="PACKAGE_DAMAGE">포장지 파손</option>
                  <option value="LABEL_ERROR">라벨 오부착</option>
                  <option value="SEAL_DEFECT">밀봉 불량</option>
                  <option value="CONTAMINATION">이물질 혼입</option>
                  <option value="OTHER">기타</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>불량 수량</label>
                <input 
                  v-model.number="defectForm.quantity" 
                  type="number" 
                  class="form-input" 
                  placeholder="불량 수량 입력"
                >
              </div>
              
              <div class="form-group">
                <label>불량 사유</label>
                <textarea 
                  v-model="defectForm.reason" 
                  class="form-textarea" 
                  placeholder="불량 사유를 입력하세요"
                  rows="3"
                ></textarea>
              </div>
              
              <button @click="registerDefect" class="btn-defect" :disabled="!canRegisterDefect">
                불량 등록
              </button>
            </div>
          </div>

          <!-- 품질 체크리스트 -->
          <div class="quality-panel">
            <h3>품질 체크리스트</h3>
            
            <div class="checklist">
              <div 
                v-for="item in qualityChecklist" 
                :key="item.id" 
                class="checklist-item"
              >
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    v-model="item.checked" 
                    @change="updateQualityStatus"
                  >
                  <span class="checkmark"></span>
                  {{ item.name }}
                </label>
              </div>
            </div>
            
            <div class="quality-status">
              <span class="status-label">품질 상태:</span>
              <span class="status-value" :class="qualityStatus.toLowerCase()">
                {{ getQualityStatusText(qualityStatus) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 작업 완료 확인 모달 -->
    <div v-if="showCompleteModal" class="modal-overlay" @click="closeCompleteModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>작업 완료 확인</h3>
          <button @click="closeCompleteModal" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <div class="complete-summary">
            <h4>작업 결과</h4>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">투입수량</span>
                <span class="summary-value">{{ formatNumber(currentWork.inputQuantity) }}개</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">생산수량</span>
                <span class="summary-value">{{ formatNumber(currentWork.producedQuantity) }}개</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">합격수량</span>
                <span class="summary-value">{{ formatNumber(currentWork.passedQuantity) }}개</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">불량수량</span>
                <span class="summary-value">{{ formatNumber(currentWork.defectQuantity) }}개</span>
              </div>
            </div>
          </div>
          <p class="confirmation-text">작업을 완료하시겠습니까?</p>
        </div>
        <div class="modal-actions">
          <button @click="closeCompleteModal" class="btn-cancel">취소</button>
          <button @click="confirmCompleteWork" class="btn-confirm">작업 완료</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

// 라인 정보 (URL 파라미터에서 가져옴)
const workInfo = ref({
  lineId: route.query.line_id || '',
  lineName: route.query.line_name || '',
  lineType: route.query.line_type || 'INNER'
})

// 작업 상태
const workStatus = ref('READY') // READY, WORKING, PAUSED, COMPLETED
const isWorking = ref(false)
const workStartTime = ref(null)
const workElapsedTime = ref('00:00:00')

// 작업 선택
const selectedWorkOrder = ref('')
const inputQuantity = ref(500)
const availableWorkOrders = ref([
  {
    workNo: 'PM1001',
    productName: '타이레놀정500mg',
    packageType: '10정/PTP',
    orderQuantity: 7000,
    progressRate: 99
  },
  {
    workNo: 'PM1002', 
    productName: '타이레놀정500mg',
    packageType: '10정/PTP',
    orderQuantity: 1000,
    progressRate: 99
  },
  {
    workNo: 'PM1003',
    productName: '타이레놀정500mg', 
    packageType: '10정/PTP',
    orderQuantity: 3000,
    progressRate: 97
  }
])

// 현재 작업 정보
const currentWork = ref({
  workNo: '',
  productName: '',
  packageType: '',
  orderQuantity: 0,
  inputQuantity: 0,
  producedQuantity: 0,
  passedQuantity: 0,
  defectQuantity: 0,
  progressRate: 0,
  passRate: 0,
  defectRate: 0,
  operator: '김포장',
  startTime: null
})

// 작업 로그
const workLogs = ref([
  {
    id: 1,
    timestamp: new Date(),
    message: '작업 페이지에 접속했습니다.',
    type: 'info'
  }
])

// 불량 등록
const defectForm = ref({
  type: '',
  quantity: 0,
  reason: ''
})

// 품질 체크리스트
const qualityChecklist = ref([
  { id: 1, name: '포장재 상태 확인', checked: false },
  { id: 2, name: '라벨 부착 상태 확인', checked: false },
  { id: 3, name: '밀봉 상태 확인', checked: false },
  { id: 4, name: '외관 검사', checked: false },
  { id: 5, name: '중량 확인', checked: false }
])

const qualityStatus = ref('PENDING') // PENDING, GOOD, WARNING, CRITICAL

// 모달
const showCompleteModal = ref(false)

// 타이머
let workTimer = null

// 계산된 값들
const canStartWork = computed(() => {
  return selectedWorkOrder.value && inputQuantity.value > 0 && !isWorking.value
})

const canRegisterDefect = computed(() => {
  return defectForm.value.type && defectForm.value.quantity > 0 && isWorking.value
})

// 컴포넌트 마운트
onMounted(() => {
  // URL 파라미터에서 작업번호가 있으면 자동 선택
  if (route.query.work_no) {
    selectedWorkOrder.value = route.query.work_no
    onWorkOrderChange()
  }
  
  addLog('작업 페이지에 접속했습니다.', 'info')
})

onUnmounted(() => {
  if (workTimer) {
    clearInterval(workTimer)
  }
})

// 작업번호 변경시
function onWorkOrderChange() {
  const selectedOrder = availableWorkOrders.value.find(order => order.workNo === selectedWorkOrder.value)
  if (selectedOrder) {
    Object.assign(currentWork.value, {
      workNo: selectedOrder.workNo,
      productName: selectedOrder.productName,
      packageType: selectedOrder.packageType,
      orderQuantity: selectedOrder.orderQuantity,
      inputQuantity: 0,
      producedQuantity: 0,
      passedQuantity: 0,
      defectQuantity: 0,
      progressRate: 0,
      passRate: 100,
      defectRate: 0
    })
    
    addLog(`작업번호 ${selectedOrder.workNo}를 선택했습니다.`, 'info')
  }
}

// 작업 시작/일시정지
function startWork() {
  if (!isWorking.value) {
    // 작업 시작
    isWorking.value = true
    workStatus.value = 'WORKING'
    workStartTime.value = new Date()
    currentWork.value.startTime = workStartTime.value
    currentWork.value.inputQuantity = inputQuantity.value
    
    // 타이머 시작
    startWorkTimer()
    
    addLog(`작업을 시작했습니다. (투입수량: ${inputQuantity.value}개)`, 'success')
    
    // 자동 생산 시뮬레이션 시작
    startProductionSimulation()
    
  } else {
    // 작업 일시정지
    isWorking.value = false
    workStatus.value = 'PAUSED'
    
    if (workTimer) {
      clearInterval(workTimer)
    }
    
    addLog('작업을 일시정지했습니다.', 'warning')
  }
}

// 생산 완료
function completeProduction() {
  showCompleteModal.value = true
}

// 작업 종료
function stopWork() {
  isWorking.value = false
  workStatus.value = 'COMPLETED'
  
  if (workTimer) {
    clearInterval(workTimer)
  }
  
  addLog('작업을 종료했습니다.', 'info')
}

// 작업 완료 확인
function confirmCompleteWork() {
  isWorking.value = false
  workStatus.value = 'COMPLETED'
  
  if (workTimer) {
    clearInterval(workTimer)
  }
  
  addLog('작업이 완료되었습니다.', 'success')
  closeCompleteModal()
  
  // 작업 완료 후 라인 선택으로 돌아가기
  setTimeout(() => {
    goBackToLineSelection()
  }, 2000)
}

// 불량 등록
function registerDefect() {
  if (!canRegisterDefect.value) return
  
  currentWork.value.defectQuantity += defectForm.value.quantity
  updateWorkProgress()
  
  addLog(`불량 등록: ${getDefectTypeText(defectForm.value.type)} ${defectForm.value.quantity}개`, 'error')
  
  // 폼 초기화
  defectForm.value = {
    type: '',
    quantity: 0,
    reason: ''
  }
}

// 품질 상태 업데이트
function updateQualityStatus() {
  const checkedCount = qualityChecklist.value.filter(item => item.checked).length
  const totalCount = qualityChecklist.value.length
  const checkRate = (checkedCount / totalCount) * 100
  
  if (checkRate === 100) {
    qualityStatus.value = 'GOOD'
  } else if (checkRate >= 80) {
    qualityStatus.value = 'WARNING'
  } else {
    qualityStatus.value = 'CRITICAL'
  }
}

// 작업 타이머 시작
function startWorkTimer() {
  workTimer = setInterval(() => {
    if (workStartTime.value) {
      const elapsed = new Date() - workStartTime.value
      workElapsedTime.value = formatElapsedTime(elapsed)
    }
  }, 1000)
}

// 생산 시뮬레이션
function startProductionSimulation() {
  const simulationInterval = setInterval(() => {
    if (!isWorking.value) {
      clearInterval(simulationInterval)
      return
    }
    
    // 랜덤 생산량 증가
    const increment = Math.floor(Math.random() * 5) + 1
    currentWork.value.producedQuantity = Math.min(
      currentWork.value.producedQuantity + increment,
      currentWork.value.inputQuantity
    )
    
    // 합격/불량 랜덤 배정 (95% 합격률)
    const isPass = Math.random() > 0.05
    if (isPass) {
      currentWork.value.passedQuantity += increment
    } else {
      currentWork.value.defectQuantity += Math.floor(increment * 0.1)
      currentWork.value.passedQuantity += Math.ceil(increment * 0.9)
    }
    
    updateWorkProgress()
    
    // 완료 체크
    if (currentWork.value.producedQuantity >= currentWork.value.inputQuantity) {
      clearInterval(simulationInterval)
      addLog('투입 수량의 생산이 완료되었습니다.', 'success')
    }
  }, 2000)
}

// 작업 진행률 업데이트
function updateWorkProgress() {
  if (currentWork.value.inputQuantity > 0) {
    currentWork.value.progressRate = Math.round(
      (currentWork.value.producedQuantity / currentWork.value.inputQuantity) * 100
    )
  }
  
  if (currentWork.value.producedQuantity > 0) {
    currentWork.value.passRate = Math.round(
      (currentWork.value.passedQuantity / currentWork.value.producedQuantity) * 100
    )
    currentWork.value.defectRate = Math.round(
      (currentWork.value.defectQuantity / currentWork.value.producedQuantity) * 100
    )
  }
}

// 로그 추가
function addLog(message, type = 'info') {
  workLogs.value.unshift({
    id: Date.now(),
    timestamp: new Date(),
    message,
    type
  })
  
  // 최대 50개 로그만 유지
  if (workLogs.value.length > 50) {
    workLogs.value = workLogs.value.slice(0, 50)
  }
}

// 모달 제어
function closeCompleteModal() {
  showCompleteModal.value = false
}

// 라인 선택으로 돌아가기
function goBackToLineSelection() {
  router.push({ name: 'PackageLineSelection' })
}

// 헬퍼 함수들
function formatNumber(num) {
  return num ? num.toLocaleString() : '0'
}

function formatTime(date) {
  if (!date) return '-'
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(date) {
  if (!date) return '-'
  return date.toLocaleString('ko-KR', { 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

function formatElapsedTime(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function getWorkStatusText(status) {
  const map = {
    'READY': '준비',
    'WORKING': '작업중',
    'PAUSED': '일시정지',
    'COMPLETED': '완료'
  }
  return map[status] || status
}

function getQualityStatusText(status) {
  const map = {
    'PENDING': '검사 대기',
    'GOOD': '양호',
    'WARNING': '주의',
    'CRITICAL': '위험'
  }
  return map[status] || status
}

function getQualityRateClass(rate) {
  if (rate >= 98) return 'excellent'
  if (rate >= 95) return 'good'
  if (rate >= 90) return 'warning'
  return 'danger'
}

function getDefectTypeText(type) {
  const map = {
    'PACKAGE_DAMAGE': '포장지 파손',
    'LABEL_ERROR': '라벨 오부착',
    'SEAL_DEFECT': '밀봉 불량',
    'CONTAMINATION': '이물질 혼입',
    'OTHER': '기타'
  }
  return map[type] || type
}
</script>

<style scoped>
.package-work-container {
  min-height: 100vh;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 헤더 */
.work-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 100;
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

.header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
}

.header-left h1 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.header-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.line-type-badge,
.work-status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.line-type-badge.inner {
  background: #dbeafe;
  color: #1d4ed8;
}

.line-type-badge.outer {
  background: #fef3c7;
  color: #a16207;
}

.work-status-badge.ready {
  background: #e0e7ff;
  color: #3730a3;
}

.work-status-badge.working {
  background: #dcfce7;
  color: #166534;
}

.work-status-badge.paused {
  background: #fef3c7;
  color: #a16207;
}

.work-status-badge.completed {
  background: #f3e8ff;
  color: #7c3aed;
}

.btn-back {
  padding: 10px 16px;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-back:hover {
  background: #4b5563;
}

/* 메인 레이아웃 */
.work-content {
  padding: 24px;
}

.work-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.work-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.work-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 패널 공통 스타일 */
.control-panel,
.progress-panel,
.log-panel,
.info-panel,
.defect-panel,
.quality-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.control-panel h3,
.progress-panel h3,
.log-panel h3,
.info-panel h3,
.defect-panel h3,
.quality-panel h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #f1f5f9;
}

/* 작업 제어 패널 */
.control-section {
  margin-bottom: 20px;
}

.control-row {
  display: flex;
  gap: 16px;
  align-items: end;
}

.control-group {
  flex: 1;
}

.control-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.control-select,
.control-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.control-select:focus,
.control-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.control-select:disabled,
.control-input:disabled {
  background: #f9fafb;
  color: #6b7280;
}

.control-buttons {
  display: flex;
  gap: 12px;
}

.btn-primary,
.btn-success,
.btn-warning {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(.disabled) {
  background: #2563eb;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover:not(.disabled) {
  background: #059669;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover:not(.disabled) {
  background: #d97706;
}

.btn-primary.disabled,
.btn-success.disabled,
.btn-warning.disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

/* 진행 상황 패널 */
.progress-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.progress-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: all 0.2s;
}

.progress-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.progress-card.success {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.progress-card.danger {
  background: #fef2f2;
  border-color: #fecaca;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.card-icon {
  font-size: 16px;
}

.card-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.card-unit {
  font-size: 12px;
  color: #6b7280;
}

.progress-section {
  margin-top: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-percent {
  font-size: 18px;
  font-weight: 700;
  color: #3b82f6;
}

.progress-bar {
  width: 100%;
  height: 12px;
  background: #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.3s ease;
  border-radius: 6px;
}

/* 로그 패널 */
.log-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 12px;
}

.log-item {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  padding: 8px;
  border-radius: 4px;
  font-size: 13px;
}

.log-item.info {
  background: #f0f9ff;
  border-left: 3px solid #3b82f6;
}

.log-item.success {
  background: #f0fdf4;
  border-left: 3px solid #10b981;
}

.log-item.warning {
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
}

.log-item.error {
  background: #fef2f2;
  border-left: 3px solid #ef4444;
}

.log-time {
  color: #6b7280;
  font-weight: 500;
  white-space: nowrap;
}

.log-content {
  color: #1e293b;
}

/* 정보 패널 */
.info-section {
  margin-bottom: 20px;
}

.info-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
}

.info-label {
  color: #6b7280;
  font-weight: 500;
}

.info-value {
  font-weight: 600;
  color: #1e293b;
}

.quality-rate.excellent {
  color: #059669;
}

.quality-rate.good {
  color: #3b82f6;
}

.quality-rate.warning {
  color: #f59e0b;
}

.quality-rate.danger {
  color: #ef4444;
}

.defect-rate {
  color: #ef4444;
}

/* 불량 등록 패널 */
.defect-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.form-select,
.form-input,
.form-textarea {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-select:focus,
.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.btn-defect {
  padding: 10px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-defect:hover:not(:disabled) {
  background: #dc2626;
}

.btn-defect:disabled {
  background: #e5e7eb;
  color: #9ca3af;
  cursor: not-allowed;
}

/* 품질 체크리스트 */
.checklist {
  margin-bottom: 16px;
}

.checklist-item {
  margin-bottom: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.quality-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 14px;
}

.status-label {
  color: #6b7280;
  font-weight: 500;
}

.status-value {
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.status-value.pending {
  background: #e0e7ff;
  color: #3730a3;
}

.status-value.good {
  background: #dcfce7;
  color: #166534;
}

.status-value.warning {
  background: #fef3c7;
  color: #a16207;
}

.status-value.critical {
  background: #fecaca;
  color: #dc2626;
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

.complete-summary {
  margin-bottom: 20px;
}

.complete-summary h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 14px;
}

.summary-label {
  color: #6b7280;
  font-weight: 500;
}

.summary-value {
  color: #1e293b;
  font-weight: 600;
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

/* 반응형 */
@media (max-width: 1024px) {
  .work-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .progress-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .control-row {
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .work-content {
    padding: 16px;
  }
  
  .header-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .progress-cards {
    grid-template-columns: 1fr;
  }
  
  .control-buttons {
    flex-direction: column;
  }
  
  .summary-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}
</style>