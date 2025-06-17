// src/stores/authStore.ts (axios 설정 수정 버전)
import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import axios from 'axios'
import { useToast } from 'vuestic-ui'

const AUTH_STORAGE_KEY = 'auth-store'

export const useAuthStore = defineStore('auth', () => {
  // ================================
  // 상태 관리
  // ================================
  const user = ref<any>(null)
  const token = ref('')
  const isLoading = ref(false)
  const isInitialized = ref(false)
  
  // ================================
  // 계산된 속성
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
  // 인증 관련 함수들
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
      console.error('localStorage 저장 실패:', error)
    }
    
    // axios 기본 헤더 설정
    setAxiosAuthHeader(userToken)
    
    console.log('인증 데이터 저장됨:', userData.employee_name || userData.employee_id)
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
        console.log('저장된 인증 데이터 없음')
        return false
      }
      
      const authData = JSON.parse(authDataStr)
      
      // 데이터 유효성 검사
      if (authData?.user && authData?.token) {
        // 만료 시간 검사 (7일) - 경고만 표시하고 로그아웃하지 않음
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - authData.timestamp > sevenDaysInMs) {
          console.log('인증 데이터가 7일 이상 지났지만 유지함')
          // 자동 로그아웃 제거 - 사용자가 직접 로그아웃할 때까지 유지
        }
        
        user.value = authData.user
        token.value = authData.token
        
        setAxiosAuthHeader(authData.token)
        
        console.log('저장된 인증 데이터 로드됨:', authData.user.employee_name || authData.user.employee_id)
        return true
      }
      
      console.log('인증 데이터 형식 오류')
      return false
    } catch (error) {
      console.error('인증 데이터 로드 에러:', error)
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
      console.error('localStorage 삭제 실패:', error)
    }
    
    removeAxiosAuthHeader()
    
    console.log('인증 데이터 삭제됨')
  }
  
  // 토큰 검증
  const verifyToken = async (tokenToVerify?: string): Promise<boolean> => {
    try {
      const targetToken = tokenToVerify || token.value
      if (!targetToken) return false
      
      const response = await axios.get('http://localhost:3000/auth/verify', {
        headers: { Authorization: `Bearer ${targetToken}` },
        timeout: 10000
      })
      
      const isValid = response.data?.success === true
      console.log(isValid ? '토큰 검증 성공' : '토큰 검증 실패')
      return isValid
    } catch (error: any) {
      console.warn('토큰 검증 실패:', error.response?.status || error.message)
      return false
    }
  }
  
  // ================================
  // 주요 액션들
  // ================================
  
  // 로그인 (개선된 버전)
  const login = async (employee_id: string, password: string) => {
    const { init: showToast } = useToast()
    
    try {
      isLoading.value = true
      
      console.log('로그인 요청:', { employee_id })
      console.log('전송할 데이터:', { employee_id, password: '***' })
      
      // 중요: 명시적으로 Content-Type 헤더 설정
      const response = await axios.post('http://localhost:3000/auth/login', {
        employee_id: employee_id.toString().trim(),
        password: password.toString().trim()
      }, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })
      
      console.log('서버 응답:', response.data)
      
      if (response.data.success) {
        const { user: userData, token: userToken } = response.data
        
        // 인증 데이터 저장
        saveAuthData(userData, userToken)
        
        showToast({
          message: `${userData.employee_name || userData.employee_id}님 환영합니다!`,
          color: 'success',
          duration: 3000
        })
        
        console.log('로그인 성공:', userData.employee_name || userData.employee_id)
        return { success: true, user: userData }
      } else {
        throw new Error(response.data.message || '로그인에 실패했습니다.')
      }
      
    } catch (error: any) {
      console.error('로그인 에러:', error)
      console.error('에러 응답:', error.response?.data)
      
      let errorMessage = '로그인에 실패했습니다.'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.status === 401) {
        errorMessage = '사원번호 또는 비밀번호가 올바르지 않습니다.'
      } else if (error.response?.status === 400) {
        errorMessage = '입력값을 확인해주세요.'
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
  
  // 로그아웃
  const logout = async (routerInstance?: any) => {
    const { init: showToast } = useToast()
    
    try {
      isLoading.value = true
      
      console.log('로그아웃 시작...')
      
      showToast({
        message: '로그아웃 중...',
        color: 'info',
        duration: 1000
      })
      
      // 서버에 로그아웃 요청
      if (token.value) {
        try {
          await axios.post('http://localhost:3000/auth/logout', {}, {
            headers: { Authorization: `Bearer ${token.value}` },
            timeout: 5000
          })
          console.log('서버 로그아웃 요청 완료')
        } catch (err) {
          console.warn('서버 로그아웃 요청 실패:', err)
        }
      }
      
      clearAuthData()
      
      showToast({
        message: '성공적으로 로그아웃되었습니다.',
        color: 'success',
        duration: 2000
      })
      
      console.log('로그아웃 완료')
      
      if (routerInstance) {
        setTimeout(() => {
          routerInstance.push({ name: 'dashboard' })
        }, 500)
      } else {
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 500)
      }
      
    } catch (error) {
      console.error('로그아웃 에러:', error)
      
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
  
  // 초기화 (앱 시작시) - axios 설정 개선
  const initialize = async () => {
    if (isInitialized.value) {
      console.log('이미 초기화됨')
      return
    }
    
    try {
      console.log('AuthStore 초기화 시작...')
      
      // axios 기본 설정 개선
      if (typeof axios !== 'undefined') {
        // 기본 URL 설정 - 명시적으로 백엔드 서버 포트 지정
        axios.defaults.baseURL = 'http://localhost:3000'
        axios.defaults.timeout = 15000
        axios.defaults.withCredentials = false
        
        // 중요: Content-Type 기본 헤더 설정
        axios.defaults.headers.common['Content-Type'] = 'application/json'
        axios.defaults.headers.common['Accept'] = 'application/json'
        
        // POST 요청용 헤더 설정
        axios.defaults.headers.post['Content-Type'] = 'application/json'
        
        console.log('axios 기본 설정 완료:', {
          baseURL: axios.defaults.baseURL,
          timeout: axios.defaults.timeout,
          contentType: axios.defaults.headers.common['Content-Type']
        })
        
        // 요청 인터셉터 추가 (디버깅용)
        axios.interceptors.request.use(
          (config) => {
            console.log('요청 전송:', {
              method: config.method?.toUpperCase(),
              url: config.url,
              data: config.data,
              headers: config.headers
            })
            return config
          },
          (error) => {
            console.error('요청 인터셉터 에러:', error)
            return Promise.reject(error)
          }
        )
        
        // 응답 인터셉터 설정
        axios.interceptors.response.use(
          (response) => {
            console.log('응답 수신:', {
              status: response.status,
              data: response.data
            })
            return response
          },
          (error) => {
            console.error('응답 에러:', {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message
            })
            
            if (error.response?.status === 401) {
              console.log('401 에러 발생했지만 자동 로그아웃하지 않음')
              // 자동 로그아웃 제거 - 사용자가 직접 로그아웃할 때까지 유지
            }
            return Promise.reject(error)
          }
        )
      }
      
      // 저장된 인증 데이터 로드
      const hasAuth = loadAuthData()
      console.log('초기화 - 인증 데이터 확인:', hasAuth)
      
      if (hasAuth && token.value) {
        console.log('인증 데이터 있음, 사용자:', user.value?.employee_name || user.value?.employee_id)
        
        // 선택적 토큰 검증 (실패해도 로그아웃하지 않음)
        try {
          const isValid = await verifyToken()
          if (!isValid) {
            console.log('토큰 검증 실패했지만 로그인 상태 유지')
            // 자동 로그아웃 제거 - 사용자가 직접 로그아웃할 때까지 유지
          }
        } catch (verifyError) {
          console.warn('토큰 검증 중 네트워크 오류:', verifyError)
          console.log('네트워크 오류로 인한 토큰 검증 실패 - 기존 정보 유지')
        }
      } else {
        console.log('인증 데이터 없음 - 게스트 모드')
      }
      
      isInitialized.value = true
      console.log('AuthStore 초기화 완료')
      
    } catch (error) {
      console.error('초기화 중 에러:', error)
      isInitialized.value = true
      console.log('초기화 에러 발생 - 기본 상태로 계속 진행')
    }
  }
  
  // ================================
  // 유틸리티 함수들
  // ================================
  const formatDate = (dateString: string): string => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('ko-KR')
    } catch (error) {
      return dateString
    }
  }
  
  // 인증 상태 확인
  const checkAuth = (): boolean => {
    return loadAuthData()
  }
  
  // 강제 로그아웃
  const forceLogout = () => {
    console.log('강제 로그아웃 실행')
    clearAuthData()
    
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }
  
  // 자동 로그인 시도 (개발용)
  const autoLogin = async (credentials?: { employee_id: string, password: string }) => {
    if (process.env.NODE_ENV !== 'development') return
    
    if (credentials) {
      console.log('개발용 자동 로그인 시도...')
      return await login(credentials.employee_id, credentials.password)
    }
  }
  
  // ================================
  // 반환할 것들
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

// 전역 유틸리티
if (typeof window !== 'undefined') {
  (window as any).authUtils = {
    getStore: () => useAuthStore(),
    
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