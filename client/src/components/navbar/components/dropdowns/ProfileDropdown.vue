<template>
  <div class="profile-dropdown-wrapper">
    <VaDropdown v-model="isShown" class="profile-dropdown" stick-to-edges>
      <template #anchor>
        <VaButton preset="secondary" color="textPrimary" class="profile-dropdown__button">
          <span class="profile-dropdown__anchor">
            <VaAvatar 
              v-if="isLoggedIn && user?.profile_img" 
              :src="user.profile_img" 
              :size="14" 
              class="mr-1"
            />
            <VaIcon 
              v-else 
              :name="isLoggedIn ? 'account_circle' : 'person'" 
              class="mr-1" 
              size="14"
            />
            {{ displayName }}
            <VaIcon name="expand_more" class="ml-1" size="12" />
          </span>
        </VaButton>
      </template>
      <VaDropdownContent
        class="profile-dropdown__content w-50 p-0 m-0"
        :style="{ 
          '--hover-color': hoverColor, 
          'height': 'auto', 
          'min-height': '40px',
          'max-height': '50px',
          'overflow': 'visible',
          'padding': '0',
          'margin': '0'
        }"
      >
        <!-- 로그인된 상태 -->
        <template v-if="isLoggedIn">
          <!-- 로그아웃 버튼만 (큰 크기) -->
          <div 
            class="menu-item cursor-pointer hover:bg-gray-50 flex items-center justify-center"
            style="font-size: 16px; line-height: 1.2; gap: 8px; white-space: nowrap; height: 40px; min-height: 40px; padding: 8px 16px; margin: 0; display: flex !important; align-items: center !important; justify-content: center !important;"
            @click="handleLogout"
          >
            <VaIcon name="logout" size="18" color="secondary" />
            로그아웃
          </div>
        </template>

        <!-- 로그인 안된 상태 -->
        <template v-else>
          <div
            class="menu-item cursor-pointer hover:bg-gray-50 flex items-center justify-center"
            style="font-size: 16px; line-height: 1.2; gap: 8px; white-space: nowrap; height: 40px; min-height: 40px; padding: 8px 16px; margin: 0; display: flex !important; align-items: center !important; justify-content: center !important;"
            @click="goToLogin"
          >
            <VaIcon name="login" size="18" color="primary" />
            로그인
          </div>
        </template>
      </VaDropdownContent>
    </VaDropdown>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useColors } from 'vuestic-ui'
import { useRouter } from 'vue-router'
import { useToast } from 'vuestic-ui'
import axios from 'axios'

// ================================
// 🔧 컴포넌트 설정
// ================================
const { colors, setHSLAColor } = useColors()
const hoverColor = computed(() => setHSLAColor(colors.focus, { a: 0.1 }))
const router = useRouter()
const { init: showToast } = useToast()

// ================================
// 🎯 상태 관리
// ================================
const user = ref<any>(null)
const isShown = ref(false)

// ================================
// 💡 계산된 속성
// ================================
const isLoggedIn = computed(() => !!user.value)

const displayName = computed(() => {
  if (isLoggedIn.value && user.value) {
    return user.value.employee_name || `사원 ${user.value.employee_id}` || '사용자'
  }
  return '계정'
})

// 사용자 역할 정보를 간소화
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
const AUTH_STORAGE_KEY = 'auth-store'

// 인증 데이터 로드
const loadAuthData = () => {
  try {
    let authDataStr = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY)
    
    if (!authDataStr) return null
    
    const authData = JSON.parse(authDataStr)
    
    if (authData?.user && authData?.token) {
      return authData
    }
    
    return null
  } catch (error) {
    console.error('ProfileDropdown: 인증 데이터 로드 에러:', error)
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

// ================================
// 🔐 인증 상태 확인 및 로드
// ================================
const checkAuthAndLoadUser = () => {
  try {
    const authData = loadAuthData()
    
    if (authData?.user) {
      user.value = authData.user
      console.log('ProfileDropdown: 사용자 정보 로드됨', authData.user.employee_name)
    } else {
      user.value = null
      console.log('ProfileDropdown: 인증되지 않은 상태')
    }
    
  } catch (error) {
    console.error('ProfileDropdown: 인증 확인 중 에러:', error)
    user.value = null
  }
}

// ================================
// 🚪 로그인/로그아웃 처리
// ================================
const goToLogin = () => {
  isShown.value = false
  router.push({ name: 'login' })
}

const handleLogout = async () => {
  isShown.value = false
  
  try {
    const authData = loadAuthData()
    
    showToast({
      message: '로그아웃 중...',
      color: 'info',
      duration: 1000
    })

    // 서버에 로그아웃 요청
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

    // 대시보드로 이동 (로그인 페이지 대신)
    router.push({ name: 'dashboard' })
    
  } catch (error) {
    console.error('ProfileDropdown: 로그아웃 에러:', error)
    showToast({
      message: '로그아웃 중 오류가 발생했습니다.',
      color: 'danger',
      duration: 3000
    })
  }
}

// ================================
// 🎧 이벤트 리스너들
// ================================
const handleAuthStateChange = (event: any) => {
  console.log('ProfileDropdown: 인증 상태 변경 감지', event.detail)
  
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
  }
}

