const express = require('express');
const router = express.Router();
const bomService = require('../services/bomService.js');

// 전체 BOM 조회
router.get('/bom', async (req, res) => {
  let bomList = await bomService.findAll().catch(err => {
    console.log(err);
    return [];
  });
  res.send(bomList);
});

// 단일 BOM(상세, 자재목록 포함)
router.get('/bom/:bom_code', async (req, res) => {
  let bomDetail = await bomService.findBomDetail(req.params.bom_code)
    .catch(err => {
      console.log(err);
      return null;
    });
  if (bomDetail) res.send(bomDetail);
  else res.status(404).send({ message: 'BOM Not Found' });
});

// BOM 등록
router.post('/bom', async (req, res) => {
  // req.body = { bomInfo: {...}, materialList: [...] }
  try {
    const { bomInfo, materialList } = req.body;
    const result = await bomService.addBom(bomInfo, materialList);
    res.send(result);
  } catch (err) {
    console.error('❌ BOM 등록 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
});

// BOM 수정
router.put('/bom/:bom_code', async (req, res) => {
  try {
    const { bomInfo, materialList } = req.body;
    const result = await bomService.updateBom(req.params.bom_code, bomInfo, materialList);
    res.send(result);
  } catch (err) {
    console.error('❌ BOM 수정 실패:', err);
    res.status(500).send({ isUpdated: false, message: '서버 오류' });
  }
});

module.exports = router;
