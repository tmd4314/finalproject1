const mapper = require('../database/mapper.js');

// 설비 이력 목록 조회
const getEquipmentHistoryList = async () => {
    try {
        let result = await mapper.query('equipmentHistoryList');
        
        if (result.length == 0) {
            return {
                isSuccessed: true,
                data: [],
                totalCount: 0
            };
        }
        
        return {
            isSuccessed: true,
            data: result,
            totalCount: result.length
        };
    } catch (err) {
        console.error('설비 이력 목록 조회 오류:', err);
        return {
            isSuccessed: false,
            error: err.message
        };
    }
};

module.exports = {
    getEquipmentHistoryList
};