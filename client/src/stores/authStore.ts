// 📁 src/stores/authStore.ts (순환 의존성 해결 버전)
import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import axios from 'axios'
import { useToast } from 'vuestic-ui'

const AUTH_STORAGE_KEY = 'auth-store'

export const useAuthStore = defineStore('auth', () => {
  // ================================
  // 🎯 상태 관리
  // ================================
  const user = ref<any>(null)
  const token = ref('')
  const isLoading = ref(false)
  const isInitialized = ref(false)
  
  // ================================
  // 💡 계산된 속성
  // ================================
  const isLoggedIn = computed(() => !!user.value && !!token.value)
  
  const displayName = computed(() => {
    if (user.value) {
      return user.value.employee_name || `사원 ${user.value.employee_id}` || '사용자'
    }
    return '계정'
  })
  
  const userRole = computed(() => {
    if (!user.value) return ''
    
    const parts = []
    if (user.value.position) parts.push(user.value.position)
    if (user.value.department_name || user.value.department_code) {
      parts.push(user.value.department_name || user.value.department_code)
    }
    
    return parts.join(' • ')
  })
  
  // ================================
  // 🔐 인증 관련 함수들
  // ================================
  
  // 인증 데이터 저장
  const saveAuthData = (userData: any, userToken: string) => {
    const authData = {
      user: userData,
      token: userToken,
      timestamp: Date.now(),
      version: '1.0'
    }
    
    user.value = userData
    token.value = userToken
    
    // localStorage에 저장 (새로고침 시 유지)
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
      sessionStorage.removeItem(AUTH_STORAGE_KEY) // 중복 방지
    } catch (error) {
      console.error('❌ localStorage 저장 실패:', error)
    }
    
    // axios 기본 헤더 설정
    setAxiosAuthHeader(userToken)
    
    console.log('✅ 인증 데이터 저장됨:', userData.employee_name || userData.employee_id)
  }
  
  // axios 인증 헤더 설정
  const setAxiosAuthHeader = (authToken: string) => {
    if (axios?.defaults?.headers?.common) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
    }
  }
  
  // axios 인증 헤더 제거
  const removeAxiosAuthHeader = () => {
    if (axios?.defaults?.headers?.common) {
      delete axios.defaults.headers.common['Authorization']
    }
  }
  
  // 인증 데이터 로드
  const loadAuthData = (): boolean => {
    try {
      const authDataStr = localStorage.getItem(AUTH_STORAGE_KEY) || 
                          sessionStorage.getItem(AUTH_STORAGE_KEY)
      
      if (!authDataStr) {
        console.log('📭 저장된 인증 데이터 없음')
        return false
      }
      
      const authData = JSON.parse(authDataStr)
      
      // 데이터 유효성 검사
      if (authData?.user && authData?.token) {
        // 만료 시간 검사 (7일)
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - authData.timestamp > sevenDaysInMs) {
          console.log('⏰ 인증 데이터 만료됨')
          clearAuthData()
          return false
        }
        
        user.value = authData.user
        token.value = authData.token
        
        setAxiosAuthHeader(authData.token)
        
        console.log('✅ 저장된 인증 데이터 로드됨:', authData.user.employee_name || authData.user.employee_id)
        return true
      }
      
      console.log('❌ 인증 데이터 형식 오류')
      return false
    } catch (error) {
      console.error('❌ 인증 데이터 로드 에러:', error)
      clearAuthData()
      return false
    }
  }
  
  // 인증 데이터 삭제
  const clearAuthData = () => {
    user.value = null
    token.value = ''
    
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
    } catch (error) {
      console.error('❌ localStorage 삭제 실패:', error)
    }
    
    removeAxiosAuthHeader()
    
    console.log('🧹 인증 데이터 삭제됨')
  }
  
  // 토큰 검증
  const verifyToken = async (tokenToVerify?: string): Promise<boolean> => {
    try {
      const targetToken = tokenToVerify || token.value
      if (!targetToken) return false
      
      const response = await axios.get('/auth/verify', {
        headers: { Authorization: `Bearer ${targetToken}` },
        timeout: 10000
      })
      
      const isValid = response.data?.success === true
      console.log(isValid ? '✅ 토큰 검증 성공' : '❌ 토큰 검증 실패')
      return isValid
    } catch (error: any) {
      console.warn('⚠️ 토큰 검증 실패:', error.response?.status || error.message)
      return false
    }
  }
  
  // ================================
  // 🚀 주요 액션들
  // ================================
  
  // 로그인
  const login = async (employee_id: string, password: string) => {
    const { init: showToast } = useToast()
    
    try {
      isLoading.value = true
      
      console.log('🔐 로그인 요청:', { employee_id })
      
      const response = await axios.post('/auth/login', {
        employee_id,
        password
      }, {
        timeout: 15000 // 15초 타임아웃
      })
      
      if (response.data.success) {
        const { user: userData, token: userToken } = response.data
        
        // 인증 데이터 저장
        saveAuthData(userData, userToken)
        
        showToast({
          message: `${userData.employee_name || userData.employee_id}님 환영합니다!`,
          color: 'success',
          duration: 3000
        })
        
        console.log('✅ 로그인 성공:', userData.employee_name || userData.employee_id)
        return { success: true, user: userData }
      } else {
        throw new Error(response.data.message || '로그인에 실패했습니다.')
      }
      
    } catch (error: any) {
      console.error('❌ 로그인 에러:', error)
      
      let errorMessage = '로그인에 실패했습니다.'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.status === 401) {
        errorMessage = '사원번호 또는 비밀번호가 올바르지 않습니다.'
      } else if (error.response?.status === 429) {
        errorMessage = '너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.'
      } else if (error.response?.status === 500) {
        errorMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '로그인 요청 시간이 초과되었습니다. 네트워크를 확인해주세요.'
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      showToast({
        message: errorMessage,
        color: 'danger',
        duration: 4000
      })
      
      return { success: false, message: errorMessage }
    } finally {
      isLoading.value = false
    }
  }
  
  // 로그아웃 (라우터 인스턴스를 매개변수로 받음)
  const logout = async (routerInstance?: any) => {
    const { init: showToast } = useToast()
    
    try {
      isLoading.value = true
      
      console.log('🚪 로그아웃 시작...')
      
      showToast({
        message: '로그아웃 중...',
        color: 'info',
        duration: 1000
      })
      
      // 서버에 로그아웃 요청
      if (token.value) {
        try {
          await axios.post('/auth/logout', {}, {
            headers: { Authorization: `Bearer ${token.value}` },
            timeout: 5000
          })
          console.log('✅ 서버 로그아웃 요청 완료')
        } catch (err) {
          console.warn('⚠️ 서버 로그아웃 요청 실패:', err)
          // 서버 요청 실패해도 로컬 데이터는 삭제
        }
      }
      
      clearAuthData()
      
      showToast({
        message: '성공적으로 로그아웃되었습니다.',
        color: 'success',
        duration: 2000
      })
      
      console.log('✅ 로그아웃 완료')
      
      // 라우터가 전달된 경우에만 네비게이션
      if (routerInstance) {
        setTimeout(() => {
          routerInstance.push({ name: 'dashboard' })
        }, 500)
      } else {
        // 라우터가 없는 경우 페이지 새로고침
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
      }
      
    } catch (error) {
      console.error('❌ 로그아웃 에러:', error)
      
      // 에러가 발생해도 로컬 데이터는 삭제
      clearAuthData()
      
      showToast({
        message: '로그아웃 중 오류가 발생했지만 로그아웃되었습니다.',
        color: 'warning',
        duration: 3000
      })
      
      if (routerInstance) {
        setTimeout(() => {
          routerInstance.push({ name: 'dashboard' })
        }, 500)
      } else {
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
      }
    } finally {
      isLoading.value = false
    }
  }
  
  // 초기화 (앱 시작시) - 가장 중요한 함수
  const initialize = async () => {
    if (isInitialized.value) {
      console.log('🔄 이미 초기화됨')
      return
    }
    
    try {
      console.log('🚀 AuthStore 초기화 시작...')
      
      // axios 기본 설정
      if (typeof axios !== 'undefined') {
        // 기본 URL 설정 (환경에 맞게 수정)
        axios.defaults.baseURL = process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000'
        axios.defaults.timeout = 15000
        axios.defaults.withCredentials = false // 공개 API와의 호환성
        
        // 응답 인터셉터 설정 (기존 인터셉터가 있으면 제거하지 않음)
        axios.interceptors.response.use(
          (response) => response,
          (error) => {
            if (error.response?.status === 401) {
              console.log('🔒 인증 만료 감지, 자동 정리')
              
              // 인증 데이터 정리
              clearAuthData()
              
              // 토스트 메시지
              const { init: showToast } = useToast()
              showToast({
                message: '세션이 만료되었습니다. 다시 로그인해주세요.',
                color: 'warning',
                duration: 4000
              })
              
              // 로그인 페이지로 리다이렉트 (현재 페이지가 로그인이 아닌 경우)
              if (typeof window !== 'undefined' && 
                  !window.location.pathname.includes('/login')) {
                console.log('🔄 로그인 페이지로 리다이렉트')
                setTimeout(() => {
                  window.location.href = '/login'
                }, 1000)
              }
            }
            return Promise.reject(error)
          }
        )
      }
      
      // 저장된 인증 데이터 로드
      const hasAuth = loadAuthData()
      console.log('🔍 초기화 - 인증 데이터 확인:', hasAuth)
      
      if (hasAuth && token.value) {
        console.log('✅ 인증 데이터 있음, 사용자:', user.value?.employee_name || user.value?.employee_id)
        
        // 선택적 토큰 검증 (네트워크 오류 시에도 기존 데이터 유지)
        try {
          const isValid = await verifyToken()
          if (!isValid) {
            console.log('🔒 유효하지 않은 토큰, 정리')
            clearAuthData()
            
            const { init: showToast } = useToast()
            showToast({
              message: '세션이 만료되었습니다. 로그인 버튼을 눌러 다시 로그인해주세요.',
              color: 'warning',
              duration: 4000
            })
          }
        } catch (verifyError) {
          console.warn('⚠️ 토큰 검증 중 네트워크 오류:', verifyError)
          // 네트워크 오류의 경우 기존 인증 정보 유지
          console.log('🔄 네트워크 오류로 인한 토큰 검증 실패 - 기존 정보 유지')
        }
      } else {
        console.log('❌ 인증 데이터 없음 - 게스트 모드')
      }
      
      isInitialized.value = true
      console.log('✅ AuthStore 초기화 완료')
      
    } catch (error) {
      console.error('❌ 초기화 중 에러:', error)
      // 에러가 발생해도 앱이 중단되지 않도록 기본 상태로 설정
      isInitialized.value = true
      console.log('🔄 초기화 에러 발생 - 기본 상태로 계속 진행')
    }
  }
  
  // ================================
  // 🛠️ 유틸리티 함수들
  // ================================
  const formatDate = (dateString: string): string => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('ko-KR')
    } catch (error) {
      return dateString
    }
  }
  
  // 인증 상태 확인 (간단한 헬퍼)
  const checkAuth = (): boolean => {
    return loadAuthData()
  }
  
  // 강제 로그아웃 (에러 상황에서 사용)
  const forceLogout = () => {
    console.log('🚨 강제 로그아웃 실행')
    clearAuthData()
    
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }
  
  // 자동 로그인 시도 (개발용)
  const autoLogin = async (credentials?: { employee_id: string, password: string }) => {
    if (process.env.NODE_ENV !== 'development') return
    
    if (credentials) {
      console.log('🔧 개발용 자동 로그인 시도...')
      return await login(credentials.employee_id, credentials.password)
    }
  }
  
  // ================================
  // 🎭 반환할 것들
  // ================================
  return {
    // 상태 (읽기 전용으로 노출)
    user: readonly(user),
    token: readonly(token),
    isLoading: readonly(isLoading),
    isInitialized: readonly(isInitialized),
    
    // 계산된 속성
    isLoggedIn,
    displayName,
    userRole,
    
    // 주요 액션
    login,
    logout,
    initialize,
    
    // 인증 관련 유틸리티
    verifyToken,
    loadAuthData,
    clearAuthData,
    checkAuth,
    forceLogout,
    
    // 기타 유틸리티
    formatDate,
    autoLogin,
  }
})

