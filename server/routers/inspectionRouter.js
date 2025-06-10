const express = require('express');
const router = express.Router();
const inspectionService = require('../services/inspectionService.js');

// 전체 리스트 조회
router.get('/list', async(req, res) => {
  const inspectionList = await inspectionService.selectAll().catch((err) => console.log(err));
  res.send(inspectionList);
});

router.post('/insert',async(req, res) => {
  try {
    const insertInspection = req.body;
    await inspectionService.insertOne(insertInspection);
    console.log("검사항목 등록성공")
  } catch (err) {
    console.log("검사항목 등록실패;")
  }
  }
);


module.exports = router;