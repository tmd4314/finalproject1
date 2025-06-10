<template>
  <div class="package-work-container">
    <!-- 헤더 -->
    <div class="work-header">
      <nav class="breadcrumb">
        <span class="breadcrumb-item">Home</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item">포장</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item" @click="goBackToLineSelection" style="cursor: pointer; color: #3b82f6;">포장 라인 선택</span>
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
            <div class="control-section">
              <div class="control-row">
                <div class="control-group">
                  <label class="control-label">작업번호 선택</label>
                  <select v-model="selectedWorkOrder" @change="onWorkOrderChange" class="control-select">
                    <option value="">작업을 선택하세요</option>
                    <option v-for="order in availableWorkOrders" :key="order.work_no" :value="order.work_no">
                      {{ order.work_no }} - {{ order.product_name }}
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
                <div class="card-value">{{ formatNumber(currentWork.input_qty) }}</div>
                <div class="card-unit">개</div>
              </div>
              <div class="progress-card">
                <div class="card-header">
                  <span class="card-title">생산수량</span>
                  <span class="card-icon">⚙️</span>
                </div>
                <div class="card-value">{{ formatNumber(currentWork.input_qty) }}</div>
                <div class="card-unit">개</div>
              </div>
              <div class="progress-card success">
                <div class="card-header">
                  <span class="card-title">합격수량</span>
                  <span class="card-icon">✅</span>
                </div>
                <div class="card-value">{{ formatNumber(currentWork.output_qty) }}</div>
                <div class="card-unit">개</div>
              </div>
              <div class="progress-card danger">
                <div class="card-header">
                  <span class="card-title">불량수량</span>
                  <span class="card-icon">❌</span>
                </div>
                <div class="card-value">{{ formatNumber(currentWork.defect_qty) }}</div>
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
                <div class="progress-fill" :style="{ width: currentWork.progressRate + '%' }"></div>
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

        <!-- 우측: 작업 정보 -->
        <div class="work-sidebar">
          <div class="info-panel">
            <h3>현재 작업 정보</h3>
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">라인 정보</span>
                <span class="info-value">{{ workInfo.lineName }} ({{ workInfo.lineId }})</span>
              </div>
              <div class="info-row">
                <span class="info-label">작업번호</span>
                <span class="info-value">{{ currentWork.work_no || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">제품명</span>
                <span class="info-value">{{ currentWork.product_name || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">포장형태</span>
                <span class="info-value">{{ currentWork.package_type || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">지시수량</span>
                <span class="info-value">{{ formatNumber(currentWork.order_quantity) || '-' }}</span>
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
                <span class="info-value">{{ currentWork.employee_name || '김포장' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">작업시간</span>
                <span class="info-value">{{ workElapsedTime }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">시작시간</span>
                <span class="info-value">{{ formatTime(currentWork.start_time) }}</span>
              </div>
            </div>
          </div>

          <!-- 라인 변경 버튼 -->
          <div class="line-change-panel">
            <button @click="goBackToLineSelection" class="btn-line-change">
              🔄 다른 라인으로 변경하기
            </button>
            <p class="line-change-help">
              잘못된 라인을 선택했거나 다른 라인에서 작업하고 싶다면 클릭하세요
            </p>
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
                <span class="summary-value">{{ formatNumber(currentWork.input_qty) }}개</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">합격수량</span>
                <span class="summary-value">{{ formatNumber(currentWork.output_qty) }}개</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">불량수량</span>
                <span class="summary-value">{{ formatNumber(currentWork.defect_qty) }}개</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">합격률</span>
                <span class="summary-value">{{ currentWork.passRate }}%</span>
              </div>
            </div>
          </div>
          <p class="confirmation-text">{{ workInfo.lineType === 'INNER' ? '내포장' : '외포장' }} 작업을 완료하시겠습니까?</p>
          <div class="next-step-info">
            <p v-if="workInfo.lineType === 'INNER'" class="next-step-text">
              💡 내포장 완료 후 외포장 작업을 진행할 수 있습니다.
            </p>
            <p v-else class="next-step-text">
              🎉 모든 포장 작업이 완료됩니다!
            </p>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeCompleteModal" class="btn-cancel">취소</button>
          <button @click="confirmCompleteWork" class="btn-confirm">작업 완료</button>
        </div>
      </div>
    </div>

    <!-- 로딩 스피너 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{ loadingMessage }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

// 라인 정보 (URL 파라미터에서 가져옴)
const router = useRouter()
const route = useRoute()
const workInfo = ref({
  lineId: route.query.line_id || '',
  lineName: route.query.line_name || '',
  lineType: route.query.line_type || 'INNER',
  returnTo: route.query.return_to || '',
  currentPackageType: route.query.current_package_type || ''
})

// API 기본 설정
const API_BASE_URL = 'http://localhost:3000/packages'

// 로딩 상태
const loading = ref(false)
const loadingMessage = ref('')

// 작업 상태
const workStatus = ref('READY') // READY, WORKING, PAUSED, COMPLETED
const isWorking = ref(false)
const workStartTime = ref(null)
const workElapsedTime = ref('00:00:00')

// 작업 선택
const selectedWorkOrder = ref('')
const inputQuantity = ref(500)
const availableWorkOrders = ref([])

// 현재 작업 정보
const currentWork = ref({
  work_no: '',
  product_name: '',
  package_type: '',
  order_quantity: 0,
  input_qty: 0,
  output_qty: 0,
  defect_qty: 0,
  progressRate: 0,
  passRate: 0,
  defectRate: 0,
  employee_name: '김포장',
  start_time: null
})

// 작업 로그
const workLogs = ref([])

// 모달
const showCompleteModal = ref(false)

// 타이머
let workTimer = null

// 계산된 값들
const canStartWork = computed(() => {
  return selectedWorkOrder.value && inputQuantity.value > 0 && !isWorking.value
})

// 컴포넌트 마운트
onMounted(async () => {
  await loadAvailableWorkOrders()
  if (route.query.work_no) {
    selectedWorkOrder.value = route.query.work_no
    await onWorkOrderChange()
  }
  addLog(`${workInfo.value.lineName}에서 작업을 시작합니다.`, 'info')
})

onUnmounted(() => {
  if (workTimer) clearInterval(workTimer)
})

// 1. 작업 목록 조회
async function loadAvailableWorkOrders() {
  try {
    loading.value = true
    loadingMessage.value = '작업 목록을 불러오는 중...'
    const res = await axios.get(API_BASE_URL)
    availableWorkOrders.value = res.data
    addLog(`${availableWorkOrders.value.length}개의 작업을 불러왔습니다.`, 'info')
  } catch (error) {
    addLog('작업 목록 로드에 실패했습니다.', 'error')
  } finally {
    loading.value = false
  }
}

// 2. 작업 선택시 상세 조회
async function onWorkOrderChange() {
  if (!selectedWorkOrder.value) return
  try {
    loading.value = true
    loadingMessage.value = '작업 상세 정보를 불러오는 중...'
    const res = await axios.get(`${API_BASE_URL}/${selectedWorkOrder.value}`)
    currentWork.value = {
      ...res.data,
      progressRate: 0,
      passRate: 0,
      defectRate: 0,
      input_qty: 0,
      output_qty: 0,
      defect_qty: 0,
      start_time: null
    }
    addLog(`작업번호 ${selectedWorkOrder.value} 상세정보를 불러왔습니다.`, 'info')
  } catch (err) {
    addLog('작업 상세 정보 불러오기에 실패했습니다.', 'error')
  } finally {
    loading.value = false
  }
}

// 3. 작업 시작(등록)
async function startWork() {
  if (!isWorking.value) {
    try {
      loading.value = true
      loadingMessage.value = '작업을 시작하는 중...'
      const workData = {
        work_no: selectedWorkOrder.value,
        line_id: workInfo.value.lineId,
        work_line: workInfo.value.lineName,
        work_step: workInfo.value.lineType === 'INNER' ? '내포장' : '외포장',
        step_name: currentWork.value.product_name,
        input_qty: inputQuantity.value,
        eq_code: 'PKG001',
        employee_no: 'EMP001',
        employee_name: currentWork.value.employee_name
      }
      // 등록
      const response = await axios.post(`${API_BASE_URL}/work`, workData)
      // 서버에서 계산된 결과 반영
      currentWork.value.input_qty = inputQuantity.value
      currentWork.value.output_qty = response.data.output_qty
      currentWork.value.defect_qty = response.data.defect_qty
      currentWork.value.passRate = Math.round((response.data.output_qty / inputQuantity.value) * 100)
      currentWork.value.defectRate = 100 - currentWork.value.passRate
      workStatus.value = 'WORKING'
      isWorking.value = true
      workStartTime.value = new Date()
      currentWork.value.start_time = workStartTime.value
      updateWorkProgress()
      startWorkTimer()
      addLog(`작업을 시작했습니다. (투입수량: ${inputQuantity.value}개)`, 'success')
      addLog(`예상 합격수량: ${currentWork.value.output_qty}개, 불량수량: ${currentWork.value.defect_qty}개`, 'info')
    } catch (error) {
      addLog('작업 시작에 실패했습니다.', 'error')
    } finally {
      loading.value = false
    }
  } else {
    isWorking.value = false
    workStatus.value = 'PAUSED'
    if (workTimer) clearInterval(workTimer)
    addLog('작업을 일시정지했습니다.', 'warning')
  }
}

// 4. 생산 완료 버튼
function completeProduction() {
  showCompleteModal.value = true
}

// 5. 작업 완료 처리
async function confirmCompleteWork() {
  try {
    loading.value = true
    loadingMessage.value = '작업을 완료하는 중...'
    const res = await axios.put(`${API_BASE_URL}/work/${currentWork.value.work_no}/complete`, {
      input_qty: currentWork.value.input_qty
    })
    currentWork.value.output_qty = res.data.output_qty
    currentWork.value.defect_qty = res.data.defect_qty
    currentWork.value.passRate = Math.round((res.data.output_qty / currentWork.value.input_qty) * 100)
    currentWork.value.defectRate = 100 - currentWork.value.passRate
    isWorking.value = false
    workStatus.value = 'COMPLETED'
    if (workTimer) clearInterval(workTimer)
    updateWorkProgress()
    addLog('작업이 완료되었습니다.', 'success')
    closeCompleteModal()
    setTimeout(() => { goBackToLineSelectionWithCompletion() }, 2000)
  } catch (error) {
    addLog('작업 완료 처리에 실패했습니다.', 'error')
  } finally {
    loading.value = false
  }
}

// 작업 종료 (강제)
function stopWork() {
  isWorking.value = false
  workStatus.value = 'COMPLETED'
  if (workTimer) clearInterval(workTimer)
  addLog('작업을 종료했습니다.', 'info')
}

// 진행률/품질 업데이트
function updateWorkProgress() {
  if (currentWork.value.input_qty > 0) {
    currentWork.value.progressRate = 100 // 작업 시작하면 100%로 표시
    currentWork.value.passRate = Math.round(
      (currentWork.value.output_qty / currentWork.value.input_qty) * 100
    )
    currentWork.value.defectRate = Math.round(
      (currentWork.value.defect_qty / currentWork.value.input_qty) * 100
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
  if (workLogs.value.length > 50) workLogs.value = workLogs.value.slice(0, 50)
}

// 모달 제어
function closeCompleteModal() { showCompleteModal.value = false }

// 라인 선택으로 돌아가기 (작업 완료시)
function goBackToLineSelectionWithCompletion() {
  if (window.handlePackageWorkCompleted) {
    window.handlePackageWorkCompleted(workInfo.value.lineType)
  }
  if (router) {
    router.push({
      name: 'package_line',
      query: {
        work_completed: 'true',
        completed_type: workInfo.value.lineType
      }
    })
  } else {
    window.location.href = `/packaging/line?work_completed=true&completed_type=${workInfo.value.lineType}`
  }
}

// 라인 선택으로 돌아가기 (작업 완료 없이)
function goBackToLineSelection() {
  if (isWorking.value) {
    if (!confirm('진행 중인 작업이 있습니다. 정말 라인 선택으로 돌아가시겠습니까?')) {
      return
    }
  }
  if (router) {
    router.push({ name: 'package_line' })
  } else {
    window.location.href = '/packaging/line'
  }
}

// 헬퍼 함수들
function formatNumber(num) { return num ? num.toLocaleString() : '0' }
function formatTime(date) {
  if (!date) return '-'
  return date instanceof Date
    ? date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : new Date(date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}
function formatDateTime(date) {
  if (!date) return '-'
  return date instanceof Date
    ? date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : new Date(date).toLocaleString('ko-KR', {
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
    'READY': '준비', 'WORKING': '작업중', 'PAUSED': '일시정지', 'COMPLETED': '완료'
  }
  return map[status] || status
}
function getQualityRateClass(rate) {
  if (rate >= 98) return 'excellent'
  if (rate >= 95) return 'good'
  if (rate >= 90) return 'warning'
  return 'danger'
}

// 타이머
function startWorkTimer() {
  workTimer = setInterval(() => {
    if (workStartTime.value) {
      const elapsed = new Date() - workStartTime.value
      workElapsedTime.value = formatElapsedTime(elapsed)
    }
  }, 1000)
}

defineOptions({
  name: 'PackageWork'
})
</script>


<style scoped>
.package-work-container {
  min-height: 100vh;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 로딩 오버레이 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e2e8f0;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: white;
  font-size: 16px;
  font-weight: 500;
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

.control-panel,
.progress-panel,
.log-panel,
.info-panel,
.line-change-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.control-panel h3,
.progress-panel h3,
.log-panel h3,
.info-panel h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #f1f5f9;
}

.control-section {
  margin-bottom: 20px;
}

.control-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
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

/* 라인 변경 패널 */
.line-change-panel {
  text-align: center;
}

.btn-line-change {
  width: 100%;
  padding: 16px 20px;
  background: #f59e0b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 12px;
}

.btn-line-change:hover {
  background: #d97706;
  transform: translateY(-1px);
}

.line-change-help {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
  margin: 0;
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
  margin-bottom: 16px;
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
  margin: 0 0 16px 0;
  text-align: center;
}

.next-step-info {
  background: #f0f9ff;
  padding: 12px;
  border-radius: 6px;
  border-left: 3px solid #3b82f6;
}

.next-step-text {
  font-size: 14px;
  color: #1e293b;
  margin: 0;
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