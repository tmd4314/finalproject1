// server/routes/packages.js - Service 사용 버전
const express = require('express');
const router = express.Router();
const packageService = require('../services/packageService');

// 🔥 헬스체크
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Package API is running',
    timestamp: new Date().toISOString()
  });
});

// 🔥 작업 등록
router.post('/work', async (req, res) => {
  try {
    const {
      work_no,
      line_id,
      work_line,
      work_step,
      step_name,
      input_qty,
      eq_code,
      employee_no,
      employee_name
    } = req.body;
    
    console.log(`=== 작업 등록: ${work_no} ===`);
    
    // 필수 필드 검증
    if (!work_no || !input_qty || !employee_no) {
      return res.status(400).json({
        success: false,
        message: '필수 항목이 누락되었습니다.',
        required: ['work_no', 'input_qty', 'employee_no']
      });
    }
    
    // Service를 통한 작업 등록
    const result = await packageService.createWork({
      work_no,
      line_id,
      work_line,
      work_step,
      step_name,
      input_qty,
      eq_code,
      employee_no,
      employee_name
    });
    
    console.log('작업 등록 성공');
    res.json({
      success: true,
      message: '작업이 등록되었습니다.',
      data: result
    });
    
  } catch (error) {
    console.error('작업 등록 실패:', error);
    
    // 비즈니스 로직 에러 처리
    if (error.message.includes('이미 존재하는')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('필수 데이터') || error.message.includes('투입수량')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '작업 등록에 실패했습니다.',
      error: error.message
    });
  }
});

// 🔥 작업 시작
router.put('/:workNo/start', async (req, res) => {
  try {
    const { workNo } = req.params;
    console.log(`=== 작업 시작: ${workNo} ===`);
    
    const result = await packageService.startWork(workNo);
    
    console.log('작업 시작 성공');
    res.json({
      success: true,
      message: '작업이 시작되었습니다.',
      data: result
    });
    
  } catch (error) {
    console.error('작업 시작 실패:', error);
    
    if (error.message.includes('찾을 수 없습니다')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('상태가')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '작업 시작에 실패했습니다.',
      error: error.message
    });
  }
});

// 🔥 작업 진행률 업데이트
router.put('/:workNo/progress', async (req, res) => {
  try {
    const { workNo } = req.params;
    const { output_qty, step_status } = req.body;
    
    console.log(`=== 작업 진행률 업데이트: ${workNo} ===`);
    
    if (output_qty === undefined || output_qty < 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 생산수량이 필요합니다.'
      });
    }
    
    const result = await packageService.updateWorkProgress(workNo, {
      output_qty,
      step_status
    });
    
    console.log('작업 진행률 업데이트 성공');
    res.json({
      success: true,
      message: '작업 진행률이 업데이트되었습니다.',
      data: result
    });
    
  } catch (error) {
    console.error('작업 진행률 업데이트 실패:', error);
    
    if (error.message.includes('찾을 수 없습니다')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('완료된 작업')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '작업 진행률 업데이트에 실패했습니다.',
      error: error.message
    });
  }
});

// 🔥 작업 완료
router.put('/:workNo/complete', async (req, res) => {
  try {
    const { workNo } = req.params;
    const { input_qty, output_qty } = req.body;
    
    console.log(`=== 작업 완료: ${workNo} ===`);
    
    const result = await packageService.completeWork(workNo, {
      input_qty,
      output_qty
    });
    
    console.log('작업 완료 성공');
    res.json({
      success: true,
      message: '작업이 완료되었습니다.',
      data: result
    });
    
  } catch (error) {
    console.error('작업 완료 실패:', error);
    
    if (error.message.includes('찾을 수 없습니다')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('이미 완료된')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '작업 완료 처리에 실패했습니다.',
      error: error.message
    });
  }
});

// 🔥 작업 일시정지
router.put('/:workNo/pause', async (req, res) => {
  try {
    const { workNo } = req.params;
    console.log(`=== 작업 일시정지: ${workNo} ===`);
    
    const result = await packageService.pauseWork(workNo);
    
    console.log('작업 일시정지 성공');
    res.json({
      success: true,
      message: '작업이 일시정지되었습니다.',
      data: result
    });
    
  } catch (error) {
    console.error('작업 일시정지 실패:', error);
    
    if (error.message.includes('찾을 수 없습니다')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '작업 일시정지에 실패했습니다.',
      error: error.message
    });
  }
});

// 🔥 작업 재시작
router.put('/:workNo/resume', async (req, res) => {
  try {
    const { workNo } = req.params;
    console.log(`=== 작업 재시작: ${workNo} ===`);
    
    const result = await packageService.resumeWork(workNo);
    
    console.log('작업 재시작 성공');
    res.json({
      success: true,
      message: '작업이 재시작되었습니다.',
      data: result
    });
    
  } catch (error) {
    console.error('작업 재시작 실패:', error);
    
    if (error.message.includes('찾을 수 없습니다')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '작업 재시작에 실패했습니다.',
      error: error.message
    });
  }
});

// 🔥 작업 상세 조회 (마지막에 위치)
router.get('/:workNo', async (req, res) => {
  try {
    const { workNo } = req.params;
    console.log(`=== 작업 상세 조회: ${workNo} ===`);
    
    if (!workNo) {
      return res.status(400).json({
        success: false,
        message: '작업번호가 필요합니다.'
      });
    }
    
    const result = await packageService.getWorkDetail(workNo);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: '작업을 찾을 수 없습니다.'
      });
    }
    
    console.log('작업 상세 조회 성공');
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('작업 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '작업 상세 조회에 실패했습니다.',
      error: error.message
    });
  }
});

module.exports = router;