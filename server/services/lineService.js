// server/services/lineService.js
const mariadb = require('../database/mapper');  // 기존 mapper 사용

// 공통 데이터 변환 유틸
const convertData = (obj) => obj;

// ========== 라인 마스터 관리 ==========

// 라인 마스터 목록 조회
const getLineMasterList = async () => {
  try {
    console.log('라인 마스터 목록 조회 시작...');
    const list = await mariadb.query('selectLineMasterList');
    console.log('라인 마스터 목록 조회 성공:', list.length, '건');
    return convertData(list);
  } catch (error) {
    console.error('라인 마스터 목록 조회 에러:', error);
    throw new Error('라인 마스터 조회 실패: ' + (error.err?.message || error.message));
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
    throw new Error('라인 마스터 상세 조회 실패: ' + (error.err?.message || error.message));
  }
};

// 라인 ID로 마스터 조회
const getLineMasterByLineId = async (lineId) => {
  try {
    const result = await mariadb.query('selectLineMasterByLineId', [lineId]);
    const [data] = result;
    console.log('라인 ID로 마스터 조회 성공:', lineId);
    return convertData(data);
  } catch (error) {
    console.error('라인 ID로 마스터 조회 에러:', error);
    throw new Error('라인 마스터 조회 실패: ' + (error.err?.message || error.message));
  }
};

// 라인 마스터 등록 (location 필드 제거)
const insertLineMaster = async (formData) => {
  try {
    const values = [
      formData.line_id,           
      formData.line_name,
      formData.eq_group_code || 'e3',
      formData.line_type,
      formData.max_capacity || 1000,  
      formData.description || '',      
      formData.result_id || '2001'
    ];
    const result = await mariadb.query('insertLineMaster', values);
    console.log('라인 마스터 등록 성공:', result.insertId);
    return { insertId: result.insertId };
  } catch (error) {
    console.error('라인 마스터 등록 에러:', error);
    throw new Error('라인 마스터 등록 실패: ' + (error.err?.message || error.message));
  }
};

// 라인 마스터 수정 (location 필드 제거)
const updateLineMaster = async (lineMasterId, formData) => {
  try {
    const values = [
      formData.line_name,
      formData.eq_group_code || 'e3',
      formData.line_type,
      formData.max_capacity || 1000,  
      formData.description || '',      
      lineMasterId
    ];
    const result = await mariadb.query('updateLineMaster', values);
    console.log('라인 마스터 수정 성공:', lineMasterId);
    return result;
  } catch (error) {
    console.error('라인 마스터 수정 에러:', error);
    throw new Error('라인 마스터 수정 실패: ' + (error.err?.message || error.message));
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
    throw new Error('라인 마스터 삭제 실패: ' + (error.err?.message || error.message));
  }
};

// 라인 ID 중복 체크
const checkLineIdExists = async (lineId) => {
  try {
    const result = await mariadb.query('checkLineIdExists', [lineId]);
    const count = result[0].count;
    console.log('라인 ID 중복 체크:', lineId, '- 존재 여부:', count > 0);
    return count > 0;
  } catch (error) {
    console.error('라인 ID 중복 체크 에러:', error);
    throw new Error('라인 ID 중복 체크 실패: ' + (error.err?.message || error.message));
  }
};

// 사용 가능한 라인 ID 목록 조회
const getAvailableLineIds = async () => {
  try {
    console.log('사용 가능한 라인 ID 목록 조회 시작...');
    const result = await mariadb.query('getAvailableLineIds');
    const lineIds = result.map(row => row.line_id);
    console.log('사용 가능한 라인 ID 목록:', lineIds);
    return lineIds;
  } catch (error) {
    console.error('사용 가능한 라인 ID 조회 에러:', error);
    // 에러 시 기본적으로 M-Z 반환 (A-L은 이미 사용 중)
    const allIds = Array.from({length: 14}, (_, i) => String.fromCharCode(77 + i)); // M-Z
    console.log('기본 라인 ID 목록 반환:', allIds);
    return allIds;
  }
};

// ========== 프론트엔드용 통합 라인 관리 ==========

