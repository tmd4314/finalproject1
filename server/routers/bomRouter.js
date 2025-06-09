const express = require('express');
const router = express.Router();
const bomService = require('../services/bomService');

// 전체 BOM 목록 조회
router.get('/', async (req, res) => {
  try {
    const list = await bomService.findAll();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'BOM 목록 조회 오류', error: err.message });
  }
});

// 단일 BOM 상세
router.get('/:bomCode', async (req, res) => {
  try {
    const { bomCode } = req.params;
    const data = await bomService.findBomDetail(bomCode);
    if (!data) return res.status(404).json({ message: 'BOM 정보 없음' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'BOM 상세 조회 오류', error: err.message });
  }
});

// BOM 신규 등록
router.post('/', async (req, res) => {
  try {
    const bomData = req.body;
    await bomService.saveBom(bomData);
    res.status(201).json({ message: 'BOM이 저장되었습니다.' });
  } catch (err) {
    console.error('BOM 저장 실패:', err);
    res.status(500).json({ message: 'BOM 저장 실패', error: err.message });
  }
});
// BOM 수정
router.put('/:bomCode', async (req, res) => {
  try {
    const { bomCode } = req.params;
    const bomData = req.body;
    await bomService.updateBom(bomCode, bomData);
    res.json({ message: 'BOM이 수정되었습니다.' });
  } catch (err) {
    console.error('BOM 수정 실패:', err);
    res.status(500).json({ message: 'BOM 수정 실패', error: err.message });
  }
});

module.exports = router;
