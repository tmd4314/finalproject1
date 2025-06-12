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
          <button @click="goBackToLineSelection">
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
                      {{ work.work_no }} - {{ work.step_name }} ({{ getProductName(work) }})
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
                    <option value="10">느림 (10정/초)</option>
                    <option value="30">보통 (30정/초)</option>
                    <option value="60">빠름 (60정/초)</option>
                    <option value="100">매우빠름 (100정/초)</option>
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
                :disabled="!isWorking && workStatus !== 'COMPLETED'"
                class="btn-success"
                :class="{ 
                  disabled: !isWorking && workStatus !== 'COMPLETED',
                  'btn-completed': workStatus === 'COMPLETED'
                }"
              >
                {{ workStatus === 'COMPLETED' ? '📝 완료 처리' : '✅ 생산 완료' }}
              </button>
              <!-- 내포장에서는 작업 종료 버튼만 표시, 외포장에서는 작업 완료 버튼 표시 -->
              <button 
                v-if="workInfo.lineType === 'INNER'"
                @click="stopWork" 
                :disabled="!isWorking"
                class="btn-warning"
                :class="{ disabled: !isWorking }"
              >
                ⏹ 작업 종료
              </button>
              <button 
                v-else
                @click="completeProduction" 
                :disabled="!isWorking && workStatus !== 'COMPLETED'"
                class="btn-primary"
                :class="{ 
                  disabled: !isWorking && workStatus !== 'COMPLETED',
                  'btn-completed': workStatus === 'COMPLETED'
                }"
              >
                {{ workStatus === 'COMPLETED' ? '📋 최종 완료 처리' : '🏁 작업 완료' }}
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
                <span class="info-value">{{ workInfo.lineType === 'INNER' ? '내포장' : workInfo.lineType === 'OUTER' ? '외포장' : '-' }}</span>
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
        <div class="modal-actions" :class="{ 'inner-completed': workInfo.lineType === 'INNER' }">
          <button @click="closeCompleteModal" class="btn-cancel">취소</button>
          
          <!-- 내포장 완료시 외포장 라인으로 바로 가기 버튼 추가 -->
          <button 
            v-if="workInfo.lineType === 'INNER'" 
            @click="goDirectToOuterPackaging" 
            class="btn-outer-direct"
          >
            🚀 외포장 라인으로 바로 가기
          </button>
          
          <button @click="confirmCompleteWork" class="btn-confirm">
            {{ workInfo.lineType === 'INNER' ? '내포장 완료' : '외포장 완료' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 로딩 스피너 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{ loadingMessage }}</div>
    </div>

    <!-- 에러 메시지 -->
    <div v-if="showError" class="error-overlay">
      <div class="error-modal">
        <div class="error-header">
          <h3>⚠️ 연결 오류</h3>
        </div>
        <div class="error-body">
          <p>{{ errorMessage }}</p>
          <p class="error-help">서버 상태를 확인하고 다시 시도해주세요.</p>
        </div>
        <div class="error-actions">
          <button @click="hideError" class="btn-error-close">확인</button>
          <button @click="retryConnection" class="btn-retry">다시 시도</button>
        </div>
      </div>
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
  currentPackageType: route.query.current_package_type || '내포장'
})

// API 설정
const PACKAGES_API_URL = 'http://localhost:3000/packages'
const LINES_API_URL = 'http://localhost:3000/lines'

// 로딩 및 에러 상태
const loading = ref(false)
const loadingMessage = ref('')
const showError = ref(false)
const errorMessage = ref('')

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
  employee_id: 2,
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

// 🔥 수정: localStorage로 변경하여 데이터 영속성 보장
const completedInnerWorks = ref(new Map())

// 🔥 추가: 내포장 데이터 강제 로드 함수
function forceLoadInnerData() {
  try {
    const saved = localStorage.getItem('completed_inner_works') // sessionStorage → localStorage
    console.log('🔍 강제 내포장 데이터 확인:', saved)
    
    if (saved) {
      const data = JSON.parse(saved)
      completedInnerWorks.value = new Map(Object.entries(data))
      
      addLog(`💾 내포장 완료 작업 ${completedInnerWorks.value.size}개 발견!`, 'success')
      
      for (const [workNo, info] of completedInnerWorks.value) {
        addLog(`✅ ${workNo}: ${info.product_name} (완료수량: ${info.output_qty}개)`, 'info')
      }
      
      return true
    } else {
      addLog('❌ 저장된 내포장 완료 작업이 없습니다.', 'warning')
      return false
    }
  } catch (error) {
    console.error('내포장 데이터 로드 실패:', error)
    addLog(`❌ 내포장 데이터 로드 실패: ${error.message}`, 'error')
    return false
  }
}

// 🔥 수정: localStorage 사용으로 변경
function loadCompletedInnerWorks() {
  try {
    const saved = localStorage.getItem('completed_inner_works') // sessionStorage → localStorage
    if (saved) {
      const data = JSON.parse(saved)
      completedInnerWorks.value = new Map(Object.entries(data))
      console.log('💾 저장된 내포장 완료 작업 복원:', completedInnerWorks.value.size + '개')
    }
  } catch (error) {
    console.error('완료 작업 복원 실패:', error)
  }
}

// 🔥 수정: localStorage 사용으로 변경
function saveCompletedInnerWork(workData) {
  const completionInfo = {
    work_no: workData.work_no,
    product_name: workData.product_name,
    product_code: workData.product_code,
    input_qty: workData.input_qty,
    output_qty: workData.output_qty,
    defect_qty: workData.defect_qty,
    completed_at: new Date().toISOString(),
    step_name: workData.step_name || workData.product_name
  }
  
  completedInnerWorks.value.set(workData.work_no, completionInfo)
  
  try {
    const dataToSave = Object.fromEntries(completedInnerWorks.value)
    localStorage.setItem('completed_inner_works', JSON.stringify(dataToSave)) // sessionStorage → localStorage
    console.log('💾 내포장 완료 작업 저장:', workData.work_no, '완료수량:', workData.output_qty)
  } catch (error) {
    console.error('완료 작업 저장 실패:', error)
  }
}

