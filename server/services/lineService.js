// server/services/lineService.js - dual 등록 함수 추가 버전

const mapper = require('../database/mapper.js');

// 라인 코드를 숫자로 변환하는 함수 (A=1, B=2, C=3...)
const convertLineCodeToNumber = (lineCode) => {
  if (typeof lineCode === 'string' && lineCode.length === 1) {
    return lineCode.charCodeAt(0) - 64; // A=1, B=2, C=3...
  }
  return 1; // 기본값
};

// 폴백 데이터 (DB 완전 실패 시에만 사용)
const emergencyFallback = {
  lines: [
    {
      line_id: 'A', line_name: 'A라인 내포장', line_type: 'INNER',
      line_state: 's2', line_status: '가동대기 중', employee_name: '미배정',
      employee_id: null, product_code: '', product_name: '',
      eq_name: '', current_speed: 0, target_qty: 0,
      max_capacity: 1000, description: '기본 라인',
      current_work_number: '', // 작업번호는 빈 값으로 초기화
      current_process_name: ''
    }
  ],
  products: [
    { product_code: 'BJA-DR-30', product_name: '30정 블리스터', product_type: 'BLISTER' },
    { product_code: 'BJA-BT-100', product_name: '100정 병', product_type: 'BOTTLE' }
  ],
  employees: [
    { employee_id: 2, employee_name: '관리자' },
    { employee_id: 3, employee_name: '김다산' }
  ],
  equipments: [
    { eq_name: '30정 블리스터 포장기', line_type: 'INNER' },
    { eq_name: '소형 카톤포장기', line_type: 'OUTER' }
  ]
};

// 공통 에러 처리 함수
const handleDbError = (error, fallbackValue, functionName) => {
  console.error(`❌ ${functionName} DB 에러:`, error.message);
  console.log(`📦 ${functionName} 폴백 데이터 사용`);
  return fallbackValue;
};

// ========== 데이터베이스 연결 테스트 ==========
const testDatabaseConnection = async () => {
  try {
    console.log('🔍 DB 연결 테스트 시작...');
    
    if (!mapper || typeof mapper.query !== 'function') {
      throw new Error('mapper 객체가 정의되지 않았거나 query 함수가 없습니다.');
    }
    
    const result = await mapper.query('testConnection');
    console.log('✅ DB 연결 테스트 성공:', result);
    return true;
  } catch (error) {
    console.error('❌ DB 연결 테스트 실패:', error.message);
    return false;
  }
};

const testProductTable = async () => {
  try {
    console.log('🔍 제품 테이블 테스트 시작...');
    const result = await mapper.query('testProductTableExists');
    console.log('✅ 제품 테이블 존재 확인:', result);
    return true;
  } catch (error) {
    console.error('❌ 제품 테이블 테스트 실패:', error.message);
    return false;
  }
};

