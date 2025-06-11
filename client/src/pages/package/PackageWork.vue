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
                  <select 
                    v-model="selectedWorkOrder" 
                    @change="onWorkOrderChange"
                    class="control-select" 
                    :disabled="isWorking"
                  >
                    <option value="">작업을 선택하세요</option>
                    <option 
                      v-for="work in availableWorkOrders" 
                      :key="work.work_no" 
                      :value="work.work_no"
                    >
                      {{ work.work_no }} - {{ work.step_name }} ({{ getWorkStatusText(work.step_status || 'READY') }} {{ work.progress_rate }}%)
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
                <div class="control-group">
                  <label class="control-label">생산속도 (개/초)</label>
                  <select 
                    v-model.number="productionSettings.productionSpeed" 
                    class="control-select" 
                    :disabled="isWorking"
                  >
                    <option value="5">느림 (5개/초)</option>
                    <option value="10">보통 (10개/초)</option>
                    <option value="20">빠름 (20개/초)</option>
                    <option value="50">매우빠름 (50개/초)</option>
                  </select>
                </div>
              </div>
            </div>
            <!-- 작업 버튼들 -->
            <div class="control-buttons">
              <button 
                @click="handleWorkButton" 
                :disabled="!canStartWork && !isWorking && workStatus !== 'PAUSED'"
                class="btn-primary"
                :class="{ disabled: !canStartWork && !isWorking && workStatus !== 'PAUSED' }"
              >
                {{ getWorkButtonText() }}
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
                <div class="card-value">{{ formatNumber(productionSettings.currentProgress) }}</div>
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
          <p class="confirmation-text">
            {{ workInfo.lineType === 'INNER' ? '내포장' : '외포장' }} 작업을 완료하시겠습니까?
          </p>
          <div class="next-step-info">
            <p v-if="workInfo.lineType === 'INNER'" class="next-step-text">
              ✅ 내포장 완료 후 외포장 라인을 선택하여 외포장 작업을 진행할 수 있습니다.
            </p>
            <p v-else class="next-step-text">
              🎉 외포장 완료로 모든 포장 작업이 완료됩니다!
            </p>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeCompleteModal" class="btn-cancel">취소</button>
          <button @click="confirmCompleteWork" class="btn-confirm">
            {{ workInfo.lineType === 'INNER' ? '내포장 완료 → 외포장 진행' : '외포장 완료' }}
          </button>
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

// axios 기본 설정
axios.defaults.timeout = 10000
axios.defaults.headers.common['Content-Type'] = 'application/json'

// 라인 정보 (URL 파라미터에서 가져옴)
const router = useRouter()
const route = useRoute()
const workInfo = ref({
  lineId: route.query.line_id || '1',
  lineName: route.query.line_name || 'A라인 내포장',
  lineType: route.query.line_type || 'INNER',
  returnTo: route.query.return_to || '',
  currentPackageType: route.query.current_package_type || ''
})

// 🔥 수정된 API 기본 설정 (백엔드 구조에 맞게)
const PACKAGES_API_URL = 'http://localhost:3000/packages'
const LINES_API_URL = 'http://localhost:3000/api/lines'

// 로딩 상태
const loading = ref(false)
const loadingMessage = ref('')

// 작업 상태
const workStatus = ref('READY') // READY, WORKING, PAUSED, COMPLETED
const isWorking = ref(false)
const workStartTime = ref(null)
const workElapsedTime = ref('00:00:00')

// 🔥 수정: 작업 선택 (셀렉트박스용)
const selectedWorkOrder = ref('')
const inputQuantity = ref(500)
const availableWorkOrders = ref([]) // 작업번호 목록

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
let productionTimer = null

// 🔥 생산 시뮬레이션 설정
const productionSettings = ref({
  productionSpeed: 10, // 초당 생산량
  defectRate: 0.02, // 2% 불량률
  targetQty: 0, // 목표 생산량
  currentProgress: 0 // 현재 진행 수량
})

