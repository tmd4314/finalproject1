// server/services/lineService.js
const mariadb = require('../database/mapper');

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

// 라인 코드로 마스터 조회
const getLineMasterByLineId = async (lineId) => {
  try {
    const result = await mariadb.query('selectLineMasterByLineId', [lineId]);
    const [data] = result;
    console.log('라인 코드로 마스터 조회 성공:', lineId);
    return convertData(data);
  } catch (error) {
    console.error('라인 코드로 마스터 조회 에러:', error);
    throw new Error('라인 마스터 조회 실패: ' + (error.err?.message || error.message));
  }
};

// 라인 마스터 등록
const insertLineMaster = async (formData) => {
  try {
    const values = [
      formData.line_name,
      formData.eq_group_code || 'e3',
      formData.line_type,
      formData.result_id || '2001',
      formData.line_code,
      formData.max_capacity || 1000,  
      formData.description || ''
    ];
    const result = await mariadb.query('insertLineMaster', values);
    console.log('라인 마스터 등록 성공:', result.insertId);
    return { insertId: result.insertId };
  } catch (error) {
    console.error('라인 마스터 등록 에러:', error);
    throw new Error('라인 마스터 등록 실패: ' + (error.err?.message || error.message));
  }
};

// 라인 마스터 수정
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

// 라인 코드 중복 체크
const checkLineIdExists = async (lineId, lineType = null) => {
  try {
    let result;
    if (lineType) {
      result = await mariadb.query('checkLineIdExistsByType', [lineId, lineType]);
    } else {
      result = await mariadb.query('checkLineIdExists', [lineId]);
    }
    const count = result[0].count;
    console.log('라인 코드 중복 체크:', lineId, lineType || '전체', '- 존재 여부:', count > 0);
    return count > 0;
  } catch (error) {
    console.error('라인 코드 중복 체크 에러:', error);
    throw new Error('라인 코드 중복 체크 실패: ' + (error.err?.message || error.message));
  }
};

// 사용 가능한 라인 ID 목록 조회
const getAvailableLineIds = async () => {
  try {
    console.log('사용 가능한 라인 ID 목록 조회 시작...');
    
    const usedResult = await mariadb.query('SELECT DISTINCT line_code FROM package_master WHERE line_code IS NOT NULL');
    const usedIds = usedResult.map(row => row.line_code);
    
    const allIds = Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i));
    const availableIds = allIds.filter(id => !usedIds.includes(id));
    
    console.log('사용 중인 라인 ID:', usedIds);
    console.log('사용 가능한 라인 ID 목록:', availableIds);
    return availableIds;
  } catch (error) {
    console.error('사용 가능한 라인 ID 조회 에러:', error);
    const defaultIds = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    console.log('기본 라인 ID 목록 반환:', defaultIds);
    return defaultIds;
  }
};

// ========== 프론트엔드용 통합 라인 관리 ==========

// 라인 목록 조회 - 마스터 + 최신 상태 + 작업결과 통합
const getLineList = async () => {
  try {
    console.log('=== 통합 라인 리스트 조회 시작 ===');
    
    const list = await mariadb.query('selectLineList');
    
    console.log('통합 라인 리스트 조회 성공:', list.length, '건');
    if (list.length > 0) {
      console.log('첫 번째 데이터:', JSON.stringify(list[0], null, 2));
    }
    
    // 🔥 프론트엔드 형식에 맞게 데이터 변환 (작업결과 정보 포함)
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
      employee_id: line.employee_id || null, // 🔥 employee_id 추가
      curr_work_no: line.curr_work_no || '',
      target_qty: line.target_qty || 0,
      reg_date: line.reg_date,
      created_at: line.reg_date,
      updated_at: line.reg_date,
      // 🔥 작업결과 정보 추가
      process_group_code: line.process_group_code || '',
      result_remark: line.result_remark || '',
      code_value: line.code_value || '',
      work_start_date: line.work_start_date || '',
      // 기존 work_order 정보는 유지하되 work_result로 변경
      work_no: line.curr_work_no || '',
      work_order_no: line.curr_work_no || ''
    }));
    
    return convertData(formattedList);
  } catch (error) {
    console.error('=== 통합 라인 리스트 조회 에러 ===');
    console.error('에러:', error);
    
    if (error.err) {
      throw new Error('DB 쿼리 실패: ' + (error.err.message || error.err));
    } else {
      throw new Error('통합 라인 리스트 조회 실패: ' + error.message);
    }
  }
};