// 🔥 수정: 외포장 작업 필터링 개선
function filterOuterWorksByInnerCompletion(workOrders) {
  if (workInfo.value.lineType !== 'OUTER') {
    return workOrders
  }
  
  if (completedInnerWorks.value.size === 0) {
    console.warn('⚠️ 완료된 내포장 작업이 없습니다.')
    addLog('⚠️ 완료된 내포장 작업이 없습니다. 먼저 내포장을 완료해주세요.', 'warning')
    return []
  }
  
  console.log('🔍 외포장 작업 매칭 시작...')
  console.log('내포장 완료 작업들:', Array.from(completedInnerWorks.value.keys()))
  console.log('외포장 대상 작업들:', workOrders.map(w => w.work_no))
  
  // 일단 모든 외포장 작업을 허용 (매칭은 나중에)
  const filtered = workOrders.filter(work => {
    const isOuter = work.line_type === '외포장' || 
                   work.step_name?.includes('2차') ||
                   work.step_name?.includes('외포장') ||
                   work.work_step === '외포장'
    
    if (isOuter) {
      console.log('✅ 외포장 작업 허용:', work.work_no)
      return true
    }
    
    return false
  })
  
  console.log(`🎯 외포장 필터링 결과: ${workOrders.length}개 → ${filtered.length}개`)
  return filtered
}

// 외포장 투입수량 자동 설정
function setOuterInputQuantityFromInner(workData) {
  if (workInfo.value.lineType !== 'OUTER') {
    return workData
  }
  
  let innerCompletionInfo = null
  
  // 1. 작업번호로 직접 매칭
  if (completedInnerWorks.value.has(workData.work_no)) {
    innerCompletionInfo = completedInnerWorks.value.get(workData.work_no)
  } 
  // 2. 제품코드나 제품명으로 매칭
  else {
    for (const [workNo, info] of completedInnerWorks.value) {
      if (info.product_code === workData.product_code || 
          info.step_name === workData.step_name ||
          info.product_name === workData.product_name) {
        innerCompletionInfo = info
        console.log(`🔗 제품 매칭으로 내포장 정보 연결: ${workNo} → ${workData.work_no}`)
        break
      }
    }
  }
  
  if (innerCompletionInfo) {
    const originalInputQty = workData.input_qty || 0
    workData.input_qty = innerCompletionInfo.output_qty
    
    console.log('🔄 외포장 투입수량 자동 설정:', {
      work_no: workData.work_no,
      원래_투입수량: originalInputQty,
      내포장_완료수량: innerCompletionInfo.output_qty,
      새_투입수량: workData.input_qty
    })
    
    addLog(`내포장 완료수량 ${formatNumber(innerCompletionInfo.output_qty)}개를 외포장 투입수량으로 설정했습니다.`, 'success')
  } else {
    console.warn('⚠️ 연결된 내포장 완료 정보를 찾을 수 없습니다:', workData.work_no)
    addLog('⚠️ 연결된 내포장 작업을 찾을 수 없습니다. 수동으로 투입수량을 확인해주세요.', 'warning')
  }
  
  return workData
}

// 생산 시뮬레이션 설정
const productionSettings = ref({
  productionSpeed: 10,
  defectRate: 0.02,
  targetQty: 0,
  currentProgress: 0
})

// 계산된 값들
const canStartWork = computed(() => {
  return selectedWorkOrder.value && inputQuantity.value > 0 && !isWorking.value
})



// 🔥 추가: API 응답 데이터 디버깅 함수
function debugWorkOrderData(workOrders) {
  if (workOrders && workOrders.length > 0) {
    console.log('=== 작업 주문 데이터 디버깅 ===')
    console.log('총 작업 수:', workOrders.length)
    
    // 첫 번째 작업 데이터 상세 분석
    const firstWork = workOrders[0]
    console.log('첫 번째 작업 데이터:', firstWork)
    console.log('사용 가능한 필드들:', Object.keys(firstWork))
    
    // 제품명 관련 필드들 확인
    const productFields = Object.keys(firstWork).filter(key => 
      key.toLowerCase().includes('product') ||
      key.toLowerCase().includes('item') ||
      key.toLowerCase().includes('medicine') ||
      key.toLowerCase().includes('drug') ||
      key.toLowerCase().includes('name')
    )
    
    console.log('제품명 관련 필드들:', productFields)
    productFields.forEach(field => {
      console.log(`${field}:`, firstWork[field])
    })
    
    // 추출된 제품명 확인
    console.log('추출된 제품명:', getProductName(firstWork))
  }
}

// 헬퍼 함수들
function calculatePassRate(outputQty, inputQty) {
  if (!inputQty || inputQty === 0) return 0
  return Math.round((outputQty / inputQty) * 100)
}


function calculateDefectRate(defectQty, inputQty) {
  if (!inputQty || inputQty === 0) return 0
  return Math.round((defectQty / inputQty) * 100)
}

// 🔥 통합된 제품명 추출 함수
function getProductName(workData) {
  if (!workData) return '제품명 없음'
  
  // 가능한 제품명 필드들을 순서대로 확인
  const productNameFields = [
    workData.product_name,
    workData.productName,
    workData.item_name,
    workData.itemName,
    workData.medicine_name,
    workData.medicineName,
    workData.drug_name,
    workData.drugName,
    workData.step_name,
    workData.stepName,
    workData.work_name,
    workData.workName
  ]
  
  // 첫 번째로 유효한 값을 반환
  for (const field of productNameFields) {
    if (field && typeof field === 'string' && field.trim().length > 0) {
      // 특정 패턴 제거 (예: "1차포장", "2차포장" 등)
      let cleanName = field.trim()
      cleanName = cleanName.replace(/\s*(1차|2차|내|외)?\s*포장\s*/g, '')
      cleanName = cleanName.replace(/\s*(INNER|OUTER)\s*/gi, '')
      
      if (cleanName.length > 0) {
        return cleanName
      }
    }
  }
  
  // 작업번호로 추정
  if (workData.work_no) {
    const workNo = workData.work_no.toUpperCase()
    if (workNo.includes('PM') || workNo.includes('OM')) {
      return '타이레놀정500mg'
    }
  }
  
  return '제품명 확인 필요'
}

