// server/services/prodPlanService.js

const mariadb = require('../database/mapper.js');
const { convertObjToAry } = require('../utils/converts.js');

// 제품 검색 (모달용)
const searchResult = async (resultId) => {
  let list = await mariadb.query("selectResultList", resultId)
                            .catch(err => console.log(err));
  return list;
};

const saveWorkResult = async (workOrderNo,workResultInfo) => {
  console.log(workResultInfo);

  const insertColumns = [
    'result_id', 'process_group_code', 'work_order_no', 'work_start_date'
  ];
  const values = convertObjToAry(workResultInfo, workOrderNo ,insertColumns);
  return await mariadb.query('insertResult', values)
    .catch(err => console.error(err));
};







module.exports = {
  // 검색 관련
  searchResult,
  saveWorkResult
};