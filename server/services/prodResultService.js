// server/services/prodPlanService.js

const mariadb = require('../database/mapper.js');
const { convertObjToAry } = require('../utils/converts.js');

// 제품 검색 (모달용)
const searchResult = async (resultId) => {
  let list = await mariadb.query("selectResultList", resultId)
                            .catch(err => console.log(err));
  return list;
};








module.exports = {
  // 검색 관련
  searchResult,
};