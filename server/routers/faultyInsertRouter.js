const express = require('express');
const router = express.Router();
const faultyService = require('../services/inspectionService.js');

router.get('/productList', async (req, res) => {
  try {
    const productList = await faultyService.selectProductFaultyList();
    res.send(productList);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '제품명 조회 실패' });
  }
});

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

module.exports = router;