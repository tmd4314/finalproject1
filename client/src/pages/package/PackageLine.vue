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
        
        <!-- 🔥 내포장 완료 알림 추가 -->
        <div v-if="showInnerCompletedMessage" class="completion-alert">
          🎉 내포장이 완료되었습니다! 이제 외포장을 진행해주세요.
        </div>
        
        <!-- 🔥 미리 선택된 타입 알림 -->
        <div v-if="selectedPackageType && currentStep === 'package-type-selection'" class="pre-selection-alert">
          🎯 {{ getLineTypeText(selectedPackageType) }}이 선택되었습니다. 잠시 후 라인 선택으로 이동합니다.
        </div>
      </div>
      
      <div class="package-type-cards">
        <!-- 내포장 카드 -->
        <div class="package-type-card"
            :class="{ 
              completed: completedSteps.includes('INNER'),
              'pre-selected': selectedPackageType === 'INNER' && currentStep === 'package-type-selection'
            }"
            @click="selectPackageType('INNER')">
          <div class="card-icon">
            <span class="material-icons">medication</span>
          </div>
          <h3>내포장</h3>
          <p>정제를 PTP/병에 포장하는 작업</p>
          <div v-if="completedSteps.includes('INNER')" class="completion-badge">
            ✅ 작업완료
          </div>
          <div v-else-if="selectedPackageType === 'INNER' && currentStep === 'package-type-selection'" class="pre-selected-badge">
            🎯 선택됨 (잠시 후 이동)
          </div>
          <button v-else class="selection-button available">
            선택 가능
          </button>
        </div>
        
        <!-- 외포장 카드 -->
        <div class="package-type-card"
            :class="{ 
              completed: completedSteps.includes('OUTER'), 
              disabled: !completedSteps.includes('INNER'),
              highlighted: completedSteps.includes('INNER') && !completedSteps.includes('OUTER'),
              'pre-selected': selectedPackageType === 'OUTER' && currentStep === 'package-type-selection'
            }"
            @click="selectPackageType('OUTER')">
          <div class="card-icon">
            <span class="material-icons">inventory_2</span>
          </div>
          <h3>외포장</h3>
          <p>내포장된 제품을 박스에 포장하는 작업</p>
          <div v-if="completedSteps.includes('OUTER')" class="completion-badge">
            ✅ 작업완료
          </div>
          <div v-else-if="selectedPackageType === 'OUTER' && currentStep === 'package-type-selection'" class="pre-selected-badge">
            🎯 선택됨 (잠시 후 이동)
          </div>
          <button v-else-if="completedSteps.includes('INNER')" class="selection-button available highlighted">
            ✨ 선택 가능 ✨
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
        <span class="breadcrumb-item" @click="goBackToPackageTypeSelection" style="cursor: pointer; color: #3b82f6;">
          포장 타입 선택
        </span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">{{ getLineTypeText(selectedPackageType) }} 라인 선택</span>
      </nav>
      
      <div class="header-section">
        <h1>{{ getLineTypeText(selectedPackageType) }} 라인 선택</h1>
        <p>사용 가능한 {{ getLineTypeText(selectedPackageType) }} 라인을 선택하여 작업을 시작하세요</p>
        
        <!-- 🔥 내포장 완료 알림을 외포장 라인 선택에서도 표시 -->
        <div v-if="showInnerCompletedMessage && selectedPackageType === 'OUTER'" class="completion-alert">
          🎉 내포장이 완료되었습니다! 이제 외포장 라인을 선택해주세요.
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
          {{ getBackButtonText() }}
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

// 🔥 상태 관리 - 초기값을 명확히 설정
const currentStep = ref('package-type-selection')
const selectedPackageType = ref(null)
const completedSteps = ref([]) // 🔥 초기값을 빈 배열로 설정
const innerCompletionTime = ref(null)
const outerCompletionTime = ref(null)
const showInnerCompletedMessage = ref(false)

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

// 🔥 초기 상태 설정 함수 (단순화)
function initializeToDefaultState() {
  console.log('🔄 초기 상태로 리셋');
  currentStep.value = 'package-type-selection';
  selectedPackageType.value = null;
  completedSteps.value = [];
  innerCompletionTime.value = null;
  outerCompletionTime.value = null;
  showInnerCompletedMessage.value = false;
  lineTypeFilter.value = '';
  lineStatusFilter.value = '';
  searchText.value = '';
  console.log('✅ 초기 상태 설정 완료');
}

