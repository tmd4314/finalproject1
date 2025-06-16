<template>
  <div class="dashboard-container">
    <h1 class="text-3xl font-bold mb-4">📋 대시보드</h1>

    <!-- 로그인한 사용자 정보 출력 -->
    <div class="p-4 bg-white rounded shadow-md mb-4">
      <h2 class="text-xl font-semibold mb-2">👤 로그인한 사용자</h2>
      <div v-if="user">
        <p><strong>사원명:</strong> {{ user.employee_name }}</p>
        <p><strong>사원아이디:</strong> {{ user.employee_id }}</p>
        <p><strong>직급:</strong> {{ user.position }}</p>
        <p><strong>부서:</strong> {{ user.department_name || user.department_code }}</p>
        <p><strong>고용상태:</strong> {{ user.employment_status || '재직중' }}</p>
        <p><strong>입사일:</strong> {{ formatDate(user.hire_date) }}</p>
        <p><strong>성별:</strong> {{ user.gender }}</p>
        <p><strong>전화번호:</strong> {{ user.phone }}</p>
        <p><strong>이메일:</strong> {{ user.email }}</p>
        <p v-if="user.address"><strong>주소:</strong> {{ user.address }}</p>
      </div>
      <div v-else-if="isLoading" class="text-gray-500">
        사용자 정보를 불러오는 중...
      </div>
    </div>

    <!-- 대시보드 내용들... -->
    <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="p-4 bg-blue-50 rounded shadow-md">
        <h3 class="text-lg font-semibold mb-2">📊 통계</h3>
        <p class="text-gray-600">여기에 통계 정보가 들어갑니다.</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vuestic-ui'
import axios from 'axios'

// ================================
// 🔧 컴포넌트 설정
// ================================
const router = useRouter()
const { init: showToast } = useToast()

// ================================
// 🎯 상태 관리
// ================================
const user = ref<any>(null)
const isLoading = ref(true)
const isLoggingOut = ref(false)

// ================================
// 🔐 인증 관련 함수들
// ================================
const AUTH_STORAGE_KEY = 'auth-store'

