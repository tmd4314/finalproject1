const db = require('../database/mapper');

// 🔥 DateTime 변환 유틸리티 함수 추가 (개선된 버전)
const formatDateTimeForDB = (dateInput) => {
  if (!dateInput) return null;
  
  let date;
  if (typeof dateInput === 'string') {
    // 이미 DB 형식인 경우 그대로 반환
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateInput)) {
      console.log('🔥 이미 DB 형식:', dateInput);
      return dateInput;
    }
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    console.warn('🔥 지원하지 않는 날짜 형식:', typeof dateInput, dateInput);
    return null;
  }
  
  // Invalid Date 체크
  if (isNaN(date.getTime())) {
    console.warn('🔥 유효하지 않은 날짜:', dateInput);
    return null;
  }
  
  // MariaDB 형식으로 변환: 'YYYY-MM-DD HH:MM:SS'
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  const result = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  console.log(`🔥 DateTime 변환: ${dateInput} → ${result}`);
  return result;
};

// BigInt 변환 유틸리티
const convertBigIntToNumber = (obj) => {
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
};

// 포장 타입 판별 헬퍼 함수
const determinePackageType = (stepName, workStep, lineType) => {
  // 1. step_name 기반 판별
  if (stepName) {
    if (stepName.includes('내포장') || stepName.includes('1차')) {
      return 'INNER';
    }
    if (stepName.includes('외포장') || stepName.includes('2차')) {
      return 'OUTER';
    }
  }
  
  // 2. work_step 기반 판별
  if (workStep) {
    if (workStep.includes('내포장') || workStep.includes('1차')) {
      return 'INNER';
    }
    if (workStep.includes('외포장') || workStep.includes('2차')) {
      return 'OUTER';
    }
  }
  
  // 3. line_type 기반 판별
  if (lineType) {
    return lineType;
  }
  
  // 4. 기본값
  return 'INNER';
};

// 한글/영어 변환 함수들
const getKoreanPackageType = (englishType) => {
  const typeMap = {
    'INNER': '내포장',
    'OUTER': '외포장'
  };
  return typeMap[englishType] || englishType;
};

const getEnglishPackageType = (koreanType) => {
  const typeMap = {
    '내포장': 'INNER',
    '외포장': 'OUTER',
    '1차포장': 'INNER',
    '2차포장': 'OUTER'
  };
  return typeMap[koreanType] || koreanType;
};