// ================================
// 🌍 전역 유틸리티 (하위 호환성용)
// ================================
if (typeof window !== 'undefined') {
  (window as any).authUtils = {
    // Pinia 스토어와 연결된 전역 함수들
    getStore: () => useAuthStore(),
    
    // 편의 함수들
    getUser: () => {
      const store = useAuthStore()
      return store.user || null
    },
    
    getToken: () => {
      const store = useAuthStore()
      return store.token || null
    },
    
    isAuthenticated: () => {
      const store = useAuthStore()
      return store.isLoggedIn
    },
    
    logout: async () => {
      const store = useAuthStore()
      await store.logout()
      // 페이지 새로고침으로 상태 리셋
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1000)
      }
    },
    
    forceLogout: () => {
      const store = useAuthStore()
      store.forceLogout()
    }
  }
  
  // 개발용 전역 함수
  if (process.env.NODE_ENV === 'development') {
    (window as any).devAuth = {
      clearAuth: () => {
        const store = useAuthStore()
        store.clearAuthData()
      },
      
      checkAuth: () => {
        const store = useAuthStore()
        console.log('인증 상태:', store.isLoggedIn)
        console.log('사용자:', store.user)
        console.log('토큰:', store.token ? '***' + store.token.slice(-4) : 'None')
      }
    }
  }
}

export default useAuthStore