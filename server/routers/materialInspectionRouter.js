const express = require('express');
const router = express.Router();
const materialinspectionService = require('../services/materialInspectionService.js');

//상품명만 조회
router.get('/materialList', async(req, res) => {
  const materialList = await materialinspectionService.materialAll().catch((err) => console.log(err));
  res.send(materialList);
});

module.exports = router;

