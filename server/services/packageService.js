// services/packageService.js (기존 mapper 구조 사용)
const db = require('../database/mapper'); // 기존 mapper 사용

// BigInt를 Number로 안전하게 변환
function convertBigIntToNumber(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }

  if (typeof obj === 'object') {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = convertBigIntToNumber(value);
    }
    return newObj;
  }

  return obj;
}

// 🔥 작업번호 목록 조회 (포장 작업 수행 페이지용)
const getWorkList = async () => {
  try {
    console.log('=== 작업번호 목록 조회 시작 ===');
    console.log('SQL alias: selectWorkList');
    
    const list = await db.query('selectWorkList');
    
    console.log('작업번호 목록 조회 성공:', list.length, '건');
    if (list.length > 0) {
      console.log('첫 번째 작업:', JSON.stringify(list[0], null, 2));
    } else {
      console.log('⚠️ 대기 중인 작업이 없습니다.');
    }
    
    return convertBigIntToNumber(list);
  } catch (error) {
    console.error('=== 작업번호 목록 조회 에러 ===');
    console.error('에러 객체:', error);
    console.error('에러 메시지:', error.message || error.err?.message);
    
    if (error.err) {
      throw new Error('작업번호 조회 실패: ' + (error.err.message || error.err));
    } else {
      throw new Error('작업번호 조회 실패: ' + error.message);
    }
  }
};

// 🔥 진행 중인 작업 목록 조회
const getActiveWorks = async () => {
  try {
    console.log('=== 진행 중인 작업 목록 조회 시작 ===');
    
    const list = await db.query('selectActiveWorks');
    
    console.log('진행 중인 작업 조회 성공:', list.length, '건');
    return convertBigIntToNumber(list);
  } catch (error) {
    console.error('=== 진행 중인 작업 조회 에러 ===');
    console.error('에러 메시지:', error.message || error.err?.message);
    
    if (error.err) {
      throw new Error('진행 중인 작업 조회 실패: ' + (error.err.message || error.err));
    } else {
      throw new Error('진행 중인 작업 조회 실패: ' + error.message);
    }
  }
};

// 🔥 작업번호 선택 옵션 조회 (셀렉트박스용)
const getWorkOptions = async () => {
  try {
    console.log('=== 작업번호 옵션 조회 시작 ===');
    
    const list = await db.query('selectWorkOptions');
    
    console.log('작업번호 옵션 조회 성공:', list.length, '건');
    return convertBigIntToNumber(list);
  } catch (error) {
    console.error('=== 작업번호 옵션 조회 에러 ===');
    console.error('에러 메시지:', error.message || error.err?.message);
    
    if (error.err) {
      throw new Error('작업번호 옵션 조회 실패: ' + (error.err.message || error.err));
    } else {
      throw new Error('작업번호 옵션 조회 실패: ' + error.message);
    }
  }
};

// 🔥 작업 등록
const createWork = async (workData) => {
  try {
    const {
      work_no,
      line_id,
      work_line,
      work_step,
      step_name,
      input_qty,
      eq_code,
      employee_id,
      employee_name
    } = workData;

    console.log('=== 작업 등록 시작 ===');
    console.log('작업 데이터:', workData);

    // 필수 데이터 검증
    if (!work_no || !input_qty || !employee_id) {
      throw new Error('필수 데이터가 누락되었습니다. (작업번호, 투입수량, 작업자번호)');
    }

    if (input_qty <= 0) {
      throw new Error('투입수량은 0보다 커야 합니다.');
    }

    // 중복 작업번호 확인
    const existCheck = await db.query('checkWorkExists', [work_no]);
    if (existCheck[0].count > 0) {
      throw new Error('이미 존재하는 작업번호입니다.');
    }

    // 작업 등록
    const result = await db.query('insertWork', [
      work_no,
      line_id || 'LINE001',
      work_line || '포장라인',
      work_step || '포장',
      step_name || work_no,
      parseInt(input_qty),
      eq_code || 'PKG001',
      employee_id,
      employee_name || '작업자'
    ]);

    console.log('작업 등록 성공:', result.insertId);

    // 예상 결과 계산 (95% 수율 가정)
    const expectedOutput = Math.floor(input_qty * 0.95);
    const expectedDefect = input_qty - expectedOutput;

    return {
      work_no,
      input_qty: parseInt(input_qty),
      output_qty: expectedOutput,
      defect_qty: expectedDefect,
      insertId: result.insertId
    };

  } catch (error) {
    console.error('작업 등록 서비스 오류:', error);
    throw error;
  }
};