// 🔥 수정된 URL 파라미터 처리 (강화된 디버깅 + localStorage 확인)
onBeforeMount(() => {
  console.log('🔥🔥🔥 포장 라인 페이지 로드 시작 🔥🔥🔥');
  console.log('📍 URL 파라미터:', route.query);
  console.log('📍 Route Path:', route.path);
  console.log('📍 Route Name:', route.name);
  
  // 🔥 강제 포장 타입 확인 (localStorage에서)
  const forcePackageType = localStorage.getItem('forcePackageType');
  if (forcePackageType) {
    console.log('🚨🚨 강제 포장 타입 감지:', forcePackageType);
    
    if (forcePackageType === 'OUTER') {
      console.log('🎯 외포장 강제 설정 - 내포장 완료 상태로 설정');
      completedSteps.value = ['INNER'];
      innerCompletionTime.value = new Date();
    }
    
    selectedPackageType.value = forcePackageType;
    currentStep.value = 'line-selection';
    lineTypeFilter.value = forcePackageType;
    lineStatusFilter.value = '';
    searchText.value = '';
    
    // 강제 플래그 제거
    localStorage.removeItem('forcePackageType');
    
    console.log('🎯🎯 강제 설정 완료:', {
      selectedPackageType: selectedPackageType.value,
      currentStep: currentStep.value,
      lineTypeFilter: lineTypeFilter.value,
      completedSteps: completedSteps.value
    });
    
    return;
  }
  
  // 🔥 우선순위 1: 작업 수행 페이지에서 돌아온 경우 (maintain_type + from_work)
  if (route.query.maintain_type && route.query.from_work === 'true') {
    console.log('✅✅ 작업 수행 페이지에서 돌아옴 감지!');
    console.log('📦 유지할 포장 타입:', route.query.maintain_type);
    
    const packageType = route.query.maintain_type;
    
    // 외포장 작업 중이었다면 내포장 완료 상태로 설정
    if (packageType === 'OUTER') {
      console.log('🎯 외포장 작업이므로 내포장 완료 상태 설정');
      completedSteps.value = ['INNER'];
      innerCompletionTime.value = new Date();
    }
    
    // 상태 설정
    selectedPackageType.value = packageType;
    currentStep.value = 'line-selection';
    lineTypeFilter.value = packageType;
    lineStatusFilter.value = '';
    searchText.value = '';
    
    console.log('🎯🎯 상태 설정 완료:', {
      selectedPackageType: selectedPackageType.value,
      currentStep: currentStep.value,
      lineTypeFilter: lineTypeFilter.value,
      completedSteps: completedSteps.value
    });
    
    // URL 파라미터 정리
    setTimeout(() => {
      router.replace({ query: {} });
    }, 100);
    return;
  }
  
  // 🔥 우선순위 2: 다른 라인 선택 버튼으로 온 경우
  if (route.query.current_package_type) {
    console.log('✅✅ 다른 라인 선택으로 돌아옴 감지!');
    console.log('📦 유지할 포장 타입:', route.query.current_package_type);
    
    const packageType = route.query.current_package_type;
    
    // 외포장 선택인 경우 내포장 완료 상태로 설정
    if (packageType === 'OUTER') {
      console.log('🎯 외포장 선택이므로 내포장 완료 상태 설정');
      completedSteps.value = ['INNER'];
      innerCompletionTime.value = new Date();
    }
    
    // 상태 설정
    selectedPackageType.value = packageType;
    currentStep.value = 'line-selection';
    lineTypeFilter.value = packageType;
    lineStatusFilter.value = '';
    searchText.value = '';
    
    console.log('🎯🎯 상태 설정 완료:', {
      selectedPackageType: selectedPackageType.value,
      currentStep: currentStep.value,
      lineTypeFilter: lineTypeFilter.value,
      completedSteps: completedSteps.value
    });
    
    // URL 파라미터 정리
    setTimeout(() => {
      router.replace({ query: {} });
    }, 100);
    return;
  }
  
  // 🔥 우선순위 3: localStorage에서 이전 상태 복구 시도
  try {
    const savedState = localStorage.getItem('packageLineState');
    if (savedState) {
      const state = JSON.parse(savedState);
      console.log('💾💾 localStorage에서 이전 상태 발견:', state);
      
      if (state.selectedPackageType === 'OUTER') {
        console.log('🎯 localStorage에서 외포장 상태 복구');
        
        completedSteps.value = ['INNER'];
        innerCompletionTime.value = new Date();
        selectedPackageType.value = 'OUTER';
        currentStep.value = 'line-selection';
        lineTypeFilter.value = 'OUTER';
        lineStatusFilter.value = '';
        searchText.value = '';
        
        console.log('🎯🎯 localStorage 복구 완료:', {
          selectedPackageType: selectedPackageType.value,
          currentStep: currentStep.value,
          lineTypeFilter: lineTypeFilter.value,
          completedSteps: completedSteps.value
        });
        
        return;
      }
    }
  } catch (error) {
    console.warn('⚠️ localStorage 복구 실패:', error);
  }
  
  // 🔥 우선순위 4: 내포장 완료 파라미터 확인
  if (route.query.inner_completed === 'true') {
    console.log('✅✅ 내포장 완료 감지!');
    
    completedSteps.value = ['INNER'];
    innerCompletionTime.value = new Date();
    showInnerCompletedMessage.value = true;
    
    // 3초 후 메시지 숨기기
    setTimeout(() => {
      showInnerCompletedMessage.value = false;
    }, 3000);
    
    // 내포장 완료 후 외포장으로 자동 이동
    selectedPackageType.value = 'OUTER';
    currentStep.value = 'line-selection';
    lineTypeFilter.value = 'OUTER';
    
    console.log('🎯 내포장 완료 후 외포장 라인 선택으로 자동 이동');
    
    // URL 파라미터 정리
    setTimeout(() => {
      router.replace({ query: {} });
    }, 100);
    return;
  }
  
  // 🔥 우선순위 5: 외포장 완료 파라미터 확인
  if (route.query.outer_completed === 'true' || route.query.all_completed === 'true') {
    console.log('✅✅ 외포장 완료 감지!');
    
    completedSteps.value = ['INNER', 'OUTER'];
    innerCompletionTime.value = new Date();
    outerCompletionTime.value = new Date();
    
    // 모든 작업 완료 시 포장 타입 선택 화면으로
    currentStep.value = 'package-type-selection';
    selectedPackageType.value = null;
    
    console.log('🎯 외포장 완료 후 포장 타입 선택 화면으로 이동');
    
    // URL 파라미터 정리
    setTimeout(() => {
      router.replace({ query: {} });
    }, 100);
    return;
  }
  
  // 🔥 우선순위 6: 기본 상태로 설정
  console.log('❌❌ 특별한 파라미터가 없음 - 기본 상태로 설정');
  console.log('🔄 초기화 진행...');
  
  currentStep.value = 'package-type-selection';
  selectedPackageType.value = null;
  completedSteps.value = [];
  lineTypeFilter.value = '';
  lineStatusFilter.value = '';
  searchText.value = '';
  
  console.log('🎯🎯 최종 기본 상태:', {
    selectedPackageType: selectedPackageType.value,
    currentStep: currentStep.value,
    lineTypeFilter: lineTypeFilter.value,
    completedSteps: completedSteps.value
  });
  
  console.log('🔥🔥🔥 포장 라인 페이지 로드 완료 🔥🔥🔥');
})