// 라인 목록 조회 (프론트에서 가장 중요!) - 마스터 + 최신 상태 통합
const getLineList = async () => {
  try {
    console.log('=== 통합 라인 리스트 조회 시작 ===');
    console.log('SQL alias: selectLineList');
    
    const list = await mariadb.query('selectLineList');
    
    console.log('통합 라인 리스트 조회 성공:', list.length, '건');
    if (list.length > 0) {
      console.log('첫 번째 데이터:', JSON.stringify(list[0], null, 2));
    } else {
      console.log('⚠️ 조회된 데이터가 없습니다.');
      console.log('DB에 package_master 테이블에 데이터가 있는지 확인하세요.');
    }
    
    // 프론트엔드 형식에 맞게 데이터 변환 (location 필드 제거)
    const formattedList = list.map(line => ({
      line_id: line.line_id,
      line_name: line.line_name,
      line_type: line.line_type,
      eq_name: line.eq_name || '',
      line_status: line.line_status,
      max_capacity: line.max_capacity || 1000,
      current_speed: line.current_speed || 0,
      description: line.description || '',
      employee_name: line.employee_name || '',
      curr_work_no: line.curr_work_no || '',
      target_qty: line.target_qty || 0,
      reg_date: line.reg_date,
      created_at: line.reg_date,
      updated_at: line.reg_date
    }));
    
    return convertData(formattedList);
  } catch (error) {
    console.error('=== 통합 라인 리스트 조회 에러 ===');
    console.error('에러 객체:', error);
    console.error('에러 메시지:', error.message || error.err?.message);
    console.error('에러 스택:', error.stack || error.err?.stack);
    
    // DB 연결 에러인지 SQL 에러인지 구분
    if (error.err) {
      // mapper.js에서 오는 에러 구조
      throw new Error('DB 쿼리 실패: ' + (error.err.message || error.err));
    } else {
      throw new Error('통합 라인 리스트 조회 실패: ' + error.message);
    }
  }
};

// 통합 라인 등록 (마스터 + 상태 동시 생성) - location 필드 제거
const insertIntegratedLine = async (formData) => {
  try {
    console.log('=== 통합 라인 등록 시작 ===');
    console.log('등록 데이터:', formData);

    // 1. 라인 ID 중복 체크
    const isDuplicate = await checkLineIdExists(formData.line_id);
    if (isDuplicate) {
      throw new Error('이미 존재하는 라인 ID입니다: ' + formData.line_id);
    }

    // 2. 라인명 자동 생성
    const typeText = formData.line_type === 'INNER' ? '내포장' : '외포장';
    const line_name = `${formData.line_id}라인 ${typeText}`;
    
    // 3. 라인 마스터 등록 (location 제거)
    const masterData = {
      line_id: formData.line_id,
      line_name: line_name,
      eq_group_code: 'e3',
      line_type: formData.line_type,
      max_capacity: formData.max_capacity || 1000,
      description: formData.description || '',
      result_id: '2001'
    };
    
    const masterResult = await insertLineMaster(masterData);
    const line_masterid = masterResult.insertId;
    
    // 4. 라인 상태 등록 (초기 상태)
    const statusData = {
      line_masterid: line_masterid,
      pkg_type: formData.line_type,
      line_status: formData.line_status || 'AVAILABLE',
      employee_name: formData.employee_name || '',
      eq_name: formData.eq_name || '',
      current_speed: formData.current_speed || 0,
      curr_work_no: '',
      target_qty: 0
    };
    
    const statusResult = await insertLine(statusData);
    
    console.log('통합 라인 등록 성공 - Master ID:', line_masterid, ', Status ID:', statusResult.insertId);
    
    return {
      success: true,
      insertId: line_masterid,
      line_id: formData.line_id,
      line_name: line_name,
      message: '라인이 성공적으로 등록되었습니다.'
    };
    
  } catch (error) {
    console.error('통합 라인 등록 에러:', error);
    throw new Error('통합 라인 등록 실패: ' + (error.message || error.err?.message));
  }
};

// 통합 라인 수정 (마스터 + 상태 동시 업데이트) - location 필드 제거
const updateIntegratedLine = async (lineId, formData) => {
  try {
    console.log('=== 통합 라인 수정 시작 ===');
    console.log('라인 ID:', lineId, '수정 데이터:', formData);

    // 1. 기존 라인 마스터 조회
    const existingMaster = await getLineMasterByLineId(lineId);
    if (!existingMaster) {
      throw new Error('수정할 라인을 찾을 수 없습니다: ' + lineId);
    }

    // 2. 라인명 자동 생성
    const typeText = formData.line_type === 'INNER' ? '내포장' : '외포장';
    const line_name = `${lineId}라인 ${typeText}`;
    
    // 3. 라인 마스터 수정 (location 제거)
    const masterData = {
      line_name: line_name,
      eq_group_code: 'e3',
      line_type: formData.line_type,
      max_capacity: formData.max_capacity || 1000,
      description: formData.description || ''
    };
    
    await updateLineMaster(existingMaster.line_masterid, masterData);
    
    // 4. 라인 상태 업데이트
    const statusData = {
      pkg_type: formData.line_type,
      line_status: formData.line_status || 'AVAILABLE',
      employee_name: formData.employee_name || '',
      eq_name: formData.eq_name || '',
      current_speed: formData.current_speed || 0,
      curr_work_no: formData.curr_work_no || '',
      target_qty: formData.target_qty || 0
    };
    
    await updateLineByMasterId(lineId, statusData);
    
    console.log('통합 라인 수정 성공:', lineId);
    
    return {
      success: true,
      line_id: lineId,
      line_name: line_name,
      message: '라인이 성공적으로 수정되었습니다.'
    };
    
  } catch (error) {
    console.error('통합 라인 수정 에러:', error);
    throw new Error('통합 라인 수정 실패: ' + (error.message || error.err?.message));
  }
};

