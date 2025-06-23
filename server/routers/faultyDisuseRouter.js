const express = require('express');
const router = express.Router();
const faultyDisuseService = require('../services/faultyDisuseService');


router.get('/productList', async (req, res) => {
  try {
    const productList = await faultyDisuseService.selectProductFaultyList();
    res.send(productList);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '제품명 조회 실패' });
  }
});

router.get('/workOrderList', async (req, res) => {
  const { productCode } = req.query;
  if (!productCode) {
    return res.status(400).send({ error: 'productCode가 필요합니다.' });
  }

  try {
    const result = await faultyDisuseService.getWorkOrderNosByProductCode(productCode);
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '작업지시서 조회 실패' });
  }
});

router.get('/faultyInfo', async (req, res) => {
  const { productCode, workOrderNo } = req.query;
  if (!productCode || !workOrderNo) {
    return res.status(400).send({ error: 'productCode와 workOrderNo가 필요합니다.' });
  }

  try {
    const result = await faultyDisuseService.getFaultyDetail(productCode, workOrderNo);
    res.send(result[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '불량 정보 조회 실패' });
  }
});

router.post('/register', async (req, res) => {
  const data = req.body;

  // 필수 체크
  if (
    !data.product_code || !data.work_order_no || !data.process_name || !data.occur_date ||
    !data.defect_type || !data.faulty_quantity || !data.representative ||
    !data.disuse_reason || !data.disuse_state
  ) {
    return res.status(400).send({ error: '필수 입력값이 누락되었습니다.' });
  }

  try {
    await faultyDisuseService.insertFaultyDisuseRecord(data);
    res.status(201).send({ message: '폐기정보 등록 완료' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '폐기정보 등록 실패' });
  }
});

module.exports = router;