// 계산된 값들
const canStartWork = computed(() => {
  return selectedWorkOrder.value && inputQuantity.value > 0 && !isWorking.value
})

// 🔥 새로 추가: 데이터 계산 헬퍼 함수들
function calculatePassRate(outputQty, inputQty) {
  if (!inputQty || inputQty === 0) return 0
  return Math.round((outputQty / inputQty) * 100)
}

function calculateDefectRate(defectQty, inputQty) {
  if (!inputQty || inputQty === 0) return 0
  return Math.round((defectQty / inputQty) * 100)
}

// 🔥 수정된 상태 업데이트 함수 (한글 상태값 지원)
function updateWorkStatusFromData(workData) {
  switch (workData.step_status) {
    case '진행중':
    case 'IN_PROGRESS':
      workStatus.value = 'WORKING'
      isWorking.value = true
      if (workData.start_time) {
        workStartTime.value = new Date(workData.start_time)
        startWorkTimer()
      }
      // 🔥 진행중 상태일 때 자동으로 생산 시뮬레이션 시작
      setTimeout(() => {
        if (isWorking.value && !productionTimer) {
          startProductionSimulation()
          addLog('기존 진행 중인 작업의 생산을 재개합니다.', 'info')
        }
      }, 1000)
      break
    case '완료':
    case 'COMPLETED':
      workStatus.value = 'COMPLETED'
      isWorking.value = false
      if (productionTimer) {
        clearInterval(productionTimer)
        productionTimer = null
      }
      break
    case '일시정지':
    case 'PAUSED':
      workStatus.value = 'PAUSED'
      isWorking.value = false
      if (productionTimer) {
        clearInterval(productionTimer)
        productionTimer = null
      }
      break
    case '준비':
    case 'READY':
    default:
      workStatus.value = 'READY'
      isWorking.value = false
      if (productionTimer) {
        clearInterval(productionTimer)
        productionTimer = null
      }
  }
}

function resetCurrentWork() {
  currentWork.value = {
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
  }
}

// 컴포넌트 마운트 (수정된 버전)
onMounted(() => {
  nextTick(async () => {
    try {
      await initializeWorkPage()
    } catch (error) {
      console.error('페이지 초기화 오류:', error)
      addLog('페이지 초기화에 실패했습니다.', 'error')
    }
  })
})

onUnmounted(() => {
  if (workTimer) {
    clearInterval(workTimer)
    workTimer = null
  }
  // 🔥 생산 타이머도 정리
  if (productionTimer) {
    clearInterval(productionTimer)
    productionTimer = null
  }
})

// 🔥 수정된 페이지 초기화 함수
async function initializeWorkPage() {
  try {
    loading.value = true
    loadingMessage.value = '작업 정보를 초기화하는 중...'
    
    addLog(`${workInfo.value.lineName || '선택된 라인'}에서 작업을 시작합니다.`, 'info')
    
    // 1. 작업번호 목록 먼저 로드
    await loadAvailableWorkOrders()
    
    // 2. URL에서 전달된 작업번호가 있으면 설정
    if (route.query.work_no) {
      selectedWorkOrder.value = route.query.work_no
      await onWorkOrderChange()
      addLog(`작업번호 ${route.query.work_no}가 선택되었습니다.`, 'info')
    } else {
      // 기본적으로 101번 작업을 선택 (백엔드 로그에서 보이는 대로)
      selectedWorkOrder.value = '101'
      await onWorkOrderChange()
      addLog('작업번호 101이 자동으로 선택되었습니다.', 'info')
    }
    
    addLog('페이지 초기화가 완료되었습니다.', 'success')
    
  } catch (error) {
    console.error('페이지 초기화 실패:', error)
    addLog('페이지 초기화에 실패했지만 수동으로 작업번호를 입력할 수 있습니다.', 'warning')
    
    // 🔥 임시 테스트: 백엔드에서 조회되는 101번 작업 데이터 직접 설정
    selectedWorkOrder.value = '101'
    
    // 백엔드 로그에서 보이는 데이터를 직접 설정
    currentWork.value = {
      work_no: '101',
      product_name: '1차포장',
      package_type: 'A라인 내포장',
      order_quantity: 3000,
      input_qty: 3000,
      output_qty: 0,
      defect_qty: 0, // 🔥 수정: 초기값 0으로 설정
      progressRate: 0,
      passRate: 0,
      defectRate: 0, // 🔥 수정: 초기값 0으로 설정
      employee_name: '김내포',
      start_time: null,
      step_status: '진행중' // 🔥 한글 상태값으로 설정
    }
    
    inputQuantity.value = 500
    
    // 🔥 생산 시뮬레이션 초기 설정
    productionSettings.value.targetQty = 500
    productionSettings.value.currentProgress = 0
    
    // 🔥 상태 업데이트 및 자동 시작
    updateWorkStatusFromData({ step_status: '진행중' })
    
    addLog('작업번호 101 데이터를 임시로 설정했습니다.', 'info')
    addLog('생산 시뮬레이션이 자동으로 시작됩니다.', 'info')
    
  } finally {
    loading.value = false
  }
}

