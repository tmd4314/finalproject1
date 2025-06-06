const express = require('express');
const router = express.Router();
const { getCommonCodes } = require('../services/commonCodeService');

router.get('/', async (req, res) => {
  const groups = req.query.groups?.split(',') || [];

  if (groups.length === 0) {
    return res.status(400).json({ isSuccessed: false, message: 'code_group이 필요합니다' });
  }

  try {
    const result = await getCommonCodes(groups);  // ✅ 서비스에만 위임
    res.json(result);
  } catch (err) {
    console.error('❌ 공통코드 불러오기 실패:', err);
    res.status(500).json({ isSuccessed: false, message: 'DB 조회 실패' });
  }
});

module.exports = router;