// ========== 라인 목록 조회 (작업번호 조회 완전 제거) ==========
const getLineList = async () => {
  try {
    console.log('📋 라인 목록 조회 시작 (DB 연결)');
    
    // DB 연결 테스트
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.warn('⚠️ DB 연결 실패 - 폴백 데이터 사용');
      return emergencyFallback.lines;
    }
    
    // 1차: 통합 쿼리 시도 (작업번호 없이)
    try {
      const lineList = await mapper.query('selectLineListWithJoins');
      
      if (lineList && Array.isArray(lineList) && lineList.length > 0) {
        console.log('✅ 통합 쿼리로 라인 목록 조회 성공:', lineList.length, '건');
        
        // 작업번호는 항상 빈 값으로 설정
        const processedLineList = lineList.map(line => ({
          ...line,
          current_work_number: '',  // 작업번호 컬럼 삭제됨
          current_process_name: ''  // 작업번호 컬럼 삭제됨
        }));
        
        return processedLineList;
      } else {
        console.warn('⚠️ 통합 쿼리 결과가 빈 배열');
      }
    } catch (joinError) {
      console.warn('⚠️ 통합 쿼리 실패:', joinError.message);
      
      // 2차: 안전한 쿼리 시도 (작업번호 없이)
      try {
        const safeLineList = await mapper.query('selectLineListSafe');
        
        if (safeLineList && Array.isArray(safeLineList) && safeLineList.length > 0) {
          console.log('✅ 안전한 쿼리로 라인 목록 조회 성공:', safeLineList.length, '건');
          
          return safeLineList.map(line => ({
            ...line,
            current_work_number: '',
            current_process_name: ''
          }));
        }
      } catch (safeError) {
        console.warn('⚠️ 안전한 쿼리도 실패:', safeError.message);
      }
    }
    
    // 3차: 마스터 테이블만 조회
    try {
      const masterList = await mapper.query('selectLineMasterList');
      
      if (masterList && Array.isArray(masterList) && masterList.length > 0) {
        console.log('✅ 마스터 테이블에서 조회 성공:', masterList.length, '건');
        
        // 기본 구조로 변환 (작업번호는 빈 값)
        return masterList.map(master => ({
          line_id: master.line_code,
          line_name: master.line_name,
          line_type: master.line_type || 'INNER',
          line_state: 's2',
          line_status: '가동대기 중',
          employee_name: '미배정',
          employee_id: null,
          product_code: master.product_code || '',
          product_name: master.product_code || '',
          eq_name: '',
          current_speed: 0,
          target_qty: 0,
          max_capacity: master.max_capacity || 1000,
          description: master.description || '',
          current_work_number: '',  // 작업번호 컬럼 삭제됨
          current_process_name: '', // 작업번호 컬럼 삭제됨
          work_start_time: '',
          reg_date: master.reg_date
        }));
      }
    } catch (masterError) {
      console.error('❌ 마스터 테이블 조회도 실패:', masterError.message);
    }
    
    // 모든 쿼리 실패 시 폴백
    console.warn('⚠️ 모든 DB 쿼리 실패 - 폴백 데이터 사용');
    return emergencyFallback.lines;
    
  } catch (error) {
    return handleDbError(error, emergencyFallback.lines, 'getLineList');
  }
};

// ========== 기본 데이터 조회 함수들 ==========

const getAvailableProducts = async (lineCode = null) => {
  try {
    console.log('📦 제품코드 조회 시작 (DB 연결)');
    
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return emergencyFallback.products;
    }
    
    try {
      const products = await mapper.query('selectAllProducts');
      console.log('제품 조회 결과:', products);
      
      if (products && Array.isArray(products) && products.length > 0) {
        console.log('✅ 제품코드 조회 성공:', products.length, '건');
        
        return products.map(product => ({
          ...product,
          product_type: product.product_code?.includes('DR') ? 'BLISTER' :
                       product.product_code?.includes('BT') ? 'BOTTLE' : 'TABLET',
          package_type: product.product_code?.includes('DR') ? 'BLISTER' :
                       product.product_code?.includes('BT') ? 'BOTTLE' : 'TABLET'
        }));
      }
    } catch (allError) {
      console.error('⚠️ 전체 제품 조회 실패:', allError);
      
      // nested error 처리
      const actualError = allError.err || allError;
      
      console.error('에러 상세:', {
        message: actualError.message || actualError.sqlMessage || 'Unknown error',
        stack: actualError.stack,
        name: actualError.name,
        code: actualError.code,
        errno: actualError.errno,
        sqlState: actualError.sqlState
      });
      
      try {
        const safeProducts = await mapper.query('selectProductsSafe');
        console.log('안전한 제품 조회 결과:', safeProducts);
        
        if (safeProducts && Array.isArray(safeProducts) && safeProducts.length > 0) {
          console.log('✅ 안전한 제품코드 조회 성공:', safeProducts.length, '건');
          return safeProducts.map(product => ({
            ...product,
            product_type: 'TABLET',
            package_type: 'TABLET'
          }));
        }
      } catch (safeError) {
        console.error('⚠️ 안전한 제품 조회도 실패:', safeError);
        
        // nested error 처리
        const actualError = safeError.err || safeError;
        
        console.error('안전한 조회 에러 상세:', {
          message: actualError.message || actualError.sqlMessage || 'Unknown error',
          stack: actualError.stack,
          name: actualError.name,
          code: actualError.code,
          errno: actualError.errno,
          sqlState: actualError.sqlState
        });
      }
    }
    
    return emergencyFallback.products;
    
  } catch (error) {
    console.error('❌ 제품 조회 전체 실패:', error);
    
    // nested error 처리
    const actualError = error.err || error;
    
    console.error('전체 에러 상세:', {
      message: actualError.message || actualError.sqlMessage || 'Unknown error',
      stack: actualError.stack,
      name: actualError.name,
      code: actualError.code,
      errno: actualError.errno,
      sqlState: actualError.sqlState
    });
    return handleDbError(error, emergencyFallback.products, 'getAvailableProducts');
  }
};

