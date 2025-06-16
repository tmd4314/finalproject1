const mariadb = require('../database/mapper.js');

// 검사항목 전체 조회
const selectAll = async () => {
  const list = await mariadb.query("selectInspectionList").catch((err) => console.log(err));
  return list;
};

// 제품명만 전체 조회
const productAll = async () => {
  const list = await mariadb.query("productNameList").catch((err) => console.log(err));
  return list;
};

// 검사항목 추가
const insertOne = async (data) => {
  const params = [
    data.product_code,
    data.insp_code,
    data.insp_name,
    data.insp_value_type,
    data.insp_ref_value,
    data.insp_quantita_value,
    data.insp_qualita_value,
    data.insp_unit,
    data.insp_quantita_min,
    data.insp_quantita_max,
    data.insp_range,
    data.insp_remark
  ];
  console.log("쿼리 파라미터:", params);
  try {
    const result = await mariadb.query("insertInspection", params);
    return result;
  } catch (error) {
    console.error("insertOne 쿼리 오류:", error);
    throw error;  // 에러를 상위로 전달
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
  productAll,
  insertOne,
  updateOne,
  deleteInspection
};