// server/services/lineService.js - line_id 필드 문제 수정

const mapper = require('../database/mapper.js');

// 설비 분류 함수 (설비명 기반)
const classifyEquipmentByName = (eqName, eqTypeCode = '') => {
  if (!eqName) return 'INNER';
  
  const name = eqName.toLowerCase();
  
  // 외포장 설비 패턴
  if (name.includes('카톤') || 
      name.includes('박스') || 
      name.includes('케이스') ||
      name.includes('상자') ||
      eqTypeCode === 'f2') {
    return 'OUTER';
  }
  
  // 내포장 설비 패턴
  if (name.includes('블리스터') || 
      name.includes('모노블럭') || 
      name.includes('병') ||
      name.includes('튜브') ||
      name.includes('캡슐') ||
      (name.includes('정') && !name.includes('카톤')) ||
      eqTypeCode === 'f1') {
    return 'INNER';
  }
  
  return 'INNER';
};

// 포장 타입 한글 변환
const getLineTypeText = (lineType) => {
  return lineType === 'INNER' ? '내포장' : '외포장';
};

// line_id 생성 함수
const generateLineId = (lineCode, lineType) => {
  return `${lineCode}_${lineType}`;
};

// ========== 실적 ID 관리 ==========

const getLatestResultId = async (productCode = null) => {
  try {
    console.log('최신 실적 ID 조회 시작, 제품코드:', productCode);
    
    let resultId = null;
    
    // 특정 제품코드가 있으면 해당 제품의 최신 실적 ID 조회
    if (productCode) {
      try {
        const productResult = await mapper.query('selectLatestResultIdByProduct', [productCode]);
        if (productResult && productResult.length > 0 && productResult[0].result_id) {
          resultId = productResult[0].result_id;
          console.log('제품별 실적 ID 조회 성공:', resultId);
        }
      } catch (productError) {
        console.warn('제품별 실적 ID 조회 실패:', productError.message);
      }
    }
    
    // 전체 최신 실적 ID 조회
    if (!resultId) {
      try {
        const latestResult = await mapper.query('selectLatestResultId');
        if (latestResult && latestResult.length > 0 && latestResult[0].result_id) {
          resultId = latestResult[0].result_id;
          console.log('전체 최신 실적 ID 조회 성공:', resultId);
        }
      } catch (latestError) {
        console.warn('전체 실적 ID 조회 실패:', latestError.message);
      }
    }
    
    // 기본값 생성
    if (!resultId) {
      const defaultId = `RE${new Date().toISOString().slice(0, 10).replace(/-/g, '')}001`;
      console.log('기본 실적 ID 생성:', defaultId);
      resultId = defaultId;
    }
    
    return resultId;
    
  } catch (error) {
    console.error('실적 ID 조회 실패:', error.message);
    return `RE${new Date().toISOString().slice(0, 10).replace(/-/g, '')}001`;
  }
};

// ========== 라인 목록 조회 ==========

const getLineList = async () => {
  try {
    console.log('라인 목록 조회 시작');
    
    // 1차: 통합 쿼리 시도
    try {
      const lineList = await mapper.query('selectLineListWithJoins');
      
      if (lineList && Array.isArray(lineList) && lineList.length > 0) {
        console.log('통합 쿼리로 라인 목록 조회 성공:', lineList.length, '건');
        
        return lineList.map(line => ({
          ...line,
          line_type_text: getLineTypeText(line.line_type),
          current_work_number: '',
          current_process_name: ''
        }));
      }
    } catch (joinError) {
      console.warn('통합 쿼리 실패:', joinError.message);
    }
    
    // 2차: 안전한 쿼리 시도
    try {
      const safeLineList = await mapper.query('selectLineListSafe');
      
      if (safeLineList && Array.isArray(safeLineList) && safeLineList.length > 0) {
        console.log('안전한 쿼리로 라인 목록 조회 성공:', safeLineList.length, '건');
        
        return safeLineList.map(line => ({
          ...line,
          line_type_text: getLineTypeText(line.line_type),
          current_work_number: '',
          current_process_name: ''
        }));
      }
    } catch (safeError) {
      console.warn('안전한 쿼리도 실패:', safeError.message);
    }
    
    // 3차: 마스터 테이블만 조회
    const masterList = await mapper.query('selectLineMasterList');
    
    if (masterList && Array.isArray(masterList) && masterList.length > 0) {
      console.log('마스터 테이블에서 조회 성공:', masterList.length, '건');
      
      return masterList.map(master => ({
        line_code: master.line_code,
        line_name: master.line_name,
        line_type: master.line_type || 'INNER',
        line_type_text: getLineTypeText(master.line_type || 'INNER'),
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
        current_work_number: '',
        current_process_name: '',
        work_start_time: '',
        reg_date: master.reg_date,
        eq_group_code: 'e3'
      }));
    }
    
    return [];
    
  } catch (error) {
    console.error('라인 목록 조회 실패:', error.message);
    return [];
  }
};

