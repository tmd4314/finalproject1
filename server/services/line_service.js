// server/services/line_service.js
const mariadb = require('../database/mapper');  // DB 커넥션/매퍼

// 공통 데이터 변환 유틸(없으면 그대로 통과)
const convertData = (obj) => obj;

// 라인 마스터 목록 조회
const getLineMasterList = async () => {
  const list = await mariadb.query('selectLineMasterList');
  return convertData(list);
};

// 라인 마스터 상세 조회
const getLineMasterDetail = async (lineMasterId) => {
  const [data] = await mariadb.query('selectLineMasterDetail', [lineMasterId]);
  return convertData(data);
};

// 라인 마스터 등록
const insertLineMaster = async (formData) => {
  const values = [
    formData.line_name,
    formData.eq_group_code,
    formData.line_type,
    formData.result_id || null
  ];
  const result = await mariadb.query('insertLineMaster', values);
  return { insertId: result.insertId };
};

// 라인 마스터 수정
const updateLineMaster = async (lineMasterId, formData) => {
  const values = [
    formData.line_name,
    formData.eq_group_code,
    formData.line_type,
    lineMasterId
  ];
  const result = await mariadb.query('updateLineMaster', values);
  return result;
};

// 라인 마스터 삭제
const deleteLineMaster = async (lineMasterId) => {
  const result = await mariadb.query('deleteLineMaster', [lineMasterId]);
  return result;
};

// 라인 실적(상태) 목록 조회 (프론트에서 사용)
const getLineList = async () => {
  const list = await mariadb.query('selectLineList');
  return convertData(list);
};

// 라인 실적 상세 조회
const getLineDetail = async (lineId) => {
  const [data] = await mariadb.query('selectLineDetail', [lineId]);
  return convertData(data);
};

// 라인 실적 등록
const insertLine = async (formData) => {
  const values = [
    formData.line_masterid,
    formData.pkg_type,
    formData.line_status,
    formData.employee_name,
    formData.curr_work_no,
    formData.target_qty,
  ];
  const result = await mariadb.query('insertLine', values);
  return { insertId: result.insertId };
};

// 라인 실적 수정
const updateLine = async (lineId, formData) => {
  const values = [
    formData.pkg_type,
    formData.line_status,
    formData.employee_name,
    formData.curr_work_no,
    formData.target_qty,
    lineId
  ];
  const result = await mariadb.query('updateLine', values);
  return result;
};

// 라인 실적 삭제
const deleteLine = async (lineId) => {
  const result = await mariadb.query('deleteLine', [lineId]);
  return result;
};

// 마스터+실적 JOIN 상세 조회
const getLineWithMaster = async (lineId) => {
  const [data] = await mariadb.query('selectLineWithMaster', [lineId]);
  return convertData(data);
};

module.exports = {
  getLineMasterList,
  getLineMasterDetail,
  insertLineMaster,
  updateLineMaster,
  deleteLineMaster,

  getLineList,
  getLineDetail,
  insertLine,
  updateLine,
  deleteLine,

  getLineWithMaster,
};