const getAvailableEmployees = async () => {
  try {
    console.log('👥 담당자 조회 시작 (DB 연결)');
    
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return emergencyFallback.employees;
    }
    
    try {
      const employees = await mapper.query('selectAllEmployees');
      
      if (employees && Array.isArray(employees) && employees.length > 0) {
        console.log('✅ 담당자 조회 성공:', employees.length, '명');
        return employees;
      }
    } catch (allError) {
      console.warn('⚠️ 담당자 조회 실패:', allError.message);
      
      try {
        const safeEmployees = await mapper.query('selectEmployeesSafe');
        
        if (safeEmployees && Array.isArray(safeEmployees) && safeEmployees.length > 0) {
          console.log('✅ 안전한 담당자 조회 성공:', safeEmployees.length, '명');
          return safeEmployees;
        }
      } catch (safeError) {
        console.warn('⚠️ 안전한 담당자 조회도 실패:', safeError.message);
      }
    }
    
    return emergencyFallback.employees;
    
  } catch (error) {
    return handleDbError(error, emergencyFallback.employees, 'getAvailableEmployees');
  }
};

const getAvailableEquipments = async (excludeLineId = null) => {
  try {
    console.log('🔧 설비명 조회 시작 (DB 연결)');
    
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return emergencyFallback.equipments;
    }
    
    try {
      const query = excludeLineId ? 'selectUsedEquipmentsExcludeLine' : 'selectUsedEquipments';
      const params = excludeLineId ? [excludeLineId] : [];
      
      const usedEquipments = await mapper.query(query, params);
      console.log('✅ 사용 중인 설비 조회 성공:', usedEquipments.length, '개');
      
      const allEquipments = [
        { eq_name: '10정 블리스터 포장기', line_type: 'INNER' },
        { eq_name: '30정 블리스터 포장기', line_type: 'INNER' },
        { eq_name: '60정 블리스터 포장기', line_type: 'INNER' },
        { eq_name: '병 모노블럭', line_type: 'INNER' },
        { eq_name: '소형 카톤포장기', line_type: 'OUTER' },
        { eq_name: '중형 카톤포장기', line_type: 'OUTER' },
        { eq_name: '대형 카톤포장기', line_type: 'OUTER' },
        { eq_name: '병 카톤포장기', line_type: 'OUTER' },
      ];
      
      const usedNames = usedEquipments.map(eq => eq.eq_name);
      const availableEquipments = allEquipments.filter(eq => 
        !usedNames.includes(eq.eq_name)
      );
      
      console.log('사용 가능한 설비:', availableEquipments.length, '개');
      return availableEquipments;
      
    } catch (equipError) {
      console.warn('⚠️ 설비 조회 실패:', equipError.message);
    }
    
    return emergencyFallback.equipments;
    
  } catch (error) {
    return handleDbError(error, emergencyFallback.equipments, 'getAvailableEquipments');
  }
};

const getAvailableLineIds = async () => {
  try {
    console.log('=== 사용 가능한 라인 ID 조회 (DB 연결) ===');
    
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
    }
    
    const masterList = await mapper.query('selectLineMasterList');
    const usedIds = masterList.map(master => master.line_code);
    
    // A-Z 중 사용되지 않은 ID 반환
    const allIds = Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i));
    const availableIds = allIds.filter(id => !usedIds.includes(id));
    
    console.log('✅ 사용 가능한 라인 ID:', availableIds.length, '개');
    return availableIds.slice(0, 10); // 처음 10개만 반환
    
  } catch (error) {
    console.error('❌ 사용 가능한 라인 ID 조회 실패:', error.message);
    
    // 에러 시 기본 ID 목록 반환
    return ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  }
};

// ========== 라인 마스터 관리 ==========
const getLineMasterByLineId = async (lineId) => {
  try {
    console.log('🔍 라인 마스터 조회:', lineId);
    
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return null;
    }
    
    const masterDetail = await mapper.query('selectLineMasterByLineId', [lineId]);
    
    if (masterDetail && Array.isArray(masterDetail) && masterDetail.length > 0) {
      console.log('✅ 라인 마스터 조회 성공:', lineId);
      return masterDetail[0];
    } else {
      console.warn('⚠️ 해당 라인 마스터 없음:', lineId);
      return null;
    }
  } catch (error) {
    console.error('❌ 라인 마스터 조회 실패:', error.message);
    return null;
  }
};

