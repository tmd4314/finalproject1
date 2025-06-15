// server/routers/prodPlanRouter.js

const express = require('express');
const router = express.Router();
const prodPlanService = require('../services/prodPlanService');

// ========== 번호 생성 API ==========

// [GET] /prodPlan/generate-no - 생산계획 번호 자동 생성
router.get('/generate-no', async (req, res) => {
  try {
    const planId = await prodPlanService.generatePlanId();
    res.json({ plan_id: planId });
  } catch (err) {
    console.error('생산계획 번호 생성 오류:', err);
    res.status(500).json({ error: err.message });
  }
});



// ========== 검색 API ==========


// [GET] /prodPlan/products/search - 제품 검색 (모달용)
router.get('/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await prodPlanService.searchProducts(q || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /prodPlan/orders/search - 주문 검색 (모달용)
router.get('/orders/search', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await prodPlanService.searchOrders(q || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /prodPlan/search - 생산계획 검색 (모달용)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await prodPlanService.searchProdPlans(q || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 상세 조회 API ==========

// [GET] /prodPlan/order/:orderId - 주문 정보 조회
router.get('/order/:orderId', async (req, res) => {
  try {
    const result = await prodPlanService.findOrderDetailFull(req.params.orderId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /prodPlan/:planId - 생산계획 상세 조회 (마스터 + 제품)
router.get('/:planId', async (req, res) => {
  try {
    const result = await prodPlanService.findPlanDetailFull(req.params.planId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /prodPlan/master/:planId - 생산계획 마스터 정보만
router.get('/master/:planId', async (req, res) => {
  try {
    const result = await prodPlanService.findPlanInfo(req.params.planId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /prodPlan/list - 생산계획 목록 (불러오기용)
router.get('/list', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await prodPlanService.findPlanList(q || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /prodPlan/products/:planId - 생산계획 제품 목록만
router.get('/products/:planId', async (req, res) => {
  try {
    const result = await prodPlanService.findPlanProducts(req.params.planId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ========== 저장 API ==========

// [POST] /prodPlan - 생산계획 전체 저장 (신규)
router.post('/', async (req, res) => {
  try {
    const { master, products } = req.body;
    
    // 필수 필드 검증 완화 - plan_id는 자동 생성
    if (!master) {
      return res.status(400).json({ 
        error: '마스터 정보가 필요합니다.' 
      });
    }

    const result = await prodPlanService.savePlanComplete({
      master,
      products: products || []
    });
    
    res.status(201).json(result);
  } catch (err) {
    console.error('생산계획 저장 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// [PUT] /prodPlan - 생산계획 전체 수정
router.put('/', async (req, res) => {
  try {
    const { master, products } = req.body;
    
    // 수정 시에만 plan_id 필수
    if (!master || !master.plan_id) {
      return res.status(400).json({ 
        error: '생산계획 번호가 필요합니다.' 
      });
    }

    const result = await prodPlanService.savePlanComplete({
      master,
      products: products || []
    });
    
    res.json({ ...result, message: '생산계획 수정 완료' });
  } catch (err) {
    console.error('생산계획 수정 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// [POST] /prodPlan/master - 생산계획 마스터만 저장
router.post('/master', async (req, res) => {
  try {
    const masterData = req.body;
    
    if (!masterData) {
      return res.status(400).json({ 
        error: '마스터 정보가 필요합니다.' 
      });
    }

    const result = await prodPlanService.savePlanMaster(masterData);
    res.status(201).json({ message: '생산계획 마스터 저장 완료', result });
  } catch (err) {
    console.error('생산계획 마스터 저장 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// [POST] /prodPlan/products - 생산계획 제품만 저장
router.post('/products', async (req, res) => {
  try {
    const { plan_id, products } = req.body;
    
    if (!plan_id) {
      return res.status(400).json({ 
        error: '생산계획 번호가 필요합니다.' 
      });
    }

    const result = await prodPlanService.savePlanProducts(plan_id, products || []);
    res.status(201).json({ message: '생산계획 제품 저장 완료', result });
  } catch (err) {
    console.error('생산계획 제품 저장 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;