// 🔥 작업 상세 조회
const getWorkDetail = async (work_no) => {
  try {
    if (!work_no) {
      throw new Error('작업번호가 필요합니다.');
    }

    console.log(`=== 작업 상세 조회: ${work_no} ===`);

    const result = await db.query('selectWorkDetail', [work_no]);

    console.log(`조회 결과: ${result.length}건`);

    if (result.length === 0) {
      return null;
    }

    const workData = convertBigIntToNumber(result[0]);
    console.log('작업 상세 조회 성공:', workData);

    return workData;

  } catch (error) {
    console.error('작업 상세 조회 서비스 오류:', error);
    throw error;
  }
};

// 🔥 작업 시작
const startWork = async (work_no) => {
  try {
    if (!work_no) {
      throw new Error('작업번호가 필요합니다.');
    }

    console.log(`=== 작업 시작: ${work_no} ===`);

    // 현재 작업 상태 확인
    const currentWork = await getWorkDetail(work_no);
    if (!currentWork) {
      throw new Error('해당 작업을 찾을 수 없습니다.');
    }

    if (currentWork.step_status !== 'READY') {
      throw new Error(`작업 상태가 '준비'가 아닙니다. 현재 상태: ${currentWork.step_status}`);
    }

    const result = await db.query('startWork', [work_no]);

    if (result.affectedRows === 0) {
      throw new Error('작업 시작에 실패했습니다.');
    }

    console.log('작업 시작 성공');

    return {
      work_no,
      status: 'IN_PROGRESS',
      started_at: new Date()
    };

  } catch (error) {
    console.error('작업 시작 서비스 오류:', error);
    throw error;
  }
};

// 🔥 작업 진행률 업데이트
const updateWorkProgress = async (work_no, progressData) => {
  try {
    const { output_qty, step_status } = progressData;

    console.log(`=== 작업 진행률 업데이트: ${work_no} ===`);
    console.log('진행률 데이터:', progressData);

    if (!work_no) {
      throw new Error('작업번호가 필요합니다.');
    }

    if (output_qty === undefined || output_qty < 0) {
      throw new Error('유효한 생산수량이 필요합니다.');
    }

    // 현재 작업 정보 조회
    const currentWork = await getWorkDetail(work_no);
    if (!currentWork) {
      throw new Error('해당 작업을 찾을 수 없습니다.');
    }

    if (currentWork.step_status === 'COMPLETED') {
      throw new Error('이미 완료된 작업입니다.');
    }

    // 진행률 및 품질 계산
    const input_qty = currentWork.input_qty;
    const progress_rate = input_qty > 0 ? Math.round((output_qty / input_qty) * 100 * 10) / 10 : 0;
    const defect_qty = Math.max(0, input_qty - output_qty);
    const pass_rate = input_qty > 0 ? Math.round((output_qty / input_qty) * 100 * 10) / 10 : 0;

    // 상태 결정
    let finalStatus = step_status || 'IN_PROGRESS';
    if (progress_rate >= 100) {
      finalStatus = 'NEAR_COMPLETION';
    } else if (progress_rate < 50) {
      finalStatus = 'DELAYED';
    }

    const result = await db.query('updateWorkProgress', [
      parseInt(output_qty),
      finalStatus,
      work_no
    ]);

    if (result.affectedRows === 0) {
      throw new Error('작업 진행률 업데이트에 실패했습니다.');
    }

    console.log('작업 진행률 업데이트 성공');

    return {
      work_no,
      output_qty: parseInt(output_qty),
      defect_qty,
      progress_rate,
      pass_rate,
      step_status: finalStatus
    };

  } catch (error) {
    console.error('작업 진행률 업데이트 서비스 오류:', error);
    throw error;
  }
};

