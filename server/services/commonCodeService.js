const db = require('../database/mapper');

async function getCommonCodes(groups) {
  const result = {};

  try {
    for (const group of groups) {
      if (group === 'line') {
        // 변경된 쿼리 이름 사용
        const rows = await db.query('selectLinesForCommonCode');
        result.line = rows;
      } else {
        const rows = await db.query('selectCommonCodesByGroup', [group]);
        result[group] = rows;
      }
    }
    return result;
  } catch (error) {
    console.error('Error in getCommonCodes:', error);
    throw error;
  }
}

module.exports = {
  getCommonCodes,
};