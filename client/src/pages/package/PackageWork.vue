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
            <!--  워크플로우 단계 표시 -->
            <span v-if="workflowInfo.step === 'OUTER'" class="workflow-badge">
              2단계: 최종 포장
            </span>
          </div>
        </div>
        <!--  워크플로우 진행 표시 -->
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

    <!--  워크플로우 안내 메시지 -->
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
          <!--  개선된 작업 제어 패널 -->
          <div class="control-panel">
            <h3>작업 제어</h3>
            
            <div class="control-section">
              <div class="control-row">
                <!-- 작업번호 선택 -->
                <div class="control-group">
                  <label class="control-label">
                    작업번호 선택
                    <span v-if="availableWorkOrders.length > 0" class="available-count">
                      ({{ availableWorkOrders.length }}개 사용가능)
                    </span>
                    <!--  라인 정보 표시 -->
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
                        :key="work.work_no || Math.random()" 
                        :value="work.work_no"
                        class="ready-option"
                      >
                        {{ work.work_no || '작업번호없음' }} - {{ work.product_name || work.step_name || '제품명없음' }} 
                        ({{ formatNumber(work.order_qty || work.input_qty || 1000) }}개)
                      </option>
                    </optgroup>
                    
                    <!-- 진행중 작업 -->
                    <optgroup 
                      v-if="workingWorks && workingWorks.length > 0" 
                      label="진행중인 작업"
                    >
                      <option 
                        v-for="work in workingWorks" 
                        :key="work.work_no || Math.random()" 
                        :value="work.work_no"
                        class="working-option"
                      >
                        {{ work.work_no || '작업번호없음' }} - {{ work.product_name || work.step_name || '제품명없음' }} 
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
                        :key="work.work_no || Math.random()" 
                        :value="work.work_no"
                        class="paused-option"
                      >
                        {{ work.work_no || '작업번호없음' }} - {{ work.product_name || work.step_name || '제품명없음' }} 
                        ({{ work.progress_rate || 0 }}% 완료 - {{ getWorkStatusText(work.step_status) }})
                      </option>
                    </optgroup>
                  </select>
                  
                  <!--  작업번호 상태 안내 개선 -->
                  <div v-if="availableWorkOrders.length === 0 && !loading" class="no-work-message">
                    <div>
                      <div><strong>{{ workInfo.lineName }}의 {{ workInfo.lineType === 'INNER' ? '내포장' : '외포장' }} 작업번호가 없습니다.</strong></div>
                      <div style="font-size: 12px; margin-top: 4px;">
                        • 새로고침 버튼을 눌러보세요<br>
                        • 또는 작업 생성이 필요할 수 있습니다<br>
                        • 다른 라인을 확인해보세요
                      </div>
                    </div>
                  </div>
                  
                  <!--  즉시 로딩 상태 표시 -->
                  <div v-if="loading && loadingMessage.includes('작업번호')" class="loading-work-message">
                    <div>
                      <strong>{{ workInfo.lineName }} 작업번호를 불러오는 중...</strong>
                      <div style="font-size: 12px; margin-top: 4px;">잠시만 기다려주세요.</div>
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
                <!--  투입수량 (외포장 워크플로우 연계 강화) -->
                <div class="control-group">
                  <label class="control-label">
                    투입수량
                    <span v-if="currentWork.target_quantity > 0" class="target-info">
                      (지시: {{ formatNumber(currentWork.target_quantity) }}개)
                    </span>
                    <!--  외포장 시 내포장 완료수량 안내 -->
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
                  
                  <!--  외포장 워크플로우 연계 상태 표시 -->
                  <div v-if="workInfo.lineType === 'OUTER' && workflowInfo.innerOutputQty > 0" class="workflow-linked-info">
                    연계: 내포장 완료수량으로 자동 설정됨 ({{ formatNumber(workflowInfo.innerOutputQty) }}개)
                  </div>
                  
                  <!--  부분완료 작업 안내 -->
                  <div v-if="isPartialWork" class="partial-work-info">
                    부분완료 작업 - 남은 수량: {{ formatNumber(getRemainingQuantity()) }}개
                  </div>
                  
                  <!-- 투입수량 안내 -->
                  <div v-if="inputQuantity > currentWork.target_quantity && currentWork.target_quantity > 0" class="input-warning">
                    투입수량이 지시수량을 초과합니다
                  </div>
                  
                  <!--  외포장 워크플로우 안내 -->
                  <div v-if="workInfo.lineType === 'OUTER' && workflowInfo.innerOutputQty > 0 && inputQuantity !== workflowInfo.innerOutputQty" class="workflow-suggestion">
                    내포장 완료수량({{ formatNumber(workflowInfo.innerOutputQty) }}개)과 다릅니다
                  </div>
                </div>
              </div>

              <!-- 선택된 작업 미리보기 -->
              <div v-if="selectedWorkOrder && currentWork.work_no" class="selected-work-preview">
                <h4>선택된 작업 정보</h4>
                <div class="preview-grid">
                  <div class="preview-item">
                    <span class="label">작업번호:</span>
                    <span class="value">{{ currentWork.work_no }}</span>
                  </div>
                  <div class="preview-item">
                    <span class="label">제품명:</span>
                    <span class="value">{{ currentWork.product_name }}</span>
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
                  <!--  라인 정보 추가 -->
                  <div class="preview-item">
                    <span class="label">라인:</span>
                    <span class="value">{{ workInfo.lineName }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!--  깔끔하게 개선된 작업 버튼들 -->
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
          <!--  워크플로우 정보 패널 (외포장 시에만 표시) -->
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
                <span class="info-value">{{ currentWork.work_no || '-' }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">제품명</span>
                <span class="info-value">{{ currentWork.product_name || '-' }}</span>
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
          </div>

          <!--  개선된 라인 변경 패널 -->
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

    <!--  작업 완료 확인 모달 (워크플로우 개선) -->
    <div v-if="showCompleteModal" class="modal-overlay" @click="closeCompleteModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ getCompleteModalTitle() }}</h3>
          <button @click="closeCompleteModal" class="modal-close">×</button>
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
          
          <!--  미완료 작업 안내 -->
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
          
          <!--  미완료 시 선택 옵션 -->
          <div v-if="isPartialCompletion" class="completion-options">
            <button @click="confirmPartialComplete" class="btn-partial">
              {{ getPartialCompleteButtonText() }}
            </button>
            <button @click="confirmContinueLater" class="btn-continue">
              나중에 계속하기
            </button>
          </div>
          
          <!--  완전 완료 시 -->
          <button v-else @click="confirmCompleteWork" class="btn-confirm">
            {{ getCompleteButtonText() }}
          </button>
        </div>
      </div>
    </div>

    <!--  자동 이동 안내 오버레이 -->
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
  step: route.query.workflow_step || null, // 'INNER' | 'OUTER'
  innerCompleted: route.query.inner_completed === 'true',
  innerWorkNo: route.query.inner_work_no || '',
  innerCompletionTime: route.query.inner_completion_time ? new Date(route.query.inner_completion_time) : null,
  innerOutputQty: parseInt(route.query.inner_output_qty) || 0,
  autoStartGuide: route.query.auto_start_guide === 'true'
})

// API 설정
const API_BASE_URL = 'http://localhost:3000'
const PACKAGES_API_URL = `${API_BASE_URL}/packages`

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
         currentWork.value.step_status === 'PARTIAL_COMPLETE'
})

// 작업번호 상태별 분류 (정렬 추가)
const readyWorks = computed(() => {
  const ready = availableWorkOrders.value.filter(work => {
    if (!work) return false
    const status = (work.step_status || '').toLowerCase()
    return !status || 
           status === '' || 
           status === 'ready' || 
           status === '준비' || 
           status === 'null' ||
           status === 'undefined'
  })
  
  // 작업번호 순서로 정렬
  return ready.sort((a, b) => {
    const aWorkNo = extractWorkNumber(a.work_no)
    const bWorkNo = extractWorkNumber(b.work_no)
    return aWorkNo - bWorkNo
  })
})

const workingWorks = computed(() => {
  const working = availableWorkOrders.value.filter(work => {
    if (!work) return false
    const status = (work.step_status || '').toLowerCase()
    return status === 'working' || 
           status === 'in_progress' || 
           status === '진행중' ||
           status === '진행'
  })
  
  // 작업번호 순서로 정렬
  return working.sort((a, b) => {
    const aWorkNo = extractWorkNumber(a.work_no)
    const bWorkNo = extractWorkNumber(b.work_no)
    return aWorkNo - bWorkNo
  })
})