// 영어 → 한글 변환 함수들
function getKoreanStatus(englishStatus) {
  const statusMap = {
    'READY': '준비',
    'WORKING': '진행중',
    'PAUSED': '일시정지',
    'COMPLETED': '완료',
    'IN_PROGRESS': '진행중'
  }
  return statusMap[englishStatus] || englishStatus
}

function getKoreanLineType(englishType) {
  const typeMap = {
    'INNER': '내포장',
    'OUTER': '외포장'
  }
  return typeMap[englishType] || englishType
}

// 한글 → 영어 변환 함수들
function getEnglishStatus(koreanStatus) {
  const statusMap = {
    '준비': 'READY',
    '진행중': 'WORKING',
    '일시정지': 'PAUSED',
    '완료': 'COMPLETED'
  }
  return statusMap[koreanStatus] || koreanStatus
}

function getEnglishLineType(koreanType) {
  const typeMap = {
    '내포장': 'INNER',
    '외포장': 'OUTER'
  }
  return typeMap[koreanType] || koreanType
}

function updateWorkStatusFromData(workData) {
  const status = getEnglishStatus(workData.step_status) || workData.step_status;
  
  switch (status) {
    case 'WORKING':
    case 'IN_PROGRESS':
      workStatus.value = 'WORKING'
      isWorking.value = true
      if (workData.start_time) {
        workStartTime.value = new Date(workData.start_time)
        startWorkTimer()
      }
      setTimeout(() => {
        if (isWorking.value && !productionTimer) {
          startProductionSimulation()
          addLog('기존 진행 중인 작업의 생산을 재개합니다.', 'info')
        }
      }, 1000)
      break
    case 'COMPLETED':
      workStatus.value = 'COMPLETED'
      isWorking.value = false
      if (productionTimer) {
        clearInterval(productionTimer)
        productionTimer = null
      }
      break
    case 'PAUSED':
      workStatus.value = 'PAUSED'
      isWorking.value = false
      if (productionTimer) {
        clearInterval(productionTimer)
        productionTimer = null
      }
      break
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
    employee_id: 2,
    employee_name: '김포장',
    start_time: null
  }
}

// 🔥 수정: 컴포넌트 마운트시 외포장 데이터 확인 로직 추가
onMounted(() => {
  console.log('PackageWork 컴포넌트 마운트 시작');
  console.log('현재 라인 정보:', workInfo.value);
  
  // 🔥 외포장이면 즉시 내포장 데이터 확인
  if (workInfo.value.lineType === 'OUTER') {
    console.log('🔍 외포장 모드 감지, 내포장 데이터 확인...')
    forceLoadInnerData()
  } else {
    loadCompletedInnerWorks()
  }
  
  nextTick(async () => {
    try {
      console.log('페이지 초기화 시작...');
      await initializeWorkPage()
      console.log('페이지 초기화 완료');
    } catch (error) {
      console.error('페이지 초기화 오류:', error)
      showErrorMessage('페이지 초기화에 실패했습니다.')
    }
  })
})

onUnmounted(() => {
  if (workTimer) {
    clearInterval(workTimer)
    workTimer = null
  }
  if (productionTimer) {
    clearInterval(productionTimer)
    productionTimer = null
  }
})

