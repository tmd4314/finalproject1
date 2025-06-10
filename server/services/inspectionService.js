const mariadb = require('../database/mapper.js');

// 검사항목 전체 조회
const selectAll = async () => {
  const list = await mariadb.query("selectInspectionList").catch((err) => console.log(err));
  return list;
};

// 검사항목 추가
const insertOne = async (data) => {
  const result = await mariadb.query("insertInspectionList", [
    data.insp_code,
    data.item_type,
    data.insp_name,
    data.insp_stad_val,
    data.insp_unit,
    data.insp_judt_type,
    data.insp_remark
  ]).catch((err) => {
    console.log("Insert Error", err);
  });
  return result;
}

module.exports ={
  selectAll,
  insertOne
};