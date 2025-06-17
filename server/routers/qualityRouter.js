  const express = require('express');
  const router = express.Router();
  const workOrderService = require('../services/qualityService');

  //작업지시서 조회
  router.get('/workOrderList', async(req, res) => {
    const workOrderList = await workOrderService.selectWorkOrder().catch((err) => console.log(err));
    res.send(workOrderList);
  });

  module.exports = router;