const express = require('express');
const router = express.Router();
const inspectionService = require('../services/inspectionService.js');

// 전체 리스트 조회
router.get('/list', async(req, res) => {
  let inspectionList = await inspectionService.selectAll().catch((err) => console.log(err));
  res.send(inspectionList);
});

module.exports = router;