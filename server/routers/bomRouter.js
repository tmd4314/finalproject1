// server/routers/bomRouter.js

const express = require('express');
const router = express.Router();
const bomService = require('../services/bomService');

// [GET] /bom/list - BOM 전체 목록
router.get('/list', async (req, res) => {
  try {
    const result = await bomService.findAllBomList();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// [GET] /bom/detail/:bomCode - BOM 상세 구성
router.get('/detail/:bomCode', async (req, res) => {
  try {
    const result = await bomService.findBomDetailFull(req.params.bomCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// [GET] /bom/master/:bomCode - BOM 마스터 정보만
router.get('/master/:bomCode', async (req, res) => {
  try {
    const result = await bomService.findBomMaster(req.params.bomCode);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// [GET] /bom/products - 제품 드롭다운용
router.get('/products', async (req, res) => {
  try {
    const result = await bomService.getProductList();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// [GET] /bom/materials - 자재 리스트
router.get('/materials', async (req, res) => {
  try {
    const result = await bomService.getMaterialList();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// [POST] /bom - BOM 신규 등록
router.post('/', async (req, res) => {
  const { bom_code, product_code, materials } = req.body;

  try {
    await bomService.addBomMaster({ bom_code, product_code });

    for (const item of materials) {
      await bomService.addBomDetail({
        bom_code,
        material_code: item.material_code,
        usage_qty: item.usage_qty,
        bom_unit: item.bom_unit,
      });
    }

    res.status(201).json({ message: 'BOM 등록 완료' });
  } catch (err) {
    res.status(500).json({ error: err });
  }
});

// [PUT] /bom - BOM 수정
router.put('/', async (req, res) => {
  const { bom_code, materials, deletedMaterials } = req.body;

  try {
    // 1. 삭제할 자재들 먼저 처리
    if (deletedMaterials && deletedMaterials.length > 0) {
      for (const deletedMat of deletedMaterials) {
        await bomService.removeBomDetail(deletedMat.bom_code, deletedMat.material_code);
      }
    }

    // 2. 기존 자재들 업데이트/추가
    for (const item of materials) {
      const detailInfo = {
        bom_code,
        material_code: item.material_code,
        usage_qty: item.usage_qty,
        bom_unit: item.bom_unit,
      };

      if (item.status === 'new') {
        await bomService.addBomDetail(detailInfo);
      } else if (item.status === 'existing') {
        await bomService.updateBomDetail(detailInfo);
      }
    }

    res.json({ message: 'BOM 수정 완료' });
  } catch (err) {
    console.error('BOM 수정 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