// DB에서 라인 목록 가져오기
async function fetchLines() {
  loading.value = true
  error.value = ''
  try {
    // 실제 API 호출 (🔥 /api/ 제거)
    const res = await axios.get('/lines/list')
    packageLines.value = res.data
    
    console.log('✅ 라인 목록 로드 완료:', res.data);
    console.log('📊 현재 필터 상태:', {
      lineTypeFilter: lineTypeFilter.value,
      lineStatusFilter: lineStatusFilter.value,
      searchText: searchText.value
    });
    
  } catch (err) {
    error.value = '라인 목록을 불러오지 못했습니다.'
    console.error('❌ 라인 목록 로드 실패:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  console.log('🔍 컴포넌트 마운트');
  fetchLines();
})

// 필터링된 라인 목록
const filteredLines = computed(() => {
  console.log('🔍 필터링 중...', {
    totalLines: packageLines.value.length,
    lineTypeFilter: lineTypeFilter.value,
    lineStatusFilter: lineStatusFilter.value,
    searchText: searchText.value
  });
  
  const filtered = packageLines.value.filter(line => {
    const matchType = !lineTypeFilter.value || line.line_type === lineTypeFilter.value
    const matchStatus = !lineStatusFilter.value || line.line_status === lineStatusFilter.value
    const matchSearch = !searchText.value || line.line_name?.toLowerCase().includes(searchText.value.toLowerCase())

    console.log(`라인 ${line.line_name}: type=${matchType}, status=${matchStatus}, search=${matchSearch}`);
    return matchType && matchStatus && matchSearch
  });
  
  console.log('✅ 필터링 결과:', filtered.length, '개 라인');
  return filtered;
})

// 🔥 포장 타입 선택 함수 개선
function selectPackageType(type) {
  console.log('🎯 포장 타입 선택:', type);
  console.log('🔍 현재 완료된 단계:', completedSteps.value);
  
  if (type === 'OUTER' && !completedSteps.value.includes('INNER')) {
    alert('내포장 작업을 먼저 완료해주세요.');
    return;
  }
  
  selectedPackageType.value = type;
  currentStep.value = 'line-selection';
  
  // 🔥 선택한 타입으로 필터 설정하고 다른 필터는 초기화
  lineTypeFilter.value = type;
  lineStatusFilter.value = '';
  searchText.value = '';
  
  console.log(`✅ ${type === 'INNER' ? '내포장' : '외포장'} 라인 선택 화면으로 이동`);
  console.log('🔧 필터 설정:', {
    lineTypeFilter: lineTypeFilter.value,
    lineStatusFilter: lineStatusFilter.value,
    searchText: searchText.value
  });
}

// 포장 타입 선택으로 돌아가기
function goBackToPackageTypeSelection() {
  // 현재 선택된 포장 타입이 있고, 해당 타입의 작업이 진행되었다면
  // 타입 선택을 건너뛰고 바로 라인 선택으로 이동
  if (selectedPackageType.value && 
      ((selectedPackageType.value === 'OUTER' && completedSteps.value.includes('INNER')) ||
       (selectedPackageType.value === 'INNER'))) {
    
    console.log('🔄 현재 포장 타입 유지하여 라인 선택 화면 새로고침');
    
    // 현재 포장 타입을 유지하면서 라인 선택 화면 새로고침
    lineTypeFilter.value = selectedPackageType.value;
    lineStatusFilter.value = '';
    searchText.value = '';
    
    // 라인 목록 다시 로드
    fetchLines();
    
    return; // 포장 타입 선택 단계로 가지 않음
  }
  
  // 그 외의 경우에만 포장 타입 선택 단계로 이동
  currentStep.value = 'package-type-selection'
  selectedPackageType.value = null
  
  // 🔥 필터 완전 초기화 (전체 표시)
  lineTypeFilter.value = ''
  lineStatusFilter.value = ''
  searchText.value = ''
  
  console.log('🔙 포장 타입 선택 화면으로 돌아가기, 필터 초기화 완료');
}

// 🔥 모든 단계 초기화 - 완전히 초기 상태로 리셋
function resetAllSteps() {
  console.log('🔄 모든 단계 초기화');
  initializeToDefaultState();
}

// 필터 초기화 (현재 선택된 포장 타입 유지 또는 전체 표시)
function clearAllFilters() {
  // 🔥 라인 선택 단계에서는 현재 선택된 포장 타입 유지, 포장 타입 선택 단계에서는 전체 표시
  if (currentStep.value === 'line-selection' && selectedPackageType.value) {
    lineTypeFilter.value = selectedPackageType.value;
  } else {
    lineTypeFilter.value = '';
  }
  lineStatusFilter.value = '';
  searchText.value = '';
  
  console.log('🔄 필터 초기화 완료:', {
    lineTypeFilter: lineTypeFilter.value,
    lineStatusFilter: lineStatusFilter.value,
    searchText: searchText.value
  });
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
    console.log('🚀 작업 시작 처리 중...', selectedLineForStart.value);
    
    // 🔥 라인 상태를 WORKING으로 변경하는 API 호출 (/api/ 제거)
    // await axios.post(`/lines/${selectedLineForStart.value.line_id}/start`)
    
    // 작업 수행 페이지로 이동
    navigateToWorkPage(selectedLineForStart.value)
    
  } catch (err) {
    console.error('❌ 작업 시작 중 오류:', err)
    
    // 🔥 상세한 에러 메시지 제공
    let errorMessage = '작업 시작 중 오류가 발생했습니다.';
    
    if (err.message?.includes('No match for')) {
      errorMessage = '페이지 이동 중 오류가 발생했습니다. 직접 이동을 시도합니다.';
      // 🔥 에러 발생시 강제로 직접 이동
      const params = new URLSearchParams({
        line_id: selectedLineForStart.value.line_id,
        line_name: selectedLineForStart.value.line_name,
        line_type: selectedLineForStart.value.line_type,
        work_no: selectedLineForStart.value.work_no || '',
        return_to: 'package_line',
        current_package_type: selectedPackageType.value
      })
      window.location.href = `/packaging/work?${params.toString()}`;
      return;
    }
    
    alert(errorMessage)
  } finally {
    closeStartModal()
  }
}

