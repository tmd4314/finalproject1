const express = require('express');
const router = express.Router();
const packageService = require('../services/packageService.js');

// 입력 검증 미들웨어
const validateWorkData = (req, res, next) => {
  const { work_no, input_qty, employee_no } = req.body;
  
  if (!work_no || !input_qty || !employee_no) {
    return res.status(400).json({ 
      error: '필수 항목이 누락되었습니다.', 
      required: ['work_no', 'input_qty', 'employee_no'] 
    });
  }
  
  if (input_qty <= 0) {
    return res.status(400).json({ error: '투입수량은 0보다 커야 합니다.' });
  }
  
  next();
};

// ============================================
// 구체적인 라우트들을 먼저 정의 (중요!)
// ============================================

// 대시보드 통계 (GET /packages/dashboard/stats)
router.get('/dashboard/stats', async (req, res) => {
  try {
    const result = await packageService.getDashboardStats();
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('대시보드 통계 조회 실패:', err);
    res.status(500).json({ 
      success: false,
      error: '대시보드 통계 조회 중 오류가 발생했습니다.',
      details: err.message 
    });
  }
});

// 작업자별 현황 (GET /packages/dashboard/workers)
router.get('/dashboard/workers', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const result = await packageService.getWorkerStats(parseInt(days));
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('작업자별 현황 조회 실패:', err);
    res.status(500).json({ 
      success: false,
      error: '작업자별 현황 조회 중 오류가 발생했습니다.',
      details: err.message 
    });
  }
});

// 제품별 현황 (GET /packages/dashboard/products)
router.get('/dashboard/products', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const result = await packageService.getProductStats(parseInt(days));
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('제품별 현황 조회 실패:', err);
    res.status(500).json({ 
      success: false,
      error: '제품별 현황 조회 중 오류가 발생했습니다.',
      details: err.message 
    });
  }
});

// 시간대별 현황 (GET /packages/dashboard/hourly)
router.get('/dashboard/hourly', async (req, res) => {
  try {
    const result = await packageService.getHourlyStats();
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('시간대별 현황 조회 실패:', err);
    res.status(500).json({ 
      success: false,
      error: '시간대별 현황 조회 중 오류가 발생했습니다.',
      details: err.message 
    });
  }
});

// 일별 생산 추이 (GET /packages/dashboard/daily-trend)
router.get('/dashboard/daily-trend', async (req, res) => {
  try {
    const { days = 5 } = req.query;
    const result = await packageService.getDailyTrend(parseInt(days));
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('일별 생산 추이 조회 실패:', err);
    res.status(500).json({ 
      success: false,
      error: '일별 생산 추이 조회 중 오류가 발생했습니다.',
      details: err.message 
    });
  }
});

// 진행 중인 작업 목록 (GET /packages/active/works)
router.get('/active/works', async (req, res) => {
  try {
    const result = await packageService.getActiveWorks();
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('진행 중인 작업 조회 실패:', err);
    res.status(500).json({ 
      success: false,
      error: '진행 중인 작업 조회 중 오류가 발생했습니다.',
      details: err.message 
    });
  }
});

// ============================================
// 일반적인 CRUD 라우트들
// ============================================

// 작업 등록 (POST /packages)
router.post('/', validateWorkData, async (req, res) => {
  try {
    const result = await packageService.insertWork(req.body);
    res.status(201).json({
      success: true,
      message: '작업이 성공적으로 등록되었습니다.',
      data: result
    });
  } catch (err) {
    console.error('작업 등록 실패:', err);
    res.status(500).json({ 
      success: false,
      error: '작업 등록 중 오류가 발생했습니다.',
      details: err.message 
    });
  }
});

// 작업 목록 조회 (GET /packages)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'all',
      sortBy = 'date_desc'
    } = req.query;

    // 페이지 검증
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ 
        error: '잘못된 페이징 파라미터입니다.' 
      });
    }

    const result = await packageService.getWorkList({
      page: pageNum,
      limit: limitNum,
      search,
      status,
      sortBy
    });

    res.json({
      success: true,
      data: result.works,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(result.totalCount / limitNum),
        totalCount: result.totalCount,
        limit: limitNum
      }
    });
  } catch (err) {
    console.error('작업 목록 조회 실패:', err);
    res.status(500).json({ 
      success: false,
      error: '작업 목록 조회 중 오류가 발생했습니다.',
      details: err.message 
    });
  }
});

// ============================================
// 동적 라우트들을 마지막에 정의 (중요!)
// ============================================

// 작업 진행 상황 업데이트 (PUT /packages/:work_no/progress)
router.put('/:work_no/progress', async (req, res) => {
  try {
    const { work_no } = req.params;
    const { output_qty } = req.body;

    if (!work_no || output_qty === undefined) {
      return res.status(400).json({ 
        error: '작업번호와 생산수량이 필요합니다.' 
      });
    }

    if (output_qty < 0) {
      return res.status(400).json({ 
        error: '생산수량은 0 이상이어야 합니다.' 
      });
    }

    const result = await packageService.updateWorkProgress(work_no, {
      output_qty: parseInt(output_qty)
    });

    res.json({
      success: true,
      message: '작업 진행 상황이 업데이트되었습니다.',
      data: result
    });
  } catch (err) {
    console.error('작업 진행 상황 업데이트 실패:', err);
    res.status(500).json({ 
      success: false,
      error: '작업 진행 상황 업데이트 중 오류가 발생했습니다.',
      details: err.message 
    });
  }
});

// 작업 완료 (PUT /packages/:work_no/complete)
router.put('/:work_no/complete', async (req, res) => {
  try {
    const { work_no } = req.params;
    const { output_qty } = req.body;

    if (!work_no) {
      return res.status(400).json({ error: '작업번호가 필요합니다.' });
    }

    if (output_qty !== undefined && output_qty < 0) {
      return res.status(400).json({ error: '생산수량은 0 이상이어야 합니다.' });
    }

    const result = await packageService.completeWork(work_no, {
      output_qty: output_qty ? parseInt(output_qty) : undefined
    });

    res.json({
      success: true,
      message: '작업이 성공적으로 완료되었습니다.',
      data: result
    });
  } catch (err) {
    console.error('작업 완료 처리 실패:', err);
    res.status(500).json({ 
      success: false,
      error: '작업 완료 처리 중 오류가 발생했습니다.',
      details: err.message 
    });
  }
});

// 작업 상세 조회 (GET /packages/:work_no) - 맨 마지막에!
router.get('/:work_no', async (req, res) => {
  try {
    const { work_no } = req.params;
    if (!work_no) {
      return res.status(400).json({ error: '작업번호가 필요합니다.' });
    }
    const result = await packageService.getWorkDetail(work_no);
    if (result) {
      res.json({ success: true, data: result });
    } else {
      res.status(404).json({ success: false, message: '해당 작업을 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error('작업 상세 조회 실패:', err);
    res.status(500).json({ 
      success: false,
      error: '작업 상세 조회 중 오류가 발생했습니다.',
      details: err.message 
    });
  }
});

module.exports = router;