<template>
  <div class="max-w-[1200px] h-[739px] mx-auto p-4 bg-gray-50 overflow-hidden">
    <!-- 상단 타이틀 -->
    <div class="mb-3">
      <h1 class="text-2xl font-bold text-gray-800">제품 출고 관리</h1>
    </div>

    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4" style="height: calc(100% - 60px);">
      
      <!-- 탭 메뉴 -->
      <div class="flex border-b border-gray-200 mb-4">
        <button 
          @click="activeTab = 'waiting'"
          :class="['px-4 py-2 text-sm font-medium border-b-2 transition-colors', 
                  activeTab === 'waiting' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700']"
        >
          출고 대기 목록
        </button>
        <button 
          @click="activeTab = 'processing'"
          :class="['px-4 py-2 text-sm font-medium border-b-2 transition-colors', 
                  activeTab === 'processing' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700']"
        >
          출고 진행 중
        </button>
        <button 
          @click="activeTab = 'completed'"
          :class="['px-4 py-2 text-sm font-medium border-b-2 transition-colors', 
                  activeTab === 'completed' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700']"
        >
          출고 완료
        </button>
      </div>

      <!-- 출고 대기 탭 -->
      <div v-if="activeTab === 'waiting'" class="h-full">
        <!-- 검색 영역 -->
        <div class="grid grid-cols-4 gap-3 mb-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">주문번호</label>
            <input 
              v-model="waitingSearch.order_number"
              class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="주문번호 검색"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">제품명</label>
            <input 
              v-model="waitingSearch.product_name"
              class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="제품명 검색"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">주문일자</label>
            <input 
              v-model="waitingSearch.order_date"
              type="date"
              class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div class="flex items-end gap-2">
            <button 
              @click="loadOutboundWaitingList" 
              class="px-4 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              검색
            </button>
            <button 
              @click="resetWaitingSearch" 
              class="px-4 py-1.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
            >
              초기화
            </button>
          </div>
        </div>

        <!-- 상단 버튼 영역 -->
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-3">
            <button 
              @click="loadOutboundWaitingList" 
              class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
              새로고침
            </button>
            
            <div class="text-sm text-gray-600">
              출고 대기: <span class="font-medium text-blue-600">{{ outboundWaitingList.length }}건</span>
            </div>
          </div>

          <div class="flex gap-2">
            <button 
              @click="processSelectedItems"
              :disabled="!hasSelectedItems"
              class="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              출고 ({{ selectedItemsCount }}건)
            </button>
          </div>
        </div>

        <!-- 출고 대기 목록 테이블 -->
        <div class="flex-1 overflow-auto border border-gray-200 rounded mb-4" style="height: calc(100% - 200px);">
          <table class="w-full text-xs border-collapse bg-white">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-12">
                  <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" class="rounded" />
                </th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-24">주문번호</th>
                <th class="border border-gray-200 px-2 py-2 text-left font-medium text-gray-700 w-32">제품정보</th>
                <th class="border border-gray-200 px-2 py-2 text-left font-medium text-gray-700 w-24">거래처</th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-20">주문일</th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-20">납기일</th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-16">상세</th>
              </tr>
            </thead>
            <tbody>
              <!-- 로딩 상태 -->
              <tr v-if="isLoading">
                <td colspan="7" class="text-center text-gray-500 py-8">
                  <div class="flex items-center justify-center gap-2">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    데이터를 불러오는 중...
                  </div>
                </td>
              </tr>
              
              <!-- 데이터 없음 -->
              <tr v-else-if="outboundWaitingList.length === 0">
                <td colspan="7" class="text-center text-gray-500 py-8">
                  출고 대기 중인 주문이 없습니다.
                </td>
              </tr>
              
              <!-- 데이터 행들 -->
              <tr v-else v-for="(order, index) in outboundWaitingList" :key="order.order_id" 
                  class="hover:bg-gray-50">
                <td class="border border-gray-200 px-2 py-2 text-center">
                  <input type="checkbox" v-model="order.selected" class="rounded" />
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center font-mono text-xs">
                  {{ order.order_number }}
                </td>
                <td class="border border-gray-200 px-2 py-2">
                  {{ order.product_summary }}
                </td>
                <td class="border border-gray-200 px-2 py-2">
                  {{ order.client_name }}
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center">
                  {{ order.order_date }}
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center">
                  {{ order.delivery_date }}
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center">
                  <button
                    @click="viewOrderDetails(order.order_id)"
                    class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                  >
                    상세
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 하단 정보 -->
        <div class="flex justify-between items-center text-xs text-gray-600">
          <div>
            전체 {{ outboundWaitingList.length }}건
          </div>
        </div>
      </div>

      <!-- 출고 진행 중 탭 -->
      <div v-else-if="activeTab === 'processing'" class="h-full">
        <!-- 검색 영역 -->
        <div class="grid grid-cols-4 gap-3 mb-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">출고번호</label>
            <input 
              v-model="processingSearch.outbound_number"
              class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="출고번호 검색"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">제품명</label>
            <input 
              v-model="processingSearch.product_name"
              class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="제품명 검색"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">요청일</label>
            <input 
              v-model="processingSearch.request_date"
              type="date"
              class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div class="flex items-end gap-2">
            <button 
              @click="loadOutboundProcessingList" 
              class="px-4 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              검색
            </button>
            <button 
              @click="resetProcessingSearch" 
              class="px-4 py-1.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
            >
              초기화
            </button>
          </div>
        </div>

        <!-- 상단 버튼 영역 -->
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-3">
            <button 
              @click="loadOutboundProcessingList" 
              class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
              새로고침
            </button>
            
            <div class="text-sm text-gray-600">
              출고 진행 중: <span class="font-medium text-blue-600">{{ outboundProcessingList.length }}건</span>
            </div>
          </div>

          <div class="flex gap-2">
            <button 
              @click="completeSelectedItems"
              :disabled="!hasSelectedProcessingItems"
              class="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              출고완료 ({{ selectedProcessingItemsCount }}건)
            </button>
          </div>
        </div>

        <!-- 출고 진행 중 목록 테이블 -->
        <div class="flex-1 overflow-auto border border-gray-200 rounded mb-4" style="height: calc(100% - 200px);">
          <table class="w-full text-xs border-collapse bg-white">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-12">
                  <input type="checkbox" v-model="selectAllProcessing" @change="toggleSelectAllProcessing" class="rounded" />
                </th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-24">출고번호</th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-20">주문번호</th>
                <th class="border border-gray-200 px-2 py-2 text-left font-medium text-gray-700 w-32">제품정보</th>
                <th class="border border-gray-200 px-2 py-2 text-left font-medium text-gray-700 w-24">거래처</th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-20">요청일</th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-16">상태</th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-16">작업</th>
              </tr>
            </thead>
            <tbody>
              <!-- 로딩 상태 -->
              <tr v-if="isLoadingProcessing">
                <td colspan="8" class="text-center text-gray-500 py-8">
                  <div class="flex items-center justify-center gap-2">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    데이터를 불러오는 중...
                  </div>
                </td>
              </tr>
              
              <!-- 데이터 없음 -->
              <tr v-else-if="outboundProcessingList.length === 0">
                <td colspan="8" class="text-center text-gray-500 py-8">
                  출고 진행 중인 항목이 없습니다.
                </td>
              </tr>
              
              <!-- 데이터 행들 -->
              <tr v-else v-for="(item, index) in outboundProcessingList" :key="item.outbound_code" 
                  class="hover:bg-gray-50">
                <td class="border border-gray-200 px-2 py-2 text-center">
                  <input type="checkbox" v-model="item.selected" class="rounded" />
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center font-mono text-xs">
                  {{ item.outbound_code }}
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center font-mono text-xs">
                  {{ item.order_number }}
                </td>
                <td class="border border-gray-200 px-2 py-2">
                  {{ item.product_summary }}
                </td>
                <td class="border border-gray-200 px-2 py-2">
                  {{ item.client_name }}
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center">
                  {{ item.request_date }}
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center">
                  <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-50">
                    진행중
                  </span>
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center">
                  <div class="flex gap-1">
                    <button
                      @click="viewOutboundDetails(item.outbound_code)"
                      class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                    >
                      상세
                    </button>
                    <button
                      @click="completeOutbound(item.outbound_code)"
                      class="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                    >
                      완료
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 하단 정보 -->
        <div class="flex justify-between items-center text-xs text-gray-600">
          <div>
            전체 {{ outboundProcessingList.length }}건
          </div>
        </div>
      </div>

      <!-- 출고 완료 탭 -->
      <div v-else-if="activeTab === 'completed'" class="h-full">
        <!-- 검색 영역 -->
        <div class="grid grid-cols-4 gap-3 mb-4">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">출고번호</label>
            <input 
              v-model="completedSearch.outbound_number"
              class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="출고번호 검색"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">제품명</label>
            <input 
              v-model="completedSearch.product_name"
              class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="제품명 검색"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">출고일</label>
            <input 
              v-model="completedSearch.outbound_date"
              type="date"
              class="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div class="flex items-end gap-2">
            <button 
              @click="loadOutboundCompletedList" 
              class="px-4 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              검색
            </button>
            <button 
              @click="resetCompletedSearch" 
              class="px-4 py-1.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
            >
              초기화
            </button>
          </div>
        </div>

        <!-- 상단 버튼 영역 -->
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-3">
            <button 
              @click="loadOutboundCompletedList" 
              class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
              새로고침
            </button>
            
            <div class="text-sm text-gray-600">
              출고 완료: <span class="font-medium text-green-600">{{ outboundCompletedList.length }}건</span>
            </div>
          </div>
        </div>

        <!-- 출고 완료 목록 테이블 -->
        <div class="flex-1 overflow-auto border border-gray-200 rounded mb-4" style="height: calc(100% - 200px);">
          <table class="w-full text-xs border-collapse bg-white">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-24">출고번호</th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-20">주문번호</th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-20">출고일</th>
                <th class="border border-gray-200 px-2 py-2 text-left font-medium text-gray-700 w-32">제품정보</th>
                <th class="border border-gray-200 px-2 py-2 text-left font-medium text-gray-700 w-24">거래처</th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-20">요청일</th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-16">상태</th>
                <th class="border border-gray-200 px-2 py-2 text-center font-medium text-gray-700 w-16">상세</th>
              </tr>
            </thead>
            <tbody>
              <!-- 로딩 상태 -->
              <tr v-if="isLoadingCompleted">
                <td colspan="8" class="text-center text-gray-500 py-8">
                  <div class="flex items-center justify-center gap-2">
                    <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    데이터를 불러오는 중...
                  </div>
                </td>
              </tr>
              
              <!-- 데이터 없음 -->
              <tr v-else-if="outboundCompletedList.length === 0">
                <td colspan="8" class="text-center text-gray-500 py-8">
                  출고 완료된 항목이 없습니다.
                </td>
              </tr>
              
              <!-- 데이터 행들 -->
              <tr v-else v-for="(item, index) in outboundCompletedList" :key="item.outbound_code" 
                  class="hover:bg-gray-50">
                <td class="border border-gray-200 px-2 py-2 text-center font-mono text-xs">
                  {{ item.outbound_code }}
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center font-mono text-xs">
                  {{ item.order_number }}
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center">
                  {{ item.outbound_date }}
                </td>
                <td class="border border-gray-200 px-2 py-2">
                  {{ item.product_summary }}
                </td>
                <td class="border border-gray-200 px-2 py-2">
                  {{ item.client_name }}
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center">
                  {{ item.request_date }}
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center">
                  <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-50">
                    완료
                  </span>
                </td>
                <td class="border border-gray-200 px-2 py-2 text-center">
                  <button
                    @click="viewOutboundDetails(item.outbound_code)"
                    class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                  >
                    상세
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 하단 정보 -->
        <div class="flex justify-between items-center text-xs text-gray-600">
          <div>
            전체 {{ outboundCompletedList.length }}건
          </div>
        </div>
      </div>

    </div>

    <!-- 모달 컴포넌트 -->
    <OutboundDetailModal 
      v-if="showModal"
      :modalData="modalData"
      :modalType="modalType"
      @close="closeModal"
    />

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import OutboundDetailModal from './OutboundDetailModal.vue'

