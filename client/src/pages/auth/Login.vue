<template>
  <VaForm ref="form" @submit.prevent="handleLogin">
    <h1 class="font-semibold text-4xl mb-4">로그인</h1>

    <!-- 사원아이디 입력 -->
    <VaInput 
      v-model="formData.employee_id"
      :rules="[validators.required]"
      class="mb-4"
      label="사원아이디"
      placeholder="사원아이디를 입력하세요"
      :loading="isLoading"
      :disabled="isLoading"
    />

    <!-- 비밀번호 입력 -->
    <VaValue v-slot="isPasswordVisible" :default-value="false">
      <VaInput
        v-model="formData.password"
        :rules="[validators.required]"
        :type="isPasswordVisible.value ? 'text' : 'password'"
        class="mb-4"
        label="비밀번호"
        placeholder="비밀번호를 입력하세요"
        :loading="isLoading"
        :disabled="isLoading"
        @keyup.enter="handleLogin"
        @clickAppendInner.stop="isPasswordVisible.value = !isPasswordVisible.value"
      >
        <template #appendInner>
          <VaIcon
            :name="isPasswordVisible.value ? 'mso-visibility_off' : 'mso-visibility'"
            class="cursor-pointer"
            color="secondary"
          />
        </template>
      </VaInput>
    </VaValue>

    <!-- 로그인 버튼 -->
    <div class="flex justify-center mt-4 mb-3">
      <VaButton 
        class="w-full" 
        :loading="isLoading"
        :disabled="isLoading || !formData.employee_id || !formData.password"
        @click="handleLogin"
      >
        {{ isLoading ? '로그인 중...' : '로그인' }}
      </VaButton>
    </div>

    <!-- 대시보드로 돌아가기 버튼 -->
    <div class="flex justify-center">
      <VaButton 
        preset="secondary"
        color="secondary"
        class="w-full"
        :disabled="isLoading"
        @click="goToDashboard"
      >
        📋 대시보드로 돌아가기
      </VaButton>
    </div>
  </VaForm>
</template>

<script lang="ts" setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useForm, useToast } from 'vuestic-ui'
import axios from 'axios'

// ================================
// 🔧 컴포넌트 설정
// ================================
const { validate } = useForm('form')
const router = useRouter()
const { init: showToast } = useToast()

// ================================
// 📝 유효성 검사 규칙
// ================================
const validators = {
  required: (value: string) => !!value || '필수 입력 항목입니다.'
}

// ================================
// 🎯 상태 관리
// ================================
const isLoading = ref(false)
const formData = reactive({
  employee_id: '',
  password: '',
})

// ================================
// 🔐 인증 관련 함수들 (localStorage 기반)
// ================================

// 저장소 키 설정
const AUTH_STORAGE_KEY = 'auth-store'

// 인증 데이터 저장 (항상 localStorage 사용)
const saveAuthData = (user: any, token: string) => {
  const authData = {
    user,
    token,
    timestamp: Date.now()
  }
  
  // localStorage에 저장
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
  
  // sessionStorage에서는 제거 (중복 방지)
  sessionStorage.removeItem(AUTH_STORAGE_KEY)
  
  // axios 헤더 설정
  if (axios?.defaults?.headers?.common) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }
  
  console.log('인증 데이터 저장됨 (localStorage)')
}