// 🔥 수정된 작업번호 목록 조회
async function loadAvailableWorkOrders() {
  try {
    loadingMessage.value = '작업 목록을 불러오는 중...'
    
    // 백엔드 API에 맞게 수정
    const res = await axios.get(`${PACKAGES_API_URL}/works/options`)
    
    if (res.data.success) {
      availableWorkOrders.value = res.data.data
      addLog(`${res.data.count}개의 작업을 불러왔습니다.`, 'info')
    } else {
      throw new Error(res.data.message || '작업 목록 조회 실패')
    }
    
  } catch (error) {
    console.error('작업 목록 조회 실패:', error)
    
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      addLog('서버에 연결할 수 없습니다. 패키지 API 서버 확인이 필요합니다.', 'error')
      addLog('API 주소: http://localhost:3000/packages', 'info')
    } else if (error.response) {
      addLog(`API 오류: ${error.response.status} - ${error.response.statusText}`, 'error')
    } else {
      addLog('작업 목록 로드에 실패했습니다. 수동으로 작업번호를 입력해주세요.', 'warning')
    }
    
    // 🔥 오프라인 모드용 기본 작업 목록
    availableWorkOrders.value = [
      { work_no: '101', step_name: '1차포장', progress_rate: '0.0', step_status: '진행중' },
      { work_no: 'PM1001', step_name: '타이레놀정500mg 포장', progress_rate: '99.0', step_status: '진행중' },
      { work_no: 'PM1002', step_name: '타이레놀정500mg 포장', progress_rate: '99.0', step_status: '진행중' },
      { work_no: 'PM1003', step_name: '타이레놀정500mg 포장', progress_rate: '97.0', step_status: '진행중' }
    ]
    
    addLog('오프라인 모드: 기본 작업 목록을 표시합니다.', 'warning')
  }
}