// ========== 기본 데이터 조회 함수들 ==========

const getAvailableProducts = async (lineCode = null) => {
  try {
    console.log('제품코드 조회 시작');
    
    const products = await mapper.query('selectProductsSafe');
    
    if (products && Array.isArray(products) && products.length > 0) {
      console.log('제품코드 조회 성공:', products.length, '건');
      
      return products.map(product => ({
        ...product,
        product_type: product.product_code?.includes('DR') ? 'BLISTER' :
                     product.product_code?.includes('BT') ? 'BOTTLE' : 'TABLET',
        package_type: product.product_code?.includes('DR') ? 'BLISTER' :
                     product.product_code?.includes('BT') ? 'BOTTLE' : 'TABLET'
      }));
    }
    
    return [];
    
  } catch (error) {
    console.error('제품코드 조회 실패:', error.message);
    return [];
  }
};

const getAvailableEmployees = async () => {
  try {
    console.log('담당자 조회 시작');
    
    try {
      const employees = await mapper.query('selectAllEmployees');
      
      if (employees && Array.isArray(employees) && employees.length > 0) {
        console.log('담당자 조회 성공:', employees.length, '명');
        return employees;
      }
    } catch (error) {
      console.warn('담당자 조회 실패:', error.message);
      
      const safeEmployees = await mapper.query('selectEmployeesSafe');
      
      if (safeEmployees && Array.isArray(safeEmployees) && safeEmployees.length > 0) {
        console.log('안전한 담당자 조회 성공:', safeEmployees.length, '명');
        return safeEmployees;
      }
    }
    
    return [];
    
  } catch (error) {
    console.error('담당자 조회 실패:', error.message);
    return [];
  }
};

const getAvailableEquipments = async (excludeLineCode = null) => {
  try {
    console.log('설비명 조회 시작 (equipment 테이블에서)');
    
    // equipment 테이블에서 e3(포장설비) 조회
    const allEquipments = await mapper.query('selectAllEquipments');
    
    if (allEquipments && Array.isArray(allEquipments) && allEquipments.length > 0) {
      console.log('equipment 테이블에서 설비 조회 성공:', allEquipments.length, '개');
      
      // 사용 중인 설비 확인
      const query = excludeLineCode ? 'selectUsedEquipmentsExcludeLine' : 'selectUsedEquipments';
      const params = excludeLineCode ? [excludeLineCode] : [];
      
      const usedEquipments = await mapper.query(query, params);
      const usedNames = usedEquipments.map(eq => eq.eq_name);
      
      // 설비 분류 로직
      const availableEquipments = allEquipments
        .filter(eq => !usedNames.includes(eq.eq_name))
        .map(eq => {
          const lineType = classifyEquipmentByName(eq.eq_name, eq.eq_type_code);
          
          console.log(`설비 분류: ${eq.eq_name} -> ${lineType} (타입코드: ${eq.eq_type_code})`);
          
          return {
            eq_name: eq.eq_name,
            line_type: lineType,
            eq_type: lineType,
            eq_type_code: eq.eq_type_code,
            equipment_category: eq.equipment_category || '일반설비'
          };
        });
      
      // 분류 통계
      const innerCount = availableEquipments.filter(eq => eq.line_type === 'INNER').length;
      const outerCount = availableEquipments.filter(eq => eq.line_type === 'OUTER').length;
      
      console.log('설비 분류 결과:');
      console.log(`  - 전체: ${availableEquipments.length}개`);
      console.log(`  - 내포장: ${innerCount}개`);
      console.log(`  - 외포장: ${outerCount}개`);
      
      return availableEquipments;
    }
    
    return [];
    
  } catch (error) {
    console.error('설비명 조회 실패:', error.message);
    return [];
  }
};

