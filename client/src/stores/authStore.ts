// 📁 src/stores/authStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const AUTH_STORAGE_KEY = 'auth-store'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref('')
  const isLoggedIn = computed(() => !!user.value && !!token.value)

  // 로그인 상태 저장
  function setAuth(authData: any, remember = false) {
    user.value = authData.user
    token.value = authData.token

    axios.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`

    const storage = remember ? localStorage : sessionStorage
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
  }

  // 인증 정보 로드
  function loadAuth() {
    const dataStr = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY)
    if (!dataStr) return

    try {
      const parsed = JSON.parse(dataStr)
      if (parsed?.user && parsed?.token) {
        user.value = parsed.user
        token.value = parsed.token
        axios.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`
      }
    } catch (e) {
      console.error('authStore load error:', e)
    }
  }

  // 로그아웃
  async function logout(router?: any) {
    try {
      await axios.post('/auth/logout')
    } catch (e) {
      console.warn('Logout API 실패:', e)
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
      user.value = null
      token.value = ''
      delete axios.defaults.headers.common['Authorization']

      if (router) {
        router.push({ name: 'login' })
      }
    }
  }

  return {
    user,
    token,
    isLoggedIn,
    setAuth,
    loadAuth,
    logout,
  }
})