// ================================
// 🚀 컴포넌트 초기화
// ================================
onMounted(() => {
  // axios 기본 설정
  if (typeof axios !== 'undefined') {
    axios.defaults.baseURL = 'http://localhost:3000'
  }
  
  // 초기 인증 상태 확인
  checkAuthAndLoadUser()
  
  // 전역 이벤트 리스너 등록
  window.addEventListener('auth-state-changed', handleAuthStateChange)
})

onUnmounted(() => {
  // 이벤트 리스너 정리
  window.removeEventListener('auth-state-changed', handleAuthStateChange)
})
</script>

<style lang="scss">
.profile-dropdown {
  cursor: pointer;

  &__button {
    padding: 2px 6px !important;
    min-height: 28px !important;
    height: 28px !important;
    font-size: 12px !important;
  }

  &__content {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
    border-radius: 6px !important;
    border: 1px solid #e5e7eb !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
    min-width: 0 !important;
    min-height: 40px !important;
    height: auto !important;
    max-height: 50px !important;
    
    /* 강력한 선택자로 모든 VaDropdown 요소 제어 */
    &,
    & > *,
    & > * > *,
    & .va-dropdown-content,
    & .va-dropdown-content__content,
    & .va-dropdown__content,
    & .va-list,
    & .va-list-item {
      padding: 0 !important;
      margin: 0 !important;
      min-height: 0 !important;
      height: auto !important;
      line-height: 1.2 !important;
    }
    
    .menu-item {
      transition: background-color 0.1s !important;
      margin: 0 !important;
      line-height: 1.2 !important;
      border: none !important;
      height: 40px !important;
      min-height: 40px !important;
      max-height: 40px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 8px 16px !important;
      visibility: visible !important;
      opacity: 1 !important;
      font-size: 16px !important;
      
      &:hover {
        background-color: #f1f5f9 !important;
      }
    }
  }

  &__anchor {
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    gap: 2px;
  }
}

// 더 구체적인 선택자로 패딩 강제 적용
.profile-dropdown .menu-item {
  padding: 1px 3px !important;
}

/* 더 구체적한 선택자로 패딩 강제 적용 */
.profile-dropdown .menu-item {
  padding: 3px 6px !important;
  height: 24px !important;
  min-height: 24px !important;
  max-height: 24px !important;
  display: flex !important;
  align-items: center !important;
  visibility: visible !important;
  opacity: 1 !important;
}

/* VaDropdown 전역 오버라이드 */
.va-dropdown-content {
  &.profile-dropdown__content {
    min-height: 50px !important;
    height: auto !important;
    max-height: 60px !important;
    overflow: visible !important;
    
    .va-dropdown-content__content {
      min-height: 50px !important;
      height: auto !important;
      max-height: 60px !important;
      padding: 0 !important;
      overflow: visible !important;
    }
  }
}

/* 업데이트된 패딩 클래스들 - 큰 크기용 */
.px-4 {
  padding-left: 16px !important;
  padding-right: 16px !important;
}

.py-2 {
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}

/* 기존 작은 크기 패딩들 */
.px-1 {
  padding-left: 3px !important;
  padding-right: 3px !important;
}

.py-0\.5 {
  padding-top: 1px !important;
  padding-bottom: 1px !important;
}

.px-2 {
  padding-left: 4px !important;
  padding-right: 4px !important;
}

.py-1 {
  padding-top: 2px !important;
  padding-bottom: 2px !important;
}

.px-3 {
  padding-left: 6px !important;
  padding-right: 6px !important;
}

.py-1\.5 {
  padding-top: 3px !important;
  padding-bottom: 3px !important;
}

/* 극소 마진 */
.mr-1 {
  margin-right: 2px !important;
}

.ml-1 {
  margin-left: 2px !important;
}

.border-gray-200 {
  border-color: #e5e7eb;
}

.text-xs {
  font-size: 0.75rem;
  line-height: 1rem;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-gray-500 {
  color: #6b7280;
}

.font-medium {
  font-weight: 500;
}

.font-semibold {
  font-weight: 600;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.min-w-0 {
  min-width: 0;
}

.flex-1 {
  flex: 1 1 0%;
}

.hover\:bg-gray-50:hover {
  background-color: #f9fafb;
}
</style>