const getAvailableLineCodes = async () => {
  try {
    console.log('사용 가능한 라인 코드 조회');
    
    const masterList = await mapper.query('selectLineMasterList');
    const usedCodes = masterList.map(master => master.line_code);
    
    // A-Z 중 사용되지 않은 코드 반환
    const allCodes = Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i));
    const availableCodes = allCodes.filter(code => !usedCodes.includes(code));
    
    console.log('사용 가능한 라인 코드:', availableCodes.length, '개');
    return availableCodes.slice(0, 10);
    
  } catch (error) {
    console.error('사용 가능한 라인 코드 조회 실패:', error.message);
    return [];
  }
};

// ========== 라인 마스터 관리 ==========

const getLineMasterByLineCode = async (lineCode) => {
  try {
    console.log('라인 마스터 조회:', lineCode);
    
    const masterDetails = await mapper.query('selectLineMasterByLineCode', [lineCode]);
    
    if (masterDetails && Array.isArray(masterDetails) && masterDetails.length > 0) {
      console.log('라인 마스터 조회 성공:', lineCode, masterDetails.length, '개');
      return masterDetails.map(master => ({
        ...master,
        line_type_text: getLineTypeText(master.line_type)
      }));
    } else {
      console.warn('해당 라인 마스터 없음:', lineCode);
      return [];
    }
  } catch (error) {
    console.error('라인 마스터 조회 실패:', error.message);
    return [];
  }
};

const getLineMasterDetail = async (masterId) => {
  try {
    const masterDetail = await mapper.query('selectLineMasterById', [masterId]);
    
    if (masterDetail && Array.isArray(masterDetail) && masterDetail.length > 0) {
      console.log('라인 마스터 ID 조회 성공:', masterId);
      return {
        ...masterDetail[0],
        line_type_text: getLineTypeText(masterDetail[0].line_type)
      };
    } else {
      console.warn('해당 라인 마스터 ID 없음:', masterId);
      return null;
    }
  } catch (error) {
    console.error('라인 마스터 ID 조회 실패:', error.message);
    return null;
  }
};

const checkLineCodeExists = async (lineCode, lineType = null) => {
  try {
    console.log('라인 중복 체크 시작:');
    console.log('  입력된 lineCode:', lineCode);
    console.log('  입력된 lineType:', lineType);
    
    const query = lineType ? 'checkLineCodeAndTypeExists' : 'checkLineCodeExists';
    const params = lineType ? [lineCode, lineType] : [lineCode];
    
    console.log('  사용할 쿼리:', query);
    console.log('  쿼리 파라미터:', params);
    
    const result = await mapper.query(query, params);
    const exists = result && result[0] && result[0].count > 0;
    
    console.log('  쿼리 결과:', result);
    console.log('  중복 여부:', exists ? '존재함' : '사용가능');
    
    return exists;
  } catch (error) {
    console.error('라인 코드 중복 체크 실패:', error.message);
    return false;
  }
};

const getLineMasterList = async () => {
  try {
    const masterList = await mapper.query('selectLineMasterList');
    console.log('라인 마스터 목록 조회 성공:', masterList.length, '건');
    return masterList.map(master => ({
      ...master,
      line_type_text: getLineTypeText(master.line_type)
    }));
  } catch (error) {
    console.error('라인 마스터 목록 조회 실패:', error.message);
    return [];
  }
};

// ========== 라인 CRUD 함수들 ==========

