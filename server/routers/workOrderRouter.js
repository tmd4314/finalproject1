// server/routers/workOrderRouter.js

const express = require('express');
const router = express.Router();
const workOrderService = require('../services/workOrderService');

// ========== 번호 생성 API ==========

// [GET] /workOrder/generate-no - 작업지시서 번호 자동 생성
router.get('/generate-no', async (req, res) => {
  try {
    const workOrderNo = await workOrderService.generateWorkOrderNo();
    res.json({ work_order_no: workOrderNo });
  } catch (err) {
    console.error('작업지시서 번호 생성 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== 검색 API ==========

// [GET] /workOrder/products/search - 제품 검색 (모달용)
router.get('/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await workOrderService.searchProducts(q || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /workOrder/search - 작업지시서 검색 (모달용)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await workOrderService.searchWorkOrders(q || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /workOrder/plans/search - 계획 검색 (모달용)
router.get('/plans/search', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await workOrderService.searchPlans(q || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 상세 조회 API ==========

// [GET] /workOrder/plan/:planId - 계획 정보 조회
router.get('/plan/:planId', async (req, res) => {
  try {
    const result = await workOrderService.findPlanInfo(req.params.planId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /workOrder/:workOrderNo - 작업지시서 상세 조회 (마스터 + 제품)
router.get('/:workOrderNo', async (req, res) => {
  try {
    const result = await workOrderService.findWorkOrderDetailFull(req.params.workOrderNo);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /workOrder/master/:workOrderNo - 작업지시서 마스터 정보만
router.get('/master/:workOrderNo', async (req, res) => {
  try {
    const result = await workOrderService.findWorkOrderInfo(req.params.workOrderNo);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /workOrder/products/:workOrderNo - 작업지시서 제품 목록만
router.get('/products/:workOrderNo', async (req, res) => {
  try {
    const result = await workOrderService.findWorkOrderProducts(req.params.workOrderNo);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /workOrder/list - 작업지시서 목록 (불러오기용)
router.get('/list', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await workOrderService.findWorkOrderList(q || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 저장 API ==========

// [POST] /workOrder - 작업지시서 전체 저장 (신규) - 🚨 수정됨
router.post('/', async (req, res) => {
  try {
    const { master, products } = req.body;
    
    // 🚨 필수 필드 검증 완화 - work_order_no와 plan_id 제거
    if (!master) {
      return res.status(400).json({ 
        error: '마스터 정보가 필요합니다.' 
      });
    }

    const result = await workOrderService.saveWorkOrderComplete({
      master,
      products: products || []
    });
    
    res.status(201).json(result);
  } catch (err) {
    console.error('작업지시서 저장 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// [PUT] /workOrder - 작업지시서 전체 수정
router.put('/', async (req, res) => {
  try {
    const { master, products } = req.body;
    
    // 수정 시에만 work_order_no 필수
    if (!master || !master.work_order_no) {
      return res.status(400).json({ 
        error: '작업지시서 번호가 필요합니다.' 
      });
    }

    const result = await workOrderService.saveWorkOrderComplete({
      master,
      products: products || []
    });
    
    res.json({ ...result, message: '작업지시서 수정 완료' });
  } catch (err) {
    console.error('작업지시서 수정 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// [POST] /workOrder/master - 작업지시서 마스터만 저장 - 🚨 수정됨
router.post('/master', async (req, res) => {
  try {
    const masterData = req.body;
    
    // 🚨 필수 필드 검증 완화
    if (!masterData) {
      return res.status(400).json({ 
        error: '마스터 정보가 필요합니다.' 
      });
    }

    const result = await workOrderService.saveWorkOrderMaster(masterData);
    res.status(201).json({ message: '작업지시서 마스터 저장 완료', result });
  } catch (err) {
    console.error('작업지시서 마스터 저장 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// [POST] /workOrder/products - 작업지시서 제품만 저장
router.post('/products', async (req, res) => {
  try {
    const { work_order_no, products } = req.body;
    
    if (!work_order_no) {
      return res.status(400).json({ 
        error: '작업지시서 번호가 필요합니다.' 
      });
    }

    const result = await workOrderService.saveWorkOrderProducts(work_order_no, products || []);
    res.status(201).json({ message: '작업지시서 제품 저장 완료', result });
  } catch (err) {
    console.error('작업지시서 제품 저장 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;