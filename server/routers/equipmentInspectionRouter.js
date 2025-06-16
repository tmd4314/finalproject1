const express = require('express')
const router = express.Router()
const inspectionService = require('../services/inspectionService')

// 점검 시작
router.post('/start', async (req, res) => {
  try {
    const result = await inspectionService.startInspection(req.body)
    res.json({ isSuccessed: true, data: result })
  } catch (err) {
    console.error('점검 시작 실패:', err)
    res.status(500).json({ 
      isSuccessed: false, 
      message: '점검 시작에 실패했습니다.',
      error: err.message 
    })
  }
})

// 점검 완료
router.post('/complete', async (req, res) => {
  try {
    const result = await inspectionService.completeInspection(req.body)
    res.json({ isSuccessed: true, data: result })
  } catch (err) {
    console.error('점검 완료 실패:', err)
    res.status(500).json({ 
      isSuccessed: false, 
      message: '점검 완료에 실패했습니다.',
      error: err.message 
    })
  }
})

// 설비별 점검 항목 조회
router.get('/parts/:eqTypeCode', async (req, res) => {
  try {
    const result = await inspectionService.getInspectionParts(req.params.eqTypeCode)
    res.json({ isSuccessed: true, data: result })
  } catch (err) {
    console.error('점검 항목 조회 실패:', err)
    res.status(500).json({ 
      isSuccessed: false, 
      message: '점검 항목 조회에 실패했습니다.',
      error: err.message 
    })
  }
})

// 사원 목록 조회 (직접 쿼리)
router.get('/employees', async (req, res) => {
  try {
    const result = await inspectionService.getEmployeesDirect()
    res.json(result)
  } catch (err) {
    console.error('직원 목록 조회 실패:', err)
    res.status(500).json({ 
      isSuccessed: false, 
      message: '직원 목록 조회에 실패했습니다.',
      error: err.message 
    })
  }
})

// 진행 중인 점검 조회
router.get('/in-progress/:eqId', async (req, res) => {
  try {
    const result = await inspectionService.getInProgressInspection(req.params.eqId)
    res.json({ isSuccessed: true, data: result })
  } catch (err) {
    console.error('진행 중인 점검 조회 실패:', err)
    res.status(500).json({ 
      isSuccessed: false, 
      message: '진행 중인 점검 조회에 실패했습니다.',
      error: err.message 
    })
  }
})

// 점검 이력 조회
router.get('/history/:eqId', async (req, res) => {
  try {
    const result = await inspectionService.getInspectionHistory(req.params.eqId)
    res.json({ isSuccessed: true, data: result })
  } catch (err) {
    console.error('점검 이력 조회 실패:', err)
    res.status(500).json({ 
      isSuccessed: false, 
      message: '점검 이력 조회에 실패했습니다.',
      error: err.message 
    })
  }
})

module.exports = router