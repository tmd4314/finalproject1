const mariadb = require('../database/mapper.js');

// 선택한 공정에 대한 리스트 전체 조회
const selectListByProcessInt = async (processInt) => {
  // 쿼리에 파라미터 추가
  const list = await mariadb.query("inspectionListByProcessName", [processInt]).catch((err) => console.log(err));
  return list;
};

// 프로세스 명 조회
const processNameList = async () => {
  const list = await mariadb.query("processNameList").catch((err) => console.log(err));
  return list;
};

// 검사항목 추가
const insertInspection = async (data) => {
  const params = [
    data.processInt,
    data.inspValueType,
    data.inspUnit,
    data.inspValueQty,
    data.inspValueMin,
    data.inspValueMax,
    data.inspRemark
  ];
  
  const result = await mariadb.query("insertInspection", params);
  return result;
};

module.exports ={
  selectListByProcessInt,
  processNameList,
  insertInspection,
};