const pausedWorks = computed(() => {
  const paused = availableWorkOrders.value.filter(work => {
    if (!work) return false
    const status = (work.step_status || '').toLowerCase()
    return status === 'paused' || 
           status === '일시정지' ||
           status === 'partial_complete' ||
           status === '부분완료'
  })
  
  // 작업번호 순서로 정렬
  return paused.sort((a, b) => {
    const aWorkNo = extractWorkNumber(a.work_no)
    const bWorkNo = extractWorkNumber(b.work_no)
    return aWorkNo - bWorkNo
  })
})

const completedWorks = computed(() => {
  const completed = availableWorkOrders.value.filter(work => {
    if (!work) return false
    const status = (work.step_status || '').toLowerCase()
    return status === 'completed' || 
           status === '완료'
  })
  
  // 작업번호 순서로 정렬
  return completed.sort((a, b) => {
    const aWorkNo = extractWorkNumber(a.work_no)
    const bWorkNo = extractWorkNumber(b.work_no)
    return aWorkNo - bWorkNo
  })
})

// 작업번호에서 숫자 추출 함수
function extractWorkNumber(workNo) {
  if (!workNo) return 0
  
  // 숫자만 추출 (예: "W001", "104", "작업-123" → 1, 104, 123)
  const match = workNo.toString().match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

// 현재 작업 정보
const currentWork = ref({
  work_no: '',
  product_name: '',
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
  step_status: 'READY'
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
  return remainingMs < 30 * 60 * 1000 // 30분 미만 남았을 때 경고
})

// 생산 시뮬레이션 설정
const productionSettings = ref({
  productionSpeed: 30, // 초당 생산량
  defectRate: 0.02, // 2% 불량률
  targetQty: 0,
  currentProgress: 0
})

// 계산된 값들
const canStartWork = computed(() => {
  if (!selectedWorkOrder.value) {
    return false
  }
  
  // 이미 작업 중인 경우 시작 불가
  if (isWorking.value) {
    return false
  }
  
  // 부분완료 작업의 경우 항상 시작 가능
  if (isPartialWork.value) {
    console.log('부분완료 작업 - 시작 가능')
    return true
  }
  
  // 일시정지된 작업의 경우 재시작 가능
  if (currentWork.value.step_status === '일시정지' || currentWork.value.step_status === 'PAUSED') {
    console.log('일시정지 작업 - 재시작 가능')
    return true
  }
  
  // 진행중인 작업의 경우 재시작 가능
  if (currentWork.value.step_status === '진행중' || currentWork.value.step_status === 'IN_PROGRESS' || currentWork.value.step_status === 'WORKING') {
    console.log('진행중 작업 - 재시작 가능')
    return true
  }
  
  // 일반 작업의 경우 투입수량이 있어야 시작 가능
  const hasInputQuantity = inputQuantity.value > 0
  console.log(`일반 작업 - 투입수량 확인: ${inputQuantity.value} (시작가능: ${hasInputQuantity})`)
  return hasInputQuantity
})

// 미완료 여부 판단
const isPartialCompletion = computed(() => {
  return currentWork.value.output_qty < currentWork.value.target_quantity && 
         currentWork.value.target_quantity > 0
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

// 작업 상태별 진행률 초기화 함수
// 작업 상태별 진행률 초기화 함수
function initializeWorkProgress() {
  const workStatus = (currentWork.value.step_status || '').toLowerCase()
  
  console.log('작업 상태별 진행률 초기화:', workStatus)
  console.log('현재 작업 output_qty:', currentWork.value.output_qty)
  
  if (!workStatus || workStatus === 'ready' || workStatus === '준비' || workStatus === '') {
    // 새 작업: 완전히 0부터 시작
    currentWork.value.output_qty = 0
    currentWork.value.defect_qty = 0
    currentWork.value.progressRate = 0
    productionSettings.value.currentProgress = 0
    addLog('새로운 작업입니다. 진행률 0%부터 시작합니다.', 'success')
    return 'new'
    
  } else if (workStatus.includes('부분완료') || workStatus.includes('partial')) {
    // 부분완료: 이전 진행률 유지하되 시뮬레이션 진행률은 0부터 시작
    const previousOutput = currentWork.value.output_qty || 0
    // 중요: 부분완료 작업은 이전 생산량에서 추가로 생산하는 것
    productionSettings.value.currentProgress = 0  // 새로 생산할 분량은 0부터 시작
    addLog(`부분완료 작업입니다. 이전 생산량 ${formatNumber(previousOutput)}개 + 추가 생산 시작`, 'info')
    return 'partial'
    
  } else if (workStatus.includes('진행') || workStatus.includes('working') || workStatus.includes('progress')) {
    // 진행중: 처음부터 시작
    const targetQty = currentWork.value.target_quantity || inputQuantity.value
    productionSettings.value.currentProgress = 0  // 진행중 작업도 0부터 시작
    currentWork.value.output_qty = 0
    currentWork.value.defect_qty = 0
    addLog(`진행중 작업을 0%부터 새로 시작합니다. 목표: ${formatNumber(targetQty)}개`, 'info')
    return 'continuing'
    
  } else if (workStatus.includes('일시정지') || workStatus.includes('paused')) {
    // 일시정지: 이전 진행률 유지
    const previousOutput = currentWork.value.output_qty || 0
    productionSettings.value.currentProgress = previousOutput
    addLog(`일시정지된 작업입니다. 이전 생산량 ${formatNumber(previousOutput)}개에서 재시작 가능합니다.`, 'warning')
    return 'paused'
  }
  
  addLog(`알 수 없는 작업 상태(${workStatus})입니다. 0%부터 시작합니다.`, 'warning')
  currentWork.value.output_qty = 0
  currentWork.value.defect_qty = 0
  currentWork.value.progressRate = 0
  productionSettings.value.currentProgress = 0
  return 'unknown'
}

// 개선된 컴포넌트 마운트
onMounted(async () => {
  console.log('PackageWork 컴포넌트 마운트')
  console.log('라인 정보:', workInfo.value)
  console.log('워크플로우 정보:', workflowInfo.value)
  
  try {
    loading.value = true
    loadingMessage.value = '라인별 작업번호를 불러오는 중...'
    
    // 1단계: 먼저 작업번호 목록을 확실히 로드
    await loadAvailableWorkOrdersWithRetry()
    
    // 2단계: 외포장인 경우 워크플로우 데이터 로드
    if (workInfo.value.lineType === 'OUTER') {
      console.log('외포장 감지 - 워크플로우 데이터 로드 시작')
      await loadLinkedWorkflowData()
    }
    
    // 3단계: URL에서 전달된 작업번호가 있으면 설정
    if (route.query.work_no) {
      await selectWorkOrderWithRetry(route.query.work_no)
    } else {
      // 4단계: 자동 작업번호 선택
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
    
    addLog('페이지 초기화가 완료되었습니다.', 'success')
    
  } catch (error) {
    console.error('페이지 초기화 실패:', error)
    showErrorMessage(`페이지 초기화에 실패했습니다: ${error.message}`)
  } finally {
    loading.value = false
  }
})

// 투입수량 변경 감지 및 기투입량/미투입량 업데이트
watch(inputQuantity, (newQuantity) => {
  if (selectedWorkOrder.value && newQuantity > 0) {
    // 외포장이면서 워크플로우 연계가 활성화된 경우 투입수량 변경 제한
    if (workInfo.value.lineType === 'OUTER' && workflowInfo.value.innerCompleted && workflowInfo.value.innerOutputQty > 0) {
      // 내포장 완료수량과 다르면 경고
      if (newQuantity !== workflowInfo.value.innerOutputQty) {
        addLog(`워크플로우 연계 중입니다. 투입수량은 내포장 완료수량(${formatNumber(workflowInfo.value.innerOutputQty)}개)으로 고정됩니다.`, 'warning')
        // 강제로 내포장 완료수량으로 되돌림
        nextTick(() => {
          inputQuantity.value = workflowInfo.value.innerOutputQty
        })
      }
      return
    }
    
    // 일반적인 경우 기투입량 업데이트
    currentWork.value.current_quantity = newQuantity
    updateCurrentWorkInfo()
    console.log(`투입수량 변경: ${newQuantity}개 → 기투입량/미투입량 업데이트`)
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

// 재시도가 포함된 작업번호 로딩
async function loadAvailableWorkOrdersWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`작업번호 로딩 시도 ${attempt}/${maxRetries}`)
      await loadAvailableWorkOrdersImproved()
      
      if (availableWorkOrders.value.length > 0) {
        console.log(`시도 ${attempt}에서 ${availableWorkOrders.value.length}개 작업번호 로드 성공`)
        return
      } else {
        console.log(`시도 ${attempt}: 작업번호가 없음`)
      }
    } catch (error) {
      console.error(`시도 ${attempt} 실패:`, error)
      if (attempt === maxRetries) {
        throw error
      }
      // 재시도 전 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

// 개선된 작업번호 로딩
async function loadAvailableWorkOrdersImproved() {
  try {
    console.log('개선된 작업번호 목록 조회 시작')
    console.log('현재 라인:', workInfo.value.lineName, workInfo.value.lineType)
    
    // 라인명에서 기본 라인명 추출
    const baseLineName = workInfo.value.lineName.replace(/\s*(내포장|외포장).*$/, '')
    console.log('기본 라인명:', baseLineName)
    
    const response = await axios.get(`${PACKAGES_API_URL}/works`)
    
    if (response.data.success) {
      const allWorks = response.data.data || []
      
      if (allWorks.length === 0) {
        availableWorkOrders.value = []
        addLog('시스템에 작업 데이터가 없습니다.', 'warning')
        return
      }
      
      // 라인별 + 포장타입별 정확한 필터링
      const filteredWorks = allWorks.filter(work => {
        if (!work) return false
        
        const stepName = (work.step_name || '').toLowerCase()
        const workStep = (work.work_step || '').toLowerCase()
        const packageType = (work.package_type || '').toUpperCase()
        const lineType = (work.line_type || '').toLowerCase()
        const workLineName = (work.line_name || '').toLowerCase()
        
        // 1단계: 라인명 매칭 확인
        let lineMatches = false
        if (workLineName) {
          // 정확한 라인명 매칭
          lineMatches = workLineName.includes(baseLineName.toLowerCase()) ||
                       baseLineName.toLowerCase().includes(workLineName)
        } else {
          // 라인명이 없으면 일단 통과
          lineMatches = true
        }
        
        // 2단계: 포장타입 매칭
        let typeMatches = false
        
        if (workInfo.value.lineType === 'INNER') {
          // 내포장 필터링
          const isExplicitOuter = stepName.includes('외포장') || 
                                stepName.includes('2차') || 
                                workStep.includes('2차') ||
                                workStep.includes('외포장') ||
                                packageType === 'OUTER' ||
                                lineType.includes('외포장')
          
          if (isExplicitOuter) {
            return false // 외포장은 완전 제외
          }
          
          // 내포장 관련 키워드 또는 기본값
          typeMatches = stepName.includes('내포장') || 
                       stepName.includes('1차') ||
                       stepName.includes('정제') ||
                       workStep.includes('1차') ||
                       workStep.includes('내포장') ||
                       packageType === 'INNER' ||
                       lineType.includes('내포장') ||
                       (!workStep || workStep === '') // 기본값은 내포장으로 간주
                       
        } else if (workInfo.value.lineType === 'OUTER') {
          // 외포장 필터링
          typeMatches = stepName.includes('외포장') || 
                       stepName.includes('2차') || 
                       stepName.includes('박스') ||
                       workStep.includes('2차') ||
                       workStep.includes('외포장') ||
                       packageType === 'OUTER' ||
                       lineType.includes('외포장')
        }
        
        const finalMatch = lineMatches && typeMatches
        
        if (finalMatch) {
          console.log(`매칭: ${work.work_no} (라인: ${lineMatches}, 타입: ${typeMatches})`)
        }
        
        return finalMatch
      })
      
      // 데이터 구조 정리 및 상태 초기화 방지
      const processedWorks = filteredWorks.map(work => {
        const outputQty = work.output_qty || 0
        const targetQty = work.order_qty || work.target_qty || 1000
        const inputQty = work.input_qty || 0
        const progressRate = targetQty > 0 ? Math.round((outputQty / targetQty) * 100) : 0
        
        // 상태 정규화 (부분완료 상태 보존)
        let normalizedStatus = work.step_status || 'READY'
        
        // 기존 상태 보존 (초기화하지 않음)
        if (work.step_status === '부분완료' || work.step_status === 'PARTIAL_COMPLETE') {
          normalizedStatus = '부분완료'
        } else if (work.step_status === '완료' || work.step_status === 'COMPLETED') {
          normalizedStatus = '완료'
        } else if (work.step_status === '진행중' || work.step_status === 'WORKING' || work.step_status === 'IN_PROGRESS') {
          normalizedStatus = '진행중'
        } else if (work.step_status === '일시정지' || work.step_status === 'PAUSED') {
          normalizedStatus = '일시정지'
        }
        
        return {
          work_no: work.work_no || '작업번호없음',
          step_name: work.step_name || work.work_no || '단계명없음',
          work_step: work.work_step || '',
          step_status: normalizedStatus, // 기존 상태 보존
          product_name: work.product_name || work.step_name || '제품명없음',
          order_qty: targetQty,
          target_qty: targetQty,
          input_qty: inputQty,
          output_qty: outputQty,
          defect_qty: work.defect_qty || 0,
          progress_rate: progressRate,
          employee_name: work.employee_name || work.emp_name || '작업자',
          package_type: work.package_type || workInfo.value.lineType,
          line_type: work.line_type || (workInfo.value.lineType === 'INNER' ? '내포장' : '외포장'),
          line_name: work.line_name || workInfo.value.lineName
        }
      })
      
      // 중복 제거 (최신 데이터 우선)
      const uniqueWorks = []
      const seenWorkNos = new Set()
      
      // 최신 데이터를 위해 역순으로 처리
      processedWorks.reverse().forEach(work => {
        if (!seenWorkNos.has(work.work_no)) {
          seenWorkNos.add(work.work_no)
          uniqueWorks.unshift(work) // 다시 원래 순서로
        }
      })
      
      // 상태별 + 작업번호 순서 정렬
      uniqueWorks.sort((a, b) => {
        const statusPriority = {
          '진행중': 1, 'WORKING': 1, 'IN_PROGRESS': 1,
          '일시정지': 2, 'PAUSED': 2,
          '부분완료': 3, 'PARTIAL_COMPLETE': 3,
          '준비': 4, 'READY': 4, '': 4, null: 4, undefined: 4,
          '완료': 5, 'COMPLETED': 5
        }
        
        const aPriority = statusPriority[a.step_status] || 4
        const bPriority = statusPriority[b.step_status] || 4
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }
        
        // 같은 상태 내에서 작업번호 순서 정렬
        const aWorkNo = extractWorkNumber(a.work_no)
        const bWorkNo = extractWorkNumber(b.work_no)
        return aWorkNo - bWorkNo
      })
      
      availableWorkOrders.value = uniqueWorks
      
      console.log(`라인별 필터링 결과: ${allWorks.length}개 → ${uniqueWorks.length}개`)
      console.log(`대상 라인: ${baseLineName} ${workInfo.value.lineType}`)
      
      if (uniqueWorks.length === 0) {
        addLog(`${baseLineName} ${workInfo.value.lineType === 'INNER' ? '내포장' : '외포장'} 작업번호가 없습니다.`, 'warning')
        addLog('다른 라인을 선택하거나 작업번호 생성이 필요할 수 있습니다.', 'info')
      } else {
        addLog(`${baseLineName}의 ${uniqueWorks.length}개 ${workInfo.value.lineType === 'INNER' ? '내포장' : '외포장'} 작업을 불러왔습니다.`, 'success')
        
        // 상태별 요약 로그
        const statusCounts = uniqueWorks.reduce((acc, work) => {
          const status = getWorkStatusText(work.step_status)
          acc[status] = (acc[status] || 0) + 1
          return acc
        }, {})
        
        const statusSummary = Object.entries(statusCounts)
          .map(([status, count]) => `${status}: ${count}개`)
          .join(', ')
        
        addLog(`상태별 현황: ${statusSummary}`, 'info')
      }
      
    } else {
      throw new Error(response.data.message || '작업 목록 조회 실패')
    }
    
  } catch (error) {
    console.error('작업 목록 조회 실패:', error)
    addLog(`작업 목록 조회 실패: ${error.message}`, 'error')
    availableWorkOrders.value = []
    throw error
  }
}

// 자동 작업번호 선택
async function autoSelectFirstAvailableWork() {
  if (availableWorkOrders.value.length === 0) {
    console.log('자동 선택할 작업번호가 없음')
    return
  }
  
  // 우선순위: 진행중 > 일시정지 > 부분완료 > 준비
  const priorityWorks = [
    ...workingWorks.value,
    ...pausedWorks.value, 
    ...readyWorks.value
  ]
  
  if (priorityWorks.length > 0) {
    const firstWork = priorityWorks[0]
    console.log(`자동 선택: ${firstWork.work_no} (상태: ${getWorkStatusText(firstWork.step_status)})`)
    
    selectedWorkOrder.value = firstWork.work_no
    await onWorkOrderChange()
    
    addLog(`자동 선택: ${firstWork.work_no} - ${firstWork.product_name}`, 'success')
  }
}

// 재시도가 포함된 작업번호 선택
async function selectWorkOrderWithRetry(workNo, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`작업번호 ${workNo} 선택 시도 ${attempt}/${maxRetries}`)
      
      // 작업번호가 목록에 있는지 확인
      const foundWork = availableWorkOrders.value.find(work => work.work_no === workNo)
      
      if (foundWork) {
        selectedWorkOrder.value = workNo
        await onWorkOrderChange()
        console.log(`작업번호 ${workNo} 선택 성공`)
        addLog(`URL에서 작업번호 ${workNo}가 선택되었습니다.`, 'info')
        return
      } else {
        console.log(`시도 ${attempt}: 작업번호 ${workNo}를 목록에서 찾을 수 없음`)
        
        if (attempt < maxRetries) {
          // 작업 목록을 다시 로드해보기
          await loadAvailableWorkOrdersImproved()
        }
      }
    } catch (error) {
      console.error(`시도 ${attempt} 실패:`, error)
      if (attempt === maxRetries) {
        addLog(`작업번호 ${workNo} 선택에 실패했습니다. 수동으로 선택해주세요.`, 'warning')
      }
    }
  }
}

// 수정된 라인 초기화 함수
async function resetLineStatus() {
  if (!confirm('이 라인의 부분완료 작업들을 진행 상태로 초기화하시겠습니까?')) {
    return
  }
  
  try {
    loading.value = true
    loadingMessage.value = '라인 상태를 초기화하는 중...'
    
    const baseLineName = workInfo.value.lineName.replace(/\s*(내포장|외포장).*$/, '')
    
    const resetData = {
      base_line_name: baseLineName,
      line_type: workInfo.value.lineType,
      target_status: 'IN_PROGRESS',
      reset_progress: false,
      reset_by: currentWork.value.employee_id || 2
    }
    
    let serverSuccess = false
    try {
      await axios.post(`${PACKAGES_API_URL}/line/reset`, resetData)
      addLog('서버에서 라인 상태가 초기화되었습니다.', 'success')
      serverSuccess = true
    } catch (apiError) {
      console.warn('API 호출 실패, 로컬에서 초기화 처리:', apiError)
      addLog('서버 연결 실패, 로컬에서 초기화를 처리합니다.', 'warning')
    }
    
    // 로컬 데이터 초기화 (부분완료 → 진행 중)
    availableWorkOrders.value = availableWorkOrders.value.map(work => {
      if (work.step_status === 'PARTIALLY_COMPLETED') {
        return {
          ...work,
          step_status: 'IN_PROGRESS'
        }
      }
      return work
    })
    
    // 현재 작업이 부분완료 상태라면 진행 중으로 변경
    if (selectedWorkOrder.value && workStatus.value === 'PARTIALLY_COMPLETED') {
      workStatus.value = 'IN_PROGRESS'
      isWorking.value = false
      addLog('현재 작업이 진행 중 상태로 변경되었습니다.', 'info')
    }
    
    addLog(`${baseLineName} ${workInfo.value.lineType === 'INNER' ? '내포장' : '외포장'} 라인이 초기화되었습니다.`, 'success')
    addLog('부분완료 작업들이 진행 중 상태로 변경되었습니다.', 'info')
    
    // 서버 초기화가 성공했을 때만 새로고침
    if (serverSuccess) {
      setTimeout(async () => {
        await loadAvailableWorkOrdersWithRetry()
        addLog('서버 데이터로 동기화 완료', 'success')
      }, 1000)
    }
    
  } catch (error) {
    console.error('라인 초기화 실패:', error)
    addLog(`라인 초기화 실패: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// 강화된 작업 목록 새로고침 (강력 새로고침 기능)
async function refreshWorkOrders() {
  try {
    addLog('강력 새로고침을 시작합니다...', 'info')
    loading.value = true
    loadingMessage.value = '강력 새로고침 중...'
    
    // 현재 선택된 작업번호 기억
    const currentSelectedWork = selectedWorkOrder.value
    
    // 1단계: 모든 상태 초기화
    availableWorkOrders.value = []
    workLogs.value = []
    
    // 2단계: 캐시 무력화를 위한 강제 딜레이
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 3단계: 최신 데이터 강제 로드
    await loadAvailableWorkOrdersWithRetry()
    
    // 4단계: 외포장인 경우 워크플로우 데이터 재로드
    if (workInfo.value.lineType === 'OUTER') {
      await loadLinkedWorkflowData()
    }
    
    // 5단계: 이전 선택 작업 복원 또는 자동 선택
    if (currentSelectedWork) {
      const stillExists = availableWorkOrders.value.find(work => work.work_no === currentSelectedWork)
      if (stillExists) {
        selectedWorkOrder.value = currentSelectedWork
        await onWorkOrderChange()
        
        // 부분완료 작업인 경우 특별 처리
        if (stillExists.step_status === '부분완료' || stillExists.step_status === 'PARTIAL_COMPLETE') {
          addLog(`부분완료 작업(${currentSelectedWork})을 복원했습니다. 작업 시작 가능합니다.`, 'success')
          
          // 강제로 작업 상태 업데이트
          setTimeout(() => {
            updateCurrentWorkInfo()
            addLog('부분완료 작업이 준비되었습니다. 작업 시작 버튼을 누르세요.', 'success')
          }, 100)
        } else {
          addLog(`이전 선택 작업(${currentSelectedWork})을 복원했습니다.`, 'success')
        }
      } else {
        addLog(`이전 작업(${currentSelectedWork})을 찾을 수 없어 자동 선택합니다.`, 'warning')
        await autoSelectFirstAvailableWork()
      }
    } else {
      await autoSelectFirstAvailableWork()
    }
    
    addLog('강력 새로고침이 완료되었습니다.', 'success')
    
  } catch (error) {
    console.error('강력 새로고침 실패:', error)
    addLog(`강력 새로고침 실패: ${error.message}`, 'error')
    
    // 실패 시 페이지 전체 새로고침 옵션 제공
    if (confirm('새로고침에 실패했습니다. 페이지를 완전히 새로고침하시겠습니까?')) {
      window.location.reload()
    }
  } finally {
    loading.value = false
  }
}

// 라인별 워크플로우 연계 함수
async function loadLinkedWorkflowData() {
  try {
    console.log('라인별 워크플로우 데이터 조회 시작')
    console.log('현재 라인:', workInfo.value.lineName, workInfo.value.lineType)
    
    // 현재 라인명에서 기본 라인명 추출
    const baseLineName = workInfo.value.lineName.replace(/\s*(내포장|외포장).*$/, '')
    console.log('기본 라인명:', baseLineName)
    
    if (workInfo.value.lineType === 'OUTER') {
      // 외포장인 경우: 같은 라인의 내포장 완료 정보 조회
      let innerData = null
      
      try {
        console.log('API로 내포장 완료 정보 조회 시도...')
        const response = await axios.get(`${PACKAGES_API_URL}/workflow/inner-completed`, {
          params: {
            base_line_name: baseLineName,
            line_type: 'INNER'
          }
        })
        
        if (response.data.success && response.data.data) {
          innerData = response.data.data
          console.log('API에서 내포장 완료 정보 조회 성공:', innerData)
        }
      } catch (apiError) {
        console.log('API 호출 실패:', apiError.message)
      }
      
      // API 실패 시 대안 방법들
      if (!innerData) {
        console.log('대안 데이터 소스 확인 중...')
        
        // 1단계: window 객체에서 워크플로우 데이터 확인
        const workflowKey = `workflow_${baseLineName.replace(/\s+/g, '_')}`
        let localWorkflowData = null
        
        if (window.workflowData && window.workflowData[workflowKey]) {
          localWorkflowData = window.workflowData[workflowKey]
          console.log('메모리에서 워크플로우 데이터 발견:', localWorkflowData)
        }
        
        if (localWorkflowData) {
          innerData = {
            work_no: localWorkflowData.inner_work_no,
            output_qty: localWorkflowData.inner_output_qty,
            end_time: localWorkflowData.inner_completion_time,
            completion_time: localWorkflowData.inner_completion_time,
            line_name: `${baseLineName} 내포장`,
            step_status: '완료',
            completion_type: localWorkflowData.completion_type || 'complete'
          }
          console.log('메모리 워크플로우 데이터 사용:', innerData)
        }
        // 2단계: URL 파라미터에서 직접 가져오기
        else if (route.query.inner_output_qty && parseInt(route.query.inner_output_qty) > 0) {
          innerData = {
            work_no: route.query.inner_work_no || '',
            output_qty: parseInt(route.query.inner_output_qty),
            end_time: route.query.inner_completion_time || new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            completion_time: route.query.inner_completion_time || new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            line_name: `${baseLineName} 내포장`,
            step_status: '완료'
          }
          console.log('URL 파라미터에서 워크플로우 데이터 사용:', innerData)
        }
      }
      
      // 워크플로우 정보 업데이트 및 UI 반영
      if (innerData && innerData.output_qty > 0) {
        // 워크플로우 정보 업데이트
        workflowInfo.value.innerCompleted = true
        workflowInfo.value.innerWorkNo = innerData.work_no
        workflowInfo.value.innerOutputQty = innerData.output_qty
        workflowInfo.value.innerCompletionTime = new Date(innerData.end_time || innerData.completion_time)
        workflowInfo.value.step = 'OUTER' // 외포장 단계 명시
        
        console.log('연결된 내포장 완료 정보:', innerData)
        addLog(`${baseLineName} 내포장 완료 정보를 발견했습니다.`, 'success')
        addLog(`완료 작업: ${innerData.work_no}, 완료수량: ${formatNumber(innerData.output_qty)}개`, 'info')
        
        // 투입수량 자동 설정 (즉시 반영)
        console.log(`투입수량 자동 설정: ${innerData.output_qty}개`)
        inputQuantity.value = innerData.output_qty
        currentWork.value.current_quantity = innerData.output_qty
        updateCurrentWorkInfo()
        addLog(`외포장 투입수량을 ${formatNumber(innerData.output_qty)}개로 자동 설정했습니다.`, 'success')
        
        return true
      } else {
        console.log('연결된 내포장 완료 정보 없음')
        addLog(`${baseLineName}의 내포장 완료 정보를 찾을 수 없습니다.`, 'warning')
        addLog('수동으로 투입수량을 입력해주세요.', 'info')
        return false
      }
    }
    
    return false
  } catch (error) {
    console.error('워크플로우 데이터 조회 실패:', error)
    addLog('라인별 워크플로우 연계에 실패했습니다. 수동으로 설정해주세요.', 'warning')
    return false
  }
}

// 작업번호 변경 시
async function onWorkOrderChange() {
  if (!selectedWorkOrder.value) {
    resetCurrentWork()
    return
  }
  
  try {
    loading.value = true
    loadingMessage.value = '작업 상세 정보를 불러오는 중...'
    
    console.log(`작업번호 ${selectedWorkOrder.value} 상세 조회 시작`)
    
    // 1단계: 로컬 작업 목록에서 먼저 확인
    const localWork = availableWorkOrders.value.find(work => 
      work.work_no === selectedWorkOrder.value
    )
    
    if (localWork) {
      console.log(`로컬 목록에서 발견: ${selectedWorkOrder.value}`, localWork)
      
      // 로컬 데이터로 기본 정보 설정
      currentWork.value = {
        work_no: localWork.work_no || selectedWorkOrder.value,
        product_name: localWork.product_name || localWork.step_name || '베아르정',
        package_type: workInfo.value.lineType === 'INNER' ? '내포장' : '외포장',
        target_quantity: localWork.order_qty || localWork.target_qty || 1000,
        current_quantity: localWork.input_qty || 0,
        remaining_quantity: 0,
        output_qty: localWork.output_qty || 0,
        defect_qty: localWork.defect_qty || 0,
        progressRate: parseFloat(localWork.progress_rate) || 0,
        passRate: 0,
        defectRate: 0,
        achievementRate: 0,
        employee_id: localWork.employee_id || 2,
        worker_name: localWork.employee_name || localWork.emp_name || '김포장',
        department: localWork.department || '포장부',
        position: localWork.position || '작업자',
        start_time: localWork.start_time,
        end_time: null,
        work_duration: localWork.work_duration || 0,
        estimated_duration: 0,
        step_status: localWork.step_status || 'READY'
      }
      
      // API 최신 정보 업데이트 시도
      try {
        const response = await axios.get(`${PACKAGES_API_URL}/${selectedWorkOrder.value}`)
        
        if (response.data.success && response.data.data) {
          const workData = response.data.data
          console.log(`API에서 최신 정보 업데이트: ${selectedWorkOrder.value}`)
          
          currentWork.value = {
            ...currentWork.value,
            target_quantity: workData.order_qty || workData.target_qty || currentWork.value.target_quantity,
            current_quantity: workData.input_qty || currentWork.value.current_quantity,
            output_qty: workData.output_qty || currentWork.value.output_qty,
            defect_qty: workData.defect_qty || currentWork.value.defect_qty,
            progressRate: parseFloat(workData.progress_rate) || currentWork.value.progressRate,
            step_status: workData.step_status || currentWork.value.step_status,
            start_time: workData.start_time || currentWork.value.start_time,
            work_duration: workData.work_duration || currentWork.value.work_duration
          }
        }
      } catch (apiError) {
        console.warn(`API 상세 조회 실패, 로컬 데이터 사용: ${apiError.message}`)
        addLog(`API 연결 실패, 로컬 데이터로 작업합니다.`, 'warning')
      }
      
    } else {
      console.log(`로컬 목록에서 찾을 수 없음: ${selectedWorkOrder.value}`)
      
      // API 직접 호출
      const response = await axios.get(`${PACKAGES_API_URL}/${selectedWorkOrder.value}`)
      
      if (!response.data.success) {
        throw new Error(response.data.message || '작업 정보 조회 실패')
      }
      
      const workData = response.data.data
      console.log(`API 직접 조회 성공: ${selectedWorkOrder.value}`)
      
      currentWork.value = {
        work_no: workData.work_no || selectedWorkOrder.value,
        product_name: workData.product_name || workData.step_name || '베아르정',
        package_type: workInfo.value.lineType === 'INNER' ? '내포장' : '외포장',
        target_quantity: workData.order_qty || workData.target_qty || 1000,
        current_quantity: workData.input_qty || 0,
        remaining_quantity: 0,
        output_qty: workData.output_qty || 0,
        defect_qty: workData.defect_qty || 0,
        progressRate: parseFloat(workData.progress_rate) || 0,
        passRate: 0,
        defectRate: 0,
        achievementRate: 0,
        employee_id: workData.employee_id || 2,
        worker_name: workData.emp_name || workData.employee_name || '김포장',
        department: workData.department || '포장부',
        position: workData.position || '작업자',
        start_time: workData.start_time,
        end_time: null,
        work_duration: workData.work_duration || 0,
        estimated_duration: 0,
        step_status: workData.step_status || 'READY'
      }
    }
    
    // 외포장 워크플로우 연계 처리
    if (workInfo.value.lineType === 'OUTER' && workflowInfo.value.innerCompleted && workflowInfo.value.innerOutputQty > 0) {
      console.log(`외포장 워크플로우 연계 적용: ${workflowInfo.value.innerOutputQty}개`)
      currentWork.value.current_quantity = workflowInfo.value.innerOutputQty
      inputQuantity.value = workflowInfo.value.innerOutputQty
      addLog(`워크플로우 연계: 내포장 완료수량 ${formatNumber(workflowInfo.value.innerOutputQty)}개를 기투입량으로 설정했습니다.`, 'success')
    }
    
    // 핵심 개선: 작업 상태별 진행률 초기화
    const initResult = initializeWorkProgress()
    
    // 부분완료된 작업 특별 처리
    if (currentWork.value.step_status === '부분완료' || 
        currentWork.value.step_status === 'PARTIAL_COMPLETE') {
      
      const remainingQty = currentWork.value.target_quantity - currentWork.value.output_qty
      const previousOutput = currentWork.value.output_qty || 0
      
      addLog(`부분완료된 작업을 발견했습니다.`, 'warning')
      addLog(`이전 생산량: ${formatNumber(previousOutput)}개`, 'info')
      addLog(`남은 수량: ${formatNumber(remainingQty)}개`, 'warning')
      
      if (remainingQty > 0) {
        // 핵심 수정: 부분완료 작업 복원
        inputQuantity.value = remainingQty
        
        // 중요: 부분완료 상태 복원을 위한 특별 처리
        updateCurrentWorkInfo()
        
        // 이전 생산량을 시뮬레이션에 미리 설정
        productionSettings.value.currentProgress = previousOutput
        productionSettings.value.targetQty = currentWork.value.target_quantity
        
        addLog(`투입수량을 남은 ${formatNumber(remainingQty)}개로 자동 설정했습니다.`, 'success')
        addLog(`이전 생산량 ${formatNumber(previousOutput)}개에서 이어서 작업합니다.`, 'success')
        addLog(`최종 목표: ${formatNumber(currentWork.value.target_quantity)}개`, 'info')
        
        // 핵심: 부분완료 작업은 즉시 시작 가능하도록 표시
        addLog(`부분완료 작업이 준비되었습니다. "작업 시작" 버튼을 눌러주세요.`, 'success')
      }
    } else {
      // 일반 작업의 경우 기본 투입수량 설정
      if (!inputQuantity.value || inputQuantity.value === 0) {
        inputQuantity.value = Math.min(500, currentWork.value.target_quantity || 500)
      }
    }
    
    // updateCurrentWorkInfo를 다시 호출해서 최종 상태 적용
    updateCurrentWorkInfo()
    
    // 진행 중인 작업이거나 일시정지된 작업인 경우
    if (currentWork.value.step_status === '진행중' || currentWork.value.step_status === 'IN_PROGRESS' || 
        currentWork.value.step_status === 'WORKING' || currentWork.value.step_status === '일시정지' || 
        currentWork.value.step_status === 'PAUSED') {
      
      if (!isPartialWork.value) {
        productionSettings.value.targetQty = currentWork.value.current_quantity || inputQuantity.value
        productionSettings.value.currentProgress = currentWork.value.output_qty || 0
      }
      
      addLog(`진행 중인 작업을 발견했습니다. 현재 생산량: ${currentWork.value.output_qty || 0}개`, 'info')
    }
    
    addLog(`작업번호 ${selectedWorkOrder.value} 정보를 불러왔습니다.`, 'success')
    console.log(`작업번호 ${selectedWorkOrder.value} 로드 완료:`, currentWork.value)
    console.log(`canStartWork 상태: ${canStartWork.value}`)
    
  } catch (error) {
    console.error(`작업번호 ${selectedWorkOrder.value} 조회 실패:`, error)
    
    if (error.response?.status === 404) {
      showErrorMessage(`작업번호 ${selectedWorkOrder.value}을(를) 찾을 수 없습니다.`)
      addLog(`작업번호 ${selectedWorkOrder.value}가 데이터베이스에 없을 수 있습니다.`, 'error')
    } else {
      showErrorMessage(`작업번호 ${selectedWorkOrder.value} 정보를 불러올 수 없습니다: ${error.message}`)
    }
    
    resetCurrentWork()
  } finally {
    loading.value = false
  }
}

// 투입수량 변경 핸들러
function onInputQuantityChange() {
  if (selectedWorkOrder.value && inputQuantity.value > 0) {
    // 외포장이면서 워크플로우 연계가 활성화된 경우 변경 제한
    if (workInfo.value.lineType === 'OUTER' && workflowInfo.value.innerCompleted && workflowInfo.value.innerOutputQty > 0) {
      console.log('외포장 워크플로우 연계 중 - 투입수량 변경 제한')
      addLog(`워크플로우 연계 중입니다. 투입수량은 내포장 완료수량으로 고정됩니다.`, 'warning')
      return
    }
    
    // 일반적인 경우 기투입량 업데이트
    currentWork.value.current_quantity = inputQuantity.value
    updateCurrentWorkInfo()
    console.log(`투입수량 수동 변경: ${inputQuantity.value}개 → 기투입량/미투입량 업데이트`)
  }
}

// 빠른 작업 선택
function selectQuickWork(work) {
  selectedWorkOrder.value = work.work_no
  onWorkOrderChange()
  addLog(`빠른 선택: ${work.work_no} - ${work.product_name || work.step_name}`, 'info')
}

// 개선된 작업 시작
async function startWork() {
  if (!isWorking.value) {
    try {
      loading.value = true
      loadingMessage.value = '작업을 시작하는 중...'
      
      // 부분완료 작업인 경우 특별 처리
      let actualInputQty = inputQuantity.value
      
      if (isPartialWork.value) {
        // 부분완료 작업: 남은 수량을 투입수량으로 사용
        const remainingQty = currentWork.value.target_quantity - currentWork.value.output_qty
        actualInputQty = remainingQty
        inputQuantity.value = actualInputQty
        addLog(`부분완료 작업: 남은 ${formatNumber(actualInputQty)}개로 작업 재시작`, 'info')
      } else if (workInfo.value.lineType === 'OUTER' && workflowInfo.value.innerCompleted && workflowInfo.value.innerOutputQty > 0) {
        // 외포장 워크플로우 연계
        actualInputQty = workflowInfo.value.innerOutputQty
        inputQuantity.value = actualInputQty
        addLog(`워크플로우 연계: 내포장 완료수량 ${formatNumber(actualInputQty)}개로 외포장 시작`, 'info')
      }
      
      const updateData = {
        step_status: 'WORKING',
        start_time: new Date().toISOString(),
        input_qty: actualInputQty,
        employee_id: 2,
        output_qty: currentWork.value.output_qty || 0,
        defect_qty: currentWork.value.defect_qty || 0
      }
      
      const response = await axios.put(`${PACKAGES_API_URL}/${selectedWorkOrder.value}`, updateData)
      
      if (response.data && response.data.success) {
        addLog('작업을 시작했습니다.', 'success')
      } else {
        throw new Error(response.data?.message || '작업 시작 실패')
      }
      
      // 로컬 상태 업데이트
      const workInitType = initializeWorkProgress()
      
      if (workInitType === 'new') {
        // 새 작업: 0부터 시작
        productionSettings.value.targetQty = actualInputQty
        productionSettings.value.currentProgress = 0
        addLog(`새 작업 시작 - 진행률 0%부터 시작합니다.`, 'success')
      } else if (workInitType === 'partial') {
        // 부분완료 작업: 이전 생산량에서 이어서
        productionSettings.value.targetQty = currentWork.value.target_quantity
        addLog(`부분완료 작업 재시작 - 이전 생산량에서 이어서 진행합니다.`, 'info')
      } else {
        // 기타 작업: 기존 로직
        productionSettings.value.targetQty = actualInputQty
        productionSettings.value.currentProgress = currentWork.value.output_qty || 0
      }
      
      workStatus.value = 'WORKING'
      isWorking.value = true
      workStartTime.value = new Date()
      currentWork.value.start_time = workStartTime.value
      
      updateCurrentWorkInfo()
      startWorkTimer()
      startProductionSimulation()
      
      addLog(`작업을 시작했습니다. (목표수량: ${formatNumber(currentWork.value.target_quantity)}개)`, 'success')
      addLog(`생산 속도: ${productionSettings.value.productionSpeed}개/초`, 'info')
      
    } catch (error) {
      console.error('작업 시작 실패:', error)
      
      let errorMsg = '작업 시작에 실패했습니다.'
      if (error.code === 'ERR_NETWORK') {
        errorMsg = 'API 서버 연결에 실패했습니다.'
      } else if (error.response?.status === 404) {
        errorMsg = '해당 작업번호를 찾을 수 없습니다.'
      } else {
        errorMsg = `작업 시작 실패: ${error.message}`
      }
      
      showErrorMessage(errorMsg)
    } finally {
      loading.value = false
    }
  } else {
    pauseProduction()
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
    
    // 전체 누적 생산량 계산
    const totalProduced = productionSettings.value.currentProgress
    const defectQty = Math.floor(totalProduced * productionSettings.value.defectRate)
    const passQty = totalProduced - defectQty
    
    // 전체 지시량 기준으로 진행률 계산
    const totalTargetQty = currentWork.value.target_quantity || productionSettings.value.targetQty
    currentWork.value.output_qty = passQty
    currentWork.value.defect_qty = defectQty
    currentWork.value.progressRate = Math.min(100, Math.round((passQty / totalTargetQty) * 100))
    currentWork.value.passRate = totalProduced > 0 ? Math.round((passQty / totalProduced) * 100) : 0
    currentWork.value.defectRate = totalProduced > 0 ? Math.round((defectQty / totalProduced) * 100) : 0
    
    updateCurrentWorkInfo()
    
    // 진행 상황 로그
    if (totalProduced > 0 && totalProduced % (productionSettings.value.productionSpeed * 5) === 0) {
      addLog(`생산 진행: ${passQty}개 완료 (불량: ${defectQty}개, 진행률: ${currentWork.value.progressRate}%)`, 'info')
    }
    
    // 목표 수량 도달 체크
    if (totalProduced >= productionSettings.value.targetQty) {
      // 전체 지시량 달성 여부 확인
      if (passQty >= totalTargetQty) {
        addLog('전체 지시량에 도달했습니다!', 'success')
      } else {
        addLog('현재 배치가 완료되었습니다!', 'success')
      }
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

// 부분 완료 처리
async function confirmPartialComplete() {
  try {
    loading.value = true
    loadingMessage.value = '부분 완료 처리 중...'
    
    const remainingQty = getRemainingQuantity()
    const completionRate = getCompletionRate()
    
    // 핵심 수정: 지시수량 미달성 시 작업번호 유지
    const completeData = {
      input_qty: currentWork.value.current_quantity,
      output_qty: currentWork.value.output_qty,
      defect_qty: currentWork.value.defect_qty,
      employee_id: currentWork.value.employee_id,
      step_status: remainingQty > 0 ? '부분완료' : '완료',
      line_type: workInfo.value.lineType === 'INNER' ? '내포장' : '외포장',
      work_step: workInfo.value.lineType === 'INNER' ? '내포장' : '외포장',
      end_time: new Date().toISOString(),
      remaining_qty: remainingQty,
      completion_rate: completionRate,
      needs_continuation: remainingQty > 0
    }
    
    try {
      await axios.put(`${PACKAGES_API_URL}/${currentWork.value.work_no}/partial-complete`, completeData)
      addLog(`부분 완료 처리되었습니다. (달성률: ${completionRate}%)`, 'warning')
    } catch (apiError) {
      console.error('API 호출 실패:', apiError)
      addLog('서버 연결 실패했지만 로컬에서 부분 완료 처리합니다.', 'warning')
    }
    
    // 핵심 수정: 지시수량 미달성 시 워크플로우 분기
    if (remainingQty > 0) {
      // 지시수량 미달성 → 같은 작업번호에서 계속 작업
      addLog(`지시수량 미달성: ${formatNumber(remainingQty)}개 남음`, 'warning')
      addLog(`작업번호 ${currentWork.value.work_no}는 부분완료 상태로 저장됩니다.`, 'info')
      addLog(`나중에 같은 작업번호를 선택하여 남은 ${formatNumber(remainingQty)}개를 계속 작업할 수 있습니다.`, 'success')
      
      // 부분완료 시에는 다음 단계로 넘어가지 않음
      isWorking.value = false
      workStatus.value = 'PARTIAL_COMPLETE'
      
      // 타이머 정리
      if (workTimer) {
        clearInterval(workTimer)
        workTimer = null
      }
      if (productionTimer) {
        clearInterval(productionTimer)
        productionTimer = null
      }
      
      closeCompleteModal()
      
      // 3초 후 안내 메시지만 표시
      setTimeout(() => {
        addLog('같은 작업번호를 다시 선택하여 남은 수량을 계속 작업하거나, 다른 작업을 시작할 수 있습니다.', 'info')
      }, 3000)
      
    } else {
      // 지시수량 달성 → 정상적으로 다음 단계 진행
      if (workInfo.value.lineType === 'INNER') {
        await processInnerToOuterWorkflow()
        addLog('내포장 작업이 완전히 완료되었습니다. 외포장 진행합니다...', 'success')
        
        // 외포장 작업들의 상태를 진행중으로 업데이트
        try {
          const baseLineName = workInfo.value.lineName.replace(/\s*(내포장|외포장).*$/, '')
          await axios.post(`${PACKAGES_API_URL}/workflow/activate-outer-works`, {
            base_line_name: baseLineName,
            inner_output_qty: currentWork.value.output_qty,
            target_status: 'IN_PROGRESS'
          })
          addLog('관련 외포장 작업들이 진행 가능 상태로 활성화되었습니다.', 'success')
        } catch (activationError) {
          console.warn('외포장 활성화 실패:', activationError)
        }
        
        startAutoTransitionToLineSelection()
      } else {
        addLog('외포장 작업이 완료되었습니다.', 'success')
        startAutoTransitionToLineSelection()
      }
    }
    
  } catch (error) {
    console.error('부분 완료 처리 실패:', error)
    addLog(`부분 완료 처리 중 오류 발생: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// 나중에 계속하기
async function confirmContinueLater() {
  try {
    loading.value = true
    loadingMessage.value = '작업 일시정지 처리 중...'
    
    const pauseData = {
      input_qty: currentWork.value.current_quantity,
      output_qty: currentWork.value.output_qty,
      defect_qty: currentWork.value.defect_qty,
      employee_id: currentWork.value.employee_id,
      step_status: '일시정지',
      line_type: workInfo.value.lineType === 'INNER' ? '내포장' : '외포장',
      work_step: workInfo.value.lineType === 'INNER' ? '내포장' : '외포장',
      pause_time: new Date().toISOString(),
      remaining_qty: getRemainingQuantity(),
      completion_rate: getCompletionRate(),
      can_resume: true
    }
    
    try {
      await axios.put(`${PACKAGES_API_URL}/${currentWork.value.work_no}/pause`, pauseData)
      addLog('일시정지되었습니다. 나중에 계속할 수 있습니다.', 'info')
    } catch (apiError) {
      console.error('API 호출 실패:', apiError)
      addLog('서버 연결 실패했지만 로컬에서 일시정지 처리합니다.', 'warning')
    }
    
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
    
    addLog(`작업번호 ${currentWork.value.work_no}가 일시정지되었습니다.`, 'info')
    addLog(`현재 진행률: ${getCompletionRate()}% (${formatNumber(currentWork.value.output_qty)}개 완료)`, 'info')
    addLog(`미완료 수량: ${formatNumber(getRemainingQuantity())}개`, 'warning')
    addLog('이 작업번호는 다음에 다시 선택하여 계속 진행할 수 있습니다.', 'success')
    
    // 3초 후 라인 선택으로 돌아가기
    setTimeout(() => {
      goBackToLineSelection()
    }, 3000)
    
  } catch (error) {
    console.error('일시정지 처리 실패:', error)
    addLog(`일시정지 처리 중 오류 발생: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

async function confirmCompleteWork() {
  try {
    loading.value = true
    loadingMessage.value = '작업을 완료하는 중...'
    
    const completeData = {
      input_qty: currentWork.value.current_quantity,
      output_qty: currentWork.value.output_qty,
      defect_qty: currentWork.value.defect_qty,
      employee_id: currentWork.value.employee_id,
      step_status: '완료',
      line_type: workInfo.value.lineType === 'INNER' ? '내포장' : '외포장',
      work_step: workInfo.value.lineType === 'INNER' ? '내포장' : '외포장',
      end_time: new Date().toISOString()
    }
    
    try {
      await axios.put(`${PACKAGES_API_URL}/${currentWork.value.work_no}/complete`, completeData)
      addLog('작업을 완료했습니다.', 'success')
    } catch (apiError) {
      console.error('API 호출 실패:', apiError)
      addLog('서버 연결 실패했지만 로컬에서 완료 처리합니다.', 'warning')
    }
    
    // 내포장 완료 시 외포장 연계 처리
    if (workInfo.value.lineType === 'INNER') {
      await processInnerToOuterWorkflow()
    }
    
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
    
    closeCompleteModal()
    
    addLog(`${workInfo.value.lineType === 'INNER' ? '내포장' : '외포장'} 작업이 완료되었습니다.`, 'success')
    
    // 워크플로우에 따른 분기 처리
    if (workInfo.value.lineType === 'INNER') {
      // 내포장 완료 → 외포장 라인 선택으로 이동
      addLog('내포장 작업이 완료되었습니다. 외포장 라인 선택으로 이동합니다...', 'success')
      startAutoTransitionToLineSelection()
      
    } else {
      // 외포장 완료 → 전체 완료, 라인 선택으로 이동
      addLog('모든 포장 작업이 완료되었습니다! 라인 선택으로 이동합니다.', 'success')
      startAutoTransitionToLineSelection()
    }
    
  } catch (error) {
    console.error('작업 완료 처리 실패:', error)
    addLog(`작업 완료 처리 중 오류 발생: ${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

// 내포장→외포장 워크플로우 연계 처리 (완전 완료 시에만)
async function processInnerToOuterWorkflow() {
  try {
    console.log('내포장 완료 - 외포장 연계 처리 시작')
    const baseLineName = workInfo.value.lineName.replace(/\s*(내포장|외포장).*$/, '')
    
    const linkageData = {
      base_line_name: baseLineName,
      inner_work_no: currentWork.value.work_no,
      inner_output_qty: currentWork.value.output_qty,
      inner_completion_time: new Date().toISOString(),
      completion_type: 'complete',
      completion_rate: 100,
      completed_by: currentWork.value.employee_id,
      // 외포장 작업 상태를 진행중으로 설정
      outer_status_update: 'IN_PROGRESS'
    }
    
    try {
      await axios.post(`${PACKAGES_API_URL}/workflow/update-outer-linkage`, linkageData)
      addLog(`${baseLineName} 외포장에 완료수량(${formatNumber(currentWork.value.output_qty)}개) 연계 완료`, 'success')
      
      // 외포장 작업들을 진행중 상태로 업데이트
      await axios.post(`${PACKAGES_API_URL}/workflow/activate-outer-works`, {
        base_line_name: baseLineName,
        inner_output_qty: currentWork.value.output_qty,
        target_status: 'IN_PROGRESS'
      })
      addLog(`${baseLineName} 외포장 작업들이 진행 가능 상태로 업데이트되었습니다.`, 'success')
      
    } catch (apiError) {
      console.log('API 호출 실패, 메모리 저장 사용')
      // API 실패 시 window 객체에 저장
      const workflowKey = `workflow_${baseLineName.replace(/\s+/g, '_')}`
      const workflowData = {
        ...linkageData,
        timestamp: Date.now()
      }
      
      try {
        if (!window.workflowData) window.workflowData = {}
        window.workflowData[workflowKey] = workflowData
        addLog(`${baseLineName} 외포장에 완료수량(${formatNumber(currentWork.value.output_qty)}개) 메모리 저장 완료`, 'success')
        console.log('완료 워크플로우 데이터 저장:', workflowKey, workflowData)
      } catch (storageError) {
        console.error('워크플로우 데이터 저장 실패:', storageError)
        addLog('워크플로우 데이터 저장에 실패했습니다.', 'error')
      }
    }
    
  } catch (linkageError) {
    console.error('외포장 연계 업데이트 실패:', linkageError)
    addLog('외포장 연계 업데이트에 실패했지만 작업은 완료되었습니다.', 'warning')
  }
}

// 자동 전환 함수
function startAutoTransitionToLineSelection() {
  console.log('자동 전환 시작')
  showAutoTransition.value = true
  transitionProgress.value = 0
  
  const duration = 3000 // 3초
  const interval = 50
  const increment = (100 / (duration / interval))
  
  const progressTimer = setInterval(() => {
    transitionProgress.value += increment
    
    if (transitionProgress.value >= 100) {
      clearInterval(progressTimer)
      showAutoTransition.value = false
      
      // 워크플로우별 쿼리 파라미터 구성
      let queryParams = {}
      
      if (workInfo.value.lineType === 'INNER') {
        // 내포장 완료 → 외포장 활성화
        queryParams = {
          inner_completed: 'true',
          prev_work: currentWork.value.work_no,
          inner_work_no: currentWork.value.work_no,
          inner_output_qty: currentWork.value.output_qty,
          inner_completion_time: new Date().toISOString(),
          auto_start_guide: 'true',
          message: `내포장 작업(${currentWork.value.work_no})이 완료되었습니다. 완료수량 ${formatNumber(currentWork.value.output_qty)}개를 외포장에 투입하세요.`,
          success_message: '내포장 작업이 성공적으로 완료되었습니다!'
        }
      } else {
        // 외포장 완료 → 전체 완료
        queryParams = {
          outer_completed: 'true',
          prev_work: currentWork.value.work_no,
          prev_inner_work: workflowInfo.value.innerWorkNo,
          message: `모든 포장 작업이 완료되었습니다! 내포장(${workflowInfo.value.innerWorkNo}) + 외포장(${currentWork.value.work_no})`,
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

// 현재 작업 정보 업데이트
function updateCurrentWorkInfo() {
  // 부분완료 작업 특별 처리
  if (currentWork.value.step_status === '부분완료' || 
      currentWork.value.step_status === 'PARTIAL_COMPLETE') {
    
    console.log('부분완료 작업 감지 - 특별 로직 적용')
    
    // 부분완료 시: 투입은 완료됨, 미투입량 = 0
    currentWork.value.current_quantity = currentWork.value.target_quantity
    currentWork.value.remaining_quantity = 0
    
    // 달성률 계산 (완성된 제품 기준)
    if (currentWork.value.target_quantity > 0) {
      currentWork.value.achievementRate = Math.round(
        (currentWork.value.output_qty / currentWork.value.target_quantity) * 100
      )
    }
    
    console.log(`부분완료 작업 상태:`)
    console.log(`- 지시량: ${currentWork.value.target_quantity}개`)
    console.log(`- 기투입량: ${currentWork.value.current_quantity}개 (모두 투입됨)`)
    console.log(`- 미투입량: ${currentWork.value.remaining_quantity}개 (투입 완료)`)
    console.log(`- 완성수량: ${currentWork.value.output_qty}개`)
    console.log(`- 불량수량: ${currentWork.value.defect_qty}개`)
    console.log(`- 달성률: ${currentWork.value.achievementRate}%`)
    
    return
  }
  
  // 일반 작업 로직
  if (currentWork.value.target_quantity > 0) {
    // 외포장 워크플로우 연계 처리
    if (workInfo.value.lineType === 'OUTER' && workflowInfo.value.innerCompleted && workflowInfo.value.innerOutputQty > 0) {
      // 기투입량은 내포장 완료수량으로 설정
      currentWork.value.current_quantity = workflowInfo.value.innerOutputQty
      
      // 미투입량 = 외포장 지시량 - 내포장 완료수량
      currentWork.value.remaining_quantity = Math.max(0, 
        currentWork.value.target_quantity - workflowInfo.value.innerOutputQty
      )
      
      console.log(`외포장 워크플로우 연계:`)
      console.log(`- 외포장 지시량: ${currentWork.value.target_quantity}개`)
      console.log(`- 내포장 완료수량 (=기투입량): ${workflowInfo.value.innerOutputQty}개`)
      console.log(`- 미투입량: ${currentWork.value.remaining_quantity}개`)
      
    } else {
      // 일반적인 경우: 미투입량 = 지시량 - 기투입량
      currentWork.value.remaining_quantity = Math.max(0, 
        currentWork.value.target_quantity - currentWork.value.current_quantity
      )
    }
    
    // 달성률 계산 (실제 완성된 제품 기준)
    currentWork.value.achievementRate = Math.round(
      (currentWork.value.output_qty / currentWork.value.target_quantity) * 100
    )
  } else {
    currentWork.value.remaining_quantity = 0
    currentWork.value.achievementRate = 0
  }
  
  // 예상 종료 시간 계산
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
    work_no: '',
    product_name: '',
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
    step_status: 'READY'
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
    await loadAvailableWorkOrdersWithRetry()
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
  
  // 최대 50개까지만 유지
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
  
  // 현재 작업 상태 유지하면서 돌아가기
  const queryParams = {
    from_work: 'true',
    maintain_type: workInfo.value.lineType,
    current_work: currentWork.value.work_no
  }
  
  // 워크플로우 정보도 전달
  if (workflowInfo.value.step === 'OUTER') {
    queryParams.inner_work_no = workflowInfo.value.innerWorkNo
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

// 확인 텍스트 함수
function getConfirmationText() {
  if (isPartialCompletion.value) {
    const remainingQty = getRemainingQuantity()
    if (remainingQty > 0) {
      return `지시량 ${formatNumber(currentWork.value.target_quantity)}개 중 ${formatNumber(currentWork.value.output_qty)}개만 완료되었습니다. 남은 ${formatNumber(remainingQty)}개는 어떻게 처리하시겠습니까?`
    }
  }
  
  if (workInfo.value.lineType === 'INNER') {
    return '내포장 작업을 완료하고 외포장 라인 선택으로 이동하시겠습니까?'
  } else {
    return '외포장 작업을 완료하시겠습니까? 모든 포장 단계가 완료됩니다.'
  }
}

function getCompleteButtonText() {
  if (workInfo.value.lineType === 'INNER') {
    return '내포장 완료 → 외포장 선택'
  } else {
    return '외포장 완료 → 전체 완료'
  }
}

// 수정된 부분 완료 버튼 텍스트
function getPartialCompleteButtonText() {
  const remainingQty = getRemainingQuantity()
  
  if (remainingQty > 0) {
    return `부분완료로 저장 (남은: ${formatNumber(remainingQty)}개)`
  } else if (workInfo.value.lineType === 'INNER') {
    return `내포장 완료 → 외포장 진행`
  } else {
    return `외포장 완료`
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
  // 부분완료 작업인 경우 특별 텍스트
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
/* 워크플로우 연계 관련 새 스타일 */
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
}

/* 부분완료 상태 스타일 */
.work-status-badge.partial_complete {
  background: #fef3c7;
  color: #a16207;
}

.work-status.partial {
  background: #fef3c7;
  color: #a16207;
}

.preview-item .value.partial {
  color: #d97706;
}

/* 기존 스타일들... */
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
.target-info {
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

.no-work-message {
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
.quick-select-panel,
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