// 통합 라인 등록 - 마스터 + 상태 동시 생성
const insertIntegratedLine = async (formData) => {
  try {
    console.log('=== 통합 라인 등록 시작 ===');
    console.log('등록 데이터:', formData);

    // 1. 라인 ID + 타입 중복 체크
    const isDuplicate = await checkLineIdExists(formData.line_id, formData.line_type);
    if (isDuplicate) {
      throw new Error(`이미 존재하는 라인입니다: ${formData.line_id}라인 ${formData.line_type}`);
    }

    // 2. 라인명 자동 생성
    const typeText = formData.line_type === 'INNER' ? '내포장' : '외포장';
    const line_name = `${formData.line_id}라인 ${typeText}`;
    
    // 3. 라인 마스터 등록
    const masterData = {
      line_name: line_name,
      eq_group_code: 'e3',
      line_type: formData.line_type,
      result_id: '2001',
      line_code: formData.line_id,
      max_capacity: formData.max_capacity || 1000,
      description: formData.description || ''
    };
    
    const masterResult = await insertLineMaster(masterData);
    const line_masterid = masterResult.insertId;
    
    // 4. 라인 상태 등록 - 🔥 로그인 사원 정보 사용
    const statusData = {
      line_masterid: line_masterid,
      pkg_type: formData.line_type,
      line_status: formData.line_status || 'AVAILABLE',
      curr_work_no: '',
      target_qty: 0,
      eq_name: formData.eq_name || '',
      current_speed: formData.current_speed || 0,
      line_code: formData.line_id,
      employee_id: formData.employee_id || 2  // 🔥 로그인 사원 ID 사용
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

// 내포장/외포장 라인 동시 등록
const insertDualPackagingLine = async (formData) => {
  try {
    console.log('=== 내포장/외포장 라인 동시 등록 시작 ===');
    console.log('등록 데이터:', formData);

    const innerExists = await checkLineIdExists(formData.line_id, 'INNER');
    const outerExists = await checkLineIdExists(formData.line_id, 'OUTER');
    
    if (innerExists && outerExists) {
      throw new Error(`${formData.line_id}라인의 내포장/외포장이 모두 이미 존재합니다.`);
    }

    const results = [];

    // 내포장 라인 등록
    if (!innerExists) {
      const innerData = {
        ...formData,
        line_type: 'INNER',
        eq_name: formData.inner_eq_name,
        max_capacity: formData.inner_capacity,
        current_speed: formData.inner_speed,
        employee_id: formData.inner_employee_id  // 🔥 내포장 담당자 ID 사용
      };
      const innerResult = await insertIntegratedLine(innerData);
      results.push({ type: 'INNER', ...innerResult });
    } else {
      results.push({ type: 'INNER', message: '이미 존재함', skipped: true });
    }

    // 외포장 라인 등록
    if (!outerExists) {
      const outerData = {
        ...formData,
        line_type: 'OUTER',
        eq_name: formData.outer_eq_name,
        max_capacity: formData.outer_capacity,
        current_speed: formData.outer_speed,
        employee_id: formData.outer_employee_id  // 🔥 외포장 담당자 ID 사용
      };
      const outerResult = await insertIntegratedLine(outerData);
      results.push({ type: 'OUTER', ...outerResult });
    } else {
      results.push({ type: 'OUTER', message: '이미 존재함', skipped: true });
    }

    const newCount = results.filter(r => !r.skipped).length;
    
    return {
      success: true,
      line_id: formData.line_id,
      results: results,
      newCount: newCount,
      message: `${formData.line_id}라인 등록 완료 (신규: ${newCount}개, 기존: ${2-newCount}개)`
    };
    
  } catch (error) {
    console.error('내포장/외포장 라인 동시 등록 에러:', error);
    throw new Error('라인 동시 등록 실패: ' + (error.message || error.err?.message));
  }
};

// 🔥 통합 라인 수정 (서브쿼리 문제 해결)
const updateIntegratedLine = async (lineId, formData) => {
  try {
    console.log('=== 통합 라인 수정 시작 ===');
    console.log('라인 ID:', lineId, '수정 데이터:', formData);

    const existingMaster = await getLineMasterByLineId(lineId);
    if (!existingMaster) {
      throw new Error('수정할 라인을 찾을 수 없습니다: ' + lineId);
    }

    const typeText = formData.line_type === 'INNER' ? '내포장' : '외포장';
    const line_name = `${lineId}라인 ${typeText}`;
    
    // 1. 라인 마스터 수정
    const masterData = {
      line_name: line_name,
      eq_group_code: 'e3',
      line_type: formData.line_type,
      max_capacity: formData.max_capacity || 1000,
      description: formData.description || ''
    };
    
    await updateLineMaster(existingMaster.line_masterid, masterData);
    
    // 2. 🔥 최신 라인 상태 ID 찾기 (새로운 쿼리 사용)
    const latestLineResult = await mariadb.query('selectLatestLineIdByMasterId', [lineId]);
    
    if (latestLineResult.length === 0) {
      throw new Error('업데이트할 라인 상태를 찾을 수 없습니다: ' + lineId);
    }
    
    const latestLineId = latestLineResult[0].line_id;
    console.log('🔍 최신 라인 상태 ID:', latestLineId);
    
    // 3. 라인 상태 직접 업데이트 - 🔥 로그인 사원 정보 사용
    const statusData = {
      pkg_type: formData.line_type,
      line_status: formData.line_status || 'AVAILABLE',
      employee_id: formData.employee_id || 2,  // 🔥 선택된 담당자 ID 사용
      eq_name: formData.eq_name || '',
      current_speed: formData.current_speed || 0,
      curr_work_no: formData.curr_work_no || '',
      target_qty: formData.target_qty || 0
    };
    
    await updateLine(latestLineId, statusData);
    
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

// 통합 라인 삭제
const deleteIntegratedLine = async (lineId) => {
  try {
    console.log('=== 통합 라인 삭제 시작 ===');

    const existingMaster = await getLineMasterByLineId(lineId);
    if (!existingMaster) {
      throw new Error('삭제할 라인을 찾을 수 없습니다: ' + lineId);
    }

    await deleteLineByMasterId(lineId);
    await deleteLineMaster(existingMaster.line_masterid);
    
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

    let deletedCount = 0;
    const errors = [];

    for (const lineId of lineIds) {
      try {
        await deleteIntegratedLine(lineId);
        deletedCount++;
      } catch (error) {
        errors.push(`${lineId}: ${error.message}`);
      }
    }
    
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

// ========== 담당자 관리 ==========

// 🔥 사용 가능한 담당자 목록 조회 (새로 추가)
const getAvailableEmployees = async () => {
  try {
    console.log('사용 가능한 담당자 목록 조회 시작...');
    const employees = await mariadb.query('selectAvailableEmployees');
    console.log('사용 가능한 담당자 조회 성공:', employees.length, '명');
    return convertData(employees);
  } catch (error) {
    console.error('사용 가능한 담당자 조회 에러:', error);
    console.warn('담당자 테이블 조회 실패 - 기본 담당자 목록을 반환합니다.');
    
    // 🔥 DB 조회 실패 시 기본 담당자 목록 반환
    const defaultEmployees = [
      { employee_id: 2, employee_name: '김홍인' },
      { employee_id: 3, employee_name: '김다산' },
      { employee_id: 4, employee_name: '최현석' },
      { employee_id: 5, employee_name: '이승민' },
      { employee_id: 6, employee_name: '박현우' },
      { employee_id: 7, employee_name: '정수진' }
    ];
    
    console.log('기본 담당자 목록 반환:', defaultEmployees.length, '명');
    return defaultEmployees;
  }
};

// ========== 작업결과 관리 ==========

// 🔥 사용 가능한 작업 결과 목록 조회
const getAvailableWorkResults = async () => {
  try {
    console.log('사용 가능한 작업 결과 목록 조회 시작...');
    const results = await mariadb.query('selectAvailableWorkResults');
    console.log('사용 가능한 작업 결과 조회 성공:', results.length, '건');
    return convertData(results);
  } catch (error) {
    console.error('사용 가능한 작업 결과 조회 에러:', error);
    throw new Error('작업 결과 조회 실패: ' + (error.err?.message || error.message));
  }
};

// 🔥 특정 작업 결과 상세 조회
const getWorkResultDetail = async (workOrderNo) => {
  try {
    const result = await mariadb.query('selectWorkResultDetail', [workOrderNo]);
    const [data] = result;
    console.log('작업 결과 상세 조회 성공:', workOrderNo);
    return convertData(data);
  } catch (error) {
    console.error('작업 결과 상세 조회 에러:', error);
    throw new Error('작업 결과 상세 조회 실패: ' + (error.err?.message || error.message));
  }
};

// ========== 기존 라인 상태 관리 (하위 호환성) ==========

// 라인 실적 등록 - 🔥 로그인 사원 정보 사용
const insertLine = async (formData) => {
  try {
    const values = [
      formData.line_masterid,
      formData.pkg_type,
      formData.line_status,
      formData.curr_work_no || '',
      formData.target_qty || 0,
      formData.eq_name || '',           
      formData.current_speed || 0,      
      formData.line_code,
      formData.employee_id || 2  // 🔥 로그인 사원 ID 사용 (기본값 2)
    ];
    
    const result = await mariadb.query('insertLine', values);
    console.log('라인 실적 등록 성공:', result.insertId);
    return { insertId: result.insertId };
  } catch (error) {
    console.error('라인 실적 등록 에러:', error);
    throw new Error('라인 실적 등록 실패: ' + (error.err?.message || error.message));
  }
};

// 🔥 라인 실적 수정 - 직접 line_id로 수정 (로그인 사원 정보 사용)
const updateLine = async (lineId, formData) => {
  try {
    const values = [
      formData.pkg_type,
      formData.line_status,
      formData.employee_id || 2,  // 🔥 로그인 사원 ID 사용
      formData.eq_name || '',           
      formData.current_speed || 0,      
      formData.curr_work_no || '',
      formData.target_qty || 0,
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

// 🔥 마스터 라인 ID 기준 상태 업데이트 - 🔥 로그인 사원 정보 사용 (서브쿼리 방식)
const updateLineByMasterId = async (masterLineId, formData) => {
  try {
    const values = [
      formData.pkg_type,
      formData.line_status,
      formData.employee_id || 2,  // 🔥 로그인 사원 ID 사용
      formData.eq_name || '',
      formData.current_speed || 0,
      formData.curr_work_no || '',
      formData.target_qty || 0,
      masterLineId  // 🔥 한 번만 전달
    ];
    const result = await mariadb.query('updateLineByMasterId', values);
    console.log('마스터 라인 ID 기준 상태 업데이트 성공:', masterLineId);
    return result;
  } catch (error) {
    console.error('마스터 라인 ID 기준 상태 업데이트 에러:', error);
    throw new Error('라인 상태 업데이트 실패: ' + (error.err?.message || error.message));
  }
};

// 기타 함수들
const getLineDetail = async (lineId) => {
  try {
    const result = await mariadb.query('selectLineDetail', [lineId]);
    const [data] = result;
    return convertData(data);
  } catch (error) {
    throw new Error('라인 실적 상세 조회 실패: ' + (error.err?.message || error.message));
  }
};

const deleteLine = async (lineId) => {
  try {
    const result = await mariadb.query('deleteLine', [lineId]);
    return result;
  } catch (error) {
    throw new Error('라인 실적 삭제 실패: ' + (error.err?.message || error.message));
  }
};

const deleteLineByMasterId = async (masterLineId) => {
  try {
    const result = await mariadb.query('deleteLineByMasterId', [masterLineId]);
    return result;
  } catch (error) {
    throw new Error('라인 상태 삭제 실패: ' + (error.err?.message || error.message));
  }
};

const getLineWithMaster = async (lineId) => {
  try {
    const result = await mariadb.query('selectLineWithMaster', [lineId]);
    const [data] = result;
    return convertData(data);
  } catch (error) {
    throw new Error('라인 상세 조회 실패: ' + (error.err?.message || error.message));
  }
};

const getLineStatusStats = async () => {
  try {
    const stats = await mariadb.query('selectLineStatusStats');
    const workingLines = await mariadb.query('selectWorkingLines');
    
    return {
      statusStats: stats,
      workingLines: workingLines,
      totalLines: stats.reduce((sum, stat) => sum + stat.count, 0)
    };
  } catch (error) {
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

  // 프론트엔드 통합 관리
  getLineList,
  insertIntegratedLine,
  insertDualPackagingLine,
  updateIntegratedLine,
  deleteIntegratedLine,
  bulkDeleteLines,

  // 🔥 담당자 관리 (새로 추가)
  getAvailableEmployees,

  // 작업결과 관리
  getAvailableWorkResults,
  getWorkResultDetail,

  // 기존 라인 상태 관리
  getLineDetail,
  insertLine,
  updateLine,
  updateLineByMasterId,  // 🔥 추가
  deleteLine,
  deleteLineByMasterId,
  getLineWithMaster,

  // 통계
  getLineStatusStats,
};