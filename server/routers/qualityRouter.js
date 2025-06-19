const express = require('express');
const router = express.Router();
const workOrderService = require('../services/qualityService');

// 제품명 목록 조회
router.get('/productList', async (req, res) => {
  try {
    const productList = await workOrderService.selectProductList();
    res.send(productList);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '제품명 조회 실패' });
  }
});

// 작업지시서 조회
router.get('/workOrderNoList', async (req, res) => {
  const { productCode } = req.query;

  if (!productCode) {
    return res.status(400).send({ error: 'productCode가 필요합니다.' });
  }

  try {
    const workOrderNoList = await workOrderService.selectWorkOrderNo(productCode);
    res.send(workOrderNoList);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '작업지시서 번호 조회 실패' });
  }
});

//조회된 지시서로 상세정보 출력
router.get('/workOrderDetail', async (req, res) => {
  const { workOrderNo } = req.query;

  if (!workOrderNo) {
    return res.status(400).send({ error: 'workOrderNo가 필요합니다.' });
  }

  try {
    const detailList = await workOrderService.selectWorkOrderDetail(workOrderNo);
    res.send(detailList);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '작업지시서 상세정보 조회 실패' });
  }
});

router.get('/inspectionStandard', async (req, res) => {
  const { processName } = req.query;

  if (!processName) {
    return res.status(400).send({ error: 'processName이 필요합니다.' });
  }

  try {
    const data = await workOrderService.selectInspectionStandardByProcessName(processName);
    res.send(data);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '검사 기준 조회 실패' });
  }
});

module.exports = router;