// 작업 수행 페이지로 이동
function navigateToWorkPage(line) {
  console.log('🚀 작업 페이지로 이동:', line);
  
  // 간단하게 상태 저장
  const currentState = {
    selectedPackageType: selectedPackageType.value,
    completedSteps: completedSteps.value
  };
  localStorage.setItem('packageLineState', JSON.stringify(currentState));
  
  // 라우터로 이동 시도
  try {
    router.push({
      name: 'package_work',
      query: {
        line_id: line.line_id,
        line_name: line.line_name,
        line_type: line.line_type,
        work_no: line.work_no || '',
        return_to: 'package_line',
        current_package_type: selectedPackageType.value
      }
    })
    console.log('✅ Vue Router로 이동 성공');
  } catch (routerError) {
    console.error('❌ Vue Router 이동 실패:', routerError);
    
    // 라우터 실패시 직접 URL로 이동
    const params = new URLSearchParams({
      line_id: line.line_id,
      line_name: line.line_name,
      line_type: line.line_type,
      work_no: line.work_no || '',
      return_to: 'package_line',
      current_package_type: selectedPackageType.value
    })
    
    console.log('🔄 직접 URL로 이동:', `/packaging/work?${params.toString()}`);
    window.location.href = `/packaging/work?${params.toString()}`
  }
}

