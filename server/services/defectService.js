const mariadb = require('../database/mapper.js');

//불량항목 전체 조회
const selectAll = async () => {
  const list = await mariadb.query("selectDefectList").catch((err) => console.log(err));
  return list;
};

//불량항목 추가
const insertOne = async (data) => {
  try {
    const result = await mariadb.query("insertDefect", [
      data.defect_type_code,
      data.defect_type_name,
      data.defect_type_remark
    ]);
    return result;
  } catch (err) {
    console.log("에러발생");
  }
};

//불량유형 수정
const updateOne = async (data) => {
  const result = await mariadb.query("updateDefect", [
    data.defect_type_name,
    data.defect_type_remark,
    data.defect_type_code
  ]).catch((err) => {
    console.log("Update Error", err);
  });
  return result;
}

module.exports = {
  selectAll,
  insertOne,
  updateOne
};