// 🔥 수정된 작업 선택시 상세 조회
async function onWorkOrderChange() {
  if (!selectedWorkOrder.value) {
    resetCurrentWork()
    return
  }
  
  try {
    loading.value = true
    loadingMessage.value = '작업 상세 정보를 불러오는 중...'
    
    // 백엔드에서 조회되는 데이터 구조에 맞게 수정
    const res = await axios.get(`${PACKAGES_API_URL}/${selectedWorkOrder.value}`)
    
    if (res.data.success) {
      const workData = res.data.data
      
      currentWork.value = {
        work_no: workData.work_no,
        product_name: workData.step_name || '제품명',
        package_type: workData.line_type || '포장형태',
        order_quantity: workData.input_qty || 0,
        input_qty: workData.input_qty || 0,
        output_qty: workData.output_qty || 0,
        defect_qty: workData.defect_qty || 0,
        progressRate: parseFloat(workData.progress_rate) || 0,
        passRate: calculatePassRate(workData.output_qty, workData.input_qty),
        defectRate: calculateDefectRate(workData.defect_qty, workData.input_qty),
        employee_name: workData.employee_name || '김포장',
        start_time: workData.start_time,
        step_status: workData.step_status
      }
      
      // 투입수량을 기존 투입수량으로 설정
      inputQuantity.value = workData.input_qty || 500
      
      // 🔥 생산 시뮬레이션 초기 설정 (진행중 작업인 경우)
      if (workData.step_status === '진행중' || workData.step_status === 'IN_PROGRESS') {
        productionSettings.value.targetQty = workData.input_qty || inputQuantity.value
        productionSettings.value.currentProgress = workData.output_qty || 0
        addLog(`진행 중인 작업을 발견했습니다. 현재 생산량: ${workData.output_qty || 0}개`, 'info')
      }
      
      // 작업 상태 업데이트
      updateWorkStatusFromData(workData)
      
      addLog(`작업번호 ${selectedWorkOrder.value} 정보를 불러왔습니다.`, 'success')
      
    } else {
      throw new Error(res.data.message || '작업 정보 조회 실패')
    }
    
  } catch (err) {
    console.error('작업 상세 정보 조회 실패:', err)
    addLog(`작업번호 ${selectedWorkOrder.value} 정보를 찾을 수 없습니다.`, 'error')
    
    // 🔥 오프라인 모드: 101번 작업은 백엔드 데이터로 설정
    if (selectedWorkOrder.value === '101') {
      currentWork.value = {
        work_no: '101',
        product_name: '1차포장',
        package_type: 'A라인 내포장',
        order_quantity: 3000,
        input_qty: 3000,
        output_qty: 0,
        defect_qty: 0, // 🔥 수정: 초기값 0으로 설정
        progressRate: 0,
        passRate: 0,
        defectRate: 0, // 🔥 수정: 초기값 0으로 설정
        employee_name: '김내포',
        start_time: null,
        step_status: '진행중' // 🔥 한글 상태값으로 설정
      }
      
      inputQuantity.value = 500
      
      // 🔥 생산 시뮬레이션 초기 설정
      productionSettings.value.targetQty = 500
      productionSettings.value.currentProgress = 0
      
      // 🔥 상태 업데이트 및 자동 시작
      updateWorkStatusFromData({ step_status: '진행중' })
      
      addLog('오프라인 모드: 101번 작업 데이터를 설정했습니다.', 'warning')
      addLog('생산 시뮬레이션이 자동으로 시작됩니다.', 'info')
    } else {
      resetCurrentWork()
    }
    
  } finally {
    loading.value = false
  }
}

// 라인 정보 및 현재 작업번호 조회
async function loadLineInfo() {
  try {
    if (!workInfo.value.lineId) {
      addLog('라인 ID가 없습니다. 라인 선택 페이지로 돌아가주세요.', 'error')
      return
    }
    
    // 서버 연결 확인
    const response = await axios.get(`${LINES_API_URL}/${workInfo.value.lineId}`)
    const lineData = response.data
    
    // 라인 정보 업데이트
    workInfo.value = {
      ...workInfo.value,
      lineName: lineData.line_name || workInfo.value.lineName,
      lineType: lineData.line_type || workInfo.value.lineType,
      currWorkNo: lineData.curr_work_no || null,  // 현재 작업번호
      lineStatus: lineData.line_status || 'READY'
    }
    
    addLog(`라인 정보를 불러왔습니다: ${workInfo.value.lineName}`, 'info')
    
    if (workInfo.value.currWorkNo) {
      addLog(`현재 진행 중인 작업: ${workInfo.value.currWorkNo}`, 'info')
    } else {
      addLog('현재 진행 중인 작업이 없습니다.', 'info')
    }
    
  } catch (error) {
    console.error('라인 정보 조회 실패:', error)
    
    // 네트워크 연결 오류인 경우
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
      addLog('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.', 'error')
      addLog('서버 주소: http://localhost:3000', 'info')
    } else if (error.response) {
      // 서버에서 응답은 왔지만 오류인 경우
      addLog(`서버 오류: ${error.response.status} - ${error.response.statusText}`, 'error')
    } else {
      addLog('라인 정보를 불러오는데 실패했습니다.', 'error')
    }
    
    // 기본값으로 설정하여 계속 진행할 수 있도록 함
    workInfo.value = {
      ...workInfo.value,
      currWorkNo: null,
      lineStatus: 'READY'
    }
  }
}

