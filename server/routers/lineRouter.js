const express = require('express');
const router = express.Router();
const lineService = require('../services/lineService.js');

// 전체 라인 목록 조회 (상태 + 마스터 join) - 경로만 /line에서 /list로 변경
router.get('/list', async (req, res) => {
  try {
    const lineList = await lineService.getLineList();
    res.send(lineList); // or res.json(lineList)
  } catch (err) {
    console.error('❌ 라인 목록 조회 실패:', err);
    res.status(500).send([]);
  }
});

// 단일 라인 상세 (상태 + 마스터 join)
router.get('/line/:line_id', async (req, res) => {
  try {
    const lineDetail = await lineService.getLineWithMaster(req.params.line_id);
    if (lineDetail) res.send(lineDetail);
    else res.status(404).send({ message: 'Line Not Found' });
  } catch (err) {
    console.error('❌ 라인 상세 조회 실패:', err);
    res.status(500).send({ message: '서버 오류' });
  }
});

// 라인 등록
router.post('/line', async (req, res) => {
  try {
    const result = await lineService.insertLine(req.body);
    res.send(result);
  } catch (err) {
    console.error('❌ 라인 등록 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
});

// 라인 수정
router.put('/line/:line_id', async (req, res) => {
  try {
    const result = await lineService.updateLine(req.params.line_id, req.body);
    res.send(result);
  } catch (err) {
    console.error('❌ 라인 수정 실패:', err);
    res.status(500).send({ isUpdated: false, message: '서버 오류' });
  }
});

// 라인 삭제
router.delete('/line/:line_id', async (req, res) => {
  try {
    const result = await lineService.deleteLine(req.params.line_id);
    res.send(result);
  } catch (err) {
    console.error('❌ 라인 삭제 실패:', err);
    res.status(500).send({ isDeleted: false, message: '서버 오류' });
  }
});

module.exports = router;