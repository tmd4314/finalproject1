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
          <h1>{{ workInfo.lineName }} - {{ getWorkflowStepText() }} 작업 수행</h1>
          <div class="header-meta">
            <span class="line-type-badge" :class="workInfo.lineType.toLowerCase()">
              {{ workInfo.lineType === 'INNER' ? '내포장' : '외포장' }}
            </span>
            <span class="work-status-badge" :class="workStatus.toLowerCase()">
              {{ getWorkStatusText(workStatus) }}
            </span>
            <span v-if="workflowInfo.step === 'OUTER'" class="workflow-badge">
              2단계: 최종 포장
            </span>
          </div>
        </div>
        <div v-if="workflowInfo.step" class="workflow-indicator">
          <div class="workflow-step" :class="{ completed: workflowInfo.innerCompleted }">
            <div class="step-text">내포장</div>
          </div>
          <div class="workflow-arrow">→</div>
          <div class="workflow-step" :class="{ active: workflowInfo.step === 'OUTER' }">
            <div class="step-text">외포장</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 디버깅 패널 -->
    <div v-if="showDebugPanel" class="debug-panel">
      <div class="debug-header">
        <h3>실제 데이터 디버깅</h3>
        <button @click="showDebugPanel = false" class="debug-close">닫기</button>
      </div>
      <div class="debug-content">
        <div class="debug-section">
          <h4>라인 정보</h4>
          <div class="debug-info">
            <p><strong>라인 ID:</strong> {{ workInfo.lineId }}</p>
            <p><strong>라인명:</strong> {{ workInfo.lineName }}</p>
            <p><strong>라인 타입:</strong> {{ workInfo.lineType }}</p>
          </div>
        </div>
        
        <div class="debug-section">
          <h4>API 응답 정보</h4>
          <div v-if="debugInfo.lastApiResponse" class="debug-info">
            <p><strong>조회된 작업 수:</strong> {{ debugInfo.lastApiResponse.count || 0 }}</p>
            <p><strong>필터 조건:</strong> {{ JSON.stringify(debugInfo.lastApiResponse.filters || {}) }}</p>
            <details v-if="debugInfo.lastApiResponse.metadata">
              <summary>메타데이터</summary>
              <pre>{{ JSON.stringify(debugInfo.lastApiResponse.metadata, null, 2) }}</pre>
            </details>
          </div>
        </div>
        
        <div class="debug-section">
          <h4>실제 데이터 샘플</h4>
          <div v-if="debugInfo.sampleData" class="debug-info">
            <p><strong>전체 데이터 수:</strong> {{ debugInfo.sampleData.total || 0 }}건</p>
            <details v-if="debugInfo.sampleData.samples && debugInfo.sampleData.samples.length > 0">
              <summary>샘플 데이터 구조 ({{ debugInfo.sampleData.samples.length }}건)</summary>
              <div v-for="(sample, index) in debugInfo.sampleData.samples" :key="index" class="sample-item">
                <strong>샘플 {{ index + 1 }}:</strong>
                <ul class="sample-details">
                  <li><strong>work_id:</strong> {{ sample.work_id }}</li>
                  <li><strong>work_order_no:</strong> {{ sample.work_order_no || 'null' }}</li>
                  <li><strong>line_id:</strong> {{ sample.line_id || 'null' }}</li>
                  <li><strong>work_line:</strong> {{ sample.work_line || 'null' }}</li>
                  <li><strong>step_name:</strong> {{ sample.step_name || 'null' }}</li>
                  <li><strong>product_name:</strong> {{ sample.product_name || 'null' }}</li>
                  <li><strong>step_status:</strong> {{ sample.step_status || 'null' }}</li>
                </ul>
              </div>
            </details>
          </div>
        </div>
        
        <div class="debug-section">
          <h4>필터링 테스트</h4>
          <div class="debug-info">
            <p><strong>현재 필터:</strong></p>
            <ul>
              <li>package_type: {{ workInfo.lineType }}</li>
              <li>line_id: {{ workInfo.lineId }}</li>
              <li>line_name: {{ workInfo.lineName }}</li>
            </ul>
          </div>
          <div class="debug-actions">
            <button @click="loadSampleData" class="debug-btn">실제 데이터 확인</button>
            <button @click="testAllFilters" class="debug-btn">모든 필터 테스트</button>
            <button @click="testProductNameMapping" class="debug-btn">제품명 매핑 테스트</button>
            <button @click="loadWithoutFilter" class="debug-btn">필터 없이 로드</button>
            <button @click="refreshData" class="debug-btn">강제 새로고침</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="workflowInfo.step === 'OUTER' && workflowInfo.innerCompleted" class="workflow-guide">
      <div class="guide-content">
        <h3>외포장 작업 단계입니다</h3>
        <p>내포장 작업({{ workflowInfo.innerWorkNo }})이 완료되었습니다. 이제 최종 외포장 작업을 진행해주세요.</p>
        <div class="guide-stats">
          <span>내포장 완료: {{ formatTime(workflowInfo.innerCompletionTime) }}</span>
          <span v-if="workflowInfo.innerOutputQty > 0" class="output-qty">
            완료수량: {{ formatNumber(workflowInfo.innerOutputQty) }}개 → 외포장 투입
          </span>
        </div>
      </div>
    </div>

    <!-- 메인 컨텐츠 -->
    <div class="work-content">
      <div class="work-layout">
        <!-- 좌측: 작업 제어 및 진행 상황 -->
        <div class="work-main">
          <div class="control-panel">
            <div class="panel-header">
              <h3>작업 제어</h3>
              <button @click="showDebugPanel = !showDebugPanel" class="debug-toggle">
                디버깅 {{ showDebugPanel ? '숨김' : '표시' }}
              </button>
            </div>
            
            <div class="control-section">
              <div class="control-row">
                <!-- 작업번호 선택 -->
                <div class="control-group">
                  <label class="control-label">
                    작업번호 선택
                    <span v-if="availableWorkOrders.length > 0" class="available-count">
                      ({{ availableWorkOrders.length }}개 사용가능)
                    </span>
                    <span class="line-info">{{ workInfo.lineName }}</span>
                  </label>
                  
                  <select 
                    v-model="selectedWorkOrder" 
                    @change="onWorkOrderChange"
                    class="control-select" 
                    :disabled="isWorking"
                  >
                    <option value="">{{ workInfo.lineName }}의 작업을 선택하세요</option>
                    
                    <!-- 준비 상태 작업 -->
                    <optgroup 
                      v-if="readyWorks && readyWorks.length > 0" 
                      label="시작 가능한 작업"
                    >
                      <option 
                        v-for="work in readyWorks" 
                        :key="work.work_order_no || work.work_id" 
                        :value="work.work_order_no || work.work_id"
                        class="ready-option"
                      >
                        {{ work.work_order_no || work.work_id || '작업번호없음' }} - {{ work.final_product_name || work.product_name || '제품명없음' }} 
                        ({{ formatNumber(work.order_qty || work.target_qty || work.input_qty || 1000) }}개)
                      </option>
                    </optgroup>
                    
                    <!-- 진행중 작업 -->
                    <optgroup 
                      v-if="workingWorks && workingWorks.length > 0" 
                      label="진행중인 작업"
                    >
                      <option 
                        v-for="work in workingWorks" 
                        :key="work.work_order_no || work.work_id" 
                        :value="work.work_order_no || work.work_id"
                        class="working-option"
                      >
                        {{ work.work_order_no || work.work_id || '작업번호없음' }} - {{ work.final_product_name || work.product_name || '제품명없음' }} 
                        ({{ work.progress_rate || 0 }}% 완료)
                      </option>
                    </optgroup>
                    
                    <!-- 일시정지 작업 -->
                    <optgroup 
                      v-if="pausedWorks && pausedWorks.length > 0" 
                      label="일시정지/부분완료된 작업"
                    >
                      <option 
                        v-for="work in pausedWorks" 
                        :key="work.work_order_no || work.work_id" 
                        :value="work.work_order_no || work.work_id"
                        class="paused-option"
                      >
                        {{ work.work_order_no || work.work_id || '작업번호없음' }} - {{ work.final_product_name || work.product_name || '제품명없음' }} 
                        ({{ work.progress_rate || 0 }}% 완료 - {{ getWorkStatusText(work.step_status) }})
                      </option>
                    </optgroup>
                  </select>
                  
                  <div v-if="availableWorkOrders.length === 0 && !loading" class="no-work-message">
                    <div>
                      <div><strong>{{ workInfo.lineName }}의 {{ workInfo.lineType === 'INNER' ? '내포장' : '외포장' }} 작업번호가 없습니다.</strong></div>
                      <div style="font-size: 12px; margin-top: 4px;">
                        • 새로고침 버튼을 눌러보세요<br>
                        • 또는 다른 라인을 선택해보세요<br>
                        • 디버깅 패널에서 데이터를 확인해보세요
                      </div>
                    </div>
                  </div>
                  
                  <div v-if="loading && loadingMessage.includes('작업번호')" class="loading-work-message">
                    <div>
                      <strong>{{ workInfo.lineName }} 작업번호를 불러오는 중...</strong>
                      <div style="font-size: 12px; margin-top: 4px;">실제 데이터베이스에서 조회 중입니다.</div>
                    </div>
                  </div>
                </div>
                
                <!-- 지시량 -->
                <div class="control-group">
                  <label class="control-label">지시량</label>
                  <div class="control-display">
                    <span class="display-value">{{ formatNumber(currentWork.target_quantity) }}</span>
                    <span class="display-unit">개</span>
                  </div>
                </div>
              </div>

              <div class="control-row">
                <!-- 기투입량 -->
                <div class="control-group">
                  <label class="control-label">기투입량</label>
                  <div class="control-display">
                    <span class="display-value" :class="{ 'workflow-linked': workInfo.lineType === 'OUTER' && workflowInfo.innerOutputQty > 0 }">
                      {{ formatNumber(currentWork.current_quantity) }}
                    </span>
                    <span class="display-unit">개</span>
                  </div>
                </div>

                <!-- 미투입량 -->
                <div class="control-group">
                  <label class="control-label">미투입량</label>
                  <div class="control-display">
                    <span class="display-value remaining-qty" :class="{ 'remaining-qty-highlight': getRemainingQuantity() > 0 }">
                      {{ formatNumber(currentWork.remaining_quantity) }}
                    </span>
                    <span class="display-unit">개</span>
                  </div>
                </div>
              </div>

              <div class="control-row">
                <!-- 생산속도 -->
                <div class="control-group">
                  <label class="control-label">생산속도 (개/초)</label>
                  <select 
                    v-model.number="productionSettings.productionSpeed" 
                    class="control-select" 
                    :disabled="isWorking"
                  >
                    <option value="10">느림 (10개/초)</option>
                    <option value="30">보통 (30개/초)</option>
                    <option value="60">빠름 (60개/초)</option>
                    <option value="100">매우빠름 (100개/초)</option>
                  </select>
                </div>
                
                <div class="control-group">
                  <label class="control-label">
                    투입수량
                    <span v-if="currentWork.target_quantity > 0" class="target-info">
                      (지시: {{ formatNumber(currentWork.target_quantity) }}개)
                    </span>
                    <span v-if="workInfo.lineType === 'OUTER' && workflowInfo.innerOutputQty > 0" class="workflow-info">
                      (내포장 완료: {{ formatNumber(workflowInfo.innerOutputQty) }}개)
                    </span>
                  </label>
                  <input 
                    v-model.number="inputQuantity" 
                    type="number" 
                    class="control-input" 
                    :class="{ 
                      'workflow-linked': workInfo.lineType === 'OUTER' && workflowInfo.innerOutputQty > 0,
                      'partial-work': isPartialWork
                    }"
                    :placeholder="workInfo.lineType === 'OUTER' && workflowInfo.innerOutputQty > 0 ? workflowInfo.innerOutputQty.toString() : '500'"
                    :disabled="!selectedWorkOrder || isWorking || (workInfo.lineType === 'OUTER' && workflowInfo.innerOutputQty > 0)"
                    :max="currentWork.target_quantity"
                    min="1"
                    @input="onInputQuantityChange"
                  >
                  
                  <div v-if="workInfo.lineType === 'OUTER' && workflowInfo.innerOutputQty > 0" class="workflow-linked-info">
                    연계: 내포장 완료수량으로 자동 설정됨 ({{ formatNumber(workflowInfo.innerOutputQty) }}개)
                  </div>
                  
                  <div v-if="isPartialWork" class="partial-work-info">
                    부분완료 작업 - 남은 수량: {{ formatNumber(getRemainingQuantity()) }}개
                  </div>
                  
                  <div v-if="inputQuantity > currentWork.target_quantity && currentWork.target_quantity > 0" class="input-warning">
                    투입수량이 지시수량을 초과합니다
                  </div>
                  
                  <div v-if="workInfo.lineType === 'OUTER' && workflowInfo.innerOutputQty > 0 && inputQuantity !== workflowInfo.innerOutputQty" class="workflow-suggestion">
                    내포장 완료수량({{ formatNumber(workflowInfo.innerOutputQty) }}개)과 다릅니다
                  </div>
                </div>
              </div>

              <!-- 선택된 작업 미리보기 (실제 데이터 기반) -->
              <div v-if="selectedWorkOrder && currentWork.work_order_no" class="selected-work-preview">
                <h4>선택된 작업 정보 (실제 DB 데이터)</h4>
                <div class="preview-grid">
                  <div class="preview-item">
                    <span class="label">작업번호:</span>
                    <span class="value">{{ currentWork.work_order_no || currentWork.work_id }}</span>
                  </div>
                  <div class="preview-item">
                    <span class="label">제품명:</span>
                    <span class="value">{{ currentWork.final_product_name || currentWork.product_name || '제품명없음' }}</span>
                  </div>
                  <div class="preview-item">
                    <span class="label">작업상태:</span>
                    <span class="value" :class="getWorkStatusClass(currentWork.step_status)">
                      {{ getWorkStatusText(currentWork.step_status) }}
                    </span>
                  </div>
                  <div class="preview-item">
                    <span class="label">지시수량:</span>
                    <span class="value">{{ formatNumber(currentWork.target_quantity) }}개</span>
                  </div>
                  <div class="preview-item">
                    <span class="label">현재 진행률:</span>
                    <span class="value">{{ currentWork.progressRate }}%</span>
                  </div>
                  <div class="preview-item">
                    <span class="label">작업자:</span>
                    <span class="value">{{ currentWork.worker_name }}</span>
                  </div>
                  <div class="preview-item">
                    <span class="label">라인:</span>
                    <span class="value">{{ workInfo.lineName }}</span>
                  </div>
                  <div class="preview-item">
                    <span class="label">라인타입:</span>
                    <span class="value">{{ currentWork.package_type || workInfo.lineType }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="work-controls">
              <!-- 주요 작업 버튼들 -->
              <div class="main-actions">
                <button 
                  @click="handleWorkButton" 
                  :disabled="!canStartWork && !isWorking && workStatus !== 'PAUSED'"
                  :class="['btn', 'btn-work', { 'working': isWorking }]"
                >
                  {{ getWorkButtonText() }}
                </button>
                
                <button 
                  @click="completeProduction" 
                  :disabled="!isWorking && workStatus !== 'COMPLETED'"
                  :class="['btn', 'btn-complete', { 'ready': workStatus === 'COMPLETED' }]"
                >
                  {{ workStatus === 'COMPLETED' ? '완료 처리' : '생산 완료' }}
                </button>
                
                <button 
                  @click="stopWork" 
                  :disabled="!isWorking"
                  class="btn btn-stop"
                >
                  작업 종료
                </button>
              </div>
              
              <!-- 보조 기능 버튼들 -->
              <div class="sub-actions">
                <button @click="refreshWorkOrders" :disabled="loading" class="btn btn-refresh">
                  강력 새로고침
                </button>
                <button 
                  @click="resetLineStatus" 
                  :disabled="loading || isWorking"
                  class="btn btn-reset"
                  title="라인 초기화"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>
          
          <!-- 실시간 진행 상황 -->
          <div class="progress-panel">
            <h3>실시간 진행 상황</h3>
            <div class="progress-cards">
              <div class="progress-card">
                <div class="card-header">
                  <span class="card-title">생산수량</span>
                </div>
                <div class="card-value">{{ formatNumber(productionSettings.currentProgress) }}</div>
                <div class="card-unit">개</div>
              </div>
              <div class="progress-card success">
                <div class="card-header">
                  <span class="card-title">합격수량</span>
                </div>
                <div class="card-value">{{ formatNumber(currentWork.output_qty) }}</div>
                <div class="card-unit">개</div>
              </div>
              <div class="progress-card danger">
                <div class="card-header">
                  <span class="card-title">불량수량</span>
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
          <div v-if="workflowInfo.step === 'OUTER' && workflowInfo.innerCompleted" class="workflow-panel">
            <h3>워크플로우 정보</h3>
            <div class="workflow-chain">
              <div class="chain-step completed">
                <div class="step-header">
                  <span class="step-title">내포장 완료</span>
                </div>
                <div class="step-details">
                  <div class="detail-item">
                    <span class="detail-label">작업번호:</span>
                    <span class="detail-value">{{ workflowInfo.innerWorkNo }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">완료시간:</span>
                    <span class="detail-value">{{ formatTime(workflowInfo.innerCompletionTime) }}</span>
                  </div>
                  <div v-if="workflowInfo.innerOutputQty > 0" class="detail-item">
                    <span class="detail-label">완료수량:</span>
                    <span class="detail-value highlight">{{ formatNumber(workflowInfo.innerOutputQty) }}개</span>
                  </div>
                </div>
              </div>
              <div class="chain-arrow"></div>
              <div class="chain-step current">
                <div class="step-header">
                  <span class="step-title">외포장 진행</span>
                </div>
                <div class="step-details">
                  <div class="detail-item">
                    <span class="detail-label">라인:</span>
                    <span class="detail-value">{{ workInfo.lineName }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">상태:</span>
                    <span class="detail-value">{{ getWorkStatusText(workStatus) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="info-panel">
            <h3>현재 작업 정보</h3>
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">라인 정보</span>
                <span class="info-value">{{ workInfo.lineName }} ({{ workInfo.lineId }})</span>
              </div>
              <div class="info-row">
                <span class="info-label">작업번호</span>
                <span class="info-value">{{ currentWork.work_order_no || currentWork.work_id || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">제품명</span>
                <span class="info-value">{{ currentWork.final_product_name || currentWork.product_name || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">포장형태</span>
                <span class="info-value">{{ workInfo.lineType === 'INNER' ? '내포장' : '외포장' }}</span>
              </div>
            </div>
            
            <!-- 작업량 정보 섹션 -->
            <div class="info-section">
              <h4>작업량 정보</h4>
              <div class="info-row">
                <span class="info-label">지시량</span>
                <span class="info-value">{{ formatNumber(currentWork.target_quantity) || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">기투입량</span>
                <span class="info-value" :class="{ 'workflow-linked': workInfo.lineType === 'OUTER' && workflowInfo.innerOutputQty > 0 }">
                  {{ formatNumber(currentWork.current_quantity) || '-' }}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">미투입량</span>
                <span class="info-value remaining-qty" :class="{ 'remaining-qty-highlight': getRemainingQuantity() > 0 }">{{ formatNumber(currentWork.remaining_quantity) || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">달성률</span>
                <span class="info-value achievement-rate" :class="getAchievementRateClass(currentWork.achievementRate)">
                  {{ currentWork.achievementRate }}%
                </span>
              </div>
            </div>
            
            <!-- 시간 정보 섹션 -->
            <div class="info-section">
              <h4>시간 정보</h4>
              <div class="info-row">
                <span class="info-label">시작시간</span>
                <span class="info-value">{{ formatTime(currentWork.start_time) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">작업시간</span>
                <span class="info-value work-duration">{{ workElapsedTime }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">종료예정시간</span>
                <span class="info-value estimated-time" :class="{ 'time-warning': isTimeWarning }">{{ formatTime(currentWork.end_time) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">예상소요시간</span>
                <span class="info-value">{{ formatDuration(currentWork.estimated_duration) }}</span>
              </div>
            </div>
            
            <!-- 품질 정보 -->
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
            
            <!-- 담당자 정보 섹션 -->
            <div class="info-section">
              <h4>담당자 정보</h4>
              <div class="info-row">
                <span class="info-label">작업자명</span>
                <span class="info-value worker-name">{{ currentWork.worker_name || '김포장' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">사번</span>
                <span class="info-value">{{ currentWork.employee_id || '-' }}</span>
              </div>
            </div>
            
            <!-- 실제 DB 정보 (디버깅용) -->
            <div v-if="showDebugPanel && currentWork._original_keys" class="info-section debug-section">
              <h4>실제 DB 정보</h4>
              <div class="info-row">
                <span class="info-label">원본 컬럼 수</span>
                <span class="info-value">{{ currentWork._original_keys.length }}개</span>
              </div>
              <div class="info-row">
                <span class="info-label">처리 시간</span>
                <span class="info-value">{{ currentWork._processed_at ? formatTime(new Date(currentWork._processed_at)) : '-' }}</span>
              </div>
            </div>
          </div>

          <div class="line-change-panel">
            <button @click="goBackToLineSelection" class="btn-line-change">
              다른 라인으로 변경하기
            </button>
            <p class="line-change-help">
              현재: <strong>{{ workInfo.lineName }}</strong><br>
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
          <h3>{{ getCompleteModalTitle() }}</h3>
          <button @click="closeCompleteModal" class="modal-close">닫기</button>
        </div>
        <div class="modal-body">
          <div class="complete-summary">
            <h4>작업 결과</h4>
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">지시량</span>
                <span class="summary-value">{{ formatNumber(currentWork.target_quantity) }}개</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">투입수량</span>
                <span class="summary-value">{{ formatNumber(currentWork.current_quantity) }}개</span>
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
              <div class="summary-item">
                <span class="summary-label">작업시간</span>
                <span class="summary-value">{{ workElapsedTime }}</span>
              </div>
            </div>
          </div>
          
          <!-- 워크플로우별 다음 단계 안내 -->
          <div v-if="workInfo.lineType === 'INNER' && !isPartialCompletion" class="next-step-info inner-completion">
            <div class="info-box">
              <div class="info-content">
                <h5>다음 단계: 외포장 라인 선택</h5>
                <p>내포장 작업 완료 후 외포장이 활성화된 라인 선택 페이지로 자동 이동합니다.</p>
                <ul>
                  <li>내포장 작업 완료 처리</li>
                  <li>라인 선택 페이지로 자동 이동</li>
                  <li>외포장 라인 자동 활성화</li>
                  <li>추천 라인 표시</li>
                </ul>
              </div>
            </div>
          </div>

          <div v-else-if="workInfo.lineType === 'OUTER' && !isPartialCompletion" class="next-step-info outer-completion">
            <div class="info-box">
              <div class="info-content">
                <h5>전체 포장 작업 완료!</h5>
                <p>모든 포장 단계가 완료되었습니다.</p>
                <div class="completion-chain">
                  <div class="chain-item">
                    <span class="chain-text">내포장</span>
                    <span class="chain-status">완료</span>
                  </div>
                  <div class="chain-arrow">→</div>
                  <div class="chain-item">
                    <span class="chain-text">외포장</span>
                    <span class="chain-status">완료</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="isPartialCompletion" class="partial-completion-info">
            <div class="warning-box">
              <div class="warning-content">
                <h5>지시량 미달성</h5>
                <div class="completion-stats">
                  <div class="stat-item">
                    <span class="stat-label">지시량:</span>
                    <span class="stat-value">{{ formatNumber(currentWork.target_quantity) }}개</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">현재 생산:</span>
                    <span class="stat-value">{{ formatNumber(currentWork.output_qty) }}개</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">미달성:</span>
                    <span class="stat-value shortage">{{ formatNumber(getRemainingQuantity()) }}개</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">달성률:</span>
                    <span class="stat-value">{{ getCompletionRate() }}%</span>
                  </div>
                </div>
                <p class="warning-text">지시량을 모두 달성하지 못했습니다. 어떻게 처리하시겠습니까?</p>
              </div>
            </div>
          </div>
          
          <p class="confirmation-text">
            {{ getConfirmationText() }}
          </p>
        </div>
        <div class="modal-actions">
          <button @click="closeCompleteModal" class="btn-cancel">취소</button>
          
          <div v-if="isPartialCompletion" class="completion-options">
            <button @click="confirmPartialComplete" class="btn-partial">
              {{ getPartialCompleteButtonText() }}
            </button>
            <button @click="confirmContinueLater" class="btn-continue">
              나중에 계속하기
            </button>
          </div>
          
          <button v-else @click="confirmCompleteWork" class="btn-confirm">
            {{ getCompleteButtonText() }}
          </button>
        </div>
      </div>
    </div>

    <!-- 자동 이동 안내 오버레이 -->
    <div v-if="showAutoTransition" class="auto-transition-overlay">
      <div class="transition-modal">
        <h3>{{ getTransitionTitle() }}</h3>
        <p>{{ getTransitionMessage() }}</p>
        <div class="transition-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: transitionProgress + '%' }"></div>
          </div>
          <span class="progress-text">{{ Math.round(transitionProgress) }}%</span>
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
          <h3>연결 오류</h3>
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

// axios 기본 설정
axios.defaults.timeout = 15000
axios.defaults.headers.common['Content-Type'] = 'application/json'

// 라우터 및 라우트
const router = useRouter()
const route = useRoute()

// 라인 정보 (URL 파라미터에서 가져옴)
const workInfo = ref({
  lineId: route.query.line_id || '1',
  lineName: route.query.line_name || 'A라인 내포장',
  lineType: route.query.line_type || 'INNER'
})

// 워크플로우 정보
const workflowInfo = ref({
  step: route.query.workflow_step || null,
  innerCompleted: route.query.inner_completed === 'true',
  innerWorkNo: route.query.inner_work_order_no || '',
  innerCompletionTime: route.query.inner_completion_time ? new Date(route.query.inner_completion_time) : null,
  innerOutputQty: parseInt(route.query.inner_output_qty) || 0,
  autoStartGuide: route.query.auto_start_guide === 'true'
})

// 디버깅 정보
const showDebugPanel = ref(false)
const debugInfo = ref({
  lastApiResponse: null,
  sampleData: null
})

// 로딩 및 에러 상태
const loading = ref(false)
const loadingMessage = ref('')
const showError = ref(false)
const errorMessage = ref('')

// 작업 상태
const workStatus = ref('READY')
const isWorking = ref(false)
const workStartTime = ref(null)
const workElapsedTime = ref('00:00:00')

// 작업 선택 상태
const selectedWorkOrder = ref('')
const inputQuantity = ref(500)
const availableWorkOrders = ref([])

// 자동 전환 상태
const showAutoTransition = ref(false)
const transitionProgress = ref(0)

// 부분완료 작업 여부
const isPartialWork = computed(() => {
  return currentWork.value.step_status === '부분완료' || 
         currentWork.value.step_status === 'PARTIAL_COMPLETE' ||
         currentWork.value.step_status === 'partial_complete'
})

// 작업번호 상태별 분류 (실제 데이터 기반) - DB 컬럼명 명확화
const readyWorks = computed(() => {
  const ready = availableWorkOrders.value.filter(dbWork => {
    if (!dbWork) return false
    const status = (dbWork.step_status || '').toLowerCase()
    return !status || 
           status === '' || 
           status === 'ready' || 
           status === '준비' || 
           status === 'null' ||
           status === 'undefined' ||
           status === 'available'
  })
  
  return ready.sort((a, b) => {
    const aWorkNo = extractWorkNumber(a.work_order_no || a.work_id)
    const bWorkNo = extractWorkNumber(b.work_order_no || b.work_id)
    return aWorkNo - bWorkNo
  })
})

const workingWorks = computed(() => {
  const working = availableWorkOrders.value.filter(dbWork => {
    if (!dbWork) return false
    const status = (dbWork.step_status || '').toLowerCase()
    return status === 'working' || 
           status === 'in_progress' || 
           status === '진행중' ||
           status === '진행' ||
           status === 'active'
  })
  
  return working.sort((a, b) => {
    const aWorkNo = extractWorkNumber(a.work_order_no || a.work_id)
    const bWorkNo = extractWorkNumber(b.work_order_no || b.work_id)
    return aWorkNo - bWorkNo
  })
})

const pausedWorks = computed(() => {
  const paused = availableWorkOrders.value.filter(dbWork => {
    if (!dbWork) return false
    const status = (dbWork.step_status || '').toLowerCase()
    return status === 'paused' || 
           status === '일시정지' ||
           status === 'partial_complete' ||
           status === '부분완료' ||
           status === 'partial'
  })
  
  return paused.sort((a, b) => {
    const aWorkNo = extractWorkNumber(a.work_order_no || a.work_id)
    const bWorkNo = extractWorkNumber(b.work_order_no || b.work_id)
    return aWorkNo - bWorkNo
  })
})

// 현재 작업 정보
const currentWork = ref({
  work_order_no: '',
  work_id: '',
  result_detail_id: null,
  result_id: '',
  product_name: '',
  final_product_name: '',
  product_code: '',
  package_type: '',
  target_quantity: 0,
  current_quantity: 0,
  remaining_quantity: 0,
  output_qty: 0,
  defect_qty: 0,
  progressRate: 0,
  passRate: 0,
  defectRate: 0,
  achievementRate: 0,
  employee_id: 2,
  worker_name: '김포장',
  department: '포장부',
  position: '작업자',
  start_time: null,
  end_time: null,
  work_duration: 0,
  estimated_duration: 0,
  step_status: 'READY',
  process_code: '',
  eq_type_code: '',
  _original_keys: [],
  _processed_at: null
})

// 작업 로그
const workLogs = ref([])

// 모달
const showCompleteModal = ref(false)

// 타이머
let workTimer = null
let productionTimer = null

// 시간 경고 계산
const isTimeWarning = computed(() => {
  if (!currentWork.value.end_time || !isWorking.value) return false
  const now = new Date()
  const endTime = new Date(currentWork.value.end_time)
  const remainingMs = endTime.getTime() - now.getTime()
  return remainingMs < 30 * 60 * 1000
})

// 생산 시뮬레이션 설정
const productionSettings = ref({
  productionSpeed: 30,
  defectRate: 0.02,
  targetQty: 0,
  currentProgress: 0
})

// 계산된 값들
const canStartWork = computed(() => {
  if (!selectedWorkOrder.value) {
    return false
  }
  
  if (isWorking.value) {
    return false
  }
  
  if (isPartialWork.value) {
    console.log('부분완료 작업 - 시작 가능')
    return true
  }
  
  if (currentWork.value.step_status === '일시정지' || currentWork.value.step_status === 'PAUSED') {
    console.log('일시정지 작업 - 재시작 가능')
    return true
  }
  
  if (currentWork.value.step_status === '진행중' || currentWork.value.step_status === 'IN_PROGRESS' || currentWork.value.step_status === 'WORKING') {
    console.log('진행중 작업 - 재시작 가능')
    return true
  }
  
  const hasInputQuantity = inputQuantity.value > 0
  console.log(`일반 작업 - 투입수량 확인: ${inputQuantity.value} (시작가능: ${hasInputQuantity})`)
  return hasInputQuantity
})

// 부분완료 여부 판단 (수정된 로직)
const isPartialCompletion = computed(() => {
  // 외포장인 경우에는 부분완료 로직이 다를 수 있음
  if (workInfo.value.lineType === 'OUTER') {
    return currentWork.value.output_qty < currentWork.value.target_quantity && 
           currentWork.value.target_quantity > 0
  }
  
  // 내포장의 경우: 지시량과 생산량이 정확히 일치하지 않으면 부분완료로 간주할 수 있음
  // 하지만 지시량 이상 달성했으면 완료로 처리
  const isExactMatch = currentWork.value.output_qty === currentWork.value.target_quantity
  const isOverAchieved = currentWork.value.output_qty >= currentWork.value.target_quantity
  
  // 지시량 이상 달성했으면 완료, 미달이면 부분완료
  return !isOverAchieved && currentWork.value.target_quantity > 0
})

// 미달성 수량 계산
function getRemainingQuantity() {
  return Math.max(0, currentWork.value.target_quantity - currentWork.value.current_quantity)
}

// 달성률 계산
function getCompletionRate() {
  if (currentWork.value.target_quantity <= 0) return 100
  return Math.round((currentWork.value.output_qty / currentWork.value.target_quantity) * 100)
}

// 데이터 새로고침
async function refreshData() {
  try {
    loading.value = true
    loadingMessage.value = '데이터 새로고침 중...'
    
    await loadWorkOrdersByLine()
    addLog('데이터 새로고침 완료', 'success')
    
  } catch (error) {
    console.error('데이터 새로고침 실패:', error)
    addLog(`데이터 새로고침 실패: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// ==============================================
// 실제 데이터베이스 연동 - 개선된 라인별 필터링
// ==============================================

// 컴포넌트 마운트 시 실제 작업번호 로딩
onMounted(async () => {
  console.log('PackageWork 컴포넌트 마운트 - 실제 DB 연동 시작')
  console.log('라인 정보:', workInfo.value)
  console.log('워크플로우 정보:', workflowInfo.value)
  
  try {
    loading.value = true
    loadingMessage.value = `${workInfo.value.lineName}의 작업번호 목록을 불러오는 중...`
    
    // 디버깅을 위한 샘플 데이터 로드
    await loadSampleData()
    
    // 실제 작업번호 목록 조회 (라인별 필터링 강화)
    await loadWorkOrdersByLine()
    
    // 외포장 워크플로우 데이터 로드
    if (workInfo.value.lineType === 'OUTER') {
      console.log('외포장 감지 - 워크플로우 데이터 로드')
      await loadWorkflowData()
    }
    
    // URL에서 전달된 작업번호가 있으면 선택
    if (route.query.work_order_no) {
      await selectWorkOrderWithRetry(route.query.work_order_no)
    } else {
      // 자동 작업번호 선택
      await autoSelectFirstAvailableWork()
    }
    
    // 워크플로우 안내 메시지
    if (workflowInfo.value.step === 'OUTER' && workflowInfo.value.innerCompleted) {
      addLog(`외포장 단계입니다. 내포장(${workflowInfo.value.innerWorkNo})이 완료되었습니다.`, 'success')
    }
    
    // 이전 작업 완료 메시지 표시
    if (route.query.message) {
      addLog(route.query.message, 'success')
    }
    
    addLog(`${workInfo.value.lineName}에서 작업번호 ${availableWorkOrders.value.length}개를 로딩했습니다.`, 'success')
    
  } catch (error) {
    console.error('작업번호 로딩 실패:', error)
    addLog(`초기화 실패: ${error.message}`, 'error')
    availableWorkOrders.value = []
    
    // 디버깅 모드 자동 활성화
    if (error.message.includes('Unknown column') || error.message.includes('table') || error.message.includes('column')) {
      showDebugPanel.value = true
      addLog('데이터베이스 구조 문제가 감지되어 디버깅 패널을 활성화했습니다.', 'warning')
    }
  } finally {
    loading.value = false
  }
})

// 제품명 매핑 테스트
async function testProductNameMapping() {
  try {
    loading.value = true
    loadingMessage.value = '제품명 매핑 테스트 중...'
    
    addLog('=== 제품명 매핑 테스트 시작 ===', 'info')
    
    // 현재 선택된 작업이 있으면 테스트
    if (selectedWorkOrder.value && currentWork.value.work_order_no) {
      const selectedWork = availableWorkOrders.value.find(dbWork => 
        dbWork.work_order_no === selectedWorkOrder.value || dbWork.work_id === selectedWorkOrder.value
      )
      
      if (selectedWork) {
        addLog(`현재 선택된 작업번호: ${selectedWorkOrder.value}`, 'info')
        addLog(`DB 원본 데이터:`, 'info')
        addLog(`  - final_product_name: "${selectedWork.final_product_name || 'null'}"`, 'info')
        addLog(`  - product_name: "${selectedWork.product_name || 'null'}"`, 'info')
        addLog(`  - product_code: "${selectedWork.product_code || 'null'}"`, 'info')
        addLog(`  - step_name: "${selectedWork.step_name || 'null'}"`, 'info')
        
        const actualProductName = getActualProductName(selectedWork)
        const productSource = getProductNameSource(selectedWork)
        
        addLog(`변환된 제품명: "${actualProductName}"`, 'success')
        addLog(`변환 과정: ${productSource}`, 'info')
      }
    }
    
    // 샘플 제품코드 테스트
    const testCodes = ['BJA-DR-10', 'TYL-500', 'UNKNOWN-CODE']
    addLog('샘플 제품코드 변환 테스트:', 'info')
    
    testCodes.forEach(code => {
      const converted = convertProductCodeToName(code)
      const isCode = isProductCode(code)
      addLog(`  "${code}" → "${converted}" (제품코드 인식: ${isCode})`, 'info')
    })
    
    addLog('=== 제품명 매핑 테스트 완료 ===', 'success')
    
  } catch (error) {
    console.error('제품명 매핑 테스트 실패:', error)
    addLog(`제품명 매핑 테스트 실패: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// 제품명 추출 및 매핑 함수 개선
function extractProductFromStepName(stepName) {
  if (!stepName) return '제품명없음'
  
  // 제품코드를 실제 제품명으로 매핑
  if (stepName.includes('BJA-DR-10')) return '베아르정 10mg'
  if (stepName.includes('타이레놀')) return '타이레놀정 500mg'
  if (stepName.includes('게보린')) return '게보린정'
  if (stepName.includes('부루펜')) return '부루펜시럽'
  if (stepName.includes('베아르')) return '베아르정'
  if (stepName.includes('A라인')) return 'A라인 제품'
  if (stepName.includes('B라인')) return 'B라인 제품'
  if (stepName.includes('C라인')) return 'C라인 제품'
  
  return stepName || '제품명없음'
}

// 제품코드를 제품명으로 변환하는 함수
function convertProductCodeToName(productCode) {
  if (!productCode) return '제품명없음'
  
  const productMap = {
    'BJA-DR-10': '베아르정 10mg',
    'TYL-500': '타이레놀정 500mg',
    'GBR-001': '게보린정',
    'BRP-SYR': '부루펜시럽',
    'BEA-001': '베아르정'
  }
  
  // 정확한 매칭 우선
  if (productMap[productCode]) {
    return productMap[productCode]
  }
  
  // 부분 매칭
  for (const [code, name] of Object.entries(productMap)) {
    if (productCode.includes(code)) {
      return name
    }
  }
  
  // 매핑되지 않으면 원본 반환하되 "(제품코드)" 표시
  return `${productCode} (제품코드)`
}

// 실제 제품명 추출 함수 (DB 데이터 종합 분석)
function getActualProductName(dbWork) {
  if (!dbWork) return '제품명없음'
  
  // 1단계: final_product_name이 있고 제품코드가 아닌 경우
  if (dbWork.final_product_name && !isProductCode(dbWork.final_product_name)) {
    return dbWork.final_product_name
  }
  
  // 2단계: product_name이 있고 제품코드가 아닌 경우
  if (dbWork.product_name && !isProductCode(dbWork.product_name)) {
    return dbWork.product_name
  }
  
  // 3단계: product_code를 제품명으로 변환
  if (dbWork.product_code) {
    const convertedName = convertProductCodeToName(dbWork.product_code)
    if (convertedName !== `${dbWork.product_code} (제품코드)`) {
      return convertedName
    }
  }
  
  // 4단계: final_product_name이 제품코드인 경우 변환
  if (dbWork.final_product_name) {
    const convertedName = convertProductCodeToName(dbWork.final_product_name)
    if (convertedName !== `${dbWork.final_product_name} (제품코드)`) {
      return convertedName
    }
  }
  
  // 5단계: product_name이 제품코드인 경우 변환
  if (dbWork.product_name) {
    const convertedName = convertProductCodeToName(dbWork.product_name)
    if (convertedName !== `${dbWork.product_name} (제품코드)`) {
      return convertedName
    }
  }
  
  // 6단계: step_name에서 추출
  if (dbWork.step_name) {
    return extractProductFromStepName(dbWork.step_name)
  }
  
  // 7단계: 모든 방법 실패시 기본값
  return dbWork.final_product_name || dbWork.product_name || dbWork.product_code || '제품명없음'
}

// 제품명 결정 과정 추적 함수
function getProductNameSource(dbWork) {
  if (!dbWork) return '데이터 없음'
  
  // 1단계: final_product_name이 있고 제품코드가 아닌 경우
  if (dbWork.final_product_name && !isProductCode(dbWork.final_product_name)) {
    return `DB final_product_name 컬럼에서 직접 사용: "${dbWork.final_product_name}"`
  }
  
  // 2단계: product_name이 있고 제품코드가 아닌 경우
  if (dbWork.product_name && !isProductCode(dbWork.product_name)) {
    return `DB product_name 컬럼에서 직접 사용: "${dbWork.product_name}"`
  }
  
  // 3단계: product_code를 제품명으로 변환
  if (dbWork.product_code) {
    const convertedName = convertProductCodeToName(dbWork.product_code)
    if (convertedName !== `${dbWork.product_code} (제품코드)`) {
      return `DB product_code "${dbWork.product_code}"를 제품명으로 변환: "${convertedName}"`
    }
  }
  
  // 4단계: final_product_name이 제품코드인 경우 변환
  if (dbWork.final_product_name) {
    const convertedName = convertProductCodeToName(dbWork.final_product_name)
    if (convertedName !== `${dbWork.final_product_name} (제품코드)`) {
      return `DB final_product_name "${dbWork.final_product_name}"를 제품코드로 인식하여 변환: "${convertedName}"`
    }
  }
  
  // 5단계: product_name이 제품코드인 경우 변환
  if (dbWork.product_name) {
    const convertedName = convertProductCodeToName(dbWork.product_name)
    if (convertedName !== `${dbWork.product_name} (제품코드)`) {
      return `DB product_name "${dbWork.product_name}"를 제품코드로 인식하여 변환: "${convertedName}"`
    }
  }
  
  // 6단계: step_name에서 추출
  if (dbWork.step_name) {
    return `DB step_name "${dbWork.step_name}"에서 패턴 매칭으로 추출`
  }
  
  // 7단계: 모든 방법 실패
  return `변환 실패 - 기본값 사용: ${dbWork.final_product_name || dbWork.product_name || dbWork.product_code || '제품명없음'}`
}

// 제품코드인지 확인하는 함수
function isProductCode(value) {
  if (!value) return false
  
  // 제품코드 패턴들
  const productCodePatterns = [
    /^[A-Z]{2,4}-[A-Z0-9]{2,10}$/,  // BJA-DR-10 형태
    /^[A-Z]{3}-\d{3}$/,             // TYL-500 형태
    /^[A-Z]{3}-[A-Z]{3}$/,          // BRP-SYR 형태
  ]
  
  return productCodePatterns.some(pattern => pattern.test(value))
}

// 워크플로우 데이터 로드 (외포장용)
async function loadWorkflowData() {
  try {
    console.log('외포장 워크플로우 데이터 로드 시작')
    
    const baseLineName = workInfo.value.lineName.replace(/\s*(내포장|외포장).*$/, '')
    console.log('기본 라인명:', baseLineName)
    
    // 1. API 시도
    let innerData = null
    try {
      const response = await axios.get('/packages/workflow/inner-completed', {
        params: { base_line_name: baseLineName }
      })
      
      if (response.data.success && response.data.data) {
        innerData = response.data.data
        console.log('API에서 내포장 완료 정보 조회 성공:', innerData)
      }
    } catch (apiError) {
      console.log('API 호출 실패, 대안 데이터 소스 확인:', apiError.message)
    }
    
    // 2. URL 파라미터 확인
    if (!innerData && workflowInfo.value.innerOutputQty > 0) {
      innerData = {
        work_order_no: workflowInfo.value.innerWorkNo,
        output_qty: workflowInfo.value.innerOutputQty,
        completion_time: workflowInfo.value.innerCompletionTime,
        step_status: '완료'
      }
      console.log('URL 파라미터에서 워크플로우 데이터 사용:', innerData)
    }
    
    // 3. 메모리 확인
    if (!innerData && window.workflowData) {
      const workflowKey = `workflow_${baseLineName.replace(/\s+/g, '_')}`
      const localData = window.workflowData[workflowKey]
      
      if (localData && localData.inner_output_qty > 0) {
        innerData = {
          work_order_no: localData.inner_work_order_no,
          output_qty: localData.inner_output_qty,
          completion_time: localData.inner_completion_time,
          step_status: '완료'
        }
        console.log('메모리에서 워크플로우 데이터 사용:', innerData)
      }
    }
    
    // 4. 데이터 적용
    if (innerData && innerData.output_qty > 0) {
      workflowInfo.value.innerCompleted = true
      workflowInfo.value.innerWorkNo = innerData.work_order_no
      workflowInfo.value.innerOutputQty = innerData.output_qty
      workflowInfo.value.innerCompletionTime = new Date(innerData.completion_time || innerData.end_time)
      workflowInfo.value.step = 'OUTER'
      
      // 투입수량 자동 설정
      inputQuantity.value = innerData.output_qty
      
      addLog(`${baseLineName} 내포장 완료 정보를 연결했습니다.`, 'success')
      addLog(`완료 작업: ${innerData.work_order_no}, 완료수량: ${formatNumber(innerData.output_qty)}개`, 'info')
      addLog(`외포장 투입수량을 ${formatNumber(innerData.output_qty)}개로 설정했습니다.`, 'success')
      
      return true
    } else {
      console.log('연결된 내포장 완료 정보 없음')
      addLog(`${baseLineName}의 내포장 완료 정보를 찾을 수 없습니다.`, 'warning')
      return false
    }
    
  } catch (error) {
    console.error('워크플로우 데이터 로드 실패:', error)
    addLog('워크플로우 연계에 실패했습니다. 수동으로 설정해주세요.', 'warning')
    return false
  }
}

// ==============================================
// 디버깅 기능들
// ==============================================

// 실제 샘플 데이터 로드
async function loadSampleData() {
  try {
    loading.value = true
    loadingMessage.value = '실제 데이터 샘플 로드 중...'
    
    const response = await axios.get('/packages/debug/simple-data-check')
    
    if (response.data.success) {
      debugInfo.value.sampleData = response.data.data
      addLog(`실제 데이터 확인 완료: 전체 ${response.data.data.total_rows}건`, 'success')
      
      if (response.data.data.recent_data && response.data.data.recent_data.length > 0) {
        debugInfo.value.sampleData.samples = response.data.data.recent_data
        addLog(`샘플 데이터 ${response.data.data.recent_data.length}건 로드`, 'info')
        
        // 실제 라인 정보 분석
        const lineIds = response.data.data.recent_data.map(item => item.line_id).filter(Boolean)
        const workLines = response.data.data.recent_data.map(item => item.work_line).filter(Boolean)
        const stepNames = response.data.data.recent_data.map(item => item.step_name).filter(Boolean)
        
        addLog(`실제 line_id 값들: ${[...new Set(lineIds)].join(', ') || '없음'}`, 'info')
        addLog(`실제 work_line 값들: ${[...new Set(workLines)].join(', ') || '없음'}`, 'info')
        addLog(`실제 step_name 샘플: ${stepNames.slice(0, 3).join(', ') || '없음'}`, 'info')
        
        // 작업번호 컬럼 확인
        const workOrderNos = response.data.data.recent_data.map(item => item.work_order_no).filter(Boolean)
        const workIds = response.data.data.recent_data.map(item => item.work_id).filter(Boolean)
        addLog(`실제 work_order_no 값들: ${[...new Set(workOrderNos)].join(', ') || '없음'}`, 'info')
        addLog(`실제 work_id 값들: ${[...new Set(workIds)].join(', ') || '없음'}`, 'info')
      }
    } else {
      addLog(`실제 데이터 확인 실패: ${response.data.error}`, 'error')
    }
    
  } catch (error) {
    console.error('실제 데이터 확인 실패:', error)
    addLog(`실제 데이터 확인 실패: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// 모든 필터 조건 테스트
async function testAllFilters() {
  try {
    loading.value = true
    loadingMessage.value = '필터 조건 테스트 중...'
    
    // 1. 포장타입별 테스트
    const typeResponse = await axios.get('/packages/works', {
      params: { package_type: workInfo.value.lineType }
    })
    
    addLog(`포장타입(${workInfo.value.lineType}) 필터: ${typeResponse.data.count || 0}건`, 'info')
    
    // 2. 라인ID별 테스트
    const lineIdResponse = await axios.get('/packages/works', {
      params: { line_id: workInfo.value.lineId }
    })
    
    addLog(`라인ID(${workInfo.value.lineId}) 필터: ${lineIdResponse.data.count || 0}건`, 'info')
    
    // 3. 라인명별 테스트
    const lineNameResponse = await axios.get('/packages/works', {
      params: { line_name: workInfo.value.lineName }
    })
    
    addLog(`라인명(${workInfo.value.lineName}) 필터: ${lineNameResponse.data.count || 0}건`, 'info')
    
    // 4. 조합 테스트
    const combinedResponse = await axios.get('/packages/works', {
      params: {
        package_type: workInfo.value.lineType,
        line_id: workInfo.value.lineId,
        line_name: workInfo.value.lineName
      }
    })
    
    addLog(`조합 필터: ${combinedResponse.data.count || 0}건`, 'warning')
    
    if (combinedResponse.data.count === 0) {
      addLog('조합 필터에서 결과가 없습니다. 개별 필터를 확인해보세요.', 'warning')
    }
    
  } catch (error) {
    console.error('필터 테스트 실패:', error)
    addLog(`필터 테스트 실패: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// 필터 없이 로드 (전체 데이터)
async function loadWithoutFilter() {
  try {
    loading.value = true
    loadingMessage.value = '필터 없이 전체 데이터 로드 중...'
    
    const response = await axios.get('/packages/works')
    
    if (response.data.success && response.data.data) {
      // 전체 데이터에서 라인 정보 분석
      const allData = response.data.data
      addLog(`전체 데이터: ${allData.length}건`, 'success')
      
      // 라인 정보 분석
      const lineAnalysis = {
        line_ids: [...new Set(allData.map(item => item.line_id).filter(Boolean))],
        work_lines: [...new Set(allData.map(item => item.work_line).filter(Boolean))],
        package_types: [...new Set(allData.map(item => item.package_type).filter(Boolean))],
        step_names: [...new Set(allData.map(item => item.step_name).filter(Boolean))]
      }
      
      addLog(`고유 line_id: ${lineAnalysis.line_ids.join(', ') || '없음'}`, 'info')
      addLog(`고유 work_line: ${lineAnalysis.work_lines.join(', ') || '없음'}`, 'info')
      addLog(`고유 package_type: ${lineAnalysis.package_types.join(', ') || '없음'}`, 'info')
      addLog(`step_name 샘플: ${lineAnalysis.step_names.slice(0, 5).join(', ') || '없음'}`, 'info')
      
      // 현재 라인과 매칭되는 데이터 찾기
      const matchingData = allData.filter(item => {
        const lineMatch = item.line_id?.includes('A') || item.work_line?.includes('A') || item.step_name?.includes('A')
        const typeMatch = workInfo.value.lineType === 'INNER'
        return lineMatch && typeMatch
      })
      
      addLog(`현재 라인(${workInfo.value.lineName})과 매칭 가능한 데이터: ${matchingData.length}건`, matchingData.length > 0 ? 'success' : 'warning')
      
      if (matchingData.length > 0) {
        // 매칭된 데이터로 작업목록 설정
        availableWorkOrders.value = matchingData.map(work => ({
          work_order_no: work.work_order_no,
          work_id: work.work_id,
          step_name: work.step_name || work.final_product_name || '포장작업',
          product_name: work.final_product_name || work.product_name || extractProductFromStepName(work.step_name),
          final_product_name: work.final_product_name || work.product_name || extractProductFromStepName(work.step_name),
          product_code: work.product_code,
          step_status: work.step_status || 'READY',
          order_qty: work.order_qty || work.target_qty || work.input_qty || 1000,
          target_qty: work.target_qty || work.order_qty || work.input_qty || 1000,
          input_qty: work.input_qty || 0,
          output_qty: work.output_qty || 0,
          defect_qty: work.defect_qty || 0,
          progress_rate: work.progress_rate || 0,
          employee_name: work.employee_name || work.emp_name || '김포장',
          employee_id: work.employee_id || 2,
          line_name: work.line_name || workInfo.value.lineName,
          line_id: work.line_id || workInfo.value.lineId,
          package_type: work.package_type || workInfo.value.lineType,
          start_time: work.start_time,
          end_time: work.end_time,
          reg_date: work.reg_date,
          _original_keys: work._original_keys || Object.keys(work),
          _processed_at: work._processed_at || new Date().toISOString()
        }))
        
        addLog(`매칭된 데이터로 작업목록을 설정했습니다: ${availableWorkOrders.value.length}건`, 'success')
        await autoSelectFirstAvailableWork()
      }
      
    } else {
      addLog('전체 데이터 로드 실패', 'error')
    }
    
  } catch (error) {
    console.error('필터 없이 로드 실패:', error)
    addLog(`필터 없이 로드 실패: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// 라인별 작업번호 목록 조회 - 개선된 버전 (필터링 로직 수정)
async function loadWorkOrdersByLine() {
  try {
    console.log(`${workInfo.value.lineName} 라인의 작업번호 목록 조회 시작`)
    
    // 1단계: 전체 데이터 먼저 확인
    const allDataResponse = await axios.get('/packages/works')
    
    if (!allDataResponse.data.success || !allDataResponse.data.data) {
      throw new Error('전체 데이터 조회 실패')
    }
    
    const allData = allDataResponse.data.data
    console.log(`전체 데이터: ${allData.length}건`)
    addLog(`전체 데이터 ${allData.length}건 확인`, 'info')
    
    // 2단계: 클라이언트 사이드에서 유연한 필터링
    let filteredData = allData.filter(work => {
      if (!work) return false
      
      // 라인 매칭 (더 유연하게)
      const lineMatch = 
        (work.line_id && (
          work.line_id.toString().includes('A') || 
          work.line_id.toString().toLowerCase().includes('inner') ||
          work.line_id.toString().includes('1')
        )) ||
        (work.work_line && (
          work.work_line.includes('A') || 
          work.work_line.includes('라인')
        )) ||
        (work.step_name && (
          work.step_name.includes('A') ||
          work.step_name.includes('라인')
        ))
      
      // 포장 타입 매칭 (더 유연하게)
      const typeMatch = workInfo.value.lineType === 'INNER' ? 
        (!work.package_type || work.package_type === 'INNER' || 
         !work.step_name?.includes('외포장') || 
         !work.step_name?.includes('2차')) :
        (work.package_type === 'OUTER' || 
         work.step_name?.includes('외포장') || 
         work.step_name?.includes('2차'))
      
      return lineMatch && typeMatch
    })
    
    console.log(`클라이언트 필터링 후: ${filteredData.length}건`)
    addLog(`${workInfo.value.lineName} 필터링 결과: ${filteredData.length}건`, filteredData.length > 0 ? 'success' : 'warning')
    
    // 3단계: 필터링 결과가 없으면 전체 데이터 사용
    if (filteredData.length === 0) {
      addLog('필터링 결과가 없어 전체 데이터를 사용합니다.', 'warning')
      filteredData = allData
    }
    
    // 4단계: UI 형식으로 변환 (DB 컬럼명 → Vue 컴포넌트 속성명)
    availableWorkOrders.value = filteredData.map(dbWork => ({
      // DB 원본 컬럼 (실제 DB에서 가져온 값들)
      work_order_no: dbWork.work_order_no,  // DB의 실제 작업번호 컬럼
      work_id: dbWork.work_id,              // DB의 작업 ID 컬럼
      
      // 제품 정보 매핑 - 제품코드를 실제 제품명으로 변환
      step_name: dbWork.step_name || dbWork.final_product_name || '포장작업',
      product_name: getActualProductName(dbWork),
      final_product_name: getActualProductName(dbWork),
      product_code: dbWork.product_code,
      
      // 상태 정보
      step_status: dbWork.step_status || 'READY',
      
      // 수량 정보 (DB 컬럼명에 맞춰 매핑)
      order_qty: dbWork.order_qty || dbWork.target_qty || dbWork.input_qty || 1000,
      target_qty: dbWork.target_qty || dbWork.order_qty || dbWork.input_qty || 1000,
      input_qty: dbWork.input_qty || 0,
      output_qty: dbWork.output_qty || 0,
      defect_qty: dbWork.defect_qty || 0,
      progress_rate: dbWork.progress_rate || 0,
      
      // 작업자 정보
      employee_name: dbWork.employee_name || dbWork.emp_name || '김포장',
      employee_id: dbWork.employee_id || 2,
      
      // 라인 정보
      line_name: dbWork.line_name || workInfo.value.lineName,
      line_id: dbWork.line_id || workInfo.value.lineId,
      package_type: dbWork.package_type || workInfo.value.lineType,
      
      // 시간 정보
      start_time: dbWork.start_time,
      end_time: dbWork.end_time,
      reg_date: dbWork.reg_date,
      
      // 디버깅 정보
      _original_keys: dbWork._original_keys || Object.keys(dbWork),
      _processed_at: dbWork._processed_at || new Date().toISOString()
    }))
    
    addLog(`${workInfo.value.lineName}의 작업번호 ${availableWorkOrders.value.length}개를 처리했습니다.`, 'success')
    
    // 디버깅 정보 저장
    debugInfo.value.lastApiResponse = {
      count: availableWorkOrders.value.length,
      filters: {
        package_type: workInfo.value.lineType,
        line_id: workInfo.value.lineId,
        line_name: workInfo.value.lineName
      },
      metadata: {
        total_data: allData.length,
        filtered_data: filteredData.length,
        final_count: availableWorkOrders.value.length
      }
    }
    
  } catch (error) {
    console.error('라인별 작업번호 조회 실패:', error)
    addLog(`작업번호 조회 실패: ${error.message}`, 'error')
    
    // 실패 시 샘플 데이터 자동 로드
    await loadSampleData()
    throw error
  }
}

// ==============================================
// 기존 작업 관리 함수들 (실제 DB 기반으로 수정)
// ==============================================

// 작업번호 변경 시 - 명확한 변수명 구분
async function onWorkOrderChange() {
  if (!selectedWorkOrder.value) {
    resetCurrentWork()
    return
  }
  
  try {
    loading.value = true
    loadingMessage.value = '작업 정보를 불러오는 중...'
    
    console.log(`선택된 작업번호: ${selectedWorkOrder.value}`)
    
    // availableWorkOrders에서 해당 작업 찾기 (DB 컬럼명으로 검색)
    const selectedWorkFromDB = availableWorkOrders.value.find(dbWork => 
      dbWork.work_order_no === selectedWorkOrder.value || dbWork.work_id === selectedWorkOrder.value
    )
    
    if (!selectedWorkFromDB) {
      throw new Error(`작업번호 ${selectedWorkOrder.value}를 찾을 수 없습니다.`)
    }
    
    console.log('DB에서 찾은 작업 정보:', selectedWorkFromDB)
    
    // DB 데이터를 currentWork 객체 형식으로 매핑
    currentWork.value = {
      // 작업번호 (DB: work_order_no, work_id)
      work_order_no: selectedWorkFromDB.work_order_no || selectedWorkFromDB.work_id,
      work_id: selectedWorkFromDB.work_id,
      
      // 제품 정보 (DB: product_name, final_product_name)  
      product_name: selectedWorkFromDB.final_product_name || selectedWorkFromDB.product_name || '제품명없음',
      final_product_name: selectedWorkFromDB.final_product_name || selectedWorkFromDB.product_name || '제품명없음',
      product_code: selectedWorkFromDB.product_code || '',
      
      // 수량 정보 (DB: input_qty, output_qty, target_qty)
      target_quantity: selectedWorkFromDB.target_qty || selectedWorkFromDB.order_qty || selectedWorkFromDB.input_qty || 1000,
      current_quantity: selectedWorkFromDB.input_qty || 0,
      remaining_quantity: 0, // 계산됨
      output_qty: selectedWorkFromDB.output_qty || 0,
      defect_qty: selectedWorkFromDB.defect_qty || 0,
      
      // 진행률 (DB: progress_rate)
      progressRate: parseFloat(selectedWorkFromDB.progress_rate) || 0,
      passRate: 0, // 계산됨
      defectRate: 0, // 계산됨
      achievementRate: 0, // 계산됨
      
      // 작업자 정보 (DB: employee_name, employee_id)
      employee_id: selectedWorkFromDB.employee_id || 2,
      worker_name: selectedWorkFromDB.employee_name || selectedWorkFromDB.emp_name || '김포장',
      department: '포장부',
      position: '작업자',
      
      // 시간 정보 (DB: start_time, end_time)
      start_time: selectedWorkFromDB.start_time,
      end_time: selectedWorkFromDB.end_time,
      work_duration: 0,
      estimated_duration: 0,
      
      // 상태 정보 (DB: step_status)
      step_status: selectedWorkFromDB.step_status || 'READY',
      package_type: selectedWorkFromDB.package_type || workInfo.value.lineType,
      
      // 기타
      process_code: '',
      eq_type_code: '',
      
      // 디버깅 정보
      _original_keys: selectedWorkFromDB._original_keys || [],
      _processed_at: selectedWorkFromDB._processed_at || new Date().toISOString()
    }
    
    console.log('currentWork 객체로 변환 완료:', currentWork.value)
    
    // 외포장 워크플로우 연계
    if (workInfo.value.lineType === 'OUTER' && workflowInfo.value.innerCompleted && workflowInfo.value.innerOutputQty > 0) {
      console.log(`외포장 워크플로우 연계: ${workflowInfo.value.innerOutputQty}개`)
      currentWork.value.current_quantity = workflowInfo.value.innerOutputQty
      inputQuantity.value = workflowInfo.value.innerOutputQty
      addLog(`워크플로우 연계: 내포장 완료수량 ${formatNumber(workflowInfo.value.innerOutputQty)}개를 투입량으로 설정`, 'success')
    }
    
    // 부분완료 작업 특별 처리
    if (currentWork.value.step_status === '부분완료' || 
        currentWork.value.step_status === 'PARTIAL_COMPLETE' ||
        currentWork.value.step_status === 'partial_complete') {
      
      const remainingQty = currentWork.value.target_quantity - currentWork.value.output_qty
      
      addLog(`부분완료된 작업을 발견했습니다.`, 'warning')
      addLog(`이전 생산량: ${formatNumber(currentWork.value.output_qty)}개`, 'info')
      addLog(`남은 수량: ${formatNumber(remainingQty)}개`, 'warning')
      
      if (remainingQty > 0) {
        inputQuantity.value = remainingQty
        addLog(`투입수량을 남은 ${formatNumber(remainingQty)}개로 설정했습니다.`, 'success')
      }
    } else {
      // 일반 작업의 경우 기본 투입수량 설정
      if (!inputQuantity.value || inputQuantity.value === 0) {
        inputQuantity.value = Math.min(500, currentWork.value.target_quantity || 500)
      }
    }
    
    updateCurrentWorkInfo()
    addLog(`작업번호 ${selectedWorkOrder.value} 정보를 불러왔습니다. (실제 DB 데이터)`, 'success')
    addLog(`제품명: ${currentWork.value.final_product_name}`, 'info')
    addLog(`제품명 결정 과정: ${getProductNameSource(selectedWorkFromDB)}`, 'info')
    
    if (selectedWorkFromDB._original_keys && selectedWorkFromDB._original_keys.length > 0) {
      addLog(`원본 DB 컬럼 ${selectedWorkFromDB._original_keys.length}개를 성공적으로 매핑했습니다.`, 'info')
    }
    
  } catch (error) {
    console.error(`작업번호 ${selectedWorkOrder.value} 조회 실패:`, error)
    showErrorMessage(`작업번호 ${selectedWorkOrder.value} 정보를 불러올 수 없습니다: ${error.message}`)
    resetCurrentWork()
  } finally {
    loading.value = false
  }
}

// 작업 시작 - 실제 DB 연동 강화 (work_result_detail 테이블)
async function startWork() {
  if (!isWorking.value) {
    try {
      loading.value = true
      loadingMessage.value = '작업을 시작하는 중...'
      
      const startTime = new Date().toISOString()
      
      // 실제 DB API 호출 - work_result_detail 테이블 업데이트
      const updateData = {
        work_order_no: currentWork.value.work_order_no || currentWork.value.work_id,
        work_start_time: startTime,
        step_status: 'WORKING',
        input_qty: inputQuantity.value,
        employee_id: currentWork.value.employee_id,
        package_type: workInfo.value.lineType,
        line_id: workInfo.value.lineId,
        line_name: workInfo.value.lineName,
        table_name: 'work_result_detail'
      }
      
      // 내포장 시작 시 특별 처리
      if (workInfo.value.lineType === 'INNER') {
        updateData.inner_start_time = startTime
        updateData.process_step = 'INNER_PACKAGING'
        addLog('내포장 작업 시작 - work_start_time과 inner_start_time 업데이트', 'info')
      } else {
        updateData.outer_start_time = startTime
        updateData.process_step = 'OUTER_PACKAGING'
        addLog('외포장 작업 시작 - outer_start_time 업데이트', 'info')
      }
      
      try {
        const response = await axios.put('/packages/works/start', updateData)
        
        if (response.data.success) {
          addLog('작업 시작이 work_result_detail 테이블에 반영되었습니다.', 'success')
          addLog(`DB 업데이트: work_start_time = ${startTime}`, 'info')
        } else {
          throw new Error(response.data.message || '작업 시작 API 실패')
        }
      } catch (apiError) {
        console.warn('work_result_detail 업데이트 실패, 로컬 상태만 업데이트:', apiError.message)
        addLog('DB 연결 실패 - 로컬 시뮬레이션 모드로 진행', 'warning')
      }
      
      // 상태 업데이트 (DB 성공/실패 관계없이)
      isWorking.value = true
      workStatus.value = 'WORKING'
      workStartTime.value = new Date(startTime)
      currentWork.value.start_time = workStartTime.value
      currentWork.value.current_quantity = inputQuantity.value
      currentWork.value.step_status = 'WORKING'
      
      // 진행률 초기화
      productionSettings.value.targetQty = inputQuantity.value
      productionSettings.value.currentProgress = currentWork.value.output_qty || 0
      
      updateCurrentWorkInfo()
      startWorkTimer()
      startProductionSimulation()
      
      addLog(`${workInfo.value.lineType === 'INNER' ? '내포장' : '외포장'} 작업 시작: ${formatNumber(inputQuantity.value)}개`, 'success')
      
    } catch (error) {
      console.error('작업 시작 실패:', error)
      addLog(`작업 시작 실패: ${error.message}`, 'error')
    } finally {
      loading.value = false
    }
  } else {
    pauseProduction()
  }
}

// 작업 완료 - 실제 DB 연동 및 워크플로우 개선
async function confirmCompleteWork() {
  try {
    loading.value = true
    loadingMessage.value = '작업을 완료하는 중...'
    
    const endTime = new Date().toISOString()
    const isCompleteWork = currentWork.value.output_qty >= currentWork.value.target_quantity
    const isExactMatch = currentWork.value.output_qty === currentWork.value.target_quantity
    
    const completionData = {
      work_order_no: currentWork.value.work_order_no || currentWork.value.work_id,
      output_qty: currentWork.value.output_qty,
      defect_qty: currentWork.value.defect_qty,
      work_end_time: endTime,
      step_status: isCompleteWork ? 'COMPLETED' : 'PARTIAL_COMPLETE',
      employee_id: currentWork.value.employee_id,
      package_type: workInfo.value.lineType,
      line_id: workInfo.value.lineId,
      line_name: workInfo.value.lineName,
      completion_type: isCompleteWork ? 'COMPLETE' : 'PARTIAL',
      target_quantity: currentWork.value.target_quantity,
      achievement_rate: Math.round((currentWork.value.output_qty / currentWork.value.target_quantity) * 100)
    }
    
    // 내포장 vs 외포장 완료 시간 구분
    if (workInfo.value.lineType === 'INNER') {
      completionData.inner_end_time = endTime
      completionData.process_step = 'INNER_PACKAGING_COMPLETE'
    } else {
      completionData.outer_end_time = endTime
      completionData.process_step = 'OUTER_PACKAGING_COMPLETE'
    }
    
    try {
      // 실제 DB API 호출
      const response = await axios.put('/packages/works/complete', completionData)
      
      if (response.data.success) {
        if (workInfo.value.lineType === 'INNER') {
          addLog('내포장 작업이 완료되었습니다. (work_result_detail 테이블 업데이트)', 'success')
          addLog(`DB 업데이트: inner_end_time = ${endTime}`, 'info')
        } else {
          addLog('외포장 작업이 완료되었습니다. (work_result_detail 테이블 업데이트)', 'success')
          addLog(`DB 업데이트: outer_end_time = ${endTime}`, 'info')
        }
      } else {
        throw new Error(response.data.message || '작업 완료 실패')
      }
    } catch (apiError) {
      console.warn('work_result_detail 업데이트 실패, 워크플로우는 계속 진행:', apiError.message)
      addLog('DB 연결 실패 - 시뮬레이션 모드로 완료 처리', 'warning')
    }
    
    // 내포장 완료 시 워크플로우 처리
    if (workInfo.value.lineType === 'INNER') {
      await processInnerToOuterWorkflow()
      
      // 지시량과 생산량 비교하여 워크플로우 결정
      if (isExactMatch) {
        // 정확히 일치하면 바로 외포장으로
        addLog(`지시량 ${formatNumber(currentWork.value.target_quantity)}개와 생산량이 정확히 일치합니다.`, 'success')
        addLog('부분완료 처리 없이 바로 외포장 단계로 이동합니다.', 'info')
        
        setTimeout(() => {
          startDirectTransitionToOuter()
        }, 2000)
        
      } else if (isCompleteWork) {
        // 지시량 이상 달성했지만 정확하지 않은 경우
        addLog(`지시량을 달성했습니다. (목표: ${formatNumber(currentWork.value.target_quantity)}, 실제: ${formatNumber(currentWork.value.output_qty)})`, 'success')
        addLog('외포장 단계로 이동합니다.', 'info')
        
        setTimeout(() => {
          startDirectTransitionToOuter()
        }, 2000)
        
      } else {
        // 지시량 미달성 시 부분완료 처리
        const shortfall = currentWork.value.target_quantity - currentWork.value.output_qty
        addLog(`지시량 미달성: ${formatNumber(shortfall)}개 부족`, 'warning')
        addLog('부분완료로 처리되며, 추후 계속 작업하거나 외포장으로 진행할 수 있습니다.', 'info')
        
        // 부분완료 처리 후에도 외포장 옵션 제공
        setTimeout(() => {
          showPartialCompleteOptions()
        }, 2000)
      }
    } else {
      // 외포장 완료
      addLog('모든 포장 작업이 완료되었습니다!', 'success')
      setTimeout(() => {
        startAutoTransitionToLineSelection()
      }, 3000)
    }
    
    // 작업 상태 업데이트
    isWorking.value = false
    workStatus.value = isCompleteWork ? 'COMPLETED' : 'PARTIAL_COMPLETE'
    
    if (workTimer) {
      clearInterval(workTimer)
      workTimer = null
    }
    if (productionTimer) {
      clearInterval(productionTimer)
      productionTimer = null
    }
    
    closeCompleteModal()
    
  } catch (error) {
    console.error('작업 완료 실패:', error)
    addLog(`작업 완료 처리 중 오류: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// 내포장→외포장 워크플로우 연계
async function processInnerToOuterWorkflow() {
  try {
    console.log('내포장→외포장 워크플로우 연계 시작')
    
    const baseLineName = workInfo.value.lineName.replace(/\s*(내포장|외포장).*$/, '')
    
    const linkageData = {
      base_line_name: baseLineName,
      inner_work_order_no: currentWork.value.work_order_no || currentWork.value.work_id,
      inner_output_qty: currentWork.value.output_qty,
      inner_completion_time: new Date().toISOString(),
      completion_type: 'complete',
      completed_by: currentWork.value.employee_id
    }
    
    // 실제 API는 구현되지 않았으므로 메모리에만 저장
    if (!window.workflowData) window.workflowData = {}
    const workflowKey = `workflow_${baseLineName.replace(/\s+/g, '_')}`
    window.workflowData[workflowKey] = {
      inner_work_order_no: currentWork.value.work_order_no || currentWork.value.work_id,
      inner_output_qty: currentWork.value.output_qty,
      inner_completion_time: new Date().toISOString(),
      completion_type: 'complete'
    }
    
    addLog(`${baseLineName} 외포장에 워크플로우 연계 완료 (${formatNumber(currentWork.value.output_qty)}개)`, 'success')
    
  } catch (error) {
    console.error('워크플로우 연계 실패:', error)
    addLog('외포장 연계에 실패했지만 작업은 완료되었습니다.', 'warning')
  }
}

// 작업번호에서 숫자 추출 (DB 컬럼명 명확화)
function extractWorkNumber(workOrderNo) {
  if (!workOrderNo) return 0
  const match = workOrderNo.toString().match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

// 자동 작업번호 선택 - DB 컬럼명 명확화
async function autoSelectFirstAvailableWork() {
  if (availableWorkOrders.value.length === 0) {
    console.log('자동 선택할 작업번호가 없음')
    addLog('사용 가능한 작업번호가 없습니다.', 'warning')
    return
  }
  
  const priorityWorks = [
    ...workingWorks.value,
    ...pausedWorks.value, 
    ...readyWorks.value
  ]
  
  if (priorityWorks.length > 0) {
    const firstWork = priorityWorks[0]
    const workOrderNo = firstWork.work_order_no || firstWork.work_id
    console.log(`자동 선택: ${workOrderNo} (상태: ${getWorkStatusText(firstWork.step_status)})`)
    
    selectedWorkOrder.value = workOrderNo
    await onWorkOrderChange()
    
    addLog(`자동 선택: ${workOrderNo} - ${firstWork.final_product_name || firstWork.product_name}`, 'success')
  } else {
    addLog('우선순위 작업이 없습니다.', 'warning')
  }
}

// 재시도 작업번호 선택 - DB 컬럼명 명확화
async function selectWorkOrderWithRetry(targetWorkNo, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`작업번호 ${targetWorkNo} 선택 시도 ${attempt}/${maxRetries}`)
      
      const foundWork = availableWorkOrders.value.find(dbWork => 
        dbWork.work_order_no === targetWorkNo || dbWork.work_id === targetWorkNo
      )
      
      if (foundWork) {
        selectedWorkOrder.value = targetWorkNo
        await onWorkOrderChange()
        console.log(`작업번호 ${targetWorkNo} 선택 성공`)
        addLog(`URL에서 작업번호 ${targetWorkNo}가 선택되었습니다.`, 'info')
        return
      } else {
        console.log(`시도 ${attempt}: 작업번호 ${targetWorkNo}를 목록에서 찾을 수 없음`)
        addLog(`시도 ${attempt}: 작업번호 ${targetWorkNo} 없음 (전체 ${availableWorkOrders.value.length}개 중)`, 'warning')
        
        if (attempt < maxRetries) {
          await loadWorkOrdersByLine()
        }
      }
    } catch (error) {
      console.error(`시도 ${attempt} 실패:`, error)
      if (attempt === maxRetries) {
        addLog(`작업번호 ${targetWorkNo} 선택에 실패했습니다.`, 'warning')
      }
    }
  }
}

// 강력 새로고침
async function refreshWorkOrders() {
  try {
    addLog('강력 새로고침을 시작합니다...', 'info')
    loading.value = true
    loadingMessage.value = '강력 새로고침 중 (실제 DB 재조회)...'
    
    const currentSelectedWork = selectedWorkOrder.value
    
    // 초기화
    availableWorkOrders.value = []
    debugInfo.value.lastApiResponse = null
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 다시 로드
    await loadWorkOrdersByLine()
    
    if (workInfo.value.lineType === 'OUTER') {
      await loadWorkflowData()
    }
    
    // 이전 선택 복원 - DB 컬럼명으로 검색
    if (currentSelectedWork) {
      const stillExists = availableWorkOrders.value.find(dbWork => 
        dbWork.work_order_no === currentSelectedWork || dbWork.work_id === currentSelectedWork
      )
      if (stillExists) {
        selectedWorkOrder.value = currentSelectedWork
        await onWorkOrderChange()
        addLog(`이전 작업(${currentSelectedWork})을 복원했습니다.`, 'success')
      } else {
        addLog(`이전 작업(${currentSelectedWork})을 찾을 수 없어 자동 선택합니다.`, 'warning')
        await autoSelectFirstAvailableWork()
      }
    } else {
      await autoSelectFirstAvailableWork()
    }
    
    addLog('강력 새로고침이 완료되었습니다. (실제 DB 기반)', 'success')
    
  } catch (error) {
    console.error('강력 새로고침 실패:', error)
    addLog(`강력 새로고침 실패: ${error.message}`, 'error')
    
    if (error.message.includes('Unknown column') || error.message.includes('table')) {
      showDebugPanel.value = true
      addLog('데이터베이스 구조 문제가 감지되어 디버깅 패널을 활성화했습니다.', 'warning')
    }
    
    if (confirm('새로고침에 실패했습니다. 페이지를 새로고침하시겠습니까?')) {
      window.location.reload()
    }
  } finally {
    loading.value = false
  }
}

// 투입수량 변경 감지
watch(inputQuantity, (newQuantity) => {
  if (selectedWorkOrder.value && newQuantity > 0) {
    if (workInfo.value.lineType === 'OUTER' && workflowInfo.value.innerCompleted && workflowInfo.value.innerOutputQty > 0) {
      if (newQuantity !== workflowInfo.value.innerOutputQty) {
        addLog(`워크플로우 연계 중입니다. 투입수량은 내포장 완료수량으로 고정됩니다.`, 'warning')
        nextTick(() => {
          inputQuantity.value = workflowInfo.value.innerOutputQty
        })
      }
      return
    }
    
    currentWork.value.current_quantity = newQuantity
    updateCurrentWorkInfo()
  }
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

// 투입수량 변경 핸들러
function onInputQuantityChange() {
  if (selectedWorkOrder.value && inputQuantity.value > 0) {
    if (workInfo.value.lineType === 'OUTER' && workflowInfo.value.innerCompleted && workflowInfo.value.innerOutputQty > 0) {
      console.log('외포장 워크플로우 연계 중 - 투입수량 변경 제한')
      return
    }
    
    currentWork.value.current_quantity = inputQuantity.value
    updateCurrentWorkInfo()
  }
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
}

// 생산 재시작
function resumeProduction() {
  isWorking.value = true
  workStatus.value = 'WORKING'
  
  startWorkTimer()
  startProductionSimulation()
  
  addLog('작업을 재시작했습니다.', 'success')
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
    
    const totalTargetQty = currentWork.value.target_quantity || productionSettings.value.targetQty
    currentWork.value.output_qty = passQty
    currentWork.value.defect_qty = defectQty
    currentWork.value.progressRate = Math.min(100, Math.round((passQty / totalTargetQty) * 100))
    currentWork.value.passRate = totalProduced > 0 ? Math.round((passQty / totalProduced) * 100) : 0
    currentWork.value.defectRate = totalProduced > 0 ? Math.round((defectQty / totalProduced) * 100) : 0
    
    updateCurrentWorkInfo()
    
    if (totalProduced > 0 && totalProduced % (productionSettings.value.productionSpeed * 5) === 0) {
      addLog(`생산 진행: ${passQty}개 완료 (불량: ${defectQty}개, 진행률: ${currentWork.value.progressRate}%)`, 'info')
    }
    
    if (totalProduced >= productionSettings.value.targetQty) {
      autoCompleteProduction()
    }
    
  }, 1000)
}

// 자동 완료
function autoCompleteProduction() {
  if (productionTimer) {
    clearInterval(productionTimer)
    productionTimer = null
  }
  
  isWorking.value = false
  workStatus.value = 'COMPLETED'
  
  addLog('생산이 완료되었습니다!', 'success')
  addLog('"완료 처리" 버튼을 눌러 작업을 마무리해주세요.', 'info')
}

// 생산 완료 버튼
function completeProduction() {
  if (workStatus.value === 'COMPLETED' || !isWorking.value) {
    showCompleteModal.value = true
    return
  }
  
  showCompleteModal.value = true
}

// 작업 종료
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
    
  } catch (error) {
    console.error('작업 종료 실패:', error)
    showErrorMessage('작업 종료 처리에 실패했습니다.')
  }
}

// 바로 외포장으로 전환
function startDirectTransitionToOuter() {
  addLog('지시량 달성 완료 - 외포장 라인 선택으로 이동합니다.', 'success')
  
  const queryParams = {
    inner_completed: 'true',
    inner_work_order_no: currentWork.value.work_order_no || currentWork.value.work_id,
    inner_output_qty: currentWork.value.output_qty,
    inner_completion_time: new Date().toISOString(),
    auto_start_guide: 'true',
    workflow_type: 'direct_transition',
    message: `내포장 작업(${currentWork.value.work_order_no || currentWork.value.work_id})이 완료되었습니다. 완료수량 ${formatNumber(currentWork.value.output_qty)}개를 외포장에 투입하세요.`,
    success_message: '내포장 작업이 성공적으로 완료되었습니다!'
  }
  
  // 자동 전환 애니메이션 표시
  showAutoTransition.value = true
  transitionProgress.value = 0
  
  const duration = 2000  // 2초로 단축
  const interval = 50
  const increment = (100 / (duration / interval))
  
  const progressTimer = setInterval(() => {
    transitionProgress.value += increment
    
    if (transitionProgress.value >= 100) {
      clearInterval(progressTimer)
      showAutoTransition.value = false
      
      router.push({
        name: 'package_line',
        query: queryParams
      })
    }
  }, interval)
}

// 부분완료 옵션 표시
function showPartialCompleteOptions() {
  // 부분완료 확인 모달 표시
  showCompleteModal.value = true
  
  // 부분완료 안내 메시지
  addLog('부분완료 옵션: 1) 현재 수량으로 외포장 진행, 2) 나중에 계속 작업', 'info')
}

// 부분 완료 처리 (외포장 진행 옵션 포함)
async function confirmPartialComplete() {
  try {
    loading.value = true
    loadingMessage.value = '부분 완료 처리 중...'
    
    const endTime = new Date().toISOString()
    
    // 부분완료 DB 업데이트
    const partialData = {
      work_order_no: currentWork.value.work_order_no || currentWork.value.work_id,
      output_qty: currentWork.value.output_qty,
      defect_qty: currentWork.value.defect_qty,
      work_end_time: endTime,
      step_status: 'PARTIAL_COMPLETE',
      employee_id: currentWork.value.employee_id,
      package_type: workInfo.value.lineType,
      line_id: workInfo.value.lineId,
      completion_type: 'PARTIAL',
      partial_reason: `지시량 ${formatNumber(currentWork.value.target_quantity)}개 중 ${formatNumber(currentWork.value.output_qty)}개 완료`
    }
    
    if (workInfo.value.lineType === 'INNER') {
      partialData.inner_end_time = endTime
      partialData.process_step = 'INNER_PACKAGING_PARTIAL'
    }
    
    try {
      const response = await axios.put('/packages/works/partial-complete', partialData)
      if (response.data.success) {
        addLog('부분완료가 DB에 반영되었습니다.', 'success')
      }
    } catch (apiError) {
      console.warn('부분완료 DB 업데이트 실패:', apiError.message)
      addLog('DB 연결 실패 - 로컬에서 부분완료 처리', 'warning')
    }
    
    isWorking.value = false
    workStatus.value = 'PARTIAL_COMPLETE'
    
    if (workTimer) {
      clearInterval(workTimer)
      workTimer = null
    }
    if (productionTimer) {
      clearInterval(productionTimer)
      productionTimer = null
    }
    
    closeCompleteModal()
    
    const shortfall = currentWork.value.target_quantity - currentWork.value.output_qty
    addLog(`부분완료 처리완료 (달성률: ${getCompletionRate()}%)`, 'warning')
    addLog(`미달성: ${formatNumber(shortfall)}개`, 'info')
    
    // 내포장 부분완료 시에도 외포장 진행 옵션 제공
    if (workInfo.value.lineType === 'INNER' && currentWork.value.output_qty > 0) {
      addLog('현재 완료된 수량으로 외포장을 진행할 수 있습니다.', 'info')
      
      // 워크플로우 데이터 저장
      await processInnerToOuterWorkflow()
      
      // 3초 후 외포장 옵션 제공
      setTimeout(() => {
        if (confirm(`현재 완료된 ${formatNumber(currentWork.value.output_qty)}개로 외포장을 진행하시겠습니까?\n\n확인: 외포장 진행\n취소: 나중에 계속 작업`)) {
          startDirectTransitionToOuter()
        } else {
          addLog('나중에 같은 작업번호를 선택하여 계속 작업할 수 있습니다.', 'info')
        }
      }, 2000)
    } else {
      addLog('나중에 같은 작업번호를 선택하여 계속 작업할 수 있습니다.', 'info')
    }
    
  } catch (error) {
    console.error('부분 완료 처리 실패:', error)
    addLog(`부분 완료 처리 중 오류: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// 나중에 계속하기
async function confirmContinueLater() {
  try {
    loading.value = true
    loadingMessage.value = '일시정지 처리 중...'
    
    // 실제 API 대신 시뮬레이션
    addLog('일시정지되었습니다. 나중에 계속할 수 있습니다. (시뮬레이션 모드)', 'info')
    
    isWorking.value = false
    workStatus.value = 'PAUSED'
    
    if (workTimer) {
      clearInterval(workTimer)
      workTimer = null
    }
    if (productionTimer) {
      clearInterval(productionTimer)
      productionTimer = null
    }
    
    closeCompleteModal()
    
    setTimeout(() => {
      goBackToLineSelection()
    }, 2000)
    
  } catch (error) {
    console.error('일시정지 처리 실패:', error)
    addLog(`일시정지 처리 중 오류: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// 라인 초기화
async function resetLineStatus() {
  if (!confirm('이 라인의 작업 상태를 초기화하시겠습니까?')) {
    return
  }
  
  try {
    loading.value = true
    loadingMessage.value = '라인 상태 초기화 중...'
    
    addLog('라인 상태를 초기화했습니다.', 'success')
    
    await refreshWorkOrders()
    
  } catch (error) {
    console.error('라인 초기화 실패:', error)
    addLog(`라인 초기화 실패: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// 현재 작업 정보 업데이트
function updateCurrentWorkInfo() {
  if (currentWork.value.target_quantity > 0) {
    currentWork.value.remaining_quantity = Math.max(0, 
      currentWork.value.target_quantity - currentWork.value.current_quantity
    )
    
    currentWork.value.achievementRate = Math.round(
      (currentWork.value.output_qty / currentWork.value.target_quantity) * 100
    )
  } else {
    currentWork.value.remaining_quantity = 0
    currentWork.value.achievementRate = 0
  }
  
  if (isWorking.value && productionSettings.value.productionSpeed > 0) {
    const remainingQty = productionSettings.value.targetQty - productionSettings.value.currentProgress
    const remainingSeconds = remainingQty / productionSettings.value.productionSpeed
    currentWork.value.end_time = new Date(Date.now() + remainingSeconds * 1000)
    currentWork.value.estimated_duration = Math.ceil(remainingSeconds)
  }
}

// 작업 정보 리셋
function resetCurrentWork() {
  currentWork.value = {
    work_order_no: '',
    work_id: '',
    result_detail_id: null,
    result_id: '',
    product_name: '',
    final_product_name: '',
    product_code: '',
    package_type: '',
    target_quantity: 0,
    current_quantity: 0,
    remaining_quantity: 0,
    output_qty: 0,
    defect_qty: 0,
    progressRate: 0,
    passRate: 0,
    defectRate: 0,
    achievementRate: 0,
    employee_id: 2,
    worker_name: '김포장',
    department: '포장부',
    position: '작업자',
    start_time: null,
    end_time: null,
    work_duration: 0,
    estimated_duration: 0,
    step_status: 'READY',
    process_code: '',
    eq_type_code: '',
    _original_keys: [],
    _processed_at: null
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
    await refreshWorkOrders()
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
  
  if (workLogs.value.length > 50) {
    workLogs.value = workLogs.value.slice(0, 50)
  }
  
  console.log(`[${type.toUpperCase()}] ${message}`)
}

// 모달 제어
function closeCompleteModal() {
  showCompleteModal.value = false
}

// 라인 선택으로 돌아가기
function goBackToLineSelection() {
  if (isWorking.value) {
    if (!confirm('진행 중인 작업이 있습니다. 정말 돌아가시겠습니까?')) {
      return
    }
  }
  
  const queryParams = {
    from_work: 'true',
    maintain_type: workInfo.value.lineType,
    current_work: currentWork.value.work_order_no || currentWork.value.work_id
  }
  
  if (workflowInfo.value.step === 'OUTER') {
    queryParams.inner_work_order_no = workflowInfo.value.innerWorkNo
    queryParams.inner_completed = 'true'
  }
  
  router.push({ 
    name: 'package_line',
    query: queryParams
  })
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

// 자동 전환 함수 (일반용)
function startAutoTransitionToLineSelection() {
  console.log('자동 전환 시작')
  showAutoTransition.value = true
  transitionProgress.value = 0
  
  const duration = 3000
  const interval = 50
  const increment = (100 / (duration / interval))
  
  const progressTimer = setInterval(() => {
    transitionProgress.value += increment
    
    if (transitionProgress.value >= 100) {
      clearInterval(progressTimer)
      showAutoTransition.value = false
      
      let queryParams = {}
      
      if (workInfo.value.lineType === 'INNER') {
        queryParams = {
          inner_completed: 'true',
          prev_work: currentWork.value.work_order_no || currentWork.value.work_id,
          inner_work_order_no: currentWork.value.work_order_no || currentWork.value.work_id,
          inner_output_qty: currentWork.value.output_qty,
          inner_completion_time: new Date().toISOString(),
          auto_start_guide: 'true',
          message: `내포장 작업(${currentWork.value.work_order_no || currentWork.value.work_id})이 완료되었습니다. 완료수량 ${formatNumber(currentWork.value.output_qty)}개를 외포장에 투입하세요.`,
          success_message: '내포장 작업이 성공적으로 완료되었습니다!'
        }
      } else {
        queryParams = {
          outer_completed: 'true',
          prev_work: currentWork.value.work_order_no || currentWork.value.work_id,
          prev_inner_work: workflowInfo.value.innerWorkNo,
          message: `모든 포장 작업이 완료되었습니다! 내포장(${workflowInfo.value.innerWorkNo}) + 외포장(${currentWork.value.work_order_no || currentWork.value.work_id})`,
          success_message: '전체 포장 프로세스가 성공적으로 완료되었습니다!'
        }
      }
      
      router.push({
        name: 'package_line',
        query: queryParams
      })
      
      addLog('라인 선택 페이지로 이동했습니다.', 'success')
    }
  }, interval)
}

// 워크플로우 관련 텍스트 함수들
function getWorkflowStepText() {
  if (workflowInfo.value.step === 'OUTER') {
    return '외포장 (2단계)'
  } else if (workflowInfo.value.step === 'INNER') {
    return '내포장 (1단계)'
  }
  return workInfo.value.lineType === 'INNER' ? '내포장' : '외포장'
}

function getCompleteModalTitle() {
  if (workInfo.value.lineType === 'INNER') {
    return '내포장 작업 완료 확인'
  } else {
    return '외포장 작업 완료 확인'
  }
}

function getConfirmationText() {
  const isExactMatch = currentWork.value.output_qty === currentWork.value.target_quantity
  const isOverAchieved = currentWork.value.output_qty >= currentWork.value.target_quantity
  
  if (isPartialCompletion.value) {
    const remainingQty = getRemainingQuantity()
    if (remainingQty > 0) {
      if (workInfo.value.lineType === 'INNER') {
        return `지시량 ${formatNumber(currentWork.value.target_quantity)}개 중 ${formatNumber(currentWork.value.output_qty)}개만 완료되었습니다.\n\n현재 완료된 수량으로 외포장을 진행하거나, 나중에 계속 작업할 수 있습니다.`
      } else {
        return `지시량 ${formatNumber(currentWork.value.target_quantity)}개 중 ${formatNumber(currentWork.value.output_qty)}개만 완료되었습니다. 남은 ${formatNumber(remainingQty)}개는 어떻게 처리하시겠습니까?`
      }
    }
  }
  
  if (workInfo.value.lineType === 'INNER') {
    if (isExactMatch) {
      return `지시량 ${formatNumber(currentWork.value.target_quantity)}개를 정확히 달성했습니다!\n바로 외포장 라인 선택으로 이동하시겠습니까?`
    } else if (isOverAchieved) {
      return `지시량을 달성했습니다! (목표: ${formatNumber(currentWork.value.target_quantity)}개, 실제: ${formatNumber(currentWork.value.output_qty)}개)\n외포장 라인 선택으로 이동하시겠습니까?`
    } else {
      return '내포장 작업을 완료하고 외포장 라인 선택으로 이동하시겠습니까?'
    }
  } else {
    return '외포장 작업을 완료하시겠습니까? 모든 포장 단계가 완료됩니다.'
  }
}

function getCompleteButtonText() {
  const isExactMatch = currentWork.value.output_qty === currentWork.value.target_quantity
  const isOverAchieved = currentWork.value.output_qty >= currentWork.value.target_quantity
  
  if (workInfo.value.lineType === 'INNER') {
    if (isExactMatch) {
      return '정확히 달성! → 외포장 선택'
    } else if (isOverAchieved) {
      return '목표 달성! → 외포장 선택'
    } else {
      return '내포장 완료 → 외포장 선택'
    }
  } else {
    return '외포장 완료 → 전체 완료'
  }
}

function getPartialCompleteButtonText() {
  const remainingQty = getRemainingQuantity()
  
  if (workInfo.value.lineType === 'INNER') {
    if (remainingQty > 0) {
      return `현재 수량으로 외포장 진행 (${formatNumber(currentWork.value.output_qty)}개)`
    } else {
      return `내포장 완료 → 외포장 진행`
    }
  } else {
    if (remainingQty > 0) {
      return `부분완료로 저장 (남은: ${formatNumber(remainingQty)}개)`
    } else {
      return `외포장 완료`
    }
  }
}

function getTransitionTitle() {
  if (workInfo.value.lineType === 'INNER') {
    return '외포장 라인 선택으로 이동 중...'
  } else {
    return '작업 완료 - 라인 선택으로 이동 중...'
  }
}

function getTransitionMessage() {
  if (workInfo.value.lineType === 'INNER') {
    return '내포장 작업이 완료되었습니다. 잠시 후 외포장이 활성화된 라인 선택 페이지로 이동합니다.'
  } else {
    return '모든 포장 작업이 완료되었습니다. 잠시 후 라인 선택 페이지로 이동합니다.'
  }
}

// 작업 버튼 텍스트
function getWorkButtonText() {
  if (isPartialWork.value && !isWorking.value) {
    return '부분완료 작업 시작'
  }
  
  switch (workStatus.value) {
    case 'READY':
      return '작업 시작'
    case 'WORKING':
      return '작업 일시정지'
    case 'PAUSED':
      return '작업 재시작'
    case 'COMPLETED':
      return '작업 완료됨'
    case 'PARTIAL_COMPLETE':
      return '부분완료 작업 시작'
    default:
      return '작업 시작'
  }
}

// 작업 상태 텍스트
function getWorkStatusText(status) {
  const map = {
    'READY': '준비',
    'WORKING': '작업중',
    'IN_PROGRESS': '작업중',
    'PAUSED': '일시정지',
    'COMPLETED': '완료',
    'PARTIAL_COMPLETE': '부분완료',
    'partial_complete': '부분완료',
    '준비': '준비',
    '작업중': '작업중',
    '진행중': '작업중',
    '일시정지': '일시정지',
    '완료': '완료',
    '부분완료': '부분완료'
  }
  return map[status] || status || '준비'
}

// 작업 상태 클래스
function getWorkStatusClass(status) {
  const normalizedStatus = (status || '').toLowerCase()
  
  if (normalizedStatus.includes('ready') || normalizedStatus.includes('준비') || !status) {
    return 'ready'
  } else if (normalizedStatus.includes('working') || normalizedStatus.includes('진행') || normalizedStatus.includes('progress')) {
    return 'working'
  } else if (normalizedStatus.includes('paused') || normalizedStatus.includes('일시정지')) {
    return 'paused'
  } else if (normalizedStatus.includes('completed') || normalizedStatus.includes('완료')) {
    return 'completed'
  } else if (normalizedStatus.includes('partial') || normalizedStatus.includes('부분')) {
    return 'partial'
  }
  
  return 'unknown'
}

// 품질 등급 클래스
function getQualityRateClass(rate) {
  if (rate >= 98) return 'excellent'
  if (rate >= 95) return 'good'
  if (rate >= 90) return 'warning'
  return 'danger'
}

// 달성률 클래스
function getAchievementRateClass(rate) {
  if (rate >= 100) return 'excellent'
  if (rate >= 90) return 'good'
  if (rate >= 70) return 'warning'
  return 'danger'
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

function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '-'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`
  } else if (minutes > 0) {
    return `${minutes}분 ${secs}초`
  } else {
    return `${secs}초`
  }
}

function formatElapsedTime(ms) {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((ms % (1000 * 60)) / 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// 작업 타이머
function startWorkTimer() {
  workTimer = setInterval(() => {
    if (workStartTime.value) {
      const elapsed = new Date() - workStartTime.value
      workElapsedTime.value = formatElapsedTime(elapsed)
      currentWork.value.work_duration = Math.floor(elapsed / 1000)
    }
  }, 1000)
}
</script>

<style scoped>
/* 디버깅 패널 스타일 */
.debug-panel {
  background: #1f2937;
  color: white;
  border-radius: 8px;
  margin: 16px 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 2px solid #374151;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #374151;
}

.debug-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #f3f4f6;
}

.debug-close {
  background: #374151;
  color: #d1d5db;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.debug-close:hover {
  background: #4b5563;
}

.debug-content {
  padding: 20px;
}

.debug-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #374151;
}

.debug-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.debug-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #10b981;
}

.debug-info {
  font-size: 13px;
  line-height: 1.5;
}

.debug-info p {
  margin: 6px 0;
  color: #d1d5db;
}

.debug-info strong {
  color: #f3f4f6;
}

.sample-item {
  background: #374151;
  border-radius: 4px;
  padding: 12px;
  margin: 8px 0;
  border-left: 3px solid #10b981;
}

.sample-details {
  margin: 8px 0;
  padding-left: 16px;
  list-style: none;
}

.sample-details li {
  margin: 4px 0;
  font-size: 11px;
  color: #d1d5db;
}

.sample-details strong {
  color: #f3f4f6;
  margin-right: 8px;
}

.debug-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.debug-btn {
  background: #065f46;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.debug-btn:hover {
  background: #047857;
}

.debug-toggle {
  background: #374151;
  color: #d1d5db;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.debug-toggle:hover {
  background: #4b5563;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.panel-header h3 {
  margin: 0;
}

/* 디버깅 정보 스타일 */
.debug-section {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.debug-section h4 {
  color: #475569;
  font-size: 14px;
  margin: 0 0 8px 0;
}

/* 워크플로우 연계 관련 스타일 */
.workflow-linked {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5) !important;
  border-color: #10b981 !important;
  color: #065f46 !important;
  font-weight: 600;
}

.workflow-linked-info {
  font-size: 12px;
  color: #059669;
  margin-top: 4px;
  padding: 8px 12px;
  background: #ecfdf5;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-input:disabled.workflow-linked {
  opacity: 0.8;
  cursor: not-allowed;
}

.info-value.workflow-linked {
  color: #059669;
  font-weight: 700;
  background: #ecfdf5;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #bbf7d0;
}

/* 부분완료 작업 강조 스타일 */
.control-input.partial-work {
  background: linear-gradient(135deg, #fef3c7, #fde68a) !important;
  border-color: #f59e0b !important;
  color: #92400e !important;
  font-weight: 600;
}

.partial-work-info {
  font-size: 12px;
  color: #d97706;
  margin-top: 4px;
  padding: 8px 12px;
  background: #fef3c7;
  border-radius: 6px;
  border: 1px solid #fde68a;
  display: flex;
  align-items: center;
  gap: 6px;
}

.partial-completion-info {
  margin: 20px 0;
}

.warning-box {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 2px solid #f59e0b;
  border-radius: 12px;
  padding: 20px;
}

.warning-content h5 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 700;
  color: #92400e;
}

.completion-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 12px 0;
  padding: 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.stat-label {
  color: #92400e;
  font-weight: 500;
}

.stat-value {
  color: #1e293b;
  font-weight: 600;
}

.stat-value.shortage {
  color: #dc2626;
  font-weight: 700;
}

.warning-text {
  margin: 12px 0 0 0;
  color: #92400e;
  line-height: 1.5;
  font-weight: 500;
}

.completion-options {
  display: flex;
  gap: 8px;
}

.work-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.main-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sub-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-work {
  background: #3b82f6;
  color: white;
}

.btn-work.working {
  background: #f59e0b;
}

.btn-complete {
  background: #10b981;
  color: white;
}

.btn-complete.ready {
  background: #8b5cf6;
}

.btn-stop {
  background: #ef4444;
  color: white;
}

.btn-refresh, .btn-reset {
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
  min-width: 60px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-refresh:hover:not(:disabled) {
  background: linear-gradient(135deg, #4b5563, #374151);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
}

.btn-reset:hover:not(:disabled) {
  background: linear-gradient(135deg, #4b5563, #374151);
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.btn-partial {
  background: #f59e0b;
  color: white;
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-partial:hover {
  background: #d97706;
  transform: translateY(-1px);
}

.btn-continue {
  background: #6b7280;
  color: white;
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-continue:hover {
  background: #4b5563;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .work-controls {
    gap: 8px;
  }
  
  .main-actions {
    justify-content: center;
  }
  
  .sub-actions {
    justify-content: center;
    margin-left: 0;
  }
  
  .btn {
    flex: 1;
    min-width: 0;
  }
  
  .debug-panel {
    margin: 16px;
  }
  
  .debug-actions {
    justify-content: center;
  }
}

/* 기존 스타일들 */
.workflow-info {
  color: #059669;
  font-weight: 600;
  font-size: 12px;
}

.workflow-suggestion {
  font-size: 12px;
  color: #f59e0b;
  margin-top: 4px;
  padding: 4px 8px;
  background: #fef3c7;
  border-radius: 4px;
  border-left: 3px solid #f59e0b;
}

.output-qty {
  color: #059669;
  font-weight: 600;
  background: #ecfdf5;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
}

.guide-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.detail-value.highlight {
  color: #059669;
  font-weight: 700;
  background: #ecfdf5;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 기본 스타일들 */
.package-work-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.work-header {
  background: white;
  padding: 20px 24px;
  border-bottom: 2px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.breadcrumb {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 16px;
}

.breadcrumb-separator {
  margin: 0 8px;
}

.breadcrumb-item.active {
  color: #1e293b;
  font-weight: 600;
}

.header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
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
.work-status-badge,
.workflow-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.line-type-badge.inner {
  background: #dbeafe;
  color: #1d4ed8;
}

.line-type-badge.outer {
  background: #ecfdf5;
  color: #166534;
}

.work-status-badge.ready {
  background: #f3f4f6;
  color: #374151;
}

.work-status-badge.working {
  background: #dbeafe;
  color: #1d4ed8;
}

.work-status-badge.paused {
  background: #fef3c7;
  color: #a16207;
}

.work-status-badge.completed {
  background: #dcfce7;
  color: #166534;
}

.workflow-badge {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.workflow-indicator {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #f8fafc;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
}

.workflow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-radius: 8px;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.workflow-step.completed {
  background: #ecfdf5;
  border: 2px solid #10b981;
  opacity: 1;
}

.workflow-step.active {
  background: #eff6ff;
  border: 2px solid #3b82f6;
  opacity: 1;
  animation: pulse 2s infinite;
}

.step-text {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
}

.workflow-arrow {
  font-size: 16px;
  color: #9ca3af;
}

.workflow-guide {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 2px solid #3b82f6;
  border-radius: 12px;
  padding: 20px 24px;
  margin: 20px 24px;
}

.guide-content h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e40af;
}

.guide-content p {
  margin: 0 0 12px 0;
  color: #1e40af;
  line-height: 1.5;
}

.work-content {
  padding: 24px;
}

.work-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.work-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.control-panel,
.progress-panel,
.log-panel {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 2px solid #e2e8f0;
}

.control-panel h3,
.progress-panel h3,
.log-panel h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 20px 0;
}

.control-section {
  margin-bottom: 24px;
}

.control-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.available-count,
.target-info,
.line-info {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.control-select,
.control-input {
  padding: 12px 16px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  background: white;
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
  cursor: not-allowed;
}

.control-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
}

.display-value {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.display-unit {
  font-size: 14px;
  color: #64748b;
}

.remaining-qty {
  color: #ef4444;
}

.remaining-qty-highlight {
  background: #fef2f2;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #fecaca;
}

.no-work-message,
.loading-work-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 8px;
  margin-top: 8px;
}

.input-warning {
  font-size: 12px;
  color: #dc2626;
  margin-top: 4px;
  padding: 4px 8px;
  background: #fecaca;
  border-radius: 4px;
  border-left: 3px solid #dc2626;
}

.selected-work-preview {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
}

.selected-work-preview h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.preview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.preview-item .label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.preview-item .value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
}

.preview-item .value.ready {
  color: #6b7280;
}

.preview-item .value.working {
  color: #3b82f6;
}

.preview-item .value.paused {
  color: #f59e0b;
}

.preview-item .value.completed {
  color: #10b981;
}

.progress-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.progress-card {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.3s ease;
}

.progress-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.progress-card.info {
  border-color: #3b82f6;
  background: #eff6ff;
}

.progress-card.success {
  border-color: #10b981;
  background: #ecfdf5;
}

.progress-card.danger {
  border-color: #ef4444;
  background: #fef2f2;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.card-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.card-unit {
  font-size: 12px;
  color: #64748b;
}

.progress-section {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
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
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  transition: width 0.3s ease;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
}

.log-item:last-child {
  border-bottom: none;
}

.log-item.success {
  background: #ecfdf5;
  border-left: 4px solid #10b981;
}

.log-item.warning {
  background: #fef3c7;
  border-left: 4px solid #f59e0b;
}

.log-item.error {
  background: #fef2f2;
  border-left: 4px solid #ef4444;
}

.log-item.info {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
}

.log-time {
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  font-family: monospace;
  min-width: 80px;
}

.log-content {
  flex: 1;
  color: #1e293b;
  line-height: 1.4;
}

.work-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.workflow-panel,
.info-panel,
.line-change-panel {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  border: 2px solid #e2e8f0;
}

.workflow-panel h3,
.info-panel h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 20px 0;
}

.workflow-chain {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chain-step {
  padding: 16px;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
}

.chain-step.completed {
  background: #ecfdf5;
  border-color: #10b981;
}

.chain-step.current {
  background: #eff6ff;
  border-color: #3b82f6;
  animation: pulse 2s infinite;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.step-title {
  font-weight: 600;
  color: #1e293b;
}

.step-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.detail-label {
  color: #64748b;
}

.detail-value {
  color: #1e293b;
  font-weight: 600;
}

.chain-arrow {
  text-align: center;
  font-size: 20px;
  color: #3b82f6;
  margin: 8px 0;
}

.info-section {
  margin-bottom: 20px;
}

.info-section h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e2e8f0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  color: #64748b;
  font-weight: 500;
}

.info-value {
  color: #1e293b;
  font-weight: 600;
  text-align: right;
}

.info-value.achievement-rate.excellent {
  color: #10b981;
}

.info-value.achievement-rate.good {
  color: #3b82f6;
}

.info-value.achievement-rate.warning {
  color: #f59e0b;
}

.info-value.achievement-rate.danger {
  color: #ef4444;
}

.info-value.work-duration,
.info-value.estimated-time {
  font-family: monospace;
  font-size: 13px;
}

.info-value.estimated-time.time-warning {
  color: #ef4444;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0.5; }
}

.info-value.quality-rate.excellent {
  color: #10b981;
}

.info-value.quality-rate.good {
  color: #3b82f6;
}

.info-value.quality-rate.warning {
  color: #f59e0b;
}

.info-value.quality-rate.danger {
  color: #ef4444;
}

.info-value.defect-rate {
  color: #ef4444;
}

.info-value.worker-name {
  color: #3b82f6;
}

.line-change-panel {
  text-align: center;
}

.btn-line-change {
  width: 100%;
  padding: 14px 20px;
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 12px;
}

.btn-line-change:hover {
  background: linear-gradient(135deg, #4b5563, #374151);
  transform: translateY(-1px);
}

.line-change-help {
  font-size: 12px;
  color: #64748b;
  margin: 0;
  line-height: 1.4;
}

/* 모달 스타일들 */
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
  max-width: 600px;
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

.complete-summary {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.complete-summary h4 {
  font-size: 18px;
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
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
}

.summary-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.summary-value {
  font-size: 14px;
  color: #1e293b;
  font-weight: 600;
}

.next-step-info {
  margin: 20px 0;
}

.info-box {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  border: 2px solid;
}

.inner-completion .info-box {
  background: #eff6ff;
  border-color: #3b82f6;
}

.outer-completion .info-box {
  background: #ecfdf5;
  border-color: #10b981;
}

.info-content h5 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.info-content p {
  margin: 0 0 12px 0;
  color: #374151;
  line-height: 1.5;
}

.info-content ul {
  margin: 0;
  padding-left: 20px;
  color: #374151;
}

.info-content li {
  margin-bottom: 4px;
}

.completion-chain {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
}

.chain-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chain-text {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.chain-status {
  font-size: 10px;
  color: #10b981;
  font-weight: 500;
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

/* 자동 전환 오버레이 */
.auto-transition-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  backdrop-filter: blur(8px);
}

.transition-modal {
  background: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  border: 2px solid #e2e8f0;
}

.transition-modal h3 {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.transition-modal p {
  font-size: 16px;
  color: #64748b;
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.transition-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.transition-progress .progress-bar {
  flex: 1;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.transition-progress .progress-fill {
  height: 100%;
  background: linear-gradient(135deg, #10b981, #059669);
  transition: width 0.1s linear;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  min-width: 40px;
}

/* 로딩 및 에러 오버레이 */
.loading-overlay,
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
  z-index: 1000;
  backdrop-filter: blur(4px);
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

.loading-text {
  color: white;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.error-modal {
  background: white;
  border-radius: 16px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  border: 2px solid #ef4444;
}

.error-header {
  padding: 20px 24px;
  border-bottom: 2px solid #e2e8f0;
  background: #fef2f2;
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
  margin: 0 0 8px 0;
  color: #374151;
  line-height: 1.5;
}

.error-help {
  font-size: 14px;
  color: #64748b;
}

.error-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 2px solid #e2e8f0;
}

.btn-error-close,
.btn-retry {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
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
  background: #ef4444;
  color: white;
}

.btn-retry:hover {
  background: #dc2626;
}

/* 애니메이션 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

/* 반응형 */
@media (max-width: 1024px) {
  .work-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .control-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .progress-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .preview-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .work-content {
    padding: 16px;
  }
  
  .header-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .workflow-indicator {
    flex-direction: column;
    gap: 8px;
  }
  
  .workflow-arrow {
    transform: rotate(90deg);
  }
  
  .workflow-guide {
    flex-direction: column;
    text-align: center;
  }
  
  .progress-cards {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    width: 95%;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .completion-options {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .control-panel,
  .progress-panel,
  .log-panel,
  .workflow-panel,
  .info-panel {
    padding: 16px;
  }
  
  .transition-modal {
    padding: 24px;
  }
  
  .transition-modal h3 {
    font-size: 20px;
  }
}

/* 접근성 개선 */
@media (prefers-reduced-motion: reduce) {
  .workflow-step.active,
  .chain-step.current,
  .loading-spinner {
    animation: none;
  }
  
  .info-value.estimated-time.time-warning {
    animation: none;
    color: #ef4444;
  }
}

/* 인쇄 스타일 */
@media print {
  .loading-overlay,
  .error-overlay,
  .auto-transition-overlay,
  .modal-overlay {
    display: none !important;
  }
  
  .work-layout {
    grid-template-columns: 1fr;
  }
  
  .work-controls,
  .line-change-panel {
    display: none !important;
  }
}
</style>