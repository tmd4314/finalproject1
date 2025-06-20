const express = require('express');
const router = express.Router();
const equipmentHistoryService = require('../services/equipmentHistoryService');

// 설비 이력 목록 조회
router.get('/', async (req, res) => {
    try {
        const result = await equipmentHistoryService.getEquipmentHistoryList();
        res.json(result);
    } catch (err) {
        console.error('설비 이력 목록 조회 라우터 오류:', err);
        res.status(500).json({
            isSuccessed: false,
            error: '서버 오류가 발생했습니다.'
        });
    }
});

module.exports = router;