// 상태 관리
const activeTab = ref('waiting')
const isLoading = ref(false)
const isLoadingProcessing = ref(false)
const isLoadingCompleted = ref(false)

// 데이터
const outboundWaitingList = ref([])
const outboundProcessingList = ref([])
const outboundCompletedList = ref([])

// 검색 조건
const waitingSearch = ref({
  order_number: '',
  product_name: '',
  order_date: ''
})

const processingSearch = ref({
  outbound_number: '',
  product_name: '',
  request_date: ''
})

const completedSearch = ref({
  outbound_number: '',
  product_name: '',
  outbound_date: ''
})

// 선택 관련
const selectAll = ref(false)
const selectAllProcessing = ref(false)
const showModal = ref(false)
const modalData = ref(null)
const modalType = ref('order') // 'order' 또는 'outbound'

// Computed 속성들
const hasSelectedItems = computed(() => {
  return outboundWaitingList.value.some(item => item.selected)
})

const selectedItemsCount = computed(() => {
  return outboundWaitingList.value.filter(item => item.selected).length
})

const hasSelectedProcessingItems = computed(() => {
  return outboundProcessingList.value.some(item => item.selected)
})

const selectedProcessingItemsCount = computed(() => {
  return outboundProcessingList.value.filter(item => item.selected).length
})