// 인증 데이터 로드
const loadAuthData = () => {
  try {
    // localStorage와 sessionStorage 모두 확인
    let authDataStr = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY)
    
    if (!authDataStr) return null
    
    const authData = JSON.parse(authDataStr)
    
    // 데이터 유효성 검사
    if (authData?.user && authData?.token) {
      // axios 헤더 설정
      if (axios?.defaults?.headers?.common) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`
      }
      
      console.log('저장된 인증 데이터 로드됨:', authData.user.employee_name)
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
  
  console.log('인증 데이터 삭제됨')
}

// 로그인 상태 확인
const isAuthenticated = () => {
  const authData = loadAuthData()
  return !!authData?.user && !!authData?.token
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
// 🚀 네비게이션 함수
// ================================
const goToDashboard = () => {
  router.push({ name: 'dashboard' })
}

// ================================
// 🌍 전역 함수 노출
// ================================
if (typeof window !== 'undefined') {
  (window as any).authUtils = {
    loadAuthData,
    saveAuthData,
    clearAuthData,
    isAuthenticated,
    verifyToken,
    
    // 편의 함수들
    getUser: () => loadAuthData()?.user || null,
    getToken: () => loadAuthData()?.token || null,
    
    logout: async () => {
      try {
        const authData = loadAuthData()
        if (authData?.token) {
          await axios.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${authData.token}` }
          }).catch(err => console.warn('로그아웃 요청 실패:', err.message))
        }
      } finally {
        clearAuthData()
        // 상태 변경 이벤트 발생
        window.dispatchEvent(new CustomEvent('auth-state-changed', { 
          detail: { type: 'logout' } 
        }))
      }
    }
  }
}

// ================================
// 🚀 컴포넌트 초기화
// ================================
onMounted(async () => {
  // axios 기본 설정
  if (typeof axios !== 'undefined') {
    axios.defaults.baseURL = 'http://localhost:3000'
    
    // 응답 인터셉터 - 401 에러 시 자동 로그아웃
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.log('인증 만료, 로그아웃 처리')
          clearAuthData()
          window.dispatchEvent(new CustomEvent('auth-state-changed', { 
            detail: { type: 'logout' } 
          }))
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
        return Promise.reject(error)
      }
    )
  }
  
  // 이미 로그인된 경우 검증 후 처리
  if (isAuthenticated()) {
    try {
      const authData = loadAuthData()
      if (authData?.token) {
        const isValid = await verifyToken(authData.token)
        if (isValid) {
          console.log('유효한 토큰, 대시보드로 이동')
          showToast({
            message: '이미 로그인되어 있습니다.',
            color: 'info',
            duration: 2000
          })
          router.push({ name: 'dashboard' })
          return
        } else {
          console.log('유효하지 않은 토큰, 정리')
          clearAuthData()
        }
      }
    } catch (error) {
      console.error('토큰 검증 중 에러:', error)
      clearAuthData()
    }
  }
})

// ================================
// 🔐 로그인 처리 함수
// ================================
const handleLogin = async () => {
  // 폼 유효성 검사
  if (!(await validate())) return
  
  // 로딩 시작
  isLoading.value = true

  try {
    console.log('로그인 요청:', { employee_id: formData.employee_id })

    // 서버에 로그인 요청
    const response = await axios.post('/auth/login', {
      employee_id: formData.employee_id,
      password: formData.password,
    })

    console.log('로그인 응답:', response.data)

    if (response.data.success) {
      const { user, token } = response.data
      
      // 인증 데이터 저장 (항상 localStorage)
      saveAuthData(user, token)
      
      // 성공 메시지
      showToast({ 
        message: `${user.employee_name}님 환영합니다!`, 
        color: 'success',
        duration: 3000
      })

      // 상태 변경 이벤트 발생
      window.dispatchEvent(new CustomEvent('auth-state-changed', { 
        detail: { type: 'login', user, token } 
      }))

      // 대시보드로 이동
      setTimeout(() => {
        router.push({ name: 'dashboard' })
      }, 1000)
      
    } else {
      throw new Error(response.data.message || '로그인에 실패했습니다.')
    }

  } catch (error: any) {
    console.error('로그인 에러:', error)
    
    let errorMessage = '로그인에 실패했습니다.'
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.response?.status === 401) {
      errorMessage = '사원번호 또는 비밀번호가 올바르지 않습니다.'
    } else if (error.response?.status === 500) {
      errorMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    } else if (error.request) {
      errorMessage = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.'
    } else if (error.message) {
      errorMessage = error.message
    }

    // 에러 메시지 표시
    showToast({
      message: errorMessage,
      color: 'danger',
      duration: 4000
    })

    // 비밀번호 필드 초기화
    formData.password = ''
    
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.va-form:has(.va-input--loading) {
  opacity: 0.8;
  pointer-events: none;
}

.va-button--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>