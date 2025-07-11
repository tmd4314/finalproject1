// server/routers/bomRouter.js

const express = require('express');
const router = express.Router();
const bomService = require('../services/bomService');

// ========== 번호 생성 API ==========

// [GET] /bom/generate-code/:productCode - BOM 코드 자동 생성
router.get('/generate-code/:productCode', async (req, res) => {
  try {
    const bomCode = await bomService.generateBomCode(req.params.productCode);
    res.json({ bom_code: bomCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 검색 API ==========

// [GET] /bom/products/search - 제품 검색 (모달용)
router.get('/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await bomService.searchProducts(q || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /bom/materials/search - 자재 검색 (모달용)
router.get('/materials/search', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await bomService.searchMaterials(q || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /bom/search - BOM 검색 (모달용)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await bomService.searchBoms(q || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 기본 데이터 조회 API (/:bomCode보다 먼저 와야 함) ==========

// [GET] /bom/products - 제품 드롭다운용
router.get('/products', async (req, res) => {
  try {
    const result = await bomService.getProductList();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /bom/materials - 자재 리스트
router.get('/materials', async (req, res) => {
  try {
    const result = await bomService.getMaterialList();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /bom/list - BOM 목록 (불러오기용)
router.get('/list', async (req, res) => {
  try {
    const { q } = req.query;
    const result = await bomService.findBomList(q || '');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /bom/check-duplicate/:productCode - 중복 BOM 체크
router.get('/check-duplicate/:productCode', async (req, res) => {
  try {
    const result = await bomService.checkDuplicateBom(req.params.productCode);
    res.json({ 
      exists: result && result.length > 0,
      existingBom: result && result.length > 0 ? result[0] : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /bom/master/:bomCode - BOM 마스터 정보만
router.get('/master/:bomCode', async (req, res) => {
  try {
    const result = await bomService.findBomInfo(req.params.bomCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /bom/materials/:bomCode - BOM 자재 목록만
router.get('/materials/:bomCode', async (req, res) => {
  try {
    const result = await bomService.findBomMaterials(req.params.bomCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /bom/integrated/list - BOM 통합조회 목록
router.get('/integrated/list', async (req, res) => {
  try {
    const {
      bom_code = '',
      product_name = '',
      product_code = '',
      material_name = '',
      start_date = '',
      end_date = ''
    } = req.query;

    const searchParams = {
      bom_code,
      product_name,
      product_code,
      material_name,
      start_date,
      end_date
    };

    const result = await bomService.findBomIntegratedList(searchParams);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [GET] /bom/processList/:product_code - 공정흐름도용 BOM 목록
router.get('/processList/:product_code', async (req, res) => {
  let productCode = req.params.product_code;
  try {
    const result = await bomService.findProcessBomList(productCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 상세 조회 API (가장 마지막에 위치) ==========

// [GET] /bom/:bomCode - BOM 상세 조회 (마스터 + 자재)
router.get('/:bomCode', async (req, res) => {
  try {
    const result = await bomService.findBomDetailFull(req.params.bomCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 저장 API ==========

// [POST] /bom - BOM 전체 저장 (신규)
router.post('/', async (req, res) => {
  try {
    const { master, materials } = req.body;

    if (!master) {
      return res.status(400).json({ 
        error: '마스터 정보가 필요합니다.' 
      });
    }

    if (!master.bom_code || master.bom_code === '') {
      const duplicateCheck = await bomService.checkDuplicateBom(master.product_code);
      if (duplicateCheck && duplicateCheck.length > 0) {
        return res.status(400).json({ 
          error: `${master.product_name || '해당 제품'}의 BOM이 이미 등록되어 있습니다.`,
          existingBom: duplicateCheck[0]
        });
      }
    }

    const result = await bomService.saveBomComplete({
      master,
      materials: materials || []
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [PUT] /bom - BOM 전체 수정
router.put('/', async (req, res) => {
  try {
    const { master, materials } = req.body;

    if (!master || !master.bom_code) {
      return res.status(400).json({ 
        error: 'BOM 코드가 필요합니다.' 
      });
    }

    const result = await bomService.saveBomComplete({
      master,
      materials: materials || []
    });

    res.json({ ...result, message: 'BOM 수정 완료' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [POST] /bom/master - BOM 마스터만 저장
router.post('/master', async (req, res) => {
  try {
    const masterData = req.body;

    if (!masterData) {
      return res.status(400).json({ 
        error: '마스터 정보가 필요합니다.' 
      });
    }

    const result = await bomService.saveBomMaster(masterData);
    res.status(201).json({ message: 'BOM 마스터 저장 완료', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [POST] /bom/materials - BOM 자재만 저장
router.post('/materials', async (req, res) => {
  try {
    const { bom_code, materials } = req.body;

    if (!bom_code) {
      return res.status(400).json({ 
        error: 'BOM 코드가 필요합니다.' 
      });
    }

    const result = await bomService.saveBomMaterials(bom_code, materials || []);
    res.status(201).json({ message: 'BOM 자재 저장 완료', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [PUT] /bom/master/date/:bomCode - BOM 마스터 수정일 업데이트
router.put('/master/date/:bomCode', async (req, res) => {
  try {
    await bomService.updateBomMasterDate(req.params.bomCode);
    res.json({ message: 'BOM 수정일 업데이트 완료' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 삭제 API ==========

// [DELETE] /bom/:bomCode - BOM 전체 삭제
router.delete('/:bomCode', async (req, res) => {
  const { bomCode } = req.params;

  try {
    const bomMaterials = await bomService.findBomMaterials(bomCode);
    if (bomMaterials && bomMaterials.length > 0) {
      await bomService.saveBomMaterials(bomCode, []);
    }

    res.json({ message: 'BOM 삭제 완료' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'BOM 삭제 중 오류가 발생했습니다.' });
  }
});

// ========== 통합조회 API ==========

// [GET] /bom/integrated/list - BOM 통합조회 목록
router.get('/integrated/list', async (req, res) => {
  try {
    const {
      bom_code = '',
      product_name = '',
      product_code = '',
      material_name = '',
      start_date = '',
      end_date = ''
    } = req.query;

    const searchParams = {
      bom_code,
      product_name,
      product_code,
      material_name,
      start_date,
      end_date
    };

    const result = await bomService.findBomIntegratedList(searchParams);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 공정흐름도용 API (기존 유지) ==========

// [GET] /bom/processList/:product_code - 공정흐름도용 BOM 목록
router.get('/processList/:product_code', async (req, res) => {
  let productCode = req.params.product_code;
  try {
    const result = await bomService.findProcessBomList(productCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