// 조인 데이터 검증 및 후처리 함수
const processJoinedWorkData = (workData) => {
  if (!workData) return null;

  // 조인 성공 여부 확인
  const joinInfo = {
    has_product: workData.has_product_info === 1,
    has_order: workData.has_order_info === 1,
    has_employee: workData.has_employee_info === 1
  };

  console.log(`🔍 조인 정보 - 제품: ${joinInfo.has_product ? '✅' : '❌'}, 주문: ${joinInfo.has_order ? '✅' : '❌'}, 사원: ${joinInfo.has_employee ? '✅' : '❌'}`);

  // 제품명 처리 (개선된 로직)
  let finalProductName = workData.product_name || workData.step_name || '제품정보없음';
  
  if (joinInfo.has_product && workData.product_name) {
    console.log(`✅ 조인된 제품명 사용: ${finalProductName}`);
  } else if (workData.step_name) {
    // step_name에서 제품명 추출 시도 (개선된 로직)
    if (workData.step_name.includes('타이레놀')) {
      finalProductName = '타이레놀정500mg';
    } else if (workData.step_name.includes('게보린')) {
      finalProductName = '게보린정';
    } else if (workData.step_name.includes('부루펜')) {
      finalProductName = '부루펜시럽';
    } else if (workData.step_name.includes('베아르')) {
      finalProductName = '베아르정';
    } else if (workData.step_name.includes('A라인')) {
      finalProductName = 'A라인 제품';
    } else if (workData.step_name.includes('B라인')) {
      finalProductName = 'B라인 제품';
    } else if (workData.step_name.includes('C라인')) {
      finalProductName = 'C라인 제품';
    } else {
      // step_name 전체를 제품명으로 사용
      finalProductName = workData.step_name || '제품정보없음';
    }
    console.log(`📝 step_name에서 추출한 제품명: ${finalProductName}`);
  }

  // 지시수량 vs 투입수량 구분
  const orderQty = workData.order_qty || workData.input_qty || 1000; // 실제 지시수량
  const inputQty = workData.input_qty || 0; // 투입수량
  const targetQty = workData.target_qty || inputQty; // 목표수량

  console.log(`📊 수량 정보 - 지시수량: ${orderQty}, 투입수량: ${inputQty}, 목표수량: ${targetQty}`);

  // 작업자명 처리
  const employeeName = workData.emp_name || workData.employee_name || '작업자';
  if (joinInfo.has_employee) {
    console.log(`✅ 조인된 작업자명 사용: ${employeeName}`);
  } else {
    console.log(`📝 기본 작업자명 사용: ${employeeName}`);
  }

  // 포장타입 후처리
  const packageType = workData.package_type || determinePackageType(workData.step_name, workData.work_step, workData.line_type);

  // 계산 필드들 추가
  const processedData = {
    ...workData,
    product_name: finalProductName,
    emp_name: employeeName,
    package_type: packageType,
    
    // 수량 관련 계산 필드
    order_qty: orderQty,           // 지시수량 (실제 주문량)
    target_quantity: targetQty,    // 목표수량 (투입수량)
    current_quantity: inputQty,    // 기투입량
    remaining_quantity: Math.max(0, orderQty - inputQty), // 미투입량
    
    // 달성률 계산 (지시수량 기준)
    achievement_rate: orderQty > 0 ? Math.round((workData.output_qty / orderQty) * 100) : 0,
    
    // 조인 메타정보
    join_info: joinInfo
  };

  return processedData;
};

// 조인 데이터 배치 처리
const processJoinedWorkList = (workList) => {
  if (!Array.isArray(workList)) return [];

  console.log(`🔄 ${workList.length}개 작업 데이터 조인 후처리 시작`);

  const processedList = workList.map(work => processJoinedWorkData(work));

  // 조인 통계 계산
  const joinStats = {
    total: processedList.length,
    with_product: processedList.filter(w => w.join_info?.has_product).length,
    with_order: processedList.filter(w => w.join_info?.has_order).length,
    with_employee: processedList.filter(w => w.join_info?.has_employee).length
  };

  console.log(`📊 조인 통계:`, joinStats);
  console.log(`✅ 제품정보 조인 성공률: ${Math.round((joinStats.with_product / joinStats.total) * 100)}%`);
  console.log(`✅ 주문정보 조인 성공률: ${Math.round((joinStats.with_order / joinStats.total) * 100)}%`);
  console.log(`✅ 사원정보 조인 성공률: ${Math.round((joinStats.with_employee / joinStats.total) * 100)}%`);

  return processedList;
};

// ==============================================
// 작업 등록
// ==============================================
const createWork = async (workData) => {
  try {
    const {
      work_no, order_detail_id, line_id, work_line, work_step, step_name,
      input_qty, eq_code, employee_id, employee_name, product_code
    } = workData;

    console.log('=== 포장 작업 등록 ===');
    console.log('작업 데이터:', workData);

    // 필수 필드 검증
    if (!work_no || !input_qty || !employee_id) {
      throw new Error('필수 필드가 누락되었습니다. (작업번호, 투입수량, 작업자ID)');
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
      order_detail_id || null,
      line_id || 'A',
      work_line || '포장라인',
      work_step || '포장',
      step_name || work_no,
      parseInt(input_qty),
      eq_code || 'PKG001',
      employee_id,
      employee_name || '작업자',
      product_code || null
    ]);

    console.log('작업 등록 성공:', result.insertId);

    return {
      work_no,
      input_qty: parseInt(input_qty),
      output_qty: 0,
      insertId: result.insertId
    };

  } catch (error) {
    console.error('작업 등록 서비스 오류:', error);
    throw error;
  }
};

