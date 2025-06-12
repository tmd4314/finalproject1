const mariadb = require('../database/mapper.js');

// 검사항목 전체 조회
const selectAll = async () => {
  const list = await mariadb.query("selectInspectionList").catch((err) => console.log(err));
  return list;
};

// 검사항목 추가
const insertOne = async (data) => {
  try {
    const result = await mariadb.query("insertInspectionList", [
      data.insp_code,
      data.item_type,
      data.insp_name,
      data.insp_stad_val,
      data.insp_unit,
      data.insp_judt_type,
      data.insp_remark
    ]);
    return result;
    } catch (err) {
      if(err.code === 'ER_DUP_ENTRY') {
        return { duplicate : true};
      }
      throw err;
    }
  };

// 검사항목 수정
const updateOne = async (data) => {
  const result = await mariadb.query("updateInspection", [
    data.item_type,
    data.insp_name,
    data.insp_stad_val,
    data.insp_unit,
    data.insp_judt_type,
    data.insp_remark,
    data.insp_code  // WHERE 조건에 사용됨
  ]).catch((err) => {
    console.log("Update Error", err);
  });
  return result;
};

//검사항목 삭제
const deleteInspection = async (data) => {
  const result = await mariadb.query("deleteInspection", data)
  .catch(err => console.log(err));

  return result;
};

module.exports ={
  selectAll,
  insertOne,
  updateOne,
  deleteInspection
};