// 인증 데이터 로드
const loadAuthData = () => {
  try {
    let authDataStr = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY)
    
    if (!authDataStr) return null
    
    const authData = JSON.parse(authDataStr)
    
    if (authData?.user && authData?.token) {
      // axios 헤더 설정
      if (axios?.defaults?.headers?.common) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`
      }
      
      return authData
    }
    
    return null
  } catch (error) {
    console.error('인증 데이터 로드 에러:', error)
    return null
  }
}

// 인증 데이터 삭제
const clearAuthData = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  
  if (axios?.defaults?.headers?.common) {
    delete axios.defaults.headers.common['Authorization']
  }
}

// 토큰 검증
const verifyToken = async (token: string) => {
  try {
    const response = await axios.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data?.success === true
  } catch (error) {
    console.warn('토큰 검증 실패:', error)
    return false
  }
}

// ================================
// 🛠️ 유틸리티 함수
// ================================
const formatDate = (dateString: string): string => {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleDateString('ko-KR')
  } catch (error) {
    return dateString
  }
}

// ================================
// 🔐 인증 상태 확인 및 로드 (수동 로그인 버전)
// ================================
const checkAuthAndLoadUser = async () => {
  try {
    // axios 기본 설정
    if (typeof axios !== 'undefined') {
      axios.defaults.baseURL = 'http://localhost:3000'
    }
    
    const authData = loadAuthData()
    
    if (!authData?.user || !authData?.token) {
      console.log('인증 데이터 없음 - 로그인 버튼으로 수동 이동 가능')
      // 자동 이동하지 않고 그냥 로딩 상태만 해제
      isLoading.value = false
      return
    }
    
    // 일단 기존 사용자 정보로 대시보드 표시
    user.value = authData.user
    isLoading.value = false
    console.log('대시보드 유저 정보 로드됨:', authData.user.employee_name)
    
    // 토큰 검증을 백그라운드에서 실행
    verifyToken(authData.token).then((isValid) => {
      if (!isValid) {
        console.log('토큰이 유효하지 않음')
        clearAuthData()
        user.value = null // 사용자 정보 제거
        showToast({
          message: '세션이 만료되었습니다. 로그인 버튼을 눌러 다시 로그인해주세요.',
          color: 'warning',
          duration: 4000
        })
      }
    }).catch((error) => {
      console.error('토큰 검증 중 에러:', error)
      // 네트워크 오류 등의 경우 그냥 기존 사용자 정보 사용
      console.log('토큰 검증 실패 - 네트워크 오류 가능성, 기존 정보 유지')
    })
    
  } catch (error) {
    console.error('인증 확인 중 에러:', error)
    // 에러가 발생해도 대시보드는 보여주되, 경고 메시지 표시
    isLoading.value = false
    showToast({
      message: '인증 확인 중 오류가 발생했습니다.',
      color: 'danger',
      duration: 3000
    })
  }
}

// ================================
// 🚪 로그인 페이지로 이동
// ================================
const goToLogin = () => {
  router.push({ name: 'login' })
}

// ================================
// 🚪 로그아웃 처리
// ================================
const handleLogout = async () => {
  isLoggingOut.value = true
  
  try {
    const authData = loadAuthData()
    
    showToast({
      message: '로그아웃 중...',
      color: 'info',
      duration: 2000
    })

    if (authData?.token) {
      await axios.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${authData.token}` }
      }).catch(err => console.warn('로그아웃 요청 실패:', err.message))
    }
    
    clearAuthData()
    user.value = null
    
    showToast({
      message: '성공적으로 로그아웃되었습니다.',
      color: 'success',
      duration: 2000
    })

    // 상태 변경 이벤트 발생
    window.dispatchEvent(new CustomEvent('auth-state-changed', { 
      detail: { type: 'logout' } 
    }))

    // 로그인 페이지로 이동
    router.push({ name: 'login' })
    
  } catch (error) {
    console.error('로그아웃 에러:', error)
    showToast({
      message: '로그아웃 중 오류가 발생했습니다.',
      color: 'danger',
      duration: 3000
    })
  } finally {
    isLoggingOut.value = false
  }
}

// ================================
// 🎧 이벤트 리스너들
// ================================
const handleAuthStateChange = (event: any) => {
  console.log('Dashboard: 인증 상태 변경 감지', event.detail)
  
  if (event.detail?.type === 'login') {
    // 로그인 이벤트
    if (event.detail.user) {
      user.value = event.detail.user
    } else {
      checkAuthAndLoadUser()
    }
  } else if (event.detail?.type === 'logout') {
    // 로그아웃 이벤트
    user.value = null
    router.push({ name: 'login' })
  }
}

// ================================
// 🚀 컴포넌트 초기화
// ================================
onMounted(() => {
  // 인증 상태 확인 및 사용자 정보 로드
  checkAuthAndLoadUser()
  
  // 전역 이벤트 리스너 등록
  window.addEventListener('auth-state-changed', handleAuthStateChange)
})

onUnmounted(() => {
  // 이벤트 리스너 정리
  window.removeEventListener('auth-state-changed', handleAuthStateChange)
})
</script>

<style scoped>
.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard-container h1 {
  color: #333;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 10px;
}

.dashboard-container .grid {
  gap: 20px;
}

.dashboard-container .shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dashboard-container .bg-blue-50 {
  background-color: #eff6ff;
}

.dashboard-container .bg-green-50 {
  background-color: #f0fdf4;
}

.dashboard-container .bg-gray-50 {
  background-color: #f9fafb;
}

.text-red-500 {
  color: #ef4444;
}

.text-amber-600 {
  color: #d97706;
}
</style>