// ==============================================
// 작업 목록 조회 (실제 데이터만)
// ==============================================
const getWorkList = async (packageType = null) => {
  try {
    console.log('=== 작업 목록 조회 (실제 데이터만) ===');
    console.log('포장타입 필터:', packageType);

    let result;
    
    // 전체 작업 목록을 먼저 조회
    result = await db.query('selectWorkList');
    console.log(`원시 데이터 조회 완료: ${result.length}건`);

    if (result.length === 0) {
      console.log('⚠️ 작업 데이터가 없습니다.');
      return [];
    }

    // 포장타입 필터링
    if (packageType && (packageType === 'INNER' || packageType === 'OUTER' || 
                       packageType === '내포장' || packageType === '외포장')) {
      const englishType = getEnglishPackageType(packageType);
      console.log('영어 포장타입으로 변환:', englishType);
      
      result = result.filter(work => {
        const stepName = (work.step_name || '').toLowerCase();
        const workStep = (work.work_step || '').toLowerCase();
        const packageType = (work.package_type || '').toUpperCase();
        const lineType = (work.line_type || '');
        
        if (englishType === 'INNER') {
          const isExplicitOuter = stepName.includes('외포장') || 
                                stepName.includes('2차') || 
                                workStep.includes('외포장') || 
                                workStep.includes('2차') ||
                                packageType === 'OUTER' ||
                                lineType === '외포장';
          return !isExplicitOuter;
        } else if (englishType === 'OUTER') {
          const isOuter = stepName.includes('외포장') || 
                         stepName.includes('2차') || 
                         workStep.includes('외포장') || 
                         workStep.includes('2차') ||
                         packageType === 'OUTER' ||
                         lineType === '외포장';
          return isOuter;
        }
        return true;
      });
      
      console.log(`포장타입 필터링 완료: ${result.length}건`);
    }

    // 조인 데이터 후처리
    const processedList = processJoinedWorkList(result);

    return convertBigIntToNumber(processedList);

  } catch (error) {
    console.error('=== 작업 목록 조회 에러 ===');
    console.error('에러 메시지:', error.message || error.err?.message);
    throw new Error('작업 목록 조회 실패: ' + (error.err?.message || error.message));
  }
};

// ==============================================
// 작업번호 선택 옵션 조회 (실제 데이터만)
// ==============================================
const getWorkOptions = async (packageType = null) => {
  try {
    console.log('=== 실제 데이터베이스에서 작업번호 옵션 조회 ===');
    console.log('포장타입 필터:', packageType);

    const result = await db.query('selectWorkOptions');
    
    console.log(`실제 데이터 조회 완료: ${result.length}건`);
    
    if (result.length === 0) {
      console.log('⚠️ 데이터베이스에 작업 데이터가 없습니다.');
      console.log('package_line 테이블의 curr_work_no와 package_work 테이블의 work_no를 확인해주세요.');
      return [];
    }

    // 포장타입 필터링 (요청된 경우에만)
    let filteredResult = result;
    
    if (packageType && (packageType === 'INNER' || packageType === 'OUTER' || 
                       packageType === '내포장' || packageType === '외포장')) {
      const englishType = getEnglishPackageType(packageType);
      console.log('포장타입 필터링 적용:', englishType);
      
      const beforeFilter = result.length;
      filteredResult = result.filter(work => work.package_type === englishType);
      console.log(`포장타입 필터링: ${beforeFilter}개 → ${filteredResult.length}개`);
    }

    // 조인 데이터 후처리
    const processedOptions = processJoinedWorkList(filteredResult);

    console.log(`✅ 최종 처리된 작업 옵션: ${processedOptions.length}건`);

    return convertBigIntToNumber(processedOptions);

  } catch (error) {
    console.error('=== 작업번호 옵션 조회 에러 ===');
    console.error('에러 메시지:', error.message || error.err?.message);
    throw new Error('데이터베이스 조회 실패: ' + error.message);
  }
};

