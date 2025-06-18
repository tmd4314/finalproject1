// server/routers/equipmentInspectionRouter.js

const express = require('express')
const router = express.Router()
const service = require('../services/equipmentInspectionService')

// [GET] /equipment-inspection/equipments
// 점검 가능한 설비 목록 조회
router.get('/equipments', async (req, res) => {
  try {
    const list = await service.getInspectableEquipments()
    res.json({ isSuccessed: true, data: list })
  } catch (err) {
    console.error('점검 가능 설비 조회 실패:', err)
    res.status(500).json({ isSuccessed: false, message: '설비 조회 실패' })
  }
})

// [GET] /equipment-inspection/parts/:eq_type_code
// 설비 유형별 점검 항목 조회
router.get('/parts/:eq_type_code', async (req, res) => {
  try {
    const eq_type_code = req.params.eq_type_code
    const eq_name = req.query.eq_name || '' // 추가된 부분

    const parts = await service.getInspectionPartsByType(eq_type_code, eq_name)
    res.json(parts)
  } catch (err) {
    console.error('점검 항목 조회 실패:', err)
    res.status(500).json({ message: '점검 항목 조회 실패' })
  }
})

// [POST] /equipment-inspection/start
// 점검 시작
router.post('/start', async (req, res) => {
  try {
    const { eq_id, operator_id, inspection_type_code } = req.body
    
    if (!eq_id || !operator_id || !inspection_type_code) {
      return res.status(400).json({ isSuccessed: false, message: '필수 항목이 누락되었습니다.' })
    }

    // 점검 가능 여부 확인
    const availability = await service.checkInspectionAvailability(eq_id)
    if (availability !== 'AVAILABLE') {
      let message = '점검을 시작할 수 없습니다.'
      if (availability === 'CLEANING_IN_PROGRESS') {
        message = '청소가 진행 중인 설비는 점검할 수 없습니다.'
      } else if (availability === 'INSPECTION_IN_PROGRESS') {
        message = '이미 점검이 진행 중입니다.'
      }
      return res.status(400).json({ isSuccessed: false, message })
    }

    await service.startInspection({ eq_id, operator_id, inspection_type_code })
    res.json({ isSuccessed: true, message: '점검이 시작되었습니다.' })
  } catch (err) {
    console.error('점검 시작 실패:', err)
    res.status(500).json({ isSuccessed: false, message: '점검 시작에 실패했습니다.' })
  }
})

// [POST] /equipment-inspection/end
// 점검 종료 - 강화된 디버깅 버전
router.post('/end', async (req, res) => {
  console.log('🏁 ===== 점검 종료 요청 시작 =====')
  
  try {
    const { eq_id, parts } = req.body
    
    console.log('📝 요청 데이터:')
    console.log('  - 설비 ID:', eq_id)
    console.log('  - 점검 항목 수:', Array.isArray(parts) ? parts.length : 'parts가 배열이 아님')
    console.log('  - 점검 항목 상세:')
    
    if (Array.isArray(parts)) {
      parts.forEach((part, index) => {
        console.log(`    [${index}] ${part.name}: checked=${part.checked}, result=${part.result}, remark="${part.remark}", checker_id=${part.checker_id}`)
      })
    } else {
      console.log('    ❌ parts가 배열이 아닙니다:', typeof parts)
    }
    
    // 유효성 검사
    if (!eq_id || !Array.isArray(parts)) {
      console.log('❌ 필수 항목 누락 또는 잘못된 데이터 형식')
      return res.status(400).json({ isSuccessed: false, message: '필수 항목이 누락되었습니다.' })
    }

    console.log('🔄 서비스 함수 호출 중...')
    const result = await service.endInspection({ eq_id, parts })
    
    console.log('✅ 점검 종료 성공:', result)
    res.json({ isSuccessed: true, message: '점검이 완료되었습니다.' })
    
  } catch (err) {
    console.error('❌ 점검 종료 실패 상세:')
    console.error('  - 에러 타입:', err.constructor.name)
    console.error('  - 에러 메시지:', err.message)
    console.error('  - 스택 트레이스:', err.stack)
    
    // SQL 에러인 경우 추가 정보
    if (err.code) {
      console.error('  - SQL 에러 코드:', err.code)
      console.error('  - SQL 상태:', err.sqlState)
      console.error('  - SQL 메시지:', err.sqlMessage)
    }
    
    res.status(500).json({ 
      isSuccessed: false, 
      message: '점검 종료에 실패했습니다.',
      error: err.message,
      details: {
        type: err.constructor.name,
        code: err.code,
        sqlState: err.sqlState,
        sqlMessage: err.sqlMessage
      }
    })
  }
  
  console.log('🏁 ===== 점검 종료 요청 종료 =====')
})

// [GET] /equipment-inspection/employee
// 사원 목록 조회
router.get('/employee', async (req, res) => {
  try {
    const employees = await service.getAllEmployees()
    res.json(employees)
  } catch (err) {
    console.error('사원 목록 조회 실패:', err)
    res.status(500).json({ message: '사원 목록 조회에 실패했습니다.' })
  }
})

// [GET] /equipment-inspection/status/:eq_id
// 설비별 점검 상태 확인
router.get('/status/:eq_id', async (req, res) => {
  try {
    const status = await service.getEquipmentInspectionStatus(req.params.eq_id)
    res.json({ isSuccessed: true, data: status })
  } catch (err) {
    console.error('설비 점검 상태 조회 실패:', err)
    res.status(500).json({ isSuccessed: false, message: '점검 상태 조회 실패' })
  }
})

module.exports = router