// 3. 작업 시작(등록) - 🔥 생산 시뮬레이션 추가
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
      
      // 작업 시작 API 호출 (오프라인 모드에서는 스킵)
      try {
        const response = await axios.post(`${PACKAGES_API_URL}/work`, workData)
        
        // 라인의 curr_work_no 업데이트
        await axios.put(`${LINES_API_URL}/${workInfo.value.lineId}`, {
          curr_work_no: selectedWorkOrder.value,
          line_status: 'WORKING'
        })
        
        addLog('백엔드 연동 성공: 작업이 등록되었습니다.', 'success')
      } catch (apiError) {
        addLog('오프라인 모드: 로컬에서 작업을 시작합니다.', 'warning')
      }
      
      // 🔥 생산 초기 설정
      productionSettings.value.targetQty = inputQuantity.value
      productionSettings.value.currentProgress = 0
      
      // 작업 정보 초기화
      currentWork.value.input_qty = inputQuantity.value
      currentWork.value.output_qty = 0
      currentWork.value.defect_qty = 0
      currentWork.value.progressRate = 0
      currentWork.value.passRate = 0
      currentWork.value.defectRate = 0
      
      workStatus.value = 'WORKING'
      isWorking.value = true
      workStartTime.value = new Date()
      currentWork.value.start_time = workStartTime.value
      
      updateWorkProgress()
      startWorkTimer()
      startProductionSimulation() // 🔥 생산 시뮬레이션 시작
      
      addLog(`작업을 시작했습니다. (목표수량: ${inputQuantity.value}개)`, 'success')
      addLog(`생산 속도: ${productionSettings.value.productionSpeed}개/초`, 'info')
      addLog('생산을 시작합니다...', 'info')
      
    } catch (error) {
      console.error('작업 시작 실패:', error)
      addLog('작업 시작에 실패했습니다.', 'error')
    } finally {
      loading.value = false
    }
  } else {
    // 일시정지
    pauseProduction()
  }
}

// 🔥 새로 추가: 생산 시뮬레이션 시작
function startProductionSimulation() {
  if (productionTimer) {
    clearInterval(productionTimer)
  }
  
  addLog('생산 시뮬레이션을 시작합니다...', 'info')
  
  productionTimer = setInterval(() => {
    if (!isWorking.value) return
    
    // 생산 진행
    const increment = productionSettings.value.productionSpeed
    productionSettings.value.currentProgress = Math.min(
      productionSettings.value.currentProgress + increment,
      productionSettings.value.targetQty
    )
    
    // 합격품과 불량품 계산
    const totalProduced = productionSettings.value.currentProgress
    const defectQty = Math.floor(totalProduced * productionSettings.value.defectRate)
    const passQty = totalProduced - defectQty
    
    // 화면 업데이트
    currentWork.value.output_qty = passQty
    currentWork.value.defect_qty = defectQty
    currentWork.value.progressRate = Math.min(100, Math.round((totalProduced / productionSettings.value.targetQty) * 100))
    currentWork.value.passRate = totalProduced > 0 ? Math.round((passQty / totalProduced) * 100) : 0
    currentWork.value.defectRate = totalProduced > 0 ? Math.round((defectQty / totalProduced) * 100) : 0
    
    // 로그 추가 (5초마다)
    if (totalProduced > 0 && totalProduced % (productionSettings.value.productionSpeed * 5) === 0) {
      addLog(`생산 진행: ${passQty}개 완료 (불량: ${defectQty}개, 진행률: ${currentWork.value.progressRate}%)`, 'info')
    }
    
    // 목표 달성시 자동 완료
    if (totalProduced >= productionSettings.value.targetQty) {
      addLog('🎉 목표 수량에 도달했습니다!', 'success')
      autoCompleteProduction()
    }
    
  }, 1000) // 1초마다 업데이트
}