// 🔥 작업 완료
const completeWork = async (work_no, completionData = {}) => {
  try {
    if (!work_no) {
      throw new Error('작업번호가 필요합니다.');
    }

    console.log(`=== 작업 완료: ${work_no} ===`);

    // 현재 작업 정보 조회
    const currentWork = await getWorkDetail(work_no);
    if (!currentWork) {
      throw new Error('해당 작업을 찾을 수 없습니다.');
    }

    if (currentWork.step_status === 'COMPLETED') {
      throw new Error('이미 완료된 작업입니다.');
    }

    // 최종 생산수량 결정
    let finalOutputQty = completionData.output_qty;

    // output_qty가 없으면 현재 진행률 기준 또는 95% 수율로 계산
    if (finalOutputQty === undefined) {
      if (currentWork.output_qty > 0) {
        finalOutputQty = currentWork.output_qty; // 현재 진행된 수량 사용
      } else {
        finalOutputQty = Math.floor(currentWork.input_qty * 0.95); // 95% 수율 가정
      }
    }

    // 최종 품질 계산
    const defect_qty = Math.max(0, currentWork.input_qty - finalOutputQty);
    const pass_rate = currentWork.input_qty > 0 ?
      Math.round((finalOutputQty / currentWork.input_qty) * 100 * 10) / 10 :
      0;

    const result = await db.query('completeWork', [
      parseInt(finalOutputQty),
      work_no
    ]);

    if (result.affectedRows === 0) {
      throw new Error('작업 완료 처리에 실패했습니다.');
    }

    console.log('작업 완료 성공');

    return {
      work_no,
      input_qty: currentWork.input_qty,
      output_qty: parseInt(finalOutputQty),
      defect_qty,
      pass_rate,
      defect_rate: Math.round((defect_qty / currentWork.input_qty) * 100 * 10) / 10,
      completed_at: new Date()
    };

  } catch (error) {
    console.error('작업 완료 서비스 오류:', error);
    throw error;
  }
};

// 🔥 작업 일시정지
const pauseWork = async (work_no) => {
  try {
    if (!work_no) {
      throw new Error('작업번호가 필요합니다.');
    }

    console.log(`=== 작업 일시정지: ${work_no} ===`);

    const result = await db.query('pauseWork', [work_no]);

    if (result.affectedRows === 0) {
      throw new Error('진행 중인 작업을 찾을 수 없습니다.');
    }

    console.log('작업 일시정지 성공');

    return {
      work_no,
      status: 'PAUSED',
      paused_at: new Date()
    };

  } catch (error) {
    console.error('작업 일시정지 서비스 오류:', error);
    throw error;
  }
};

// 🔥 작업 재시작
const resumeWork = async (work_no) => {
  try {
    if (!work_no) {
      throw new Error('작업번호가 필요합니다.');
    }

    console.log(`=== 작업 재시작: ${work_no} ===`);

    const result = await db.query('resumeWork', [work_no]);

    if (result.affectedRows === 0) {
      throw new Error('일시정지된 작업을 찾을 수 없습니다.');
    }

    console.log('작업 재시작 성공');

    return {
      work_no,
      status: 'IN_PROGRESS',
      resumed_at: new Date()
    };

  } catch (error) {
    console.error('작업 재시작 서비스 오류:', error);
    throw error;
  }
};

// 🔥 작업 존재 확인
const checkWorkExists = async (work_no) => {
  try {
    const result = await db.query('checkWorkExists', [work_no]);
    return result[0].count > 0;
  } catch (error) {
    console.error('작업 존재 확인 서비스 오류:', error);
    throw error;
  }
};

module.exports = {
  // 작업번호 조회 관련
  getWorkList,        // 전체 작업번호 목록
  getActiveWorks,     // 진행 중인 작업 목록
  getWorkOptions,     // 작업번호 선택 옵션
  
  // 작업 관리 관련
  createWork,         // 작업 등록
  getWorkDetail,      // 작업 상세 조회
  startWork,          // 작업 시작
  updateWorkProgress, // 작업 진행률 업데이트
  completeWork,       // 작업 완료
  pauseWork,          // 작업 일시정지
  resumeWork,         // 작업 재시작
  checkWorkExists     // 작업 존재 확인
};