// 통합 라인 삭제 (마스터 + 상태 동시 삭제)
const deleteIntegratedLine = async (lineId) => {
  try {
    console.log('=== 통합 라인 삭제 시작 ===');
    console.log('삭제할 라인 ID:', lineId);

    // 1. 기존 라인 마스터 조회
    const existingMaster = await getLineMasterByLineId(lineId);
    if (!existingMaster) {
      throw new Error('삭제할 라인을 찾을 수 없습니다: ' + lineId);
    }

    // 2. 라인 상태 데이터 삭제
    await deleteLineByMasterId(lineId);
    
    // 3. 라인 마스터 삭제
    await deleteLineMaster(existingMaster.line_masterid);
    
    console.log('통합 라인 삭제 성공:', lineId);
    
    return {
      success: true,
      line_id: lineId,
      message: '라인이 성공적으로 삭제되었습니다.'
    };
    
  } catch (error) {
    console.error('통합 라인 삭제 에러:', error);
    throw new Error('통합 라인 삭제 실패: ' + (error.message || error.err?.message));
  }
};

// 일괄 삭제
const bulkDeleteLines = async (lineIds) => {
  try {
    console.log('=== 라인 일괄 삭제 시작 ===');
    console.log('삭제할 라인 IDs:', lineIds);

    let deletedCount = 0;
    const errors = [];

    for (const lineId of lineIds) {
      try {
        await deleteIntegratedLine(lineId);
        deletedCount++;
      } catch (error) {
        console.error(`라인 ${lineId} 삭제 실패:`, error.message);
        errors.push(`${lineId}: ${error.message}`);
      }
    }

    console.log(`일괄 삭제 완료 - 성공: ${deletedCount}개, 실패: ${errors.length}개`);
    
    return {
      success: true,
      deletedCount: deletedCount,
      totalRequested: lineIds.length,
      errors: errors,
      message: `${deletedCount}개의 라인이 삭제되었습니다.`
    };
    
  } catch (error) {
    console.error('일괄 삭제 에러:', error);
    throw new Error('일괄 삭제 실패: ' + (error.message || error.err?.message));
  }
};

// ========== 기존 라인 상태 관리 (하위 호환성) ==========

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
      formData.eq_name || '',           
      formData.current_speed || 0,      
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
      formData.eq_name || '',           
      formData.current_speed || 0,      
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

// 마스터 라인 ID 기준 상태 업데이트 (수정된 쿼리 사용)
const updateLineByMasterId = async (masterLineId, formData) => {
  try {
    const values = [
      formData.pkg_type,
      formData.line_status,
      formData.employee_name,
      formData.eq_name || '',
      formData.current_speed || 0,
      formData.curr_work_no || '',
      formData.target_qty || 0,
      masterLineId,
      masterLineId  // WHERE 절에서 두 번 사용
    ];
    const result = await mariadb.query('updateLineByMasterId', values);
    console.log('마스터 라인 ID 기준 상태 업데이트 성공:', masterLineId);
    return result;
  } catch (error) {
    console.error('마스터 라인 ID 기준 상태 업데이트 에러:', error);
    throw new Error('라인 상태 업데이트 실패: ' + (error.err?.message || error.message));
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

// 마스터 라인 ID 기준 상태 삭제
const deleteLineByMasterId = async (masterLineId) => {
  try {
    const result = await mariadb.query('deleteLineByMasterId', [masterLineId]);
    console.log('마스터 라인 ID 기준 상태 삭제 성공:', masterLineId);
    return result;
  } catch (error) {
    console.error('마스터 라인 ID 기준 상태 삭제 에러:', error);
    throw new Error('라인 상태 삭제 실패: ' + (error.err?.message || error.message));
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

// ========== 통계 및 대시보드 ==========

// 라인 상태 통계
const getLineStatusStats = async () => {
  try {
    const stats = await mariadb.query('selectLineStatusStats');
    const workingLines = await mariadb.query('selectWorkingLines');
    
    console.log('라인 상태 통계 조회 성공');
    return {
      statusStats: stats,
      workingLines: workingLines,
      totalLines: stats.reduce((sum, stat) => sum + stat.count, 0)
    };
  } catch (error) {
    console.error('라인 상태 통계 조회 에러:', error);
    throw new Error('라인 상태 통계 조회 실패: ' + (error.err?.message || error.message));
  }
};

module.exports = {
  // 라인 마스터 관리
  getLineMasterList,
  getLineMasterDetail,
  getLineMasterByLineId,
  insertLineMaster,
  updateLineMaster,
  deleteLineMaster,
  checkLineIdExists,
  getAvailableLineIds,

  // 프론트엔드 통합 관리 (주요 기능)
  getLineList,
  insertIntegratedLine,
  updateIntegratedLine,
  deleteIntegratedLine,
  bulkDeleteLines,

  // 기존 라인 상태 관리 (하위 호환성)
  getLineDetail,
  insertLine,
  updateLine,
  updateLineByMasterId,
  deleteLine,
  deleteLineByMasterId,
  getLineWithMaster,

  // 통계
  getLineStatusStats,
};