// ==============================================
// 🔥 부분완료 처리 포함한 작업 상세 조회 (누락된 함수)
// ==============================================
const getWorkDetailWithPartialHandling = async (workNo) => {
  try {
    console.log(`=== 부분완료 처리 포함 작업 상세 조회: ${workNo} ===`);
    
    // 기본 작업 상세 조회
    const result = await db.query('selectWorkDetail', [workNo]);
    
    if (result.length === 0) {
      console.log(`⚠️ 작업번호 ${workNo}를 찾을 수 없습니다.`);
      return null;
    }
    
    const workData = result[0];
    console.log(`✅ 작업 기본 정보 조회 성공: ${workNo}`);
    
    // 🔥 부분완료 상태인 경우 추가 정보 조회
    if (workData.step_status === '부분완료' || workData.step_status === 'PARTIAL_COMPLETE') {
      try {
        const partialResult = await db.query('selectPartialWorkDetail', [workNo]);
        if (partialResult.length > 0) {
          console.log(`🔄 부분완료 추가 정보 조회 성공: ${workNo}`);
          // 부분완료 특화 데이터 병합
          Object.assign(workData, partialResult[0]);
        }
      } catch (partialError) {
        console.warn(`⚠️ 부분완료 추가 정보 조회 실패, 기본 정보 사용: ${partialError.message}`);
      }
    }
    
    // 조인 데이터 후처리
    const processedWork = processJoinedWorkData(workData);
    
    // 🔥 부분완료 작업 특별 처리
    if (processedWork.step_status === '부분완료' || processedWork.step_status === 'PARTIAL_COMPLETE') {
      const remainingQty = Math.max(0, processedWork.target_quantity - processedWork.output_qty);
      const completionRate = processedWork.target_quantity > 0 ? 
        Math.round((processedWork.output_qty / processedWork.target_quantity) * 100) : 0;
      
      processedWork.is_partial_work = true;
      processedWork.remaining_quantity = remainingQty;
      processedWork.completion_rate = completionRate;
      processedWork.can_resume = remainingQty > 0;
      
      console.log(`🔄 부분완료 작업 처리: 남은수량 ${remainingQty}개, 달성률 ${completionRate}%`);
    }
    
    console.log(`✅ 부분완료 처리 포함 작업 상세 조회 완료: ${workNo}`);
    return convertBigIntToNumber(processedWork);
    
  } catch (error) {
    console.error(`❌ 부분완료 처리 포함 작업 상세 조회 실패 (${workNo}):`, error);
    throw error;
  }
};

// ==============================================
// 🔥 안전한 작업 업데이트 (누락된 함수)
// ==============================================
// ==============================================
// 🔥 수정된 안전한 작업 업데이트 (불량수량 처리 추가)
// ==============================================
// packageService.js의 updateWorkSafe 함수 수정