// 🔥 수정: 페이지 초기화 함수 개선
async function initializeWorkPage() {
  try {
    loading.value = true
    loadingMessage.value = '작업 정보를 초기화하는 중...'
    
    // 🔥 외포장이면 먼저 내포장 데이터 강제 로드
    if (workInfo.value.lineType === 'OUTER') {
      addLog('🔍 외포장 모드: 내포장 완료 데이터를 확인합니다...', 'info')
      const hasInnerData = forceLoadInnerData()
      
      if (!hasInnerData) {
        showErrorMessage(`내포장이 완료된 작업이 없습니다.\n\n먼저 내포장을 완료한 후 외포장을 진행해주세요.\n\n또는 다른 브라우저/탭에서 내포장을 완료했다면\n브라우저를 새로고침해보세요.`)
        return
      }
    }
    
    addLog(`${workInfo.value.lineName || '선택된 라인'}에서 작업을 시작합니다.`, 'info')
    
    loadingMessage.value = '작업 목록을 불러오는 중...'
    await loadAvailableWorkOrders()
    
    if (route.query.work_no) {
      selectedWorkOrder.value = route.query.work_no
      loadingMessage.value = '작업 상세 정보를 불러오는 중...'
      await onWorkOrderChange()
      addLog(`작업번호 ${route.query.work_no}가 선택되었습니다.`, 'info')
    }
    
    addLog('페이지 초기화가 완료되었습니다.', 'success')
    
  } catch (error) {
    console.error('페이지 초기화 실패:', error)
    showErrorMessage(`페이지 초기화에 실패했습니다: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// 🔥 수정: 작업번호 목록 조회 함수 개선
async function loadAvailableWorkOrders() {
  try {
    console.log('작업번호 목록 조회 시작...');
    console.log('현재 라인 타입:', workInfo.value.lineType);
    
    // 🔥 외포장인 경우 먼저 내포장 데이터 재확인
    if (workInfo.value.lineType === 'OUTER') {
      console.log('🔍 외포장 모드: 내포장 데이터 재확인...')
      forceLoadInnerData()
      
      if (completedInnerWorks.value.size === 0) {
        addLog('⚠️ 내포장 완료 작업이 없습니다.', 'warning')
        showErrorMessage('내포장이 완료된 작업이 없습니다.\n먼저 내포장을 완료해주세요.')
        return
      }
    }
    
    const apiUrl = `${PACKAGES_API_URL}/works/options`;
    console.log('요청 URL:', apiUrl);
    
    const koreanLineType = getKoreanLineType(workInfo.value.lineType);
    console.log('한글 라인타입으로 요청:', koreanLineType);
    
    const res = await axios.get(apiUrl, {
      params: {
        line_type: koreanLineType,
        work_step: koreanLineType
      }
    })
    
    console.log('API 응답 상태:', res.status, res.statusText);
    console.log('응답 데이터:', res.data);
    
    if (res.data.success) {
      let workOrders = res.data.data || [];
      
      if (workOrders.length > 0) {
        const beforeFilter = workOrders.length;
        
        workOrders = workOrders.filter(work => {
          if (workInfo.value.lineType === 'INNER') {
            return work.line_type === '내포장' || 
                   work.step_name?.includes('1차') ||
                   work.step_name?.includes('내포장') ||
                   work.work_step === '내포장' ||
                   work.work_step === '1차포장';
          } else if (workInfo.value.lineType === 'OUTER') {
            return work.line_type === '외포장' || 
                   work.step_name?.includes('2차') ||
                   work.step_name?.includes('외포장') ||
                   work.work_step === '외포장' ||
                   work.work_step === '2차포장';
          }
          return true;
        });
        
        console.log(`라인 타입 필터링: ${beforeFilter}개 → ${workOrders.length}개`);
        
        // 🔥 외포장인 경우 필터링 적용
        if (workInfo.value.lineType === 'OUTER') {
          const beforeInnerFilter = workOrders.length;
          workOrders = filterOuterWorksByInnerCompletion(workOrders);
          console.log(`내포장 완료 필터링: ${beforeInnerFilter}개 → ${workOrders.length}개`);
        }
      }
      
      availableWorkOrders.value = workOrders;
      
      // 🔥 추가: 데이터 디버깅
      debugWorkOrderData(workOrders)
      
      if (availableWorkOrders.value.length === 0) {
        const packageType = workInfo.value.lineType === 'INNER' ? '1차(내포장)' : '2차(외포장)';
        
        if (workInfo.value.lineType === 'OUTER' && completedInnerWorks.value.size === 0) {
          addLog(`⚠️ 내포장이 완료된 작업이 없습니다. 먼저 내포장을 완료해주세요.`, 'warning');
          showErrorMessage(`사용 가능한 ${packageType} 작업이 없습니다.\n내포장을 먼저 완료해주세요.`);
        } else {
          addLog(`⚠️ ${packageType} 작업이 없습니다.`, 'warning');
          showErrorMessage(`사용 가능한 ${packageType} 작업이 없습니다.`);
        }
      } else {
        const packageType = workInfo.value.lineType === 'INNER' ? '1차(내포장)' : '2차(외포장)';
        addLog(`${availableWorkOrders.value.length}개의 ${packageType} 작업을 불러왔습니다.`, 'success');
        
        if (workInfo.value.lineType === 'OUTER') {
          addLog(`내포장 완료: ${completedInnerWorks.value.size}개 | 외포장 가능: ${availableWorkOrders.value.length}개`, 'info');
        }
      }
    } else {
      throw new Error(res.data.message || '작업 목록 조회 실패');
    }
    
  } catch (error) {
    console.error('작업 목록 조회 실패:', error);
    throw error;
  }
}

// 작업 선택시 상세 조회
async function onWorkOrderChange() {
  if (!selectedWorkOrder.value) {
    resetCurrentWork()
    return
  }
  
  try {
    loading.value = true
    loadingMessage.value = '작업 상세 정보를 불러오는 중...'
    
    console.log('작업 상세 조회 시작...');
    console.log('작업번호:', selectedWorkOrder.value);
    
    const detailApiUrl = `${PACKAGES_API_URL}/${selectedWorkOrder.value}`;
    console.log('요청 URL:', detailApiUrl);
    
    const res = await axios.get(detailApiUrl)
    
    console.log('작업 상세 응답:', res.status, res.statusText);
    console.log('작업 상세 데이터:', res.data);
    
    if (!res.data.success) {
      throw new Error(res.data.message || '작업 정보 조회 실패')
    }
    
    const workData = res.data.data;
    
    if (!workData) {
      throw new Error('작업 데이터가 없습니다.')
    }
    
    console.log('=== workData 상세 디버깅 ===');
    console.log('전체 workData:', workData);
    console.log('product_name:', workData.product_name);
    console.log('step_name:', workData.step_name);
    console.log('타입 확인:', typeof workData.product_name);
    console.log('모든 키:', Object.keys(workData));
    
    function extractProductName(data) {
      const candidates = [
        data.product_name,
        data.productName,
        data.step_name,
        data.item_name,
        data.medicine_name,
        data.drug_name
      ];
      
      for (const candidate of candidates) {
        if (candidate && typeof candidate === 'string' && candidate.trim().length > 0) {
          console.log('선택된 제품명:', candidate.trim());
          return candidate.trim();
        }
      }
      
      console.warn('제품명을 찾을 수 없어 기본값 사용');
      return '베아르정';
    }
    
    const extractedProductName = extractProductName(workData);
    
    console.log('작업 데이터 검증:', {
      work_no: workData.work_no,
      extracted_product_name: extractedProductName,
      input_qty: workData.input_qty,
      output_qty: workData.output_qty,
      step_status: workData.step_status
    });
    
    currentWork.value = {
      work_no: workData.work_no || selectedWorkOrder.value,
      product_name: extractedProductName,
      package_type: getKoreanLineType(workData.line_type || workInfo.value.lineType),
      order_quantity: workData.input_qty || 0,
      input_qty: workData.input_qty || 0,
      output_qty: workData.output_qty || 0,
      defect_qty: workData.defect_qty || 0,
      progressRate: parseFloat(workData.progress_rate) || 0,
      passRate: calculatePassRate(workData.output_qty, workData.input_qty),
      defectRate: calculateDefectRate(workData.defect_qty, workData.input_qty),
      employee_id: 2,
      employee_name: workData.employee_name || '김포장',
      start_time: workData.start_time,
      step_status: workData.step_status
    }
    
    inputQuantity.value = workData.input_qty || 500
    
    if (workData.step_status === '진행중' || workData.step_status === 'IN_PROGRESS' || 
        workData.step_status === 'WORKING' || workData.step_status === '작업중') {
      productionSettings.value.targetQty = workData.input_qty || inputQuantity.value
      productionSettings.value.currentProgress = workData.output_qty || 0
      addLog(`진행 중인 작업을 발견했습니다. 현재 생산량: ${workData.output_qty || 0}개`, 'info')
    }
    
    updateWorkStatusFromData(workData)
    addLog(`작업번호 ${selectedWorkOrder.value} 정보를 불러왔습니다. (제품: ${extractedProductName})`, 'success')
    
  } catch (error) {
    console.error('작업 상세 조회 실패:', error);
    
    if (error.response?.status === 404) {
      showErrorMessage(`작업번호 ${selectedWorkOrder.value}을(를) 찾을 수 없습니다.`)
    } else {
      showErrorMessage(`작업번호 ${selectedWorkOrder.value} 정보를 불러올 수 없습니다: ${error.message}`)
    }
    
    resetCurrentWork()
  } finally {
    loading.value = false
  }
}

// 기존 작업 강제 재시작 함수
async function forceRestartExistingWork() {
  try {
    loading.value = true
    loadingMessage.value = '기존 작업을 재시작하는 중...'
    
    console.log('기존 작업 강제 재시작 시도');
    console.log('작업번호:', selectedWorkOrder.value);
    
    const updateApiUrl = `${PACKAGES_API_URL}/${selectedWorkOrder.value}`;
    const updateData = {
      step_status: '진행중',
      input_qty: inputQuantity.value,
      employee_id: 2,
      start_time: new Date().toISOString(),
      line_type: getKoreanLineType(workInfo.value.lineType),
      work_step: getKoreanLineType(workInfo.value.lineType)
    };
    
    console.log('PUT 요청으로 기존 작업 업데이트:', updateApiUrl);
    console.log('업데이트 데이터 (한글):', updateData);
    
    const response = await axios.put(updateApiUrl, updateData);
    
    console.log('작업 업데이트 응답:', response.data);
    
    if (response.data && (response.data.success !== false)) {
      addLog('기존 작업을 성공적으로 재시작했습니다.', 'success');
      await proceedWithWorkStart();
    } else {
      throw new Error(response.data?.message || '작업 업데이트 실패');
    }
    
  } catch (updateError) {
    console.error('PUT 요청 실패:', updateError);
    
    try {
      addLog('PUT 실패, PATCH로 재시도...', 'warning');
      
      const patchApiUrl = `${PACKAGES_API_URL}/${selectedWorkOrder.value}/start`;
      const patchData = {
        input_qty: inputQuantity.value,
        employee_id: 2,
        step_status: '진행중',
        line_type: getKoreanLineType(workInfo.value.lineType),
        work_step: getKoreanLineType(workInfo.value.lineType)
      };
      
      console.log('PATCH 요청으로 작업 시작 (한글):', patchApiUrl);
      console.log('PATCH 데이터:', patchData);
      
      const patchResponse = await axios.patch(patchApiUrl, patchData);
      
      console.log('PATCH 응답:', patchResponse.data);
      
      if (patchResponse.data && (patchResponse.data.success !== false)) {
        addLog('PATCH로 작업 시작에 성공했습니다.', 'success');
        await proceedWithWorkStart();
      } else {
        throw new Error('PATCH도 실패');
      }
      
    } catch (patchError) {
      console.error('PATCH도 실패:', patchError);
      addLog('⚠️ 서버 업데이트 실패, 로컬에서만 작업을 시작합니다.', 'warning');
      await proceedWithWorkStart();
    }
  } finally {
    loading.value = false
  }
}

// 실제 작업 시작 진행
async function proceedWithWorkStart() {
  try {
    productionSettings.value.targetQty = inputQuantity.value
    productionSettings.value.currentProgress = 0
    
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
    startProductionSimulation()
    
    addLog(`작업을 시작했습니다. (목표수량: ${inputQuantity.value}개)`, 'success')
    addLog(`생산 속도: ${productionSettings.value.productionSpeed}개/초`, 'info')
    addLog('생산을 시작합니다...', 'info')
    
  } catch (error) {
    console.error('로컬 작업 시작 실패:', error);
    showErrorMessage('작업 시작 중 오류가 발생했습니다.');
  }
}

async function startWork() {
  if (!isWorking.value) {
    try {
      loading.value = true
      loadingMessage.value = '작업을 시작하는 중...'
      
      console.log('작업 시작 요청');
      
      const workData = {
        work_no: selectedWorkOrder.value,
        input_qty: inputQuantity.value,
        employee_id: 2,
        step_status: '진행중',
        line_type: getKoreanLineType(workInfo.value.lineType),
        work_step: getKoreanLineType(workInfo.value.lineType),
        start_time: new Date().toISOString()
      }
      
      console.log('작업 시작 요청 데이터 (한글):', workData);
      
      try {
        const response = await axios.post(`${PACKAGES_API_URL}/works`, workData)
        
        console.log('작업 시작 응답:', response.data);
        
        if (response.data && response.data.success) {
          addLog('새 작업을 성공적으로 시작했습니다.', 'success');
          await proceedWithWorkStart();
        } else {
          throw new Error(response.data?.message || '작업 시작 실패')
        }
        
      } catch (postError) {
        console.error('POST 요청 실패:', postError);
        
        if (postError.response?.status === 409) {
          const errorMsg = postError.response.data?.message || '';
          console.log('409 에러 감지:', errorMsg);
          
          if (errorMsg.includes('이미 존재하는 작업번호') || errorMsg.includes('already exists')) {
            addLog('⚠️ 이미 존재하는 작업번호입니다. 기존 작업을 재시작합니다...', 'warning');
            await forceRestartExistingWork();
            return;
          }
        }
        
        throw postError;
      }
      
    } catch (error) {
      console.error('작업 시작 실패:', error)
      
      let errorMsg = '작업 시작에 실패했습니다.';
      if (error.response?.status === 409) {
        errorMsg = '이미 진행 중인 작업입니다.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMsg = 'API 서버 연결에 실패했습니다.';
      } else {
        errorMsg = `작업 시작 실패: ${error.message}`;
      }
      
      showErrorMessage(errorMsg)
    } finally {
      loading.value = false
    }
  } else {
    pauseProduction()
  }
}

// 작업 완료 처리 함수
async function confirmCompleteWork() {
  let shouldNavigate = false;
  
  try {
    loading.value = true
    loadingMessage.value = '작업을 완료하는 중...'
    
    console.log('작업 완료 처리');
    
    try {
      const completeApiUrl = `${PACKAGES_API_URL}/${currentWork.value.work_no}/complete`;
      console.log('작업 완료 API 호출:', completeApiUrl);
      
      const completeData = {
        input_qty: currentWork.value.input_qty,
        output_qty: currentWork.value.output_qty,
        defect_qty: currentWork.value.defect_qty,
        employee_id: currentWork.value.employee_id,
        step_status: '완료',
        line_type: getKoreanLineType(workInfo.value.lineType),
        work_step: getKoreanLineType(workInfo.value.lineType),
        end_time: new Date().toISOString()
      };
      
      console.log('작업 완료 데이터 (한글):', completeData);
      
      const res = await axios.put(completeApiUrl, completeData)
      
      console.log('작업 완료 API 응답:', res.data);
      
      if (res.data && res.data.success) {
        addLog('API로 작업을 완료했습니다.', 'success');
        shouldNavigate = true;
      } else {
        console.warn('API 응답이 실패였지만 로컬에서 완료 처리합니다:', res.data?.message);
        addLog('서버 응답이 실패였지만 로컬에서 작업을 완료했습니다.', 'warning');
        shouldNavigate = true;
      }
    } catch (apiError) {
      console.error('API 호출 실패, 로컬에서 완료 처리:', apiError);
      
      if (apiError.response?.status === 404) {
        addLog('완료 API 엔드포인트가 없어서 로컬에서만 완료 처리했습니다.', 'warning');
      } else if (apiError.code === 'ERR_NETWORK') {
        addLog('서버 연결 실패, 로컬에서만 완료 처리했습니다.', 'warning');
      } else {
        addLog(`서버 오류 발생, 로컬에서만 완료 처리했습니다: ${apiError.message}`, 'warning');
      }
      
      shouldNavigate = true;
    }
    
  } catch (error) {
    console.error('전체 작업 완료 처리 실패:', error);
    addLog(`작업 완료 처리 중 오류 발생: ${error.message}`, 'error');
    shouldNavigate = true;
  } finally {
    loading.value = false
  }
  
  try {
    currentWork.value.passRate = Math.round((currentWork.value.output_qty / currentWork.value.input_qty) * 100)
    currentWork.value.defectRate = 100 - currentWork.value.passRate
    
    isWorking.value = false
    workStatus.value = 'COMPLETED'
    if (workTimer) clearInterval(workTimer)
    
    updateWorkProgress()
    
    if (workInfo.value.lineType === 'INNER') {
      saveCompletedInnerWork({
        work_no: currentWork.value.work_no,
        product_name: currentWork.value.product_name,
        product_code: currentWork.value.product_code,
        input_qty: currentWork.value.input_qty,
        output_qty: currentWork.value.output_qty,
        defect_qty: currentWork.value.defect_qty,
        step_name: currentWork.value.product_name
      })
      addLog(`✅ 내포장 완료! 완료수량 ${formatNumber(currentWork.value.output_qty)}개가 외포장 투입수량으로 설정됩니다.`, 'success')
    }
    
    addLog(`${workInfo.value.lineType === 'INNER' ? '내포장' : '외포장'} 작업이 로컬에서 완료되었습니다.`, 'success')
    closeCompleteModal()
    
    if (shouldNavigate || true) {
      console.log('페이지 이동을 시작합니다...');
      const moveDelay = workInfo.value.lineType === 'INNER' ? 1000 : 2000
      setTimeout(async () => { 
        console.log('실제 페이지 이동 실행...');
        await goBackToLineSelectionWithCompletion() 
      }, moveDelay)
    } else {
      console.log('페이지 이동 조건을 만족하지 않습니다.');
    }
    
  } catch (finalError) {
    console.error('최종 처리 실패:', finalError);
    setTimeout(async () => { 
      console.log('최종 처리 실패 후 강제 페이지 이동...');
      await goBackToLineSelectionWithCompletion() 
    }, 2000)
  }
}

// 생산 시뮬레이션 시작
function startProductionSimulation() {
  if (productionTimer) {
    clearInterval(productionTimer)
  }
  
  addLog('생산 시뮬레이션을 시작합니다...', 'info')
  
  productionTimer = setInterval(() => {
    if (!isWorking.value) return
    
    const increment = productionSettings.value.productionSpeed
    productionSettings.value.currentProgress = Math.min(
      productionSettings.value.currentProgress + increment,
      productionSettings.value.targetQty
    )
    
    const totalProduced = productionSettings.value.currentProgress
    const defectQty = Math.floor(totalProduced * productionSettings.value.defectRate)
    const passQty = totalProduced - defectQty
    
    currentWork.value.output_qty = passQty
    currentWork.value.defect_qty = defectQty
    currentWork.value.progressRate = Math.min(100, Math.round((totalProduced / productionSettings.value.targetQty) * 100))
    currentWork.value.passRate = totalProduced > 0 ? Math.round((passQty / totalProduced) * 100) : 0
    currentWork.value.defectRate = totalProduced > 0 ? Math.round((defectQty / totalProduced) * 100) : 0
    
    if (totalProduced > 0 && totalProduced % (productionSettings.value.productionSpeed * 5) === 0) {
      addLog(`생산 진행: ${passQty}개 완료 (불량: ${defectQty}개, 진행률: ${currentWork.value.progressRate}%)`, 'info')
    }
    
    if (totalProduced >= productionSettings.value.targetQty) {
      addLog('🎉 목표 수량에 도달했습니다!', 'success')
      autoCompleteProduction()
    }
    
  }, 1000)
}

// 생산 일시정지
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

// 생산 재시작 
function resumeProduction() {
  isWorking.value = true
  workStatus.value = 'WORKING'
  
  startWorkTimer()
  startProductionSimulation()
  
  addLog('작업을 재시작했습니다.', 'success')
}

// 자동 완료
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
    addLog('내포장이 완료되었습니다. "완료 처리" 버튼을 눌러 다음 단계로 진행해주세요!', 'info')
    addLog('💡 팁: 모달을 닫아도 언제든 "완료 처리" 버튼으로 다시 열 수 있습니다.', 'info')
    setTimeout(() => {
      showCompleteModal.value = true
    }, 1000)
  } else {
    addLog('외포장이 완료되어 모든 작업이 끝났습니다!', 'info')
    addLog('💡 팁: "최종 완료 처리" 버튼으로 언제든 완료 모달을 다시 열 수 있습니다.', 'info')
    setTimeout(() => {
      showCompleteModal.value = true
    }, 1000)
  }
}

// 생산 완료 버튼
function completeProduction() {
  if (workStatus.value === 'COMPLETED' || !isWorking.value) {
    if (workStatus.value === 'COMPLETED') {
      addLog('완료 처리 모달을 다시 엽니다.', 'info')
    }
    showCompleteModal.value = true
    return
  }
  
  showCompleteModal.value = true
}

// 작업 종료 (강제)
async function stopWork() {
  try {
    isWorking.value = false
    workStatus.value = 'COMPLETED'
    
    if (workTimer) {
      clearInterval(workTimer)
      workTimer = null
    }
    if (productionTimer) {
      clearInterval(productionTimer)
      productionTimer = null
    }
    
    addLog('작업을 강제 종료했습니다.', 'info')
    addLog(`최종 생산량: ${currentWork.value.output_qty}개 (${currentWork.value.progressRate}% 완료)`, 'info')
    
  } catch (error) {
    console.error('작업 종료 실패:', error)
    showErrorMessage('작업 종료 처리에 실패했습니다.')
  }
}

// 진행률/품질 업데이트
function updateWorkProgress() {
  if (currentWork.value.input_qty > 0) {
    currentWork.value.progressRate = 100
    currentWork.value.passRate = Math.round(
      (currentWork.value.output_qty / currentWork.value.input_qty) * 100
    )
    currentWork.value.defectRate = Math.round(
      (currentWork.value.defect_qty / currentWork.value.input_qty) * 100
    )
  }
}

// 에러 처리
function showErrorMessage(message) {
  errorMessage.value = message
  showError.value = true
  addLog(message, 'error')
}

function hideError() {
  showError.value = false
}

async function retryConnection() {
  hideError()
  try {
    await initializeWorkPage()
  } catch (error) {
    showErrorMessage('재연결에 실패했습니다.')
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
  
  if (workStatus.value === 'COMPLETED') {
    const buttonText = workInfo.value.lineType === 'INNER' ? '"완료 처리"' : '"최종 완료 처리"'
    addLog(`💡 모달을 다시 열려면 ${buttonText} 버튼을 클릭하세요.`, 'info')
  }
}

// 외포장 라인으로 바로 가기
function goDirectToOuterPackaging() {
  addLog('외포장 라인으로 바로 이동합니다...', 'info')
  closeCompleteModal()
  
  if (router) {
    try {
      router.push({
        name: 'package_line',
        query: {
          inner_completed: 'true',
          next_step: 'outer',
          auto_select: 'outer',
          message: '내포장 완료! 외포장을 선택해주세요.'
        }
      })
      console.log('외포장 라인 페이지로 직접 이동 성공');
      return;
    } catch (routerError) {
      console.error('외포장 라인 페이지 이동 실패:', routerError);
    }
  }
  
  window.location.href = '/packaging/line?inner_completed=true&next_step=outer&auto_select=outer';
}

// 라인 선택으로 돌아가기 (작업 완료시)
async function goBackToLineSelectionWithCompletion() {
  console.log('goBackToLineSelectionWithCompletion 함수 호출됨');
  console.log('현재 라인 타입:', workInfo.value.lineType);
  
  if (workInfo.value.lineType === 'INNER') {
    addLog('내포장이 완료되었습니다! 이제 외포장 작업을 진행해주세요.', 'success')
    
    if (window.handleInnerPackageCompleted) {
      try {
        window.handleInnerPackageCompleted()
        console.log('window.handleInnerPackageCompleted 호출 성공');
      } catch (globalError) {
        console.warn('window.handleInnerPackageCompleted 호출 실패:', globalError);
      }
    }
    
    if (router) {
      console.log('Vue Router로 외포장 라인 페이지 이동 시도...');
      
      const routeOptions = {
        query: {
          inner_completed: 'true',
          next_step: 'outer',
          message: '내포장 완료! 외포장을 진행해주세요.'
        }
      };
      
      const routeNames = ['package_line'];
      let routerSuccess = false;
      
      for (const routeName of routeNames) {
        try {
          console.log(`라우터 이름 "${routeName}"으로 이동 시도...`);
          await router.push({
            name: routeName,
            ...routeOptions
          });
          console.log(`라우터 이름 "${routeName}"으로 이동 성공!`);
          routerSuccess = true;
          break;
        } catch (routerError) {
          console.warn(`라우터 이름 "${routeName}" 이동 실패:`, routerError.message);
        }
      }
      
      if (!routerSuccess) {
        const routePaths = ['/packaging/line', '/package/line'];
        
        for (const routePath of routePaths) {
          try {
            console.log(`라우터 경로 "${routePath}"로 이동 시도...`);
            await router.push({
              path: routePath,
              ...routeOptions
            });
            console.log(`라우터 경로 "${routePath}"로 이동 성공!`);
            routerSuccess = true;
            break;
          } catch (routerError) {
            console.warn(`라우터 경로 "${routePath}" 이동 실패:`, routerError.message);
          }
        }
      }
      
      if (!routerSuccess) {
        console.log('Vue Router 이동 모두 실패, 직접 URL로 이동...');
        const targetUrl = '/packaging/line?inner_completed=true&next_step=outer&message=' + 
                         encodeURIComponent('내포장 완료! 외포장을 진행해주세요.');
        console.log('URL 이동:', targetUrl);
        window.location.href = targetUrl;
      }
    } else {
      console.log('Vue Router 없음, 직접 URL로 이동...');
      const targetUrl = '/packaging/line?inner_completed=true&next_step=outer&message=' + 
                       encodeURIComponent('내포장 완료! 외포장을 진행해주세요.');
      console.log('URL 이동:', targetUrl);
      window.location.href = targetUrl;
    }
  } else {
    addLog('🎉 모든 포장 작업이 완료되었습니다!', 'success')
    
    if (window.handleAllPackageCompleted) {
      try {
        window.handleAllPackageCompleted()
        console.log('window.handleAllPackageCompleted 호출 성공');
      } catch (globalError) {
        console.warn('window.handleAllPackageCompleted 호출 실패:', globalError);
      }
    }
    
    if (router) {
      const dashboardRoutes = ['package_status'];
      let routerSuccess = false;
      
      for (const routeName of dashboardRoutes) {
        try {
          console.log(`대시보드 라우터 "${routeName}"으로 이동 시도...`);
          await router.push({
            name: routeName,
            query: {
              all_completed: 'true',
              message: '모든 포장 작업이 완료되었습니다!'
            }
          });
          console.log(`대시보드 라우터 "${routeName}"으로 이동 성공!`);
          routerSuccess = true;
          break;
        } catch (routerError) {
          console.warn(`대시보드 라우터 "${routeName}" 이동 실패:`, routerError.message);
        }
      }
      
      if (!routerSuccess) {
        console.log('대시보드 라우터 이동 실패, URL로 이동...');
        window.location.href = '/packaging/status?all_completed=true';
      }
    } else {
      console.log('Vue Router 없음, 대시보드 URL로 이동...');
      window.location.href = '/packaging/status?all_completed=true';
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
  
  console.log('라인 선택으로 돌아가기...');
  console.log('현재 라인 타입:', workInfo.value.lineType);
  
  // 🔥 수정: 외포장에서 돌아갈 때 외포장 상태 유지
  const queryParams = {
    from_work: 'true',
    keep_line_type: workInfo.value.lineType, // 현재 라인 타입 유지
    maintain_selection: 'true' // 선택 상태 유지 플래그
  };
  
  // 🔥 추가: 외포장인 경우 내포장 완료 정보도 함께 전달
  if (workInfo.value.lineType === 'OUTER') {
    queryParams.inner_completed = 'true';
    queryParams.show_outer = 'true'; // 외포장 탭을 활성화하도록 지시
    
    // 내포장 완료 수량 정보도 전달 (옵션)
    if (completedInnerWorks.value.size > 0) {
      const completedCount = completedInnerWorks.value.size;
      queryParams.inner_count = completedCount.toString();
      queryParams.message = `내포장 ${completedCount}개 완료됨. 외포장을 계속 진행하세요.`;
    }
  }
  
  console.log('전달할 파라미터:', queryParams);
  
  try {
    if (router && router.push) {
      router.push({ 
        name: 'package_line',
        query: queryParams
      }).catch(() => {
        const params = new URLSearchParams(queryParams);
        window.location.href = `/packaging/line?${params.toString()}`;
      })
    } else {
      const params = new URLSearchParams(queryParams);
      window.location.href = `/packaging/line?${params.toString()}`;
    }
  } catch (error) {
    console.error('라우터 이동 실패, URL로 이동:', error);
    const params = new URLSearchParams(queryParams);
    window.location.href = `/packaging/line?${params.toString()}`;
  }
}

// 작업 버튼 핸들러
function handleWorkButton() {
  if (workStatus.value === 'READY') {
    startWork()
  } else if (workStatus.value === 'WORKING') {
    pauseProduction()
  } else if (workStatus.value === 'PAUSED') {
    resumeProduction()
  }
}

// 작업 버튼 텍스트
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

// 유틸리티 함수들
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

function getWorkStatusText(status) {
  const map = {
    'READY': '준비',
    'WORKING': '작업중', 
    'IN_PROGRESS': '작업중',
    'PAUSED': '일시정지',
    'COMPLETED': '완료',
    '준비': '준비',
    '작업중': '작업중',
    '진행중': '작업중',
    '일시정지': '일시정지',
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

/* 에러 오버레이 */
.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
}

.error-modal {
  background: white;
  border-radius: 12px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.25);
}

.error-header {
  padding: 20px 24px;
  border-bottom: 1px solid #fee2e2;
  background: #fef2f2;
  border-radius: 12px 12px 0 0;
}

.error-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #dc2626;
  margin: 0;
}

.error-body {
  padding: 24px;
}

.error-body p {
  font-size: 14px;
  color: #1e293b;
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.error-help {
  color: #64748b;
  font-size: 13px;
}

.error-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
}

.btn-error-close,
.btn-retry {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-error-close {
  background: #f1f5f9;
  color: #64748b;
}

.btn-error-close:hover {
  background: #e2e8f0;
}

.btn-retry {
  background: #3b82f6;
  color: white;
}

.btn-retry:hover {
  background: #2563eb;
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
.btn-warning,
.btn-danger {
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

/* 완료 상태 버튼 스타일 */
.btn-success.btn-completed {
  background: linear-gradient(135deg, #10b981, #34d399);
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  animation: completePulseGreen 2s infinite;
}

.btn-primary.btn-completed {
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  animation: completePulseBlue 2s infinite;
}

@keyframes completePulseGreen {
  0%, 100% {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.5);
  }
}

@keyframes completePulseBlue {
  0%, 100% {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
  }
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-warning:hover:not(.disabled) {
  background: #d97706;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover:not(.disabled) {
  background: #dc2626;
}

.btn-primary.disabled,
.btn-success.disabled,
.btn-warning.disabled,
.btn-danger.disabled {
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

.debug-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-debug {
  padding: 8px 12px;
  background: #e0e7ff;
  color: #3730a3;
  border: 1px solid #c7d2fe;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-debug:hover {
  background: #c7d2fe;
  transform: translateY(-1px);
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

.modal-actions.inner-completed {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 12px;
}

.modal-actions.inner-completed .btn-cancel {
  grid-column: 1;
  grid-row: 1;
}

.modal-actions.inner-completed .btn-confirm {
  grid-column: 2;
  grid-row: 1;
}

.modal-actions.inner-completed .btn-outer-direct {
  grid-column: 1 / -1;
  grid-row: 2;
}

.btn-cancel,
.btn-confirm,
.btn-outer-direct {
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

.btn-outer-direct {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-outer-direct:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
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
  
  .modal-actions.inner-completed {
    display: flex;
    flex-direction: column;
  }
}
</style>