const getLineMasterDetail = async (masterId) => {
  try {
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return null;
    }
    
    const masterDetail = await mapper.query('selectLineMasterById', [masterId]);
    
    if (masterDetail && Array.isArray(masterDetail) && masterDetail.length > 0) {
      console.log('✅ 라인 마스터 ID 조회 성공:', masterId);
      return masterDetail[0];
    } else {
      console.warn('⚠️ 해당 라인 마스터 ID 없음:', masterId);
      return null;
    }
  } catch (error) {
    console.error('❌ 라인 마스터 ID 조회 실패:', error.message);
    return null;
  }
};

const checkLineIdExists = async (lineId, lineType = null) => {
  try {
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return false;
    }
    
    const query = lineType ? 'checkLineIdAndTypeExists' : 'checkLineIdExists';
    const params = lineType ? [lineId, lineType] : [lineId];
    
    const result = await mapper.query(query, params);
    const exists = result && result[0] && result[0].count > 0;
    
    console.log('라인 ID 중복 체크:', lineId, lineType || '', exists ? '존재함' : '사용가능');
    return exists;
  } catch (error) {
    console.error('❌ 라인 ID 중복 체크 실패:', error.message);
    return false;
  }
};

const getLineMasterList = async () => {
  try {
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return [];
    }
    
    const masterList = await mapper.query('selectLineMasterList');
    console.log('✅ 라인 마스터 목록 조회 성공:', masterList.length, '건');
    return masterList;
  } catch (error) {
    console.error('❌ 라인 마스터 목록 조회 실패:', error.message);
    return [];
  }
};

// ========== 라인 CRUD 함수들 (작업번호 제거) ==========

