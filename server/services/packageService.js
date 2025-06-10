// server/services/packageService.js
const mariadb = require('../database/mapper');
const sqls = require('../database/sqls/package');

// BigInt를 안전하게 Number로 변환하는 헬퍼 함수
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

// 랜덤 합격률 함수 (95~99%)
function getRandomPassRate() {
  return (Math.floor(Math.random() * 5) + 95) / 100;
}

// 작업 상태 결정 함수
function determineWorkStatus(progressRate) {
  if (progressRate >= 100) return '완료';
  if (progressRate >= 90) return '진행중';
  return '지연';
}

// 작업 등록
const insertWork = async (data) => {
  try {
    // 입력 데이터 검증
    if (!data.work_no || !data.input_qty || !data.employee_no) {
      throw new Error('필수 데이터가 누락되었습니다.');
    }

    // 중복 작업번호 확인
    const existingWork = await mariadb.query('selectWorkDetail', [data.work_no]);
    if (existingWork && existingWork.length > 0) {
      throw new Error('이미 존재하는 작업번호입니다.');
    }

    const input_qty = parseInt(data.input_qty);

    const values = [
      data.work_no,
      data.line_id || 1,
      data.work_line || 'A라인 냉포장',
      data.work_step || '냉포장',
      data.step_name || '1차포장',
      '진행중',          // 초기 상태
      input_qty,
      0,               // 초기 생산수량은 0
      data.eq_code || 'e3',
      data.employee_no,
      data.employee_name
    ];

    const result = await mariadb.query('insertWork', values);
    
    return { 
      insertId: result.insertId, 
      work_no: data.work_no,
      input_qty,
      message: '작업이 성공적으로 등록되었습니다.'
    };
  } catch (error) {
    console.error('작업 등록 서비스 오류:', error);
    throw error;
  }
};

// 작업 목록 조회 (필터링, 검색, 페이징 포함)
const getWorkList = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'all',
      sortBy = 'date_desc'
    } = options;

    const offset = (page - 1) * limit;

    // 총 개수 조회
    const countResult = await mariadb.query('selectWorkListCount', [
      search, search, search, search, search,
      status, status
    ]);
    const totalCount = convertBigIntToNumber(countResult[0]?.total_count || 0);

    // 데이터 조회
    const works = await mariadb.query('selectWorkListWithFilter', [
      search, search, search, search, search,  // 검색어 (5개 필드)
      status, status,  // 상태 필터
      sortBy, sortBy, sortBy,  // 정렬 (3번 반복은 CASE문 때문)
      limit, offset  // 페이징
    ]);

    return {
      works: convertBigIntToNumber(works),
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };
  } catch (error) {
    console.error('작업 목록 조회 서비스 오류:', error);
    throw error;
  }
};

// 작업 상세 조회
const getWorkDetail = async (work_no) => {
  try {
    if (!work_no) throw new Error('작업번호가 필요합니다.');
    const result = await mariadb.query('selectWorkDetail', [work_no]);
    return convertBigIntToNumber(result[0]) || null;
  } catch (error) {
    console.error('작업 상세 조회 서비스 오류:', error);
    throw error;
  }
};

// 작업 진행 상황 업데이트
const updateWorkProgress = async (work_no, data) => {
  try {
    if (!work_no) {
      throw new Error('작업번호가 필요합니다.');
    }

    const { output_qty } = data;

    // 현재 작업 정보 조회
    const currentWork = await getWorkDetail(work_no);
    if (!currentWork) {
      throw new Error('해당 작업을 찾을 수 없습니다.');
    }

    if (currentWork.step_status.includes('완료')) {
      throw new Error('이미 완료된 작업입니다.');
    }

    // 진행률 계산 및 상태 결정
    const progressRate = currentWork.input_qty > 0 
      ? (output_qty / currentWork.input_qty * 100) 
      : 0;
    
    const newStatus = determineWorkStatus(progressRate);

    await mariadb.query('updateWorkProgress', [
      output_qty, 
      newStatus,
      work_no
    ]);

    const defect_qty = currentWork.input_qty - output_qty;

    return { 
      work_no, 
      output_qty, 
      defect_qty, // 계산된 값
      progress_rate: Math.round(progressRate * 10) / 10,
      status: newStatus
    };
  } catch (error) {
    console.error('작업 진행 상황 업데이트 서비스 오류:', error);
    throw error;
  }
};