const updateWorkSafe = async (workNo, updateData) => {
  try {
    console.log(`=== 안전한 작업 업데이트: ${workNo} ===`);
    console.log('업데이트 데이터:', updateData);
    
    // 필수 필드 검증
    if (!workNo) {
      throw new Error('작업번호가 필요합니다.');
    }
    
    // 작업 존재 확인
    const existingWork = await checkWorkExists(workNo);
    if (!existingWork) {
      throw new Error(`작업번호 ${workNo}를 찾을 수 없습니다.`);
    }
    
    // 업데이트할 필드 구성
    const {
      step_status,
      input_qty,
      output_qty = 0,
      defect_qty = 0,
      start_time,
      end_time,
      employee_id
    } = updateData;
    
    // 🔥 불량수량이 있는지 확인
    const hasDefectQty = defect_qty > 0;
    const isPartialComplete = step_status === '부분완료' || step_status === 'PARTIAL_COMPLETE';
    const isPaused = step_status === '일시정지' || step_status === 'PAUSED';
    
    console.log(`🔍 업데이트 상황 분석:`);
    console.log(`- 불량수량: ${defect_qty}개 (적용: ${hasDefectQty})`);
    console.log(`- 부분완료: ${isPartialComplete}`);
    console.log(`- 일시정지: ${isPaused}`);
    
    // 🔥 시간 필드 안전 처리
    const safeTimeConvert = (timeValue, fieldName) => {
      if (timeValue === null || timeValue === undefined) {
        return null;
      }
      
      if (typeof timeValue === 'object' && Object.keys(timeValue).length === 0) {
        console.log(`🚨 ${fieldName}: 빈 객체 감지 → null`);
        return null;
      }
      
      if (typeof timeValue === 'string' && timeValue.includes('T')) {
        return formatDateTimeForDB(timeValue);
      }
      
      if (typeof timeValue === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timeValue)) {
        return timeValue;
      }
      
      return null;
    };
    
    const actualStartTime = safeTimeConvert(start_time, 'start_time');
    let actualEndTime = safeTimeConvert(end_time, 'end_time');
    
    // 🔥 WORKING 상태인 경우 end_time은 무조건 null
    if (step_status === 'WORKING') {
      actualEndTime = null;
      console.log('🔥 WORKING 상태: end_time 강제 null 설정');
    }
    
    let result;
    
    // 🔥 불량수량이 있거나 특수 상태인 경우 updatePartialWork 사용
    if (hasDefectQty || isPartialComplete || isPaused) {
      console.log('🔥 updatePartialWork 쿼리 사용 (불량수량/부분완료/일시정지)');
      
      try {
        result = await db.query('updatePartialWork', [
          step_status || existingWork.step_status,
          output_qty,
          defect_qty,
          actualEndTime,
          workNo
        ]);
        
        console.log(`✅ updatePartialWork 성공: ${workNo}`);
        
      } catch (partialError) {
        console.log(`⚠️ updatePartialWork 실패, 직접 UPDATE 시도: ${partialError.message}`);
        
        // 🔥 직접 SQL로 defect_qty 포함 업데이트
        result = await db.query(`
          UPDATE tablets.package_work 
          SET 
            step_status = ?,
            output_qty = ?,
            defect_qty = ?,
            start_time = COALESCE(?, start_time),
            end_time = ?,
            upd_date = NOW()
          WHERE work_no = ?
        `, [
          step_status || existingWork.step_status,
          output_qty,
          defect_qty,
          actualStartTime,
          actualEndTime,
          workNo
        ]);
        
        console.log(`✅ 직접 UPDATE로 불량수량 포함 업데이트 성공: ${workNo}`);
      }
      
    } else {
      console.log('🔥 기본 updateWork 쿼리 사용 (일반 업데이트)');
      
      // 🔥 기본 updateWork 쿼리 사용 (5개 파라미터)
      result = await db.query('updateWork', [
        step_status || existingWork.step_status,
        output_qty,
        actualStartTime || existingWork.start_time,
        actualEndTime,
        workNo
      ]);
      
      console.log(`✅ 기본 updateWork 성공: ${workNo}`);
    }
    
    console.log(`✅ 작업 업데이트 성공: ${workNo} (영향받은 행: ${result.affectedRows})`);
    
    // 🔥 업데이트된 정보 반환
    return {
      work_no: workNo,
      step_status: step_status || existingWork.step_status,
      input_qty: input_qty || existingWork.input_qty,
      output_qty: output_qty,
      defect_qty: defect_qty,
      good_qty: Math.max(0, output_qty - defect_qty),
      start_time: actualStartTime || existingWork.start_time,
      end_time: actualEndTime,
      updated_at: formatDateTimeForDB(new Date()),
      affectedRows: result.affectedRows,
      update_method: hasDefectQty || isPartialComplete || isPaused ? 'partial_work' : 'standard'
    };
    
  } catch (error) {
    console.error(`❌ 안전한 작업 업데이트 실패 (${workNo}):`, error);
    throw error;
  }
};

