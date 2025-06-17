// src/stores/authStore.ts (완전 수정된 버전)
import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import axios from 'axios'
import { useToast } from 'vuestic-ui'

const AUTH_STORAGE_KEY = 'auth-store'

// 🔥 사용자 타입 정의
interface User {
  employee_id: string | number
  employee_name: string
  department_code: string
  department_name?: string
  position?: string
  [key: string]: any
}

// 🔥 부서 권한 타입 정의
interface DepartmentPermission {
  name: string
  modules: string[]
  description: string
}

export const useAuthStore = defineStore('auth', () => {
  // ================================
  // 상태 관리
  // ================================
  const user = ref<User | null>(null)
  const token = ref<string>('')
  const isLoading = ref<boolean>(false)
  const isInitialized = ref<boolean>(false)
  
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
    
    const parts: string[] = []
    if (user.value.position) parts.push(user.value.position)
    if (user.value.department_name || user.value.department_code) {
      parts.push(user.value.department_name || user.value.department_code)
    }
    
    return parts.join(' • ')
  })

  // ================================
  // 🔥 부서별 권한 관리 시스템
  // ================================
  
  // 부서별 권한 매핑 (department 테이블의 department_code 기준)
  const DEPARTMENT_PERMISSIONS: Record<string, DepartmentPermission> = {
    '01': {
      name: '생산',
      modules: ['production'], // 생산 관리만
      description: '생산 관리 권한'
    },
    '02': {
      name: '자재',
      modules: ['material', 'inventory'], // 자재/재고 관리만
      description: '자재 관리 권한'
    },
    '03': {
      name: '포장',
      modules: ['packaging'], // 포장 관리 (라인 관리 포함)
      description: '포장 라인 관리 권한'
    },
    '04': {
      name: '품질',
      modules: ['quality', 'inspection'], // 품질 관리만
      description: '품질 관리 권한'
    },
    '05': {
      name: '물류',
      modules: ['logistics', 'shipping'], // 물류 관리만
      description: '물류 관리 권한'
    },
    '06': {
      name: '총무',
      modules: ['admin', 'user_manage'], // 관리자 권한만
      description: '총무 관리 권한'
    },
    '07': {
      name: '영업',
      modules: ['sales', 'order'], // 영업 관리만
      description: '영업 관리 권한'
    }
  }
  
  // 사용자 부서 정보
  const userDepartment = computed(() => {
    if (!user.value || !user.value.department_code) return null
    return DEPARTMENT_PERMISSIONS[user.value.department_code] || null
  })
  
  // 특정 모듈 권한 확인 함수
  const hasModulePermission = (module: string): boolean => {
    if (!isLoggedIn.value) return false
    
    // 🔥 관리자는 모든 권한 허용
    if (user.value?.position === '관리자') return true
    
    if (!userDepartment.value) return false
    return userDepartment.value.modules.includes(module)
  }
  
  // 부서별 권한 확인 (Computed Properties)
  const isPackagingEmployee = computed(() => hasModulePermission('packaging'))
  // 🔥 포장 라인은 포장 부서 전용이므로 관리/조회 권한이 동일
  const canManageLines = computed(() => 
    user.value?.position === '관리자' || user.value?.department_code === '03'
  )
  const canViewLines = computed(() => 
    user.value?.position === '관리자' || user.value?.department_code === '03'
  )
  const canManageProduction = computed(() => hasModulePermission('production'))
  const canManageMaterial = computed(() => hasModulePermission('material'))
  const canManageQuality = computed(() => hasModulePermission('quality'))
  const canManageLogistics = computed(() => hasModulePermission('logistics'))
  const canManageAdmin = computed(() => hasModulePermission('admin'))
  const canManageSales = computed(() => hasModulePermission('sales'))
  
  // 권한 메시지 생성 (모듈별)
  const getPermissionMessage = (module: string = 'line_manage'): string => {
    if (!isLoggedIn.value) {
      return '이 기능을 사용하려면 로그인이 필요합니다.'
    }
    
    // 🔥 관리자는 모든 권한이 있으므로 메시지 없음
    if (user.value?.position === '관리자') {
      return ''
    }
    
    // 🔥 라인 관련 기능은 포장 부서 전용
    if (module === 'line_manage' || module === 'line_view') {
      if (user.value?.department_code !== '03') {
        return '라인 관리는 포장부서 전용 기능입니다.'
      }
      return ''
    }
    
    if (!userDepartment.value) {
      return '부서 정보를 확인할 수 없습니다. 관리자에게 문의하세요.'
    }
    
    if (!hasModulePermission(module)) {
      const moduleNames: Record<string, string> = {
        'production': '생산 관리',
        'material': '자재 관리',
        'quality': '품질 관리',
        'logistics': '물류 관리',
        'admin': '관리자',
        'sales': '영업 관리',
        'packaging': '포장 관리'
      }
      
      const moduleName = moduleNames[module] || module
      return `${moduleName} 권한이 없습니다. (현재: ${userDepartment.value.name}부서 - ${userDepartment.value.description})`
    }
    
    return ''
  }
  
  // 사용자 권한 요약
  const userPermissionSummary = computed(() => {
    if (!user.value) return null
    
    // 🔥 관리자인 경우 모든 권한 허용
    if (user.value.position === '관리자') {
      return {
        departmentName: '관리자',
        departmentCode: user.value.department_code,
        description: '전체 시스템 관리 권한',
        modules: ['admin', 'packaging', 'production', 'material', 'quality', 'logistics', 'sales'],
        permissions: {
          canViewLines: true,
          canManageLines: true,
          canManageProduction: true,
          canManageMaterial: true,
          canManageQuality: true,
          canManageLogistics: true,
          canManageAdmin: true,
          canManageSales: true
        }
      }
    }
    
    if (!userDepartment.value) return null
    
    return {
      departmentName: userDepartment.value.name,
      departmentCode: user.value?.department_code,
      description: userDepartment.value.description,
      modules: userDepartment.value.modules,
      permissions: {
        canViewLines: canViewLines.value,
        canManageLines: canManageLines.value,
        canManageProduction: canManageProduction.value,
        canManageMaterial: canManageMaterial.value,
        canManageQuality: canManageQuality.value,
        canManageLogistics: canManageLogistics.value,
        canManageAdmin: canManageAdmin.value,
        canManageSales: canManageSales.value
      }
    }
  })
  
  // ================================
  // 인증 관련 함수들
  // ================================
  
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
  
  // 인증 데이터 저장
  const saveAuthData = (userData: User, userToken: string) => {
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
    console.log('부서 정보:', userData.department_name || userData.department_code)
    console.log('권한 정보:', userData.department_code ? DEPARTMENT_PERMISSIONS[userData.department_code] || '권한 없음' : '권한 없음')
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
        }
        
        user.value = authData.user
        token.value = authData.token
        
        setAxiosAuthHeader(authData.token)
        
        console.log('저장된 인증 데이터 로드됨:', authData.user.employee_name || authData.user.employee_id)
        console.log('부서 정보:', authData.user.department_name || authData.user.department_code)
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
        
        // 🔥 관리자/부서별 권한 메시지 표시
        let welcomeMessage = `${userData.employee_name || userData.employee_id}님 환영합니다!`
        
        if (userData.position === '관리자') {
          welcomeMessage += ` (관리자 - 전체 시스템 관리 권한)`
        } else {
          const departmentInfo = DEPARTMENT_PERMISSIONS[userData.department_code]
          if (departmentInfo) {
            welcomeMessage += ` (${departmentInfo.name}부서 - ${departmentInfo.description})`
          } else {
            welcomeMessage += ` (${userData.department_name || userData.department_code} - 조회 전용)`
          }
        }
        
        showToast({
          message: welcomeMessage,
          color: 'success',
          duration: 4000
        })
        
        console.log('로그인 성공:', userData.employee_name || userData.employee_id)
        console.log('권한 정보:', {
          department: userData.department_name || userData.department_code,
          position: userData.position,
          permissions: userData.position === '관리자' ? 
            '전체 권한' : 
            (userData.department_code ? DEPARTMENT_PERMISSIONS[userData.department_code] || '권한 없음' : '권한 없음')
        })
        
        return { success: true, user: userData }
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
  
  // 초기화 (앱 시작시)
  const initialize = async () => {
    if (isInitialized.value) {
      console.log('이미 초기화됨')
      return
    }
    
    try {
      console.log('AuthStore 초기화 시작...')
      
      // axios 기본 설정
      if (typeof axios !== 'undefined') {
        axios.defaults.baseURL = 'http://localhost:3000'
        axios.defaults.timeout = 15000
        axios.defaults.withCredentials = false
        axios.defaults.headers.common['Content-Type'] = 'application/json'
        axios.defaults.headers.common['Accept'] = 'application/json'
        axios.defaults.headers.post['Content-Type'] = 'application/json'
        
        console.log('axios 기본 설정 완료')
        
        // 응답 인터셉터 설정
        axios.interceptors.response.use(
          (response) => response,
          (error) => {
            console.error('응답 에러:', {
              status: error.response?.status,
              data: error.response?.data,
              message: error.message
            })
            
            if (error.response?.status === 401) {
              console.log('401 에러 발생했지만 자동 로그아웃하지 않음')
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
        console.log('부서 권한:', {
          department: user.value?.department_name || user.value?.department_code,
          position: user.value?.position,
          permissions: user.value?.position === '관리자' ? 
            '전체 권한' : 
            (user.value?.department_code ? DEPARTMENT_PERMISSIONS[user.value.department_code] || '권한 없음' : '권한 없음')
        })
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
  
  // 🔥 권한 체크 함수 (모듈별)
  const checkPermission = (module: string = 'line_manage', action: string = '이 작업'): boolean => {
    if (!isLoggedIn.value) {
      console.log(`권한 체크 실패: 로그인 필요 - ${action}`)
      return false
    }
    
    // 🔥 관리자는 모든 권한 허용
    if (user.value?.position === '관리자') {
      console.log(`권한 체크 성공: 관리자 권한 - ${action}`)
      return true
    }
    
    // 🔥 라인 관련 기능은 포장 부서 전용
    if (module === 'line_manage' || module === 'line_view') {
      if (user.value?.department_code === '03') {
        console.log(`권한 체크 성공: 포장부서 라인 권한 - ${action}`)
        return true
      } else {
        console.log(`권한 체크 실패: 포장부서 전용 기능 - ${action}`)
        return false
      }
    }
    
    if (!hasModulePermission(module)) {
      console.log(`권한 체크 실패: ${module} 모듈 권한 없음 - ${action}`)
      return false
    }
    
    console.log(`권한 체크 성공: ${module} 모듈 - ${action}`)
    return true
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
    
    // 🔥 권한 관련 추가
    isPackagingEmployee,
    canManageLines,
    canViewLines,
    canManageProduction,
    canManageMaterial,
    canManageQuality,
    canManageLogistics,
    canManageAdmin,
    canManageSales,
    userDepartment,
    userPermissionSummary,
    hasModulePermission,
    getPermissionMessage,
    
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
    
    // 🔥 권한 체크 함수 추가
    checkPermission,
    
    // 기타 유틸리티
    formatDate,
  }
})

export default useAuthStore