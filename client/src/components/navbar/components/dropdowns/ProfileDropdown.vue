<template>
  <div class="profile-dropdown-wrapper">
    <VaDropdown v-model="isShown" class="profile-dropdown" stick-to-edges>
      <template #anchor>
        <VaButton preset="secondary" color="textPrimary">
          <span class="profile-dropdown__anchor min-w-max">
            <VaAvatar 
              v-if="isLoggedIn && user?.profile_img" 
              :src="user.profile_img" 
              :size="24" 
              class="mr-2"
            />
            <VaIcon 
              v-else 
              :name="isLoggedIn ? 'account_circle' : 'person'" 
              class="mr-2" 
            />
            {{ displayName }}
            <VaIcon name="expand_more" class="ml-1" />
          </span>
        </VaButton>
      </template>
      <VaDropdownContent
        class="profile-dropdown__content md:w-60 px-0 py-4 w-full"
        :style="{ '--hover-color': hoverColor }"
      >
        <!-- 로그인된 상태 -->
        <template v-if="isLoggedIn">
          <!-- 사용자 정보 헤더 -->
          <div class="px-4 py-3 border-b border-gray-200">
            <div class="flex items-center space-x-3">
              <VaAvatar 
                v-if="user?.profile_img" 
                :src="user.profile_img" 
                :size="40"
              />
              <VaIcon v-else name="account_circle" size="40" color="primary" />
              <div>
                <div class="font-semibold text-sm">{{ user?.employee_name || '사용자' }}</div>
                <div class="text-xs text-gray-500">{{ user?.employee_id || '' }}</div>
                <div class="text-xs text-gray-500">{{ user?.position || '' }}</div>
                <div class="text-xs text-gray-500">{{ user?.department_name || user?.department_code || '' }}</div>
              </div>
            </div>
          </div>
          <VaList>
            <VaListItem
              key="logout"
              class="menu-item px-4 text-base cursor-pointer h-8"
              @click="handleLogout"
            >
              <VaIcon name="logout" class="pr-1" color="secondary" />
              로그아웃
            </VaListItem>
          </VaList>
        </template>

        <!-- 로그인 안된 상태 -->
        <template v-else>
          <VaList>
            <VaListItem
              key="login"
              class="menu-item px-4 text-base cursor-pointer h-8"
              @click="goToLogin"
            >
              <VaIcon name="login" class="pr-1" color="secondary" />
              로그인
            </VaListItem>
          </VaList>
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

    // 로그인 페이지로 이동
    router.push({ name: 'login' })
    
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

  &__content {
    .menu-item:hover {
      background: var(--hover-color);
    }
  }

  &__anchor {
    display: inline-flex;
    align-items: center;
  }
}

.border-gray-200 {
  border-color: #e5e7eb;
}

.space-x-3 > * + * {
  margin-left: 0.75rem;
}

.text-xs {
  font-size: 0.75rem;
  line-height: 1rem;
}

.text-gray-500 {
  color: #6b7280;
}

.font-semibold {
  font-weight: 600;
}
</style>