// ==============================================
// 🔥 부분완료 처리 (누락된 함수)
// ==============================================
const updateWorkPartialComplete = async (workNo, partialData) => {
  try {
    console.log(`=== 부분완료 처리: ${workNo} ===`);
    console.log('부분완료 데이터:', partialData);
    
    const {
      output_qty = 0,
      defect_qty = 0,
      remaining_qty,
      completion_rate,
      employee_id = 2,
      end_time
    } = partialData;
    
    // 🔥 시간 형식 변환
    const formattedEndTime = end_time ? formatDateTimeForDB(end_time) : formatDateTimeForDB(new Date());
    
    // 🔥 부분완료 전용 쿼리 사용 (있는 경우)
    try {
      const result = await db.query('updatePartialWork', [
        '부분완료',  // step_status
        output_qty,
        defect_qty,
        formattedEndTime,
        workNo
      ]);
      
      console.log(`✅ 부분완료 전용 업데이트 성공: ${workNo}`);
      return {
        work_no: workNo,
        step_status: '부분완료',
        output_qty: output_qty,
        defect_qty: defect_qty,
        remaining_qty: remaining_qty,
        completion_rate: completion_rate,
        end_time: formattedEndTime,
        is_partial: true,
        can_resume: remaining_qty > 0,
        affectedRows: result.affectedRows
      };
      
    } catch (partialQueryError) {
      console.log(`⚠️ 부분완료 전용 쿼리 실패, 기본 업데이트 사용: ${partialQueryError.message}`);
      
      // 🔥 기본 업데이트 쿼리로 대체
      const fallbackResult = await db.query('updateWork', [
        '부분완료',
        output_qty,
        null, // start_time 유지
        formattedEndTime,
        workNo
      ]);
      
      console.log(`✅ 기본 쿼리로 부분완료 처리 성공: ${workNo}`);
      return {
        work_no: workNo,
        step_status: '부분완료',
        output_qty: output_qty,
        defect_qty: defect_qty,
        remaining_qty: remaining_qty,
        completion_rate: completion_rate,
        end_time: formattedEndTime,
        is_partial: true,
        can_resume: remaining_qty > 0,
        affectedRows: fallbackResult.affectedRows
      };
    }
    
  } catch (error) {
    console.error(`❌ 부분완료 처리 실패 (${workNo}):`, error);
    throw error;
  }
};

// ==============================================
// 🔥 일시정지 처리 (누락된 함수)
// ==============================================
const updateWorkPause = async (workNo, pauseData) => {
  try {
    console.log(`=== 일시정지 처리: ${workNo} ===`);
    console.log('일시정지 데이터:', pauseData);
    
    const {
      output_qty = 0,
      defect_qty = 0,
      remaining_qty,
      completion_rate,
      employee_id = 2,
      pause_time
    } = pauseData;
    
    // 🔥 시간 형식 변환 (일시정지는 end_time을 설정하지 않음)
    const formattedPauseTime = pause_time ? formatDateTimeForDB(pause_time) : formatDateTimeForDB(new Date());
    
    // 일시정지 처리 (end_time은 설정하지 않음 - 재시작 가능)
    const result = await db.query('updateWork', [
      '일시정지',
      output_qty,
      null, // start_time 유지
      null, // end_time 설정하지 않음 (재시작 가능)
      workNo
    ]);
    
    console.log(`✅ 일시정지 처리 성공: ${workNo}`);
    
    return {
      work_no: workNo,
      step_status: '일시정지',
      output_qty: output_qty,
      defect_qty: defect_qty,
      remaining_qty: remaining_qty,
      completion_rate: completion_rate,
      pause_time: formattedPauseTime,
      can_resume: true,
      is_paused: true,
      affectedRows: result.affectedRows
    };
    
  } catch (error) {
    console.error(`❌ 일시정지 처리 실패 (${workNo}):`, error);
    throw error;
  }
};

