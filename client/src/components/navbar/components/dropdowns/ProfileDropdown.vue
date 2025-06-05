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
            {{ isLoggedIn ? user?.employee_name || '사용자' : '계정' }}
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
                <div class="font-semibold text-sm">{{ user?.employee_name }}</div>
                <div class="text-xs text-gray-500">{{ user?.employee_no }}</div>
                <div class="text-xs text-gray-500">{{ user?.position }}</div>
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
              v-bind="loginLink"
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
import { ref, computed } from 'vue'
import { useColors } from 'vuestic-ui'
import { useRouter } from 'vue-router'

const { colors, setHSLAColor } = useColors()
const hoverColor = computed(() => setHSLAColor(colors.focus, { a: 0.1 }))
const router = useRouter()

// User 타입 정의 (생략 가능)
type User = {
  employee_id: number
  employee_no: string
  employee_name: string
  position: string
  hire_date: string
  phone: string
  email: string
  address: string
  employment_status: string
  reg_date: string
  upd_date: string
  gender: string
  profile_img?: string
  department_code: string
}

const props = withDefaults(
  defineProps<{
    isLoggedIn?: boolean
    user?: User
  }>(),
  {
    isLoggedIn: false,
    user: undefined
  }
)

const isShown = ref(false)

const emit = defineEmits<{
  logout: []
}>()

// 로그인 버튼 링크 속성 (라우터 사용)
const loginLink = { to: { name: 'login' } }

// 로그아웃 처리
const handleLogout = () => {
  emit('logout')
  isShown.value = false
}
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
</style>