// 🔥 새로 추가: 생산 일시정지
function pauseProduction() {
  isWorking.value = false
  workStatus.value = 'PAUSED'
  
  if (productionTimer) {
    clearInterval(productionTimer)
    productionTimer = null
  }
  
  if (workTimer) {
    clearInterval(workTimer)
    workTimer = null
  }
  
  addLog('작업을 일시정지했습니다.', 'warning')
  addLog(`현재까지 생산: ${currentWork.value.output_qty}개 (진행률: ${currentWork.value.progressRate}%)`, 'info')
}

// 🔥 새로 추가: 생산 재시작 
function resumeProduction() {
  isWorking.value = true
  workStatus.value = 'WORKING'
  
  startWorkTimer()
  startProductionSimulation()
  
  addLog('작업을 재시작했습니다.', 'success')
}

// 🔥 새로 추가: 자동 완료
function autoCompleteProduction() {
  if (productionTimer) {
    clearInterval(productionTimer)
    productionTimer = null
  }
  
  isWorking.value = false
  workStatus.value = 'COMPLETED'
  
  addLog('🎉 생산이 완료되었습니다!', 'success')
  addLog(`최종 결과 - 합격: ${currentWork.value.output_qty}개, 불량: ${currentWork.value.defect_qty}개`, 'success')
  
  if (workInfo.value.lineType === 'INNER') {
    addLog('내포장이 완료되었습니다. 외포장을 진행해주세요!', 'info')
  } else {
    addLog('외포장이 완료되어 모든 작업이 끝났습니다!', 'info')
  }
  
  // 3초 후 완료 모달 자동 표시
  setTimeout(() => {
    showCompleteModal.value = true
  }, 3000)
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
    
    // 작업 완료 API 호출
    const res = await axios.put(`${PACKAGES_API_URL}/${currentWork.value.work_no}/complete`, {
      input_qty: currentWork.value.input_qty,
      output_qty: currentWork.value.output_qty,
      defect_qty: currentWork.value.defect_qty
    })
    
    // 라인 상태 업데이트 (curr_work_no 초기화)
    await axios.put(`${LINES_API_URL}/${workInfo.value.lineId}`, {
      curr_work_no: null,
      line_status: 'READY'
    })
    
    // 최종 결과 반영
    currentWork.value.output_qty = res.data.output_qty || currentWork.value.output_qty
    currentWork.value.defect_qty = res.data.defect_qty || currentWork.value.defect_qty
    currentWork.value.passRate = Math.round((currentWork.value.output_qty / currentWork.value.input_qty) * 100)
    currentWork.value.defectRate = 100 - currentWork.value.passRate
    
    isWorking.value = false
    workStatus.value = 'COMPLETED'
    if (workTimer) clearInterval(workTimer)
    
    updateWorkProgress()
    addLog(`${workInfo.value.lineType === 'INNER' ? '내포장' : '외포장'} 작업이 완료되었습니다.`, 'success')
    closeCompleteModal()
    
    // 내포장 완료시 즉시 이동, 외포장 완료시 2초 후 이동
    const moveDelay = workInfo.value.lineType === 'INNER' ? 1000 : 2000
    setTimeout(() => { 
      goBackToLineSelectionWithCompletion() 
    }, moveDelay)
    
  } catch (error) {
    console.error('작업 완료 처리 실패:', error)
    addLog('작업 완료 처리에 실패했습니다.', 'error')
  } finally {
    loading.value = false
  }
}