// 전체 선택/해제
const toggleSelectAll = () => {
  outboundWaitingList.value.forEach(item => {
    item.selected = selectAll.value
  })
}

const toggleSelectAllProcessing = () => {
  outboundProcessingList.value.forEach(item => {
    item.selected = selectAllProcessing.value
  })
}

// 검색 초기화
const resetWaitingSearch = () => {
  waitingSearch.value = {
    order_number: '',
    product_name: '',
    order_date: ''
  }
  loadOutboundWaitingList()
}

const resetProcessingSearch = () => {
  processingSearch.value = {
    outbound_number: '',
    product_name: '',
    request_date: ''
  }
  loadOutboundProcessingList()
}

const resetCompletedSearch = () => {
  completedSearch.value = {
    outbound_number: '',
    product_name: '',
    outbound_date: ''
  }
  loadOutboundCompletedList()
}

// 출고 대기 목록 조회
const loadOutboundWaitingList = async () => {
  isLoading.value = true
  
  try {
    const response = await axios.get('/productOutbound/waiting-list', {
      params: waitingSearch.value
    })
    
    outboundWaitingList.value = response.data.map(item => ({
      ...item,
      selected: false
    }))
    
    selectAll.value = false
    
  } catch (error) {
    console.error('출고 대기 목록 조회 오류:', error)
    
    let errorMessage = '출고 대기 목록을 불러오는데 실패했습니다.'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    alert(errorMessage)
    outboundWaitingList.value = []
  } finally {
    isLoading.value = false
  }
}

