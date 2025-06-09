const mariadb = require('../database/mapper.js');

// 검사항목 전체 조회
const selectAll = async () => {
  let list = await mariadb.query("selectInspectionList").catch((err) => console.log(err));
  return list;
};

module.exports ={
  selectAll
};