// 작업 종료 (강제) - 🔥 생산 타이머 정리 추가
async function stopWork() {
  try {
    isWorking.value = false
    workStatus.value = 'COMPLETED'
    
    // 🔥 모든 타이머 정리
    if (workTimer) {
      clearInterval(workTimer)
      workTimer = null
    }
    if (productionTimer) {
      clearInterval(productionTimer)
      productionTimer = null
    }
    
    // 라인 상태 업데이트
    try {
      await axios.put(`${LINES_API_URL}/${workInfo.value.lineId}`, {
        curr_work_no: null,
        line_status: 'READY'
      })
      addLog('라인 상태를 초기화했습니다.', 'info')
    } catch (error) {
      addLog('오프라인 모드: 로컬에서 작업을 종료합니다.', 'warning')
    }
    
    addLog('작업을 강제 종료했습니다.', 'info')
    addLog(`최종 생산량: ${currentWork.value.output_qty}개 (${currentWork.value.progressRate}% 완료)`, 'info')
    
  } catch (error) {
    console.error('작업 종료 실패:', error)
    addLog('작업 종료 처리에 실패했습니다.', 'error')
  }
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
function closeCompleteModal() { 
  showCompleteModal.value = false 
}

// 라인 선택으로 돌아가기 (작업 완료시)
function goBackToLineSelectionWithCompletion() {
  if (workInfo.value.lineType === 'INNER') {
    // 🔥 내포장 완료 → 외포장 라인 선택으로 이동
    addLog('내포장이 완료되었습니다! 이제 외포장 작업을 진행해주세요.', 'success')
    
    if (window.handleInnerPackageCompleted) {
      window.handleInnerPackageCompleted()
    }
    
    if (router) {
      router.push({
        name: 'package_line_selection', // 포장 라인 선택 페이지
        query: {
          inner_completed: 'true',
          next_step: 'outer',
          message: '내포장 완료! 외포장을 진행해주세요.'
        }
      })
    } else {
      // 라인 선택 페이지로 이동하여 외포장 선택하도록 안내
      window.location.href = '/packaging/line?inner_completed=true&next_step=outer'
    }
  } else {
    // 🔥 외포장 완료 → 모든 작업 완료
    addLog('🎉 모든 포장 작업이 완료되었습니다!', 'success')
    
    if (window.handleAllPackageCompleted) {
      window.handleAllPackageCompleted()
    }
    
    if (router) {
      router.push({
        name: 'package_dashboard', // 대시보드나 메인으로
        query: {
          all_completed: 'true',
          message: '모든 포장 작업이 완료되었습니다!'
        }
      })
    } else {
      window.location.href = '/packaging/dashboard?all_completed=true'
    }
  }
}

// 라인 선택으로 돌아가기 (작업 완료 없이)
function goBackToLineSelection() {
  if (isWorking.value) {
    const workType = workInfo.value.lineType === 'INNER' ? '내포장' : '외포장'
    if (!confirm(`진행 중인 ${workType} 작업이 있습니다. 정말 라인 선택으로 돌아가시겠습니까?`)) {
      return
    }
  }
  if (router) {
    router.push({ name: 'package_line' })
  } else {
    window.location.href = '/packaging/line'
  }
}

// 🔥 새로 추가: 작업 버튼 핸들러
function handleWorkButton() {
  if (workStatus.value === 'READY') {
    startWork()
  } else if (workStatus.value === 'WORKING') {
    pauseProduction()
  } else if (workStatus.value === 'PAUSED') {
    resumeProduction()
  }
}

// 🔥 새로 추가: 작업 버튼 텍스트
function getWorkButtonText() {
  switch (workStatus.value) {
    case 'READY':
      return '▶ 작업 시작'
    case 'WORKING':
      return '⏸ 작업 일시정지'
    case 'PAUSED':
      return '▶ 작업 재시작'
    case 'COMPLETED':
      return '✅ 작업 완료됨'
    default:
      return '▶ 작업 시작'
  }
}

// 헬퍼 함수들
function formatNumber(num) { 
  return num ? num.toLocaleString() : '0' 
}

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

// 🔥 수정된 상태 텍스트 변환 (한글-영어 양방향 지원)
function getWorkStatusText(status) {
  const map = {
    'READY': '준비',
    '준비': '준비',
    'WORKING': '작업중',
    '진행중': '작업중',
    'PAUSED': '일시정지',
    '일시정지': '일시정지',
    'COMPLETED': '완료',
    '완료': '완료'
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