// routes/equipmentRouter.js

const express = require('express');
const router = express.Router();
const equipmentService = require('../services/equipmentService'); // 서비스 import

// POST /equipments - 설비 등록
router.post('/', async (req, res) => {
  try {
    const result = await equipmentService.insertEquipment(req.body); // 프론트에서 formData 받기
    res.json({ isSuccessed: true, result }); // 성공 응답
  } catch (err) {
    console.error(err);
    res.status(500).json({ isSuccessed: false, message: '설비 등록 실패' }); // 실패 응답
  }
});

module.exports = router;