// 출고 진행 중 목록 조회
const loadOutboundProcessingList = async () => {
  isLoadingProcessing.value = true
  
  try {
    const response = await axios.get('/productOutbound/processing-list', {
      params: processingSearch.value
    })
    
    outboundProcessingList.value = response.data.map(item => ({
      ...item,
      selected: false
    }))
    
    selectAllProcessing.value = false
    
  } catch (error) {
    console.error('출고 진행 중 목록 조회 오류:', error)
    
    let errorMessage = '출고 진행 중 목록을 불러오는데 실패했습니다.'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    alert(errorMessage)
    outboundProcessingList.value = []
  } finally {
    isLoadingProcessing.value = false
  }
}

// 출고 완료 목록 조회
const loadOutboundCompletedList = async () => {
  isLoadingCompleted.value = true
  
  try {
    const response = await axios.get('/productOutbound/completed-list', {
      params: completedSearch.value
    })
    
    outboundCompletedList.value = response.data
    
  } catch (error) {
    console.error('출고 완료 목록 조회 오류:', error)
    
    let errorMessage = '출고 완료 목록을 불러오는데 실패했습니다.'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    alert(errorMessage)
    outboundCompletedList.value = []
  } finally {
    isLoadingCompleted.value = false
  }
}

// 주문 상세 정보 조회 (출고 대기용)
const viewOrderDetails = async (orderId) => {
  try {
    const response = await axios.get(`/productOutbound/order-details/${orderId}`)
    
    modalData.value = response.data
    modalType.value = 'order'
    showModal.value = true
    
  } catch (error) {
    console.error('주문 상세 정보 조회 오류:', error)
    
    let errorMessage = '주문 상세 정보 조회에 실패했습니다.'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    alert(errorMessage)
  }
}

// 출고 상세 정보 조회 (진행중/완료용)
const viewOutboundDetails = async (outboundCode) => {
  try {
    const response = await axios.get(`/productOutbound/outbound-details/${outboundCode}`)
    
    modalData.value = response.data
    modalType.value = 'outbound'
    showModal.value = true
    
  } catch (error) {
    console.error('출고 상세 정보 조회 오류:', error)
    
    let errorMessage = '출고 상세 정보 조회에 실패했습니다.'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    alert(errorMessage)
  }
}

