const express = require('express');
const router = express.Router();
const defectService = require('../services/defectService');

// 불량 유형 전체 조회
router.get('/defectList', async(req, res) => {
    const defectList = await defectService.selectDefectAll().catch((err) => console.log(err));
    res.send(defectList);
});

module.exports = router;