// ==============================================
// 🔥 재시작 가능한 작업 목록 조회 (부분완료/일시정지)
// ==============================================
const getResumableWorks = async () => {
  try {
    console.log('=== 재시작 가능한 작업 목록 조회 ===');
    
    // 부분완료/일시정지 작업 조회 (쿼리가 있는 경우)
    try {
      const result = await db.query('selectResumableWorks');
      console.log(`✅ 재시작 가능한 작업 ${result.length}건 조회 성공`);
      return convertBigIntToNumber(result);
      
    } catch (queryError) {
      console.log(`⚠️ 전용 쿼리 실패, 필터링으로 대체: ${queryError.message}`);
      
      // 🔥 전체 작업에서 필터링
      const allWorks = await getWorkList();
      const resumableWorks = allWorks.filter(work => {
        const status = (work.step_status || '').toLowerCase();
        return status === '부분완료' || 
               status === 'partial_complete' ||
               status === '일시정지' ||
               status === 'paused';
      });
      
      console.log(`✅ 필터링으로 재시작 가능한 작업 ${resumableWorks.length}건 조회`);
      return resumableWorks;
    }
    
  } catch (error) {
    console.error('❌ 재시작 가능한 작업 목록 조회 실패:', error);
    throw error;
  }
};

// 라인 정보 조회 함수 (실제 데이터만)
const getLineInfo = async (lineId) => {
  try {
    console.log(`=== 라인 정보 조회: ${lineId} ===`);
    
    // 🔥 안전한 쿼리 실행
    const result = await db.query('selectAllLines');
    
    // 해당 라인 ID 필터링
    const lineInfo = result.find(line => line.line_id == lineId);
    
    if (!lineInfo) {
      throw new Error(`라인 ${lineId} 정보를 찾을 수 없습니다.`);
    }
    
    return convertBigIntToNumber(lineInfo);
    
  } catch (error) {
    console.error('라인 정보 조회 실패:', error);
    throw error;
  }
};

// 라인의 현재 작업번호 조회 함수 (실제 데이터만)
const getCurrentWorkNoByLine = async (lineId) => {
  try {
    console.log(`=== 라인 ${lineId}의 현재 작업번호 조회 ===`);
    
    // 🔥 라인 정보 조회
    const lineInfo = await getLineInfo(lineId);
    
    const currentWorkNo = lineInfo.curr_work_no;
    console.log(`라인 ${lineId}의 현재 작업번호: ${currentWorkNo}`);
    
    return currentWorkNo;
    
  } catch (error) {
    console.error('현재 작업번호 조회 실패:', error);
    throw error;
  }
};

// 작업 통계 계산
const calculateWorkStats = (workList) => {
  if (!Array.isArray(workList) || workList.length === 0) {
    return {
      total_works: 0,
      join_success_rate: {
        product: 0,
        order: 0,
        employee: 0
      }
    };
  }

  const stats = {
    total_works: workList.length,
    join_success_rate: {
      product: Math.round((workList.filter(w => w.join_info?.has_product).length / workList.length) * 100),
      order: Math.round((workList.filter(w => w.join_info?.has_order).length / workList.length) * 100),
      employee: Math.round((workList.filter(w => w.join_info?.has_employee).length / workList.length) * 100)
    }
  };

  return stats;
};

const getWorkDetail = async (workNo) => {
  try {
    console.log(`=== 개별 작업 상세 조회: ${workNo} ===`);
    
    // 직접 work_no로 조회 (JOIN 없이 간단하게)
    const result = await db.query('selectWorkDetail', [workNo]);
    
    if (result.length === 0) {
      console.log(`⚠️ 작업번호 ${workNo}를 찾을 수 없습니다.`);
      return null;
    }
    
    console.log(`✅ 작업 상세 조회 성공: ${workNo}`);
    
    // 조인 데이터 후처리
    const processedWork = processJoinedWorkData(result[0]);
    
    return convertBigIntToNumber(processedWork);
    
  } catch (error) {
    console.error(`작업 상세 조회 실패 (${workNo}):`, error);
    throw error;
  }
};