// 작업 완료 처리
const completeWork = async (work_no, data = {}) => {
  try {
    if (!work_no) {
      throw new Error('작업번호가 필요합니다.');
    }

    // 현재 작업 정보 조회
    const currentWork = await getWorkDetail(work_no);
    if (!currentWork) {
      throw new Error('해당 작업을 찾을 수 없습니다.');
    }

    if (currentWork.step_status === '완료') {
      throw new Error('이미 완료된 작업입니다.');
    }

    // 완료 데이터 결정 (파라미터가 있으면 사용, 없으면 랜덤 생성)
    let output_qty, defect_qty;
    
    if (data.output_qty !== undefined && data.defect_qty !== undefined) {
      output_qty = data.output_qty;
      defect_qty = data.defect_qty;
    } else {
      // 자동 완료 시 랜덤 생성
      const passRate = getRandomPassRate();
      output_qty = Math.floor(currentWork.input_qty * passRate);
      defect_qty = currentWork.input_qty - output_qty;
    }

    const result = await mariadb.query('completeWork', [
      '완료', 
      output_qty, 
      defect_qty, 
      work_no
    ]);

    const passRate = currentWork.input_qty > 0 
      ? (output_qty / currentWork.input_qty) 
      : 0;

    return { 
      work_no, 
      output_qty, 
      defect_qty, 
      pass_rate: Math.round(passRate * 10000) / 100,
      affected_rows: result.affectedRows
    };
  } catch (error) {
    console.error('작업 완료 처리 서비스 오류:', error);
    throw error;
  }
};

// 대시보드 통계
const getDashboardStats = async () => {
  try {
    const result = await mariadb.query('selectDashboardStats');
    return convertBigIntToNumber(result[0]) || {
      total_works: 0,
      completed_works: 0,
      in_progress_works: 0,
      delayed_works: 0,
      total_input_qty: 0,
      total_output_qty: 0,
      total_defect_qty: 0,
      avg_progress_rate: 0
    };
  } catch (error) {
    console.error('대시보드 통계 조회 서비스 오류:', error);
    throw error;
  }
};

// 작업자별 현황
const getWorkerStats = async (days = 7) => {
  try {
    const result = await mariadb.query('selectWorkerStats', [days]);
    return convertBigIntToNumber(result);
  } catch (error) {
    console.error('작업자별 현황 조회 서비스 오류:', error);
    throw error;
  }
};

// 제품별 현황
const getProductStats = async (days = 7) => {
  try {
    const result = await mariadb.query('selectProductStats', [days]);
    return convertBigIntToNumber(result);
  } catch (error) {
    console.error('제품별 현황 조회 서비스 오류:', error);
    throw error;
  }
};

// 시간대별 현황
const getHourlyStats = async () => {
  try {
    const result = await mariadb.query('selectHourlyStats');
    return convertBigIntToNumber(result);
  } catch (error) {
    console.error('시간대별 현황 조회 서비스 오류:', error);
    throw error;
  }
};

// 일별 생산 추이
const getDailyTrend = async (days = 5) => {
  try {
    const result = await mariadb.query('selectDailyTrend', [days]);
    return convertBigIntToNumber(result);
  } catch (error) {
    console.error('일별 생산 추이 조회 서비스 오류:', error);
    throw error;
  }
};

// 진행 중인 작업 목록
const getActiveWorks = async () => {
  try {
    const result = await mariadb.query('selectActiveWorks');
    return convertBigIntToNumber(result);
  } catch (error) {
    console.error('진행 중인 작업 조회 서비스 오류:', error);
    throw error;
  }
};

module.exports = {
  insertWork,
  getWorkList,
  getWorkDetail,
  updateWorkProgress,
  completeWork,
  getDashboardStats,
  getWorkerStats,
  getProductStats,
  getHourlyStats,
  getDailyTrend,
  getActiveWorks
};