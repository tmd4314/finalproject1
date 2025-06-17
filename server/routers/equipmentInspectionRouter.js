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
    const parts = await service.getInspectionPartsByType(req.params.eq_type_code)
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
// 점검 종료
router.post('/end', async (req, res) => {
  try {
    const { eq_id, parts } = req.body
    
    if (!eq_id || !Array.isArray(parts)) {
      return res.status(400).json({ isSuccessed: false, message: '필수 항목이 누락되었습니다.' })
    }

    await service.endInspection({ eq_id, parts })
    res.json({ isSuccessed: true, message: '점검이 완료되었습니다.' })
  } catch (err) {
    console.error('점검 종료 실패:', err)
    res.status(500).json({ isSuccessed: false, message: '점검 종료에 실패했습니다.' })
  }
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