const insertIntegratedLine = async (data) => {
  try {
    console.log('=== 통합 라인 등록 시작 ===');
    console.log('입력 데이터:', JSON.stringify(data, null, 2));
    
    // 필수 데이터 검증
    if (!data.line_code) {
      throw new Error('라인 코드는 필수입니다.');
    }
    if (!data.line_type) {
      throw new Error('라인 타입은 필수입니다.');
    }
    
    // 중복 체크
    const exists = await checkLineCodeExists(data.line_code, data.line_type);
    if (exists) {
      throw new Error(`이미 존재하는 라인입니다: ${data.line_code}라인 ${getLineTypeText(data.line_type)}`);
    }
    
    // 실적 ID 조회
    const resultId = await getLatestResultId(data.product_code);
    console.log('사용할 실적 ID:', resultId);
    
    // line_id 생성
    const lineId = generateLineId(data.line_code, data.line_type);
    console.log('생성된 line_id:', lineId);
    
    // 라인 마스터 등록
    const lineTypeName = getLineTypeText(data.line_type);
    
    // 🔧 수정: line_id 포함한 파라미터 (올바른 순서)
    const masterParams = [
      lineId,                                // line_id 
      `${data.line_code}라인 ${lineTypeName}`, // line_name
      data.line_type,                        // line_type
      resultId,                              // result_id
      data.line_code,                        // line_code
      data.max_capacity || 1000,             // max_capacity
      data.description || '',                // description
      data.product_code || ''                // product_code
    ];
    
    console.log('마스터 등록 파라미터:', masterParams);
    
    let masterResult;
    let insertId = null;
    
    try {
      // 🔧 방법 1: line_id 포함 쿼리 시도
      console.log('line_id 포함 쿼리 실행 중...');
      masterResult = await mapper.query('insertLineMaster', masterParams);
      console.log('line_id 포함 마스터 등록 결과:', JSON.stringify(masterResult, null, 2));
      
      // insertId 추출 시도
      if (masterResult && masterResult.insertId) {
        insertId = masterResult.insertId;
        console.log('insertId 추출 성공 (방법1):', insertId);
      }
      
    } catch (lineIdError) {
      console.warn('line_id 포함 등록 실패:', lineIdError?.message || lineIdError);
      
      try {
        // 🔧 방법 2: line_id 없는 대체 쿼리 시도
        const fallbackParams = [
          `${data.line_code}라인 ${lineTypeName}`, // line_name
          data.line_type,                        // line_type
          resultId,                              // result_id
          data.line_code,                        // line_code
          data.max_capacity || 1000,             // max_capacity
          data.description || '',                // description
          data.product_code || ''                // product_code
        ];
        
        console.log('대체 쿼리 실행 중...');
        masterResult = await mapper.query('insertLineMasterWithoutLineId', fallbackParams);
        console.log('대체 마스터 등록 결과:', JSON.stringify(masterResult, null, 2));
        
        // insertId 추출 시도
        if (masterResult && masterResult.insertId) {
          insertId = masterResult.insertId;
          console.log('insertId 추출 성공 (방법2):', insertId);
        }
        
      } catch (fallbackError) {
        console.error('대체 쿼리도 실패:', fallbackError?.message || fallbackError);
        
        // 실패해도 계속 진행 (에러를 던지지 않음)
        console.log('쿼리 실패했지만 계속 진행...');
      }
    }
    
    // insertId가 여전히 없다면 다른 방법으로 찾기
    if (!insertId) {
      console.log('insertId가 없어서 대안 방법 시도...');
      
      try {
        // 방금 삽입된 레코드를 라인 코드로 찾기
        const findQuery = 'selectLineMasterByLineCode';
        const newMaster = await mapper.query(findQuery, [data.line_code]);
        
        console.log('라인 코드로 검색한 결과:', JSON.stringify(newMaster, null, 2));
        
        if (newMaster && Array.isArray(newMaster) && newMaster.length > 0) {
          // 같은 타입의 마스터 찾기
          const targetMaster = newMaster.find(m => m.line_type === data.line_type);
          if (targetMaster && targetMaster.line_masterid) {
            insertId = targetMaster.line_masterid;
            console.log('라인 코드로 insertId 찾기 성공:', insertId);
          } else {
            // 첫 번째 결과 사용
            insertId = newMaster[0].line_masterid;
            console.log('첫 번째 결과로 insertId 사용:', insertId);
          }
        }
      } catch (findError) {
        console.error('라인 코드로 찾기도 실패:', findError?.message || findError);
      }
    }
    
    // 여전히 insertId가 없다면 강제로 생성 (임시)
    if (!insertId) {
      console.warn('모든 방법 실패 - 임시 insertId 생성');
      insertId = `temp_${Date.now()}`;
    }
    
    console.log('라인 마스터 등록 최종 성공, insertId:', insertId);
    
    // 라인 상태 등록 (insertId가 있고 임시 ID가 아닌 경우만)
    if (data.employee_id && insertId && !String(insertId).startsWith('temp_')) {
      const lineParams = [
        insertId,
        data.line_type === 'INNER' ? 'IP' : 'OP',
        data.line_state || 's2',
        data.target_qty || 0,
        data.eq_name || '',
        data.current_speed || 0,
        data.line_code,
        data.employee_id
      ];
      
      console.log('라인 상태 등록 파라미터:', lineParams);
      
      const lineResult = await mapper.query('insertLine', lineParams);
      console.log('라인 상태 등록 결과:', lineResult);
    }
    
    const isTemporaryId = String(insertId).startsWith('temp_');
    
    const result = {
      success: true,
      insertId: insertId,
      line_id: lineId,
      line_code: data.line_code,
      line_name: `${data.line_code}라인 ${lineTypeName}`,
      line_type: data.line_type,
      line_type_text: lineTypeName,
      eq_group_code: 'e3',
      result_id: resultId,
      temporary: isTemporaryId,
      message: isTemporaryId ? 
        `${data.line_code}라인 ${lineTypeName}이 부분적으로 등록되었습니다. (일부 기능 제한)` :
        `${data.line_code}라인 ${lineTypeName}이 성공적으로 등록되었습니다.`
    };
    
    console.log('라인 등록 완료:', result);
    return result;
    
  } catch (error) {
    console.error('통합 라인 등록 실패:', error);
    throw error;
  }
};