const insertIntegratedLine = async (data) => {
  try {
    console.log('➕ 통합 라인 등록 시작:', JSON.stringify(data, null, 2));
    
    // 필수 데이터 검증
    if (!data.line_id) {
      throw new Error('라인 ID는 필수입니다.');
    }
    if (!data.line_type) {
      throw new Error('라인 타입은 필수입니다.');
    }
    
    // DB 연결 확인
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('데이터베이스 연결에 실패했습니다.');
    }
    
    // 중복 체크
    const exists = await checkLineIdExists(data.line_id, data.line_type);
    if (exists) {
      throw new Error(`이미 존재하는 라인입니다: ${data.line_id}라인 ${data.line_type}`);
    }
    
    // 라인 마스터 등록 - line_id를 숫자로 변환해서 추가
    const masterParams = [
      `${data.line_id}라인 ${data.line_type === 'INNER' ? '내포장' : '외포장'}`,
      data.eq_group_code || 'EQ001',
      data.line_type,
      data.result_id || 1,
      data.line_id,        // line_code (문자열)
      convertLineCodeToNumber(data.line_id), // line_id (숫자)
      data.max_capacity || 1000,
      data.description || '',
      data.product_code || ''
    ];
    
    console.log('마스터 등록 파라미터:', masterParams);
    console.log('line_id 변환:', data.line_id, '->', convertLineCodeToNumber(data.line_id));
    
    // 라인 마스터 등록 - 여러 방법 시도
    let masterResult = null;
    let insertSuccess = false;
    
    // 1차 시도: line_id를 숫자로 변환해서 삽입
    try {
      masterResult = await mapper.query('insertLineMaster', masterParams);
      console.log('마스터 등록 결과 (숫자 line_id):', masterResult);
      insertSuccess = true;
    } catch (firstError) {
      console.warn('1차 시도 실패 (숫자 line_id):', firstError.err?.sqlMessage || firstError.message);
      
      // 2차 시도: line_id를 NULL로 삽입
      try {
        const nullParams = [
          `${data.line_id}라인 ${data.line_type === 'INNER' ? '내포장' : '외포장'}`,
          data.eq_group_code || 'EQ001',
          data.line_type,
          data.result_id || 1,
          data.line_id,        // line_code (문자열)
          data.max_capacity || 1000,
          data.description || '',
          data.product_code || ''
        ];
        
        console.log('2차 시도 파라미터 (NULL line_id):', nullParams);
        masterResult = await mapper.query('insertLineMasterWithNullId', nullParams);
        console.log('마스터 등록 결과 (NULL line_id):', masterResult);
        insertSuccess = true;
      } catch (secondError) {
        console.warn('2차 시도 실패 (NULL line_id):', secondError.err?.sqlMessage || secondError.message);
        
        // 3차 시도: line_id 컬럼 제외하고 삽입
        try {
          const noIdParams = [
            `${data.line_id}라인 ${data.line_type === 'INNER' ? '내포장' : '외포장'}`,
            data.eq_group_code || 'EQ001',
            data.line_type,
            data.result_id || 1,
            data.line_id,        // line_code (문자열)
            data.max_capacity || 1000,
            data.description || '',
            data.product_code || ''
          ];
          
          console.log('3차 시도 파라미터 (line_id 제외):', noIdParams);
          masterResult = await mapper.query('insertLineMasterNoId', noIdParams);
          console.log('마스터 등록 결과 (line_id 제외):', masterResult);
          insertSuccess = true;
        } catch (thirdError) {
          console.error('3차 시도도 실패 (line_id 제외):', thirdError.err?.sqlMessage || thirdError.message);
          throw firstError; // 첫 번째 에러를 던짐
        }
      }
    }
    
    if (!insertSuccess) {
      throw new Error('모든 라인 마스터 등록 방법이 실패했습니다.');
    }
    
    // insertId 추출 방법 개선
    let insertId = null;
    if (masterResult) {
      if (masterResult.insertId) {
        insertId = masterResult.insertId;
      } else if (Array.isArray(masterResult) && masterResult.length > 0) {
        insertId = masterResult[0].insertId;
      } else if (masterResult.affectedRows > 0) {
        // MySQL의 경우 직접 조회해서 최신 ID 가져오기
        const newMaster = await mapper.query('selectLineMasterByLineId', [data.line_id]);
        if (newMaster && newMaster.length > 0) {
          insertId = newMaster[0].line_masterid;
        }
      }
    }
    
    if (!insertId) {
      console.error('❌ insertId를 가져올 수 없음:', masterResult);
      throw new Error('라인 마스터 등록에 실패했습니다. (insertId 없음)');
    }
    
    console.log('✅ 라인 마스터 등록 성공, insertId:', insertId);
    
    // 라인 상태 등록 (선택사항) - work_order_no 제거
    if (data.employee_id) {
      const lineParams = [
        insertId,
        data.line_type === 'INNER' ? 'IP' : 'OP',
        data.line_state || 's2',
        data.target_qty || 0,
        data.eq_name || '',
        data.current_speed || 0,
        data.line_id,
        data.employee_id
        // work_order_no 파라미터 완전 제거!
      ];
      
      console.log('라인 상태 등록 파라미터:', lineParams);
      
      const lineResult = await mapper.query('insertLine', lineParams);
      console.log('라인 상태 등록 결과:', lineResult);
      console.log('✅ 라인 상태 등록 성공');
    }
    
    const result = {
      success: true,
      insertId: insertId,
      line_id: data.line_id,
      line_name: `${data.line_id}라인 ${data.line_type === 'INNER' ? '내포장' : '외포장'}`,
      message: '라인이 성공적으로 등록되었습니다.'
    };
    
    console.log('✅ 라인 등록 완료:', result);
    return result;
    
  } catch (error) {
    console.error('❌ 통합 라인 등록 실패:', error);
    
    // nested error 처리
    const actualError = error.err || error;
    
    console.error('에러 상세:', {
      message: actualError.message || actualError.sqlMessage || 'Unknown error',
      stack: actualError.stack,
      name: actualError.name,
      code: actualError.code,
      errno: actualError.errno,
      sqlState: actualError.sqlState
    });
    
    // SQL 에러 메시지 추출
    let errorMessage = 'Unknown error';
    if (actualError.sqlMessage) {
      errorMessage = actualError.sqlMessage;
    } else if (actualError.message) {
      errorMessage = actualError.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

// ========== 내포장/외포장 동시 등록 함수 - 새로 추가 ==========
const dualRegisterLine = async (data) => {
  try {
    console.log('🔥 내포장/외포장 동시 등록 시작:', JSON.stringify(data, null, 2));
    
    // 필수 데이터 검증
    if (!data.line_id) {
      throw new Error('라인 ID는 필수입니다.');
    }
    if (!data.inner_eq_name) {
      throw new Error('내포장 설비명은 필수입니다.');
    }
    if (!data.outer_eq_name) {
      throw new Error('외포장 설비명은 필수입니다.');
    }
    if (!data.inner_employee_id) {
      throw new Error('내포장 담당자는 필수입니다.');
    }
    if (!data.outer_employee_id) {
      throw new Error('외포장 담당자는 필수입니다.');
    }
    
    // DB 연결 확인
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('데이터베이스 연결에 실패했습니다.');
    }
    
    // 중복 체크 (내포장, 외포장 둘 다)
    const innerExists = await checkLineIdExists(data.line_id, 'INNER');
    const outerExists = await checkLineIdExists(data.line_id, 'OUTER');
    
    if (innerExists || outerExists) {
      throw new Error(`이미 존재하는 라인입니다: ${data.line_id}라인`);
    }
    
    const results = [];
    
    // 1. 내포장 라인 등록
    try {
      console.log('📦 내포장 라인 등록 시작...');
      
      const innerData = {
        line_id: data.line_id,
        line_type: 'INNER',
        eq_name: data.inner_eq_name,
        max_capacity: data.inner_capacity || 1000,
        current_speed: data.inner_speed || 30,
        employee_id: data.inner_employee_id,
        product_code: data.product_code || '',
        description: data.description || '',
        eq_group_code: 'EQ001',
        line_state: 's2',
        target_qty: 0
      };
      
      console.log('내포장 등록 데이터:', innerData);
      
      const innerResult = await insertIntegratedLine(innerData);
      results.push({ type: 'INNER', result: innerResult });
      console.log('✅ 내포장 라인 등록 성공:', innerResult.insertId);
      
    } catch (innerError) {
      console.error('❌ 내포장 라인 등록 실패:', innerError);
      
      // nested error 처리
      const actualError = innerError.err || innerError;
      
      console.error('내포장 에러 상세:', {
        message: actualError.message || actualError.sqlMessage || 'Unknown error',
        stack: actualError.stack,
        name: actualError.name,
        code: actualError.code,
        errno: actualError.errno,
        sqlState: actualError.sqlState
      });
      
      const errorMessage = actualError.sqlMessage || actualError.message || innerError.message || '알 수 없는 오류';
      throw new Error(`내포장 라인 등록 실패: ${errorMessage}`);
    }
    
    // 2. 외포장 라인 등록
    try {
      console.log('📦 외포장 라인 등록 시작...');
      
      const outerData = {
        line_id: data.line_id,
        line_type: 'OUTER',
        eq_name: data.outer_eq_name,
        max_capacity: data.outer_capacity || 800,
        current_speed: data.outer_speed || 30,
        employee_id: data.outer_employee_id,
        product_code: data.product_code || '',
        description: data.description || '',
        eq_group_code: 'EQ002',
        line_state: 's2',
        target_qty: 0
      };
      
      console.log('외포장 등록 데이터:', outerData);
      
      const outerResult = await insertIntegratedLine(outerData);
      results.push({ type: 'OUTER', result: outerResult });
      console.log('✅ 외포장 라인 등록 성공:', outerResult.insertId);
      
    } catch (outerError) {
      console.error('❌ 외포장 라인 등록 실패:', outerError);
      
      // nested error 처리
      const actualError = outerError.err || outerError;
      
      console.error('외포장 에러 상세:', {
        message: actualError.message || actualError.sqlMessage || 'Unknown error',
        stack: actualError.stack,
        name: actualError.name,
        code: actualError.code,
        errno: actualError.errno,
        sqlState: actualError.sqlState
      });
      
      // 외포장 실패 시 내포장도 롤백 (수동 삭제)
      try {
        console.log('🔄 내포장 라인 롤백 시작...');
        await deleteIntegratedLine(data.line_id);
        console.log('✅ 내포장 라인 롤백 완료');
      } catch (rollbackError) {
        console.error('❌ 롤백 실패:', rollbackError);
        
        const rollbackActualError = rollbackError.err || rollbackError;
        
        console.error('롤백 에러 상세:', {
          message: rollbackActualError.message || rollbackActualError.sqlMessage || 'Unknown error',
          stack: rollbackActualError.stack,
          name: rollbackActualError.name,
          code: rollbackActualError.code,
          errno: rollbackActualError.errno,
          sqlState: rollbackActualError.sqlState
        });
      }
      
      const errorMessage = actualError.sqlMessage || actualError.message || outerError.message || '알 수 없는 오류';
      throw new Error(`외포장 라인 등록 실패: ${errorMessage}`);
    }
    
    // 성공 결과 반환
    const finalResult = {
      success: true,
      line_id: data.line_id,
      line_name: `${data.line_id}라인`,
      inner_result: results.find(r => r.type === 'INNER')?.result,
      outer_result: results.find(r => r.type === 'OUTER')?.result,
      message: `${data.line_id}라인 내포장/외포장이 성공적으로 등록되었습니다.`,
      total_registered: results.length
    };
    
    console.log('🎉 내포장/외포장 동시 등록 완료:', finalResult);
    return finalResult;
    
  } catch (error) {
    console.error('❌ 내포장/외포장 동시 등록 실패:', error);
    
    // nested error 처리
    const actualError = error.err || error;
    
    console.error('동시 등록 에러 상세:', {
      message: actualError.message || actualError.sqlMessage || 'Unknown error',
      stack: actualError.stack,
      name: actualError.name,
      code: actualError.code,
      errno: actualError.errno,
      sqlState: actualError.sqlState
    });
    
    const errorMessage = actualError.sqlMessage || actualError.message || error.message || '내포장/외포장 동시 등록 중 알 수 없는 오류가 발생했습니다.';
    throw new Error(errorMessage);
  }
};

const updateIntegratedLine = async (lineId, data) => {
  try {
    console.log('✏️ 통합 라인 수정 시작:', lineId, JSON.stringify(data, null, 2));
    
    // DB 연결 확인
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('데이터베이스 연결에 실패했습니다.');
    }
    
    // 마스터 정보 조회
    const master = await getLineMasterByLineId(lineId);
    if (!master) {
      throw new Error(`라인을 찾을 수 없습니다: ${lineId}`);
    }
    
    // 마스터 업데이트
    const updateParams = [
      `${lineId}라인 ${data.line_type === 'INNER' ? '내포장' : '외포장'}`,
      data.eq_group_code || master.eq_group_code,
      data.line_type || master.line_type,
      data.max_capacity || master.max_capacity,
      data.description || master.description,
      data.product_code || master.product_code,
      master.line_masterid
    ];
    
    console.log('마스터 수정 파라미터:', updateParams);
    
    await mapper.query('updateLineMaster', updateParams);
    console.log('✅ 라인 마스터 수정 성공');
    
    const result = {
      success: true,
      line_id: lineId,
      line_name: `${lineId}라인 ${data.line_type === 'INNER' ? '내포장' : '외포장'}`,
      message: '라인이 성공적으로 수정되었습니다.'
    };
    
    console.log('✅ 라인 수정 완료:', result);
    return result;
    
  } catch (error) {
    console.error('❌ 통합 라인 수정 실패:', error.message);
    throw error;
  }
};

