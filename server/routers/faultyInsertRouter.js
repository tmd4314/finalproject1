const express = require('express');
const router = express.Router();
const faultyService = require('../services/faultyInsertService');

router.get('/productList', async (req, res) => {
  try {
    const productList = await faultyService.selectProductFaultyList();
    res.send(productList);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '제품명 조회 실패' });
  }
});

router.get('/faultyOrderNoList', async (req, res) => {
  const { productCode } = req.query;

  if (!productCode) {
    return res.status(400).send({ error: 'productCode가 필요합니다.' });
  }

  try {
    const workOrderNoList = await faultyService.selectWorkOrderDetailNo(productCode);
    res.send(workOrderNoList);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '작업지시서 번호 조회 실패' });
  }
});

router.get('/faultyDetail', async (req, res) => {
  const { workOrderNo } = req.query;

  if (!workOrderNo) {
    return res.status(400).send({ error: 'workOrderNo가 필요합니다.' });
  }

  try {
    const result = await faultyService.selectFaultyTestDetail(workOrderNo);
    res.send(result); 
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '불량 상세 조회 실패' });
  }
});

module.exports = router;