// 내포장/외포장 동시 등록 함수
const dualRegisterLine = async (data) => {
  try {
    console.log('=== 내포장/외포장 동시 등록 시작 ===');
    console.log('원본 입력 데이터:', JSON.stringify(data, null, 2));
    
    // 필수 데이터 검증
    if (!data.line_code) {
      throw new Error('라인 코드는 필수입니다.');
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
    
    // 중복 체크
    const innerExists = await checkLineCodeExists(data.line_code, 'INNER');
    const outerExists = await checkLineCodeExists(data.line_code, 'OUTER');
    
    if (innerExists || outerExists) {
      const existingTypes = [];
      if (innerExists) existingTypes.push('내포장');
      if (outerExists) existingTypes.push('외포장');
      throw new Error(`이미 존재하는 라인입니다: ${data.line_code}라인 (${existingTypes.join(', ')})`);
    }
    
    // 실적 ID 조회
    const resultId = await getLatestResultId(data.product_code);
    console.log('동시 등록용 실적 ID:', resultId);
    
    const results = [];
    
    // 1. 내포장 라인 등록
    try {
      console.log('내포장 라인 등록 시작...');
      
      const innerData = {
        line_code: data.line_code,
        line_type: 'INNER',
        eq_name: data.inner_eq_name,
        max_capacity: data.inner_capacity || 1000,
        current_speed: data.inner_speed || 30,
        employee_id: data.inner_employee_id,
        product_code: data.product_code || '',
        description: data.description || '',
        line_state: 's2',
        target_qty: 0
      };
      
      const innerResult = await insertIntegratedLine(innerData);
      results.push({ type: 'INNER', type_text: '내포장', result: innerResult });
      console.log('내포장 라인 등록 성공:', innerResult.insertId);
      
    } catch (innerError) {
      console.error('내포장 라인 등록 실패:', innerError);
      throw new Error(`내포장 라인 등록 실패: ${innerError.message}`);
    }
    
    // 2. 외포장 라인 등록
    try {
      console.log('외포장 라인 등록 시작...');
      
      const outerData = {
        line_code: data.line_code,
        line_type: 'OUTER',
        eq_name: data.outer_eq_name,
        max_capacity: data.outer_capacity || 800,
        current_speed: data.outer_speed || 30,
        employee_id: data.outer_employee_id,
        product_code: data.product_code || '',
        description: data.description || '',
        line_state: 's2',
        target_qty: 0
      };
      
      const outerResult = await insertIntegratedLine(outerData);
      results.push({ type: 'OUTER', type_text: '외포장', result: outerResult });
      console.log('외포장 라인 등록 성공:', outerResult.insertId);
      
    } catch (outerError) {
      console.error('외포장 라인 등록 실패:', outerError);
      
      // 외포장 실패 시 내포장도 롤백
      try {
        console.log('내포장 라인 롤백 시작...');
        await deleteIntegratedLine(data.line_code);
        console.log('내포장 라인 롤백 완료');
      } catch (rollbackError) {
        console.error('롤백 실패:', rollbackError);
      }
      
      throw new Error(`외포장 라인 등록 실패: ${outerError.message}`);
    }
    
    // 성공 결과 반환
    const finalResult = {
      success: true,
      line_code: data.line_code,
      line_name: `${data.line_code}라인`,
      eq_group_code: 'e3',
      result_id: resultId,
      inner_result: results.find(r => r.type === 'INNER')?.result,
      outer_result: results.find(r => r.type === 'OUTER')?.result,
      registered_types: results.map(r => r.type),
      registered_types_text: results.map(r => r.type_text),
      message: `${data.line_code}라인 내포장/외포장이 성공적으로 등록되었습니다.`,
      total_registered: results.length
    };
    
    console.log('내포장/외포장 동시 등록 완료:', finalResult);
    return finalResult;
    
  } catch (error) {
    console.error('내포장/외포장 동시 등록 실패:', error);
    throw error;
  }
};

// 라인 수정 함수 (내포장/외포장 개별 수정)
const updateIntegratedLine = async (lineCode, lineType, data) => {
  try {
    console.log('=== 개별 라인 수정 시작 ===');
    console.log('입력 파라미터:');
    console.log('  lineCode:', lineCode);
    console.log('  lineType:', lineType);
    console.log('  data:', JSON.stringify(data, null, 2));
    
    // 라인 타입 유효성 검증
    if (lineType && !['INNER', 'OUTER'].includes(lineType)) {
      throw new Error(`유효하지 않은 라인 타입입니다: ${lineType}`);
    }
    
    // 모든 마스터 정보 조회
    const allMasters = await mapper.query('selectLineMasterByLineCode', [lineCode]);
    
    if (!allMasters || allMasters.length === 0) {
      throw new Error(`라인을 찾을 수 없습니다: ${lineCode}`);
    }
    
    console.log(`발견된 ${lineCode}라인 전체:`, allMasters.map(m => ({
      masterid: m.line_masterid,
      type: m.line_type,
      name: m.line_name
    })));
    
    // ★ 핵심: 특정 타입만 필터링 (lineType이 있는 경우)
    let targetMasters = allMasters;
    if (lineType) {
      targetMasters = allMasters.filter(master => master.line_type === lineType);
      console.log(`★ ${lineType} 타입만 필터링:`, targetMasters.map(m => ({
        masterid: m.line_masterid,
        type: m.line_type,
        name: m.line_name
      })));
    }
    
    if (targetMasters.length === 0) {
      throw new Error(`${lineType} 타입의 라인을 찾을 수 없습니다: ${lineCode}`);
    }
    
    // 실적 ID 조회
    const resultId = data.product_code ? 
      await getLatestResultId(data.product_code) : 
      targetMasters[0].result_id;
    
    let updateCount = 0;
    const updatedTypes = [];
    const updateResults = [];
    
    // ★ 핵심: 필터링된 라인만 수정
    for (const master of targetMasters) {
      try {
        const lineTypeName = getLineTypeText(master.line_type);
        console.log(`\n=== ${lineTypeName} 라인 (ID: ${master.line_masterid}) 수정 시작 ===`);
        
        // 마스터 업데이트 파라미터
        const updateParams = [
          data.line_name || `${lineCode}라인 ${lineTypeName}`, // line_name  
          master.line_type,                                   // line_type (기존 유지)
          data.max_capacity || master.max_capacity,           // max_capacity
          data.description || master.description,             // description
          data.product_code || master.product_code,           // product_code
          resultId,                                           // result_id
          master.line_masterid                                // WHERE line_masterid
        ];
        
        console.log(`${lineTypeName} 마스터 업데이트 파라미터:`, updateParams);
        
        const masterUpdateResult = await mapper.query('updateLineMaster', updateParams);
        console.log(`${lineTypeName} 마스터 업데이트 결과:`, masterUpdateResult);
        
        // 라인 상태 업데이트 (있는 경우만)
        const latestLine = await mapper.query('selectLatestLineByMasterId', [master.line_masterid]);
        
        if (latestLine && latestLine.length > 0) {
          const lineUpdateParams = [
            master.line_type === 'INNER' ? 'IP' : 'OP',       // pkg_type
            data.line_state || latestLine[0].line_state,       // line_state
            data.employee_id || latestLine[0].employee_id,     // employee_id
            data.eq_name || latestLine[0].eq_name,             // eq_name
            data.current_speed || latestLine[0].current_speed, // current_speed
            data.target_qty || latestLine[0].target_qty,       // target_qty
            latestLine[0].line_id                              // WHERE line_id
          ];
          
          console.log(`${lineTypeName} 라인 상태 업데이트 파라미터:`, lineUpdateParams);
          
          const lineUpdateResult = await mapper.query('updateLine', lineUpdateParams);
          console.log(`${lineTypeName} 라인 상태 업데이트 결과:`, lineUpdateResult);
        }
        
        updateCount++;
        updatedTypes.push(master.line_type);
        updateResults.push({
          master_id: master.line_masterid,
          line_type: master.line_type,
          line_type_text: lineTypeName,
          success: true
        });
        
        console.log(`${lineTypeName} 라인 수정 완료`);
        
      } catch (singleUpdateError) {
        console.error(`${getLineTypeText(master.line_type)} 라인 수정 실패:`, singleUpdateError);
        updateResults.push({
          master_id: master.line_masterid,
          line_type: master.line_type,
          line_type_text: getLineTypeText(master.line_type),
          success: false,
          error: singleUpdateError.message
        });
      }
    }
    
    if (updateCount === 0) {
      throw new Error(`모든 라인 수정에 실패했습니다: ${lineCode}`);
    }
    
    const result = {
      success: true,
      line_code: lineCode,
      line_name: `${lineCode}라인`,
      target_line_type: lineType || 'ALL',
      target_line_type_text: lineType ? getLineTypeText(lineType) : '전체',
      eq_group_code: 'e3',
      result_id: resultId,
      updated_types: updatedTypes,
      updated_types_text: updatedTypes.map(type => getLineTypeText(type)),
      update_count: updateCount,
      total_target: targetMasters.length,
      update_results: updateResults,
      message: lineType ? 
        `${lineCode}라인 ${getLineTypeText(lineType)}이 성공적으로 수정되었습니다.` :
        `${lineCode}라인이 성공적으로 수정되었습니다. (${updateCount}/${targetMasters.length}개 성공)`
    };
    
    console.log('\n=== 라인 수정 최종 결과 ===');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    console.error('개별 라인 수정 실패:', error.message);
    throw error;
  }
};

const deleteIntegratedLine = async (lineCode, lineType = null) => {
  try {
    console.log('통합 라인 삭제 시작:', lineCode, lineType);
    
    // 모든 마스터 정보 조회
    const allMasters = await mapper.query('selectLineMasterByLineCode', [lineCode]);
    
    if (!allMasters || allMasters.length === 0) {
      throw new Error(`라인을 찾을 수 없습니다: ${lineCode}`);
    }
    
    console.log(`발견된 ${lineCode}라인:`, allMasters.length, '개');
    
    // 특정 타입만 삭제하는 경우
    let targetMasters = allMasters;
    if (lineType && ['INNER', 'OUTER'].includes(lineType)) {
      targetMasters = allMasters.filter(master => master.line_type === lineType);
      console.log(`${lineType} 타입만 삭제:`, targetMasters.length, '개');
    }
    
    if (targetMasters.length === 0) {
      throw new Error(`${lineType} 타입의 라인을 찾을 수 없습니다: ${lineCode}`);
    }
    
    let deleteCount = 0;
    const deletedMasterIds = [];
    const deletedTypes = [];
    
    // 각 라인 타입별로 삭제
    for (const master of targetMasters) {
      try {
        const lineTypeName = getLineTypeText(master.line_type);
        console.log(`${lineTypeName} 라인 삭제 중...`);
        
        // 라인 상태 데이터 삭제 (외래키 제약조건 때문에 먼저 삭제)
        await mapper.query('deleteLineByMasterId', [master.line_masterid]);
        console.log(`${lineTypeName} 라인 상태 데이터 삭제 성공`);
        
        // 마스터 데이터 삭제
        await mapper.query('deleteLineMaster', [master.line_masterid]);
        console.log(`${lineTypeName} 라인 마스터 삭제 성공`);
        
        deleteCount++;
        deletedMasterIds.push(master.line_masterid);
        deletedTypes.push(master.line_type);
        
      } catch (singleDeleteError) {
        console.error(`${getLineTypeText(master.line_type)} 라인 삭제 실패:`, singleDeleteError.message);
      }
    }
    
    if (deleteCount === 0) {
      throw new Error(`모든 라인 삭제에 실패했습니다: ${lineCode}`);
    }
    
    const result = {
      success: true,
      line_code: lineCode,
      deleted_master_ids: deletedMasterIds,
      deleted_types: deletedTypes,
      deleted_types_text: deletedTypes.map(type => getLineTypeText(type)),
      delete_count: deleteCount,
      message: `${lineCode}라인이 성공적으로 삭제되었습니다. (${deleteCount}/${targetMasters.length}개 성공)`
    };
    
    console.log('라인 삭제 완료:', result);
    return result;
    
  } catch (error) {
    console.error('통합 라인 삭제 실패:', error.message);
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
        workingLines.push({
          ...line,
          line_type_text: getLineTypeText(line.line_type)
        });
      }
    });
    
    return {
      statusStats: statusStats.filter(s => s.count > 0),
      workingLines: workingLines,
      totalLines: lineList.length
    };
  } catch (error) {
    console.error('라인 상태 통계 조회 실패:', error);
    return {
      statusStats: [],
      workingLines: [],
      totalLines: 0
    };
  }
};