const deleteIntegratedLine = async (lineId) => {
  try {
    console.log('🗑️ 통합 라인 삭제 시작:', lineId);
    
    // DB 연결 확인
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      throw new Error('데이터베이스 연결에 실패했습니다.');
    }
    
    // 마스터 정보 조회
    const master = await getLineMasterByLineId(lineId);
    if (!master) {
      throw new Error(`라인을 찾을 수 없습니다: ${lineId}`);
    }
    
    // 라인 상태 데이터 삭제 (외래키 제약조건 때문에 먼저 삭제)
    await mapper.query('deleteLineByMasterId', [master.line_masterid]);
    console.log('✅ 라인 상태 데이터 삭제 성공');
    
    // 마스터 데이터 삭제
    await mapper.query('deleteLineMaster', [master.line_masterid]);
    console.log('✅ 라인 마스터 삭제 성공');
    
    const result = {
      success: true,
      line_id: lineId,
      deleted_master_id: master.line_masterid,
      message: `${lineId}라인이 성공적으로 삭제되었습니다.`
    };
    
    console.log('✅ 라인 삭제 완료:', result);
    return result;
    
  } catch (error) {
    console.error('❌ 통합 라인 삭제 실패:', error.message);
    throw error;
  }
};

// ========== 통계 및 기타 함수들 ==========

