<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg w-[500px] h-[400px] flex flex-col">
      <!-- 헤더 -->
      <div class="flex justify-between items-center p-4 border-b">
        <h3 class="text-lg font-semibold">{{ modalTitle }} 선택</h3>
        <button @click="$emit('close')" class="text-xl">&times;</button>
      </div>

      <!-- 검색 -->
      <div class="p-4 border-b">
        <input 
          v-model="searchTerm"
          @input="searchEmployees"
          placeholder="사원명 또는 사원번호"
          class="w-full px-3 py-2 border"
        />
      </div>

      <!-- 결과 테이블 -->
      <div class="flex-1 overflow-auto p-4">
        <table class="w-full text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="border p-2">사원번호</th>
              <th class="border p-2">사원명</th>
              <th class="border p-2">부서</th>
              <th class="border p-2">선택</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in searchResults" :key="emp.employee_id">
              <td class="border p-2">{{ emp.employee_id }}</td>
              <td class="border p-2">{{ emp.emp_name }}</td>
              <td class="border p-2">{{ emp.dept_name }}</td>
              <td class="border p-2 text-center">
                <button 
                  @click="$emit('select', emp)"
                  class="px-2 py-1 border text-xs"
                >
                  선택
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const props = defineProps(['type'])
defineEmits(['select', 'close'])

const searchTerm = ref('')
const searchResults = ref([])

const modalTitle = computed(() => {
  return props.type === 'writer' ? '작성자' : '담당자'
})

const searchEmployees = async () => {
  console.log('검색 함수 호출됨:', searchTerm.value)
  
  // 절대 URL로 API 호출
  try {
    console.log('API 호출 시작...')
    const res = await axios.get('http://localhost:3000/workOrder/employees/search', {
      params: { q: searchTerm.value }
    })
    console.log('API 성공:', res.data)
    searchResults.value = res.data || []
  } catch (err) {
    console.error('API 오류:', err)
    console.error('오류 상세:', err.response)
    
    // 오류 시 더미 데이터로 대체
    searchResults.value = [
      { employee_id: 'EMP001', emp_name: '홍길동', dept_name: '개발팀', position: '사원' },
      { employee_id: 'EMP002', emp_name: '김철수', dept_name: '기획팀', position: '대리' },
      { employee_id: 'EMP003', emp_name: '이영희', dept_name: '영업팀', position: '과장' }
    ]
  }
}

onMounted(() => {
  searchEmployees() // 전체 목록 로드
})
</script>