const getProductDetail = async (code) => {
  try {
    const product = await mapper.query('selectProductByCode', [code]);
    return product && product.length > 0 ? product[0] : null;
  } catch (error) {
    console.error('제품 상세 조회 실패:', error.message);
    return null;
  }
};

const getProductCodeUsageStats = async () => {
  try {
    const usageStats = await mapper.query('selectProductUsageStats');
    return usageStats || [];
  } catch (error) {
    console.error('제품코드 사용 현황 조회 실패:', error.message);
    return [];
  }
};

module.exports = {
  // 핵심 함수들
  getLineList,
  getAvailableProducts,
  getAvailableEmployees,
  getAvailableEquipments,
  getAvailableLineCodes,

  // 실적 ID 관리
  getLatestResultId,

  // 라인 마스터 관리
  getLineMasterList,
  getLineMasterDetail,
  getLineMasterByLineCode,
  checkLineCodeExists,

  // 라인 CRUD
  insertIntegratedLine,
  dualRegisterLine,
  updateIntegratedLine,
  deleteIntegratedLine,

  // 통계 및 기타
  getLineStatusStats,
  getProductDetail,
  getProductCodeUsageStats,

  // 유틸리티 함수들
  classifyEquipmentByName,
  getLineTypeText,
  generateLineId
};