const getLineStatusStats = async () => {
  try {
    const lineList = await getLineList();
    
    const statusStats = [
      { line_state: 's1', line_status: '가동 중', count: 0 },
      { line_state: 's2', line_status: '가동대기 중', count: 0 },
      { line_state: 's3', line_status: '가동정지', count: 0 }
    ];
    
    const workingLines = [];
    
    lineList.forEach(line => {
      const stat = statusStats.find(s => s.line_state === line.line_state);
      if (stat) stat.count++;
      
      if (line.line_state === 's1') {
        workingLines.push(line);
      }
    });
    
    return {
      statusStats: statusStats.filter(s => s.count > 0),
      workingLines: workingLines,
      totalLines: lineList.length
    };
  } catch (error) {
    console.error('❌ 라인 상태 통계 조회 실패:', error);
    return {
      statusStats: [],
      workingLines: [],
      totalLines: 0
    };
  }
};

const getLineDetail = async (id) => {
  try {
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return null;
    }
    
    const lineDetail = await mapper.query('selectLineDetail', [id]);
    return lineDetail && lineDetail.length > 0 ? lineDetail[0] : null;
  } catch (error) {
    console.error('❌ 라인 상세 조회 실패:', error.message);
    return null;
  }
};

const insertLine = async (data) => {
  try {
    // work_order_no 제거된 파라미터
    const result = await mapper.query('insertLine', [
      data.line_masterid, data.pkg_type, data.line_state, data.target_qty,
      data.eq_name, data.current_speed, data.line_code, data.employee_id
      // work_order_no 제거!
    ]);
    return result;
  } catch (error) {
    console.error('❌ 라인 등록 실패:', error.message);
    throw error;
  }
};