// ==============================================
// 간단한 작업 존재 확인
// ==============================================
const checkWorkExists = async (workNo) => {
  try {
    console.log(`=== 작업 존재 확인: ${workNo} ===`);
    
    // 🔥 기존 package.js의 별칭 사용
    const countResult = await db.query('checkWorkExists', [workNo]);
    
    if (countResult[0].count === 0) {
      console.log(`⚠️ 작업번호 ${workNo}가 존재하지 않습니다.`);
      return null;
    }
    
    // 🔥 존재하면 상세 정보 조회
    const detailResult = await db.query('selectWorkDetail', [workNo]);
    
    if (detailResult.length === 0) {
      console.log(`⚠️ 작업번호 ${workNo} 상세 정보 조회 실패`);
      return null;
    }
    
    console.log(`✅ 작업번호 ${workNo} 존재 확인`);
    return convertBigIntToNumber(detailResult[0]);
    
  } catch (error) {
    console.error(`작업 존재 확인 실패 (${workNo}):`, error);
    throw error;
  }
};

const getInnerCompletionByLineCode = async (lineCode) => {
  try {
    console.log(`=== 내포장 완료 정보 조회: ${lineCode} ===`);
    
    const result = await db.query('selectInnerCompletionByLineCode', [lineCode]);
    
    if (result.length === 0) {
      console.log(`⚠️ ${lineCode}의 내포장 완료 정보 없음`);
      return null;
    }
    
    console.log(`✅ 내포장 완료 정보 조회 성공: ${lineCode}`);
    return convertBigIntToNumber(result[0]);
    
  } catch (error) {
    console.error(`내포장 완료 정보 조회 실패 (${lineCode}):`, error);
    throw error;
  }
};

// 워크플로우 상태 조회
const getWorkflowStatusByLineCode = async (lineCode) => {
  try {
    console.log(`=== 워크플로우 상태 조회: ${lineCode} ===`);
    
    const result = await db.query('selectWorkflowByLineCode', [lineCode]);
    
    if (result.length === 0) {
      console.log(`⚠️ ${lineCode}의 워크플로우 정보 없음`);
      return null;
    }
    
    console.log(`✅ 워크플로우 상태 조회 성공: ${lineCode}`);
    return convertBigIntToNumber(result[0]);
    
  } catch (error) {
    console.error(`워크플로우 상태 조회 실패 (${lineCode}):`, error);
    throw error;
  }
};

// 외포장에 내포장 완료수량 연계
const linkInnerToOuter = async (lineCode, innerOutputQty) => {
  try {
    console.log(`=== 외포장 연계: ${lineCode}, 수량: ${innerOutputQty} ===`);
    
    const result = await db.query('linkInnerToOuter', [innerOutputQty, lineCode]);
    
    console.log(`✅ 외포장 연계 성공: ${lineCode}`);
    return result;
    
  } catch (error) {
    console.error(`외포장 연계 실패 (${lineCode}):`, error);
    throw error;
  }
};

module.exports = {
  // 기존 함수들...
  createWork,
  getWorkList,
  getWorkOptions,
  getWorkDetail,
  checkWorkExists,
  getLineInfo,
  getCurrentWorkNoByLine,
  calculateWorkStats,
  
  // 🔥 새로 추가된 워크플로우 함수들
  getInnerCompletionByLineCode,
  getWorkflowStatusByLineCode,
  linkInnerToOuter,
  
  // 🔥 누락된 핵심 함수들 추가
  getWorkDetailWithPartialHandling,
  updateWorkSafe,
  updateWorkPartialComplete,
  updateWorkPause,
  getResumableWorks,
  
  // 헬퍼 함수들
  determinePackageType,
  getKoreanPackageType,
  getEnglishPackageType,
  processJoinedWorkData,
  processJoinedWorkList,
  convertBigIntToNumber,
  formatDateTimeForDB, // 🔥 DB 시간 형식 변환 함수 추가
  
  // 호환성을 위한 별칭
  insertWork: createWork
};