// 선택된 주문들 일괄 출고 처리
const processSelectedItems = async () => {
  const selectedItems = outboundWaitingList.value.filter(item => item.selected)
  
  if (selectedItems.length === 0) {
    alert('출고 처리할 주문을 선택해주세요.')
    return
  }

  const confirmed = confirm(`선택된 ${selectedItems.length}건의 주문을 일괄 출고 처리하시겠습니까?`)
  if (!confirmed) return

  try {
    const orderIds = selectedItems.map(item => item.order_id)

    // 재고 부족 체크
    const inventoryResponse = await axios.post('/productOutbound/check-inventory', {
      order_ids: orderIds
    })
    
    if (inventoryResponse.data.has_shortage) {
      const shortageList = inventoryResponse.data.shortage_items
        .map(item => `${item.product_name} (부족: ${item.required_qty - item.available_qty}개)`)
        .join('\n')
      alert(`재고가 부족한 제품이 있습니다:\n${shortageList}`)
      return
    }

    // 출고 처리
    const outboundData = {
      order_ids: orderIds,
      employee_id: 1, // 실제로는 로그인한 사용자 ID 사용
      notes: ''
    }

    const response = await axios.post('/productOutbound/process', outboundData)
    
    const successCount = response.data.success_count
    const errorCount = response.data.error_count
    
    if (errorCount > 0) {
      alert(`처리 완료: 성공 ${successCount}건, 실패 ${errorCount}건\n실패한 건들은 재고 부족이거나 처리 오류입니다.`)
    } else {
      alert(`${successCount}건의 출고 처리가 완료되었습니다.`)
    }
    
    // 성공한 주문들을 목록에서 제거
    const successOrderIds = response.data.results
      .filter(result => result.success)
      .map(result => result.order_id)
    
    outboundWaitingList.value = outboundWaitingList.value.filter(
      item => !successOrderIds.includes(item.order_id)
    )
    
    selectAll.value = false
    
    // 진행 중 목록 새로고침
    if (activeTab.value === 'processing') {
      loadOutboundProcessingList()
    }
    
  } catch (error) {
    console.error('다중 주문 출고 처리 오류:', error)
    
    let errorMessage = '일괄 출고 처리 중 오류가 발생했습니다.'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    alert(errorMessage)
  }
}

// 선택된 출고들 완료 처리
const completeSelectedItems = async () => {
  const selectedItems = outboundProcessingList.value.filter(item => item.selected)
  
  if (selectedItems.length === 0) {
    alert('완료 처리할 출고를 선택해주세요.')
    return
  }

  const confirmed = confirm(`선택된 ${selectedItems.length}건의 출고를 완료 처리하시겠습니까?`)
  if (!confirmed) return

  try {
    const outboundCodes = selectedItems.map(item => item.outbound_code)

    const response = await axios.put('/productOutbound/complete-multiple', {
      outbound_codes: outboundCodes
    })
    
    alert(`${response.data.affected_rows}건의 출고가 완료되었습니다.`)
    
    // 완료된 출고들을 목록에서 제거
    outboundProcessingList.value = outboundProcessingList.value.filter(
      item => !outboundCodes.includes(item.outbound_code)
    )
    
    selectAllProcessing.value = false
    
    // 완료 목록 새로고침
    if (activeTab.value === 'completed') {
      loadOutboundCompletedList()
    }
    
  } catch (error) {
    console.error('다중 출고 완료 처리 오류:', error)
    
    let errorMessage = '출고 완료 처리 중 오류가 발생했습니다.'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    alert(errorMessage)
  }
}

// 단일 출고 완료 처리
const completeOutbound = async (outboundCode) => {
  try {
    const response = await axios.put(`/productOutbound/complete/${outboundCode}`)
    
    alert('출고 완료 처리되었습니다.')
    
    // 진행 중 목록에서 제거
    outboundProcessingList.value = outboundProcessingList.value.filter(
      item => item.outbound_code !== outboundCode
    )
    
    // 완료 목록 새로고침
    if (activeTab.value === 'completed') {
      loadOutboundCompletedList()
    }
    
  } catch (error) {
    console.error('출고 완료 처리 오류:', error)
    
    let errorMessage = '출고 완료 처리에 실패했습니다.'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    }
    
    alert(errorMessage)
  }
}

// 모달 닫기
const closeModal = () => {
  showModal.value = false
  modalData.value = null
  modalType.value = 'order'
}

// 탭 변경 시 데이터 로드
const handleTabChange = () => {
  if (activeTab.value === 'waiting') {
    loadOutboundWaitingList()
  } else if (activeTab.value === 'processing') {
    loadOutboundProcessingList()
  } else if (activeTab.value === 'completed') {
    loadOutboundCompletedList()
  }
}

// 컴포넌트 마운트 시 데이터 로드
onMounted(() => {
  loadOutboundWaitingList()
})

// 탭 변경 감시
watch(activeTab, handleTabChange)
</script>

<style scoped>
input, select, button {
  transition: all 0.15s ease-in-out;
}

input:focus, select:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f8fafc;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

button {
  transition: all 0.15s ease-in-out;
}
</style>