// 작업 완료 후 돌아오는 함수
function handleWorkCompleted(workType) {
  if (workType === 'INNER') {
    completedSteps.value = ['INNER'];
    innerCompletionTime.value = new Date();
    
    // 내포장 완료 후 외포장으로 자동 설정
    selectedPackageType.value = 'OUTER';
    currentStep.value = 'line-selection';
    lineTypeFilter.value = 'OUTER';
    
    console.log('✅ 내포장 완료 후 외포장 라인 선택으로 이동');
  } else if (workType === 'OUTER') {
    completedSteps.value = ['INNER', 'OUTER'];
    outerCompletionTime.value = new Date();
    
    // 외포장 완료 후 타입 선택으로
    currentStep.value = 'package-type-selection';
    selectedPackageType.value = null;
  }
}

// 전역에 함수 노출
window.handlePackageWorkCompleted = handleWorkCompleted

// 모달 닫기
function closeStartModal() {
  showStartModal.value = false
  selectedLineForStart.value = null
}

// 뒤로가기 버튼 텍스트
function getBackButtonText() {
  if (selectedPackageType.value && 
      ((selectedPackageType.value === 'OUTER' && completedSteps.value.includes('INNER')) ||
       (selectedPackageType.value === 'INNER'))) {
    return `🔄 ${getLineTypeText(selectedPackageType.value)} 라인 새로고침`
  }
  return '← 포장 타입 선택으로 돌아가기'
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

/* 🔥 내포장 완료 알림 추가 */
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
  animation: fadeInScale 0.5s ease-out;
}

@keyframes fadeInScale {
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
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

/* 🔥 외포장 활성화 시 강조 */
.package-type-card.highlighted {
  border-color: #10b981;
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 12px 30px rgba(16, 185, 129, 0.25);
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

/* 🔥 외포장 활성화 시 강조 버튼 */
.selection-button.highlighted {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  animation: shimmer 1.5s infinite;
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
  align-items: flex-end;
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