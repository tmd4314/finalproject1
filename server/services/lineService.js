// server/services/line_service.js
const mariadb = require('../database/mapper');  // 기존 mapper 사용

// 공통 데이터 변환 유틸
const convertData = (obj) => obj;

// 라인 마스터 목록 조회
const getLineMasterList = async () => {
  try {
    console.log('라인 마스터 목록 조회 시작...');
    const list = await mariadb.query('selectLineMasterList');
    console.log('라인 마스터 목록 조회 성공:', list.length, '건');
    return convertData(list);
  } catch (error) {
    console.error('라인 마스터 목록 조회 에러:', error);
    throw new Error('라인 마스터 조회 실패: ' + error.message);
  }
};

// 라인 마스터 상세 조회
const getLineMasterDetail = async (lineMasterId) => {
  try {
    const result = await mariadb.query('selectLineMasterDetail', [lineMasterId]);
    const [data] = result;
    console.log('라인 마스터 상세 조회 성공:', lineMasterId);
    return convertData(data);
  } catch (error) {
    console.error('라인 마스터 상세 조회 에러:', error);
    throw new Error('라인 마스터 상세 조회 실패: ' + error.message);
  }
};

// 라인 마스터 등록
const insertLineMaster = async (formData) => {
  try {
    const values = [
      formData.line_name,
      formData.eq_group_code,
      formData.line_type,
      formData.result_id || null
    ];
    const result = await mariadb.query('insertLineMaster', values);
    console.log('라인 마스터 등록 성공:', result.insertId);
    return { insertId: result.insertId };
  } catch (error) {
    console.error('라인 마스터 등록 에러:', error);
    throw new Error('라인 마스터 등록 실패: ' + error.message);
  }
};

// 라인 마스터 수정
const updateLineMaster = async (lineMasterId, formData) => {
  try {
    const values = [
      formData.line_name,
      formData.eq_group_code,
      formData.line_type,
      lineMasterId
    ];
    const result = await mariadb.query('updateLineMaster', values);
    console.log('라인 마스터 수정 성공:', lineMasterId);
    return result;
  } catch (error) {
    console.error('라인 마스터 수정 에러:', error);
    throw new Error('라인 마스터 수정 실패: ' + error.message);
  }
};

// 라인 마스터 삭제
const deleteLineMaster = async (lineMasterId) => {
  try {
    const result = await mariadb.query('deleteLineMaster', [lineMasterId]);
    console.log('라인 마스터 삭제 성공:', lineMasterId);
    return result;
  } catch (error) {
    console.error('라인 마스터 삭제 에러:', error);
    throw new Error('라인 마스터 삭제 실패: ' + error.message);
  }
};

// 라인 실적(상태) 목록 조회 (프론트에서 사용) - 가장 중요!
const getLineList = async () => {
  try {
    console.log('=== 라인 리스트 조회 시작 ===');
    console.log('SQL alias: selectLineList');
    
    const list = await mariadb.query('selectLineList');
    
    console.log('라인 리스트 조회 성공:', list.length, '건');
    if (list.length > 0) {
      console.log('첫 번째 데이터:', JSON.stringify(list[0], null, 2));
    } else {
      console.log('⚠️ 조회된 데이터가 없습니다.');
      console.log('DB에 package_master와 package_line 테이블에 데이터가 있는지 확인하세요.');
    }
    
    return convertData(list);
  } catch (error) {
    console.error('=== 라인 리스트 조회 에러 ===');
    console.error('에러 객체:', error);
    console.error('에러 메시지:', error.message || error.err?.message);
    console.error('에러 스택:', error.stack || error.err?.stack);
    
    // DB 연결 에러인지 SQL 에러인지 구분
    if (error.err) {
      // mapper.js에서 오는 에러 구조
      throw new Error('DB 쿼리 실패: ' + (error.err.message || error.err));
    } else {
      throw new Error('라인 리스트 조회 실패: ' + error.message);
    }
  }
};

// 라인 실적 상세 조회
const getLineDetail = async (lineId) => {
  try {
    const result = await mariadb.query('selectLineDetail', [lineId]);
    const [data] = result;
    console.log('라인 실적 상세 조회 성공:', lineId);
    return convertData(data);
  } catch (error) {
    console.error('라인 실적 상세 조회 에러:', error);
    throw new Error('라인 실적 상세 조회 실패: ' + (error.err?.message || error.message));
  }
};

// 라인 실적 등록
const insertLine = async (formData) => {
  try {
    const values = [
      formData.line_masterid,
      formData.pkg_type,
      formData.line_status,
      formData.employee_name,
      formData.curr_work_no,
      formData.target_qty,
    ];
    const result = await mariadb.query('insertLine', values);
    console.log('라인 실적 등록 성공:', result.insertId);
    return { insertId: result.insertId };
  } catch (error) {
    console.error('라인 실적 등록 에러:', error);
    throw new Error('라인 실적 등록 실패: ' + (error.err?.message || error.message));
  }
};

// 라인 실적 수정
const updateLine = async (lineId, formData) => {
  try {
    const values = [
      formData.pkg_type,
      formData.line_status,
      formData.employee_name,
      formData.curr_work_no,
      formData.target_qty,
      lineId
    ];
    const result = await mariadb.query('updateLine', values);
    console.log('라인 실적 수정 성공:', lineId);
    return result;
  } catch (error) {
    console.error('라인 실적 수정 에러:', error);
    throw new Error('라인 실적 수정 실패: ' + (error.err?.message || error.message));
  }
};

// 라인 실적 삭제
const deleteLine = async (lineId) => {
  try {
    const result = await mariadb.query('deleteLine', [lineId]);
    console.log('라인 실적 삭제 성공:', lineId);
    return result;
  } catch (error) {
    console.error('라인 실적 삭제 에러:', error);
    throw new Error('라인 실적 삭제 실패: ' + (error.err?.message || error.message));
  }
};

// 마스터+실적 JOIN 상세 조회
const getLineWithMaster = async (lineId) => {
  try {
    const result = await mariadb.query('selectLineWithMaster', [lineId]);
    const [data] = result;
    console.log('라인 상세 조회 성공:', lineId);
    return convertData(data);
  } catch (error) {
    console.error('라인 상세 조회 에러:', error);
    throw new Error('라인 상세 조회 실패: ' + (error.err?.message || error.message));
  }
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