// server/routers/line_router.js
const express = require('express');
const router = express.Router();
const lineService = require('../services/line_service.js');

// 라인 마스터 전체 조회
router.get('/master', async (req, res) => {
  try {
    const result = await lineService.getLineMasterList();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '라인 마스터 조회 실패' });
  }
});

// 라인 실적(상태) 전체 조회
router.get('/list', async (req, res) => {
  try {
    const result = await lineService.getLineList();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '라인 리스트 조회 실패' });
  }
});

// 마스터+실적 join 상세 조회
router.get('/:line_id/detail', async (req, res) => {
  try {
    const result = await lineService.getLineWithMaster(req.params.line_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: '상세 조회 실패' });
  }
});

module.exports = router;
