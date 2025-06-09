<template>
  <div class="line-selection-container">
    <div class="header-section">
      <h1 class="page-title">포장 라인 선택</h1>
      <p class="page-description">사용 가능한 포장 라인을 선택하여 작업을 시작하세요</p>
    </div>

    <!-- 필터 및 검색 -->
    <VaCard class="filter-section mb-6">
      <VaCardContent>
        <VaRow :gutter="20" align="center">
          <VaColumn :xs="12" :md="3">
            <VaSelect
              v-model="lineTypeFilter"
              :options="lineTypeOptions"
              label="라인 타입"
              text-by="label"
              value-by="value"
            />
          </VaColumn>
          <VaColumn :xs="12" :md="3">
            <VaSelect
              v-model="lineStatusFilter"
              :options="lineStatusOptions"
              label="라인 상태"
              text-by="label"
              value-by="value"
            />
          </VaColumn>
          <VaColumn :xs="12" :md="4">
            <VaInput
              v-model="searchText"
              label="검색"
              placeholder="라인명으로 검색"
              clearable
            >
              <template #prependInner>
                <VaIcon name="search" />
              </template>
            </VaInput>
          </VaColumn>
          <VaColumn :xs="12" :md="2">
            <VaButton
              @click="clearAllFilters"
              preset="secondary"
              class="w-full"
            >
              필터 초기화
            </VaButton>
          </VaColumn>
        </VaRow>
      </VaCardContent>
    </VaCard>

    <!-- 선택된 라인 정보 -->
    <VaCard v-if="selectedLine" class="selected-line-card mb-6">
      <VaCardContent>
        <div class="selected-line-header">
          <VaIcon name="check_circle" color="success" />
          <h3>선택된 라인: {{ selectedLine.line_name }}</h3>
          <VaButton @click="clearSelection" preset="secondary" size="small">
            선택 해제
          </VaButton>
        </div>
        <div class="selected-line-details">
          <span>{{ getLineTypeText(selectedLine.line_type) }}</span>
          <VaChip :color="getStatusColor(selectedLine.line_status)" size="small">
            {{ getStatusText(selectedLine.line_status) }}
          </VaChip>
        </div>
      </VaCardContent>
    </VaCard>

    <!-- 라인 목록 -->
    <div v-if="filteredLines.length" class="lines-container">
      <div 
        v-for="line in filteredLines" 
        :key="line.line_id"
        class="line-card-wrapper"
        :class="{ 
          'selected': selectedLine?.line_id === line.line_id,
          'available': line.line_status === 'AVAILABLE',
          'working': line.line_status === 'WORKING',
          'maintenance': line.line_status === 'MAINTENANCE',
          'stopped': line.line_status === 'STOPPED'
        }"
        @click="selectLine(line)"
      >
        <VaCard class="line-card h-full">
          <VaCardContent>
            <div class="line-header">
              <div class="line-info">
                <h3 class="line-name">{{ line.line_name }}</h3>
                <VaChip 
                  :color="getStatusColor(line.line_status)" 
                  size="small"
                  class="status-chip"
                >
                  <VaIcon :name="getStatusIcon(line.line_status)" class="mr-1" />
                  {{ getStatusText(line.line_status) }}
                </VaChip>
              </div>
              <VaIcon 
                :name="getLineTypeIcon(line.line_type)"
                :color="getLineTypeColor(line.line_type)"
                size="24px"
              />
            </div>

            <div class="line-details">
              <div class="detail-item">
                <span class="label">타입:</span>
                <span class="value">{{ getLineTypeText(line.line_type) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">라인 ID:</span>
                <span class="value">{{ line.line_id }}</span>
              </div>
              <div v-if="line.work_no" class="detail-item">
                <span class="label">작업번호:</span>
                <span class="value">{{ line.work_no }}</span>
              </div>
            </div>

            <div class="line-actions">
              <VaButton
                v-if="line.line_status === 'AVAILABLE'"
                @click.stop="startWork(line)"
                color="primary"
                class="w-full"
              >
                <VaIcon name="play_arrow" class="mr-1" />
                작업 시작
              </VaButton>
              <VaButton
                v-else-if="line.line_status === 'WORKING'"
                disabled
                color="secondary"
                class="w-full"
              >
                <VaIcon name="work" class="mr-1" />
                작업 중
              </VaButton>
              <VaButton
                v-else
                disabled
                color="danger"
                class="w-full"
              >
                <VaIcon name="build" class="mr-1" />
                사용 불가
              </VaButton>
            </div>

            <!-- 선택 표시 -->
            <div v-if="selectedLine?.line_id === line.line_id" class="selected-indicator">
              <VaIcon name="check_circle" color="success" />
              <span>✓ 선택됨</span>
            </div>
          </VaCardContent>
        </VaCard>
      </div>
    </div>

    <!-- 검색 결과 없음 -->
    <VaCard v-if="filteredLines.length === 0" class="empty-state">
      <VaCardContent class="text-center">
        <VaIcon name="search_off" size="48px" color="secondary" />
        <h3 class="mt-4">조건에 맞는 라인이 없습니다</h3>
        <p class="text-secondary mb-4">필터 조건을 변경해 주세요</p>
        <VaButton @click="clearAllFilters" color="primary">
          필터 초기화
        </VaButton>
      </VaCardContent>
    </VaCard>

    <!-- 작업 시작 확인 모달 -->
    <VaModal 
      v-model="showConfirmModal" 
      title="작업 시작 확인"
      :hide-default-actions="true"
    >
      <div v-if="selectedLineForWork" class="confirm-content">
        <p class="confirm-text">
          <strong>{{ selectedLineForWork.line_name }}</strong>에서 작업을 시작하시겠습니까?
        </p>
        <p class="confirm-subtext">{{ getLineTypeText(selectedLineForWork.line_type) }}</p>
      </div>
      
      <template #footer>
        <div class="modal-actions">
          <VaButton 
            @click="showConfirmModal = false"
            preset="secondary"
            class="modal-btn"
          >
            취소
          </VaButton>
          <VaButton 
            @click="confirmStartWork"
            color="primary"
            class="modal-btn"
          >
            작업 시작
          </VaButton>
        </div>
      </template>
    </VaModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

interface PackageLine {
  line_id: string
  line_name: string
  line_type: string
  line_status: string
  work_no?: string
}

// 반응형 데이터
const lineTypeFilter = ref('')
const lineStatusFilter = ref('')
const searchText = ref('')
const selectedLine = ref<PackageLine | null>(null)
const selectedLineForWork = ref<PackageLine | null>(null)
const showConfirmModal = ref(false)
const packageLines = ref<PackageLine[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// 필터 옵션
const lineTypeOptions = [
  { value: '', label: '전체' },
  { value: 'INNER', label: '내포장' },
  { value: 'OUTER', label: '외포장' }
]

const lineStatusOptions = [
  { value: '', label: '전체' },
  { value: 'AVAILABLE', label: '사용 가능' },
  { value: 'WORKING', label: '작업 중' },
  { value: 'MAINTENANCE', label: '점검 중' },
  { value: 'STOPPED', label: '정지' }
]

// 실제 데이터 불러오기
async function fetchLines() {
  loading.value = true
  error.value = null
  try {
    const response = await axios.get('/api/lines/list')
    packageLines.value = response.data
  } catch (err) {
    error.value = '라인 데이터를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}
onMounted(fetchLines)

// 필터링된 라인 계산
const filteredLines = computed(() => {
  return packageLines.value.filter(line => {
    const matchType = !lineTypeFilter.value || line.line_type === lineTypeFilter.value
    const matchStatus = !lineStatusFilter.value || line.line_status === lineStatusFilter.value
    const matchSearch = !searchText.value ||
      line.line_name.toLowerCase().includes(searchText.value.toLowerCase())
    
    return matchType && matchStatus && matchSearch
  })
})

// 메서드
function clearAllFilters() {
  lineTypeFilter.value = ''
  lineStatusFilter.value = ''
  searchText.value = ''
  selectedLine.value = null
}

function clearSelection() {
  selectedLine.value = null
}

function selectLine(line: PackageLine) {
  // 같은 라인을 다시 클릭하면 선택 해제
  if (selectedLine.value?.line_id === line.line_id) {
    selectedLine.value = null
  } else {
    selectedLine.value = line
  }
}

function startWork(line: PackageLine) {
  selectedLineForWork.value = line
  showConfirmModal.value = true
}

function confirmStartWork() {
  if (selectedLineForWork.value) {
    // PackageWork.vue 페이지로 이동
    router.push({
      path: 'work',
      query: {
        line_id: selectedLineForWork.value.line_id,
        line_name: selectedLineForWork.value.line_name,
        line_type: selectedLineForWork.value.line_type,
        line_status: selectedLineForWork.value.line_status
      }
    })
  }
  
  showConfirmModal.value = false
  selectedLineForWork.value = null
}

// 헬퍼 함수들
function getLineTypeText(type: string) {
  return type === 'INNER' ? '내포장' : '외포장'
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    'AVAILABLE': '사용 가능',
    'WORKING': '작업 중',
    'MAINTENANCE': '점검 중',
    'STOPPED': '정지'
  }
  return map[status] || status
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    'AVAILABLE': 'success',
    'WORKING': 'primary', 
    'MAINTENANCE': 'warning',
    'STOPPED': 'danger'
  }
  return colors[status] || 'secondary'
}

function getStatusIcon(status: string) {
  const icons: Record<string, string> = {
    'AVAILABLE': 'check_circle',
    'WORKING': 'play_arrow',
    'MAINTENANCE': 'build',
    'STOPPED': 'stop'
  }
  return icons[status] || 'help'
}

function getLineTypeIcon(type: string) {
  return type === 'INNER' ? 'inventory_2' : 'archive'
}

function getLineTypeColor(type: string) {
  return type === 'INNER' ? 'primary' : 'success'
}
</script>

<style scoped>
.line-selection-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 8px;
}

.page-description {
  color: #718096;
  margin-bottom: 24px;
}

.filter-section {
  margin-bottom: 20px;
}

.selected-line-card {
  border: 2px solid #059669;
  background: #f0fdf4;
}

.selected-line-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.selected-line-header h3 {
  margin: 0;
  color: #059669;
  flex: 1;
}

.selected-line-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lines-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.line-card-wrapper {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
}

.line-card-wrapper:hover {
  transform: translateY(-2px);
}

.line-card-wrapper:hover .line-card {
  border-color: #3182ce;
  box-shadow: 0 4px 12px rgba(49, 130, 206, 0.15);
}

.line-card-wrapper.selected .line-card {
  border: 2px solid #3182ce !important;
  box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1) !important;
}

.line-card-wrapper.selected .line-name {
  color: #3182ce !important;
}

.line-card {
  border: 2px solid #e2e8f0;
  transition: all 0.3s ease;
}

.line-card-wrapper.available .line-card {
  background: #f0fff4;
}

.line-card-wrapper.working .line-card {
  background: #eff6ff;
}

.line-card-wrapper.maintenance .line-card {
  background: #fffbeb;
}

.line-card-wrapper.stopped .line-card {
  background: #fef2f2;
}

.line-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.line-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
}

.status-chip {
  margin-bottom: 8px;
}

.line-details {
  margin-bottom: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 14px;
}

.detail-item .label {
  color: #718096;
  font-weight: 500;
}

.detail-item .value {
  color: #2d3748;
  font-weight: 600;
}

.line-actions {
  margin-bottom: 12px;
}

.selected-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #059669;
  font-weight: 700;
  padding: 8px;
  background: #d1fae5;
  border-radius: 6px;
  border: 1px solid #059669;
  font-size: 14px;
}

.empty-state {
  padding: 40px;
}

.confirm-content {
  padding: 20px 0;
}

.confirm-text {
  font-size: 16px;
  color: #2d3748;
  margin-bottom: 8px;
}

.confirm-subtext {
  font-size: 14px;
  color: #718096;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-btn {
  min-width: 80px;
}

@media (max-width: 768px) {
  .lines-container {
    grid-template-columns: 1fr;
  }
  
  .selected-line-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>