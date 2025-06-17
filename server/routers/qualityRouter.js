const express = require('express');
const router = express.Router();
const workOrderService = require('../services/qualityService');

//작업지시서 조회
router.get('/workOrderList', async(req, res) => {
  const workOrderList = await workOrderService.selectWorkOrder().catch((err) => console.log(err));
  res.send(workOrderList);
});

router.get('/productList', async (req, res) => {
  try {
    const productList = await workOrderService.selectProductList()
    res.send(productList)
  } catch (err) {
    console.error(err)
    res.status(500).send({ error: '제품명 조회 실패' })
  }
})

router.get('/workOrderListByProduct/:productName', async (req, res) => {
  const productName = req.params.productName
  try {
    const list = await workOrderService.selectWorkOrdersByProductName(productName)
    res.send(list)
  } catch (err) {
    console.error(err)
    res.status(500).send({ error: '작업지시서 조회 실패' })
  }
})

//작업지시서를 통한 상세데이터 조회
router.get('/workOrderDetailList/:id', async (req, res) => {
  const workOrderNo = req.params.id;
  const detail = await workOrderService.selectWorkOrderDetail(workOrderNo);
  res.send(detail);
});

module.exports = router;