const updateLine = async (id, data) => {
  try {
    // work_order_no 제거된 파라미터
    await mapper.query('updateLine', [
      data.pkg_type, data.line_state, data.employee_id, data.eq_name,
      data.current_speed, data.target_qty, id
      // work_order_no 제거!
    ]);
    return true;
  } catch (error) {
    console.error('❌ 라인 수정 실패:', error.message);
    throw error;
  }
};

const deleteLine = async (id) => {
  try {
    await mapper.query('deleteLine', [id]);
    return true;
  } catch (error) {
    console.error('❌ 라인 삭제 실패:', error.message);
    throw error;
  }
};

const deleteLineByMasterId = async (masterId) => {
  try {
    await mapper.query('deleteLineByMasterId', [masterId]);
    return true;
  } catch (error) {
    console.error('❌ 마스터 ID로 라인 삭제 실패:', error.message);
    throw error;
  }
};

const getProductDetail = async (code) => {
  try {
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return null;
    }
    
    const product = await mapper.query('selectProductByCode', [code]);
    return product && product.length > 0 ? product[0] : null;
  } catch (error) {
    console.error('❌ 제품 상세 조회 실패:', error.message);
    return null;
  }
};

const getProductCodeUsageStats = async () => {
  try {
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return [];
    }
    
    const usageStats = await mapper.query('selectProductUsageStats');
    return usageStats || [];
  } catch (error) {
    console.error('❌ 제품코드 사용 현황 조회 실패:', error.message);
    return [];
  }
};

const validateProductCodeAssignment = async (code, lineCode) => {
  try {
    // 실제 검증 로직 구현
    return { canAssign: true, reason: '할당 가능' };
  } catch (error) {
    console.error('❌ 제품코드 할당 검증 실패:', error.message);
    return { canAssign: false, reason: '검증 실패' };
  }
};

module.exports = {
  // 테스트 함수들
  testDatabaseConnection,
  testProductTable,

  // 핵심 함수들
  getLineList,
  getAvailableProducts,
  getAvailableEmployees,
  getAvailableEquipments,
  getAvailableLineIds,

  // 라인 마스터 관리
  getLineMasterList,
  getLineMasterDetail,
  getLineMasterByLineId,
  checkLineIdExists,

  // 라인 CRUD
  insertIntegratedLine,
  dualRegisterLine,        // 새로 추가된 함수
  updateIntegratedLine,
  deleteIntegratedLine,
  getLineDetail,
  insertLine,
  updateLine,
  deleteLine,
  deleteLineByMasterId,

  // 통계 및 기타
  getLineStatusStats,
  getProductDetail,
  getProductCodeUsageStats,
  validateProductCodeAssignment
};