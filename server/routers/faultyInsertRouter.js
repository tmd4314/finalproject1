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

router.get('/defectTypeList', async (req, res) => {
  try {
    const result = await faultyService.selectDefectTypeList();
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '불량유형 목록 조회 실패' });
  }
});

router.post('/register', async (req, res) => {
  const {
    product_code,
    work_order_no,
    process_name,
    defect_type,
    defect_detail,
    quantity,
    occur_date,
    qual_remark,
  } = req.body;

  // 필수값 검증 (간단히)
  if (!product_code || !work_order_no) {
    return res.status(400).send({ error: 'product_code와 work_order_no가 필요합니다.' });
  }

  try {
    const result = await faultyService.insertFaultyProduct({
      product_code,
      work_order_no,
      process_name,
      defect_type,
      defect_detail,
      quantity,
      occur_date,
      qual_remark,
    });
    res.status(200).send({ message: '등록 성공', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: '등록 실패' });
  }
});

module.exports = router;