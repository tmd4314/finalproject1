// server/services/productInboundService.js - 제품 입고 관리 서비스 (포장공정 완료 조건 추가)

const mariadb = require('../database/mapper.js');

// 입고 대기 목록 조회 (포장공정 완료 조건 추가)
const getInboundWaitingList = async (searchParams = {}) => {
  try {
    const {
      result_id = '',
      product_name = '',
      product_code = '',
      request_date = ''  // 특정 날짜 추가
    } = searchParams;

    console.log('입고 대기 목록 조회 시작, 검색 조건:', searchParams);
    console.log('포장공정 완료 조건 적용: process_seq = 7, code_value = p5');
    
    const params = [
      result_id, result_id,        // 작업실적ID
      product_name, product_name,  // 제품명
      product_code, product_code,  // 제품코드
      request_date, request_date   // 요청일자 (특정 날짜)
    ];

    const result = await mariadb.query('getInboundWaitingList', params);
    console.log(`입고 대기 목록 조회 완료: ${result.length}건 (포장공정 완료 조건 + 중복 제거 적용)`);
    
    // 포장공정 완료 조건 결과 로깅
    if (result.length > 0) {
      console.log('포장공정 완료된 제품 조회 결과:', {
        총건수: result.length,
        첫번째항목: {
          work_order_no: result[0].work_order_no,
          product_code: result[0].product_code,
          result_id: result[0].result_id,
          product_name: result[0].product_name,
          request_date: result[0].request_date
        }
      });
      
      // 중복 체크 로깅
      const uniqueKeys = new Set();
      result.forEach(item => {
        const key = `${item.work_order_no}-${item.product_code}-${item.result_id}`;
        if (uniqueKeys.has(key)) {
          console.warn('중복 발견:', key);
        }
        uniqueKeys.add(key);
      });
      console.log('포장공정 완료 제품 고유 조합 수:', uniqueKeys.size, '/ 전체 결과 수:', result.length);
    } else {
      console.log('⚠️ 포장공정이 완료된 제품이 없습니다 (process_seq = 7, code_value = p5 조건)');
    }
    
    return result;
  } catch (err) {
    console.error('입고 대기 목록 조회 오류:', err);
    console.error('포장공정 완료 조건 오류 - process 테이블 조인 확인 필요');
    throw err;
  }
};

// 입고 완료 목록 조회 (특정 날짜 검색)
const getInboundCompletedList = async (searchParams = {}) => {
  try {
    const {
      lot_num = '',
      product_name = '',
      product_code = '',
      inbound_date = ''  // 특정 날짜
    } = searchParams;

    console.log('입고 완료 목록 조회 시작, 검색 조건:', searchParams);
    
    const params = [
      lot_num, lot_num,           // LOT 번호
      product_name, product_name, // 제품명
      product_code, product_code, // 제품코드
      inbound_date, inbound_date  // 입고일자 (특정 날짜)
    ];

    const result = await mariadb.query('getInboundCompletedList', params);
    console.log(`입고 완료 목록 조회 완료: ${result.length}건`);
    
    // 완료 목록 요약 정보
    if (result.length > 0) {
      const statusSummary = result.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});
      console.log('상태별 요약:', statusSummary);
      
      console.log('조회된 완료 데이터 샘플:', {
        총건수: result.length,
        첫번째항목: {
          lot_num: result[0].lot_num,
          product_code: result[0].product_code,
          product_name: result[0].product_name,
          inbound_date: result[0].inbound_date,
          status: result[0].status
        }
      });
    }
    
    return result;
  } catch (err) {
    console.error('입고 완료 목록 조회 오류:', err);
    throw err;
  }
};

// 제품 입고 처리 (LOT 번호 순차적 생성)
const processInbound = async (inboundData) => {
  try {
    const {
      result_id,
      product_code,
      inbound_qty,
      manufacture_datetime,
      work_order_no
    } = inboundData;

    console.log('=== 입고 처리 시작 ===');
    console.log('입고 데이터:', inboundData);
    console.log('입고 처리 전 포장공정 완료 상태 검증됨');

    // 입력값 검증
    if (!result_id || !product_code || !inbound_qty || !manufacture_datetime || !work_order_no) {
      throw new Error('필수 입력값이 누락되었습니다.');
    }

    if (inbound_qty <= 0) {
      throw new Error('입고 수량은 0보다 커야 합니다.');
    }

    // 날짜 계산
    const manufactureDate = new Date(manufacture_datetime);
    const expiryDate = new Date(manufactureDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 3); // 3년 추가

    console.log('제조일자:', manufactureDate.toISOString().split('T')[0]);
    console.log('유통기한:', expiryDate.toISOString().split('T')[0]);

    // 사용가능 여부 판단
    const currentDate = new Date();
    const status = expiryDate > currentDate ? '사용가능' : '유통기한초과';
    console.log('상태:', status);

    // 오늘 날짜 기준 LOT 번호 패턴 생성
    const today = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const lotPattern = `LOT${today}`;
    console.log('오늘 LOT 패턴:', lotPattern);

    // product_lot 테이블에 INSERT (LOT 번호 순차적 생성)
    const insertParams = [
      product_code,                                 // 1. product_code
      manufactureDate.toISOString().split('T')[0],  // 2. manufacture_date
      expiryDate.toISOString().split('T')[0],       // 3. expiry_date
      parseInt(inbound_qty),                        // 4. quantity
      new Date(),                                   // 5. inbound_date
      status,                                       // 6. status
      result_id                                     // 7. result_id
    ];

    console.log('INSERT 파라미터 (7개):', insertParams);
    console.log('파라미터 상세:', {
      1: `product_code: ${insertParams[0]}`,
      2: `manufacture_date: ${insertParams[1]}`,
      3: `expiry_date: ${insertParams[2]}`,
      4: `quantity: ${insertParams[3]}`,
      5: `inbound_date: ${insertParams[4]}`,
      6: `status: ${insertParams[5]}`,
      7: `result_id: ${insertParams[6]}`
    });

    await mariadb.query('insertProductInbound', insertParams);
    console.log('product_lot 테이블 INSERT 완료 (순차적 LOT 번호 생성)');

    // 입고 결과 조회 및 확인 (생성된 LOT 번호 포함)
    const result = await mariadb.query('getInboundResult', [result_id, product_code]);
    console.log('입고 결과 조회:', result);

    const generatedLotNumber = result && result.length > 0 ? result[0].lot_num : null;
    console.log('생성된 순차적 LOT 번호:', generatedLotNumber);

    // LOT 번호 패턴 검증
    if (generatedLotNumber && generatedLotNumber.startsWith(lotPattern)) {
      const sequenceNumber = generatedLotNumber.split('-')[1];
      console.log('✅ LOT 번호 생성 성공:', {
        pattern: lotPattern,
        sequence: sequenceNumber,
        full_lot: generatedLotNumber
      });
    } else {
      console.warn('⚠️ LOT 번호 패턴이 예상과 다름:', generatedLotNumber);
    }

    console.log('=== 입고 처리 완료 ===');

    return {
      success: true,
      message: '포장공정 완료 제품 입고 처리 완료',
      lot_number: generatedLotNumber,  // 순차적으로 생성된 LOT 번호 반환
      work_order_no: work_order_no,
      lot_pattern: lotPattern,         // 오늘 LOT 패턴 정보
      data: result && result.length > 0 ? result[0] : null
    };

  } catch (err) {
    console.error('=== 제품 입고 처리 오류 ===');
    console.error('오류 상세 정보:');
    console.error('- 오류 타입:', typeof err);
    console.error('- 오류 생성자:', err?.constructor?.name);
    console.error('- 오류 메시지:', err?.message);
    console.error('- SQL 메시지:', err?.sqlMessage);  
    console.error('- 오류 코드:', err?.code);
    console.error('- errno:', err?.errno);
    console.error('- 전체 오류 객체:', err);
    
    // 구체적인 에러 분류 및 사용자 친화적 메시지 생성
    let userErrorMessage = '입고 처리 중 오류가 발생했습니다.';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      if (err?.sqlMessage?.includes('lot_num') || err?.message?.includes('lot_num')) {
        userErrorMessage = 'LOT 번호 생성 중 중복이 발생했습니다. 다시 시도해주세요.';
        errorCode = 'DUPLICATE_LOT_NUMBER';
      } else {
        userErrorMessage = '이미 입고 처리된 제품입니다.';
        errorCode = 'ALREADY_PROCESSED';
      }
    } else if (err?.message) {
      userErrorMessage = err.message;
      errorCode = err.code || 'APPLICATION_ERROR';
    } else if (err?.sqlMessage) {
      userErrorMessage = `데이터베이스 오류: ${err.sqlMessage}`;
      errorCode = 'SQL_ERROR';
    }
    
    // 에러 객체 새로 생성해서 던지기
    const processedError = new Error(userErrorMessage);
    processedError.code = errorCode;
    processedError.originalError = err;
    
    console.error('가공된 에러:', {
      message: processedError.message,
      code: processedError.code
    });
    
    throw processedError;
  }
};

// 입고 이력 조회 (범위 검색 유지)
const getInboundHistory = async (searchParams = {}) => {
  try {
    const {
      lot_num = '',
      product_name = '',
      start_date = '',
      end_date = ''
    } = searchParams;

    console.log('입고 이력 조회 파라미터:', searchParams);

    const params = [
      lot_num, lot_num,           // LOT 번호
      product_name, product_name, // 제품명
      start_date, start_date,     // 시작일
      end_date, end_date          // 종료일
    ];

    const result = await mariadb.query('getInboundHistory', params);
    console.log(`입고 이력 조회 완료: ${result.length}건`);
    
    return result;
  } catch (err) {
    console.error('입고 이력 조회 오류:', err);
    throw err;
  }
};

// 입고 상태 확인
const checkInboundStatus = async (result_id, product_code) => {
  try {
    console.log(`입고 상태 확인 - result_id: ${result_id}, product_code: ${product_code}`);
    
    const result = await mariadb.query('checkInboundStatus', [result_id, product_code]);
    const status = result && result.length > 0 ? result[0].inbound_status : '입고대기';
    
    console.log('입고 상태:', status);
    return status;
  } catch (err) {
    console.error('입고 상태 확인 오류:', err);
    return '입고대기';
  }
};

// 다중 제품 입고 처리 (포장공정 완료 조건 적용)
const processMultipleInbound = async (products) => {
  try {
    console.log('=== 다중 제품 입고 처리 시작 ===');
    console.log(`처리할 제품 수: ${products.length}개`);
    console.log('포장공정 완료 조건 적용: 모든 제품은 이미 포장공정 완료된 상태');

    const results = [];
    const errors = [];

    // 각 제품별로 순차 처리
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`\n--- 제품 ${i + 1}/${products.length} 처리 중 ---`);
      console.log('처리할 제품:', product);
      
      try {
        const result = await processInbound(product);
        results.push({
          index: i,
          product_code: product.product_code,
          result_id: product.result_id,
          success: true,
          lot_number: result.lot_number,
          message: result.message
        });
        console.log(`✅ 포장공정 완료 제품 ${product.product_code} 입고 성공, LOT: ${result.lot_number}`);
        
      } catch (err) {
        console.error(`❌ 제품 ${product.product_code} 입고 실패:`, err);
        
        // 간단하고 확실한 에러 메시지 추출
        let errorMessage = '알 수 없는 오류가 발생했습니다.';
        let errorCode = 'UNKNOWN_ERROR';
        
        if (err && err.message && typeof err.message === 'string') {
          errorMessage = err.message;
          errorCode = err.code || 'APPLICATION_ERROR';
        } else if (err && typeof err === 'string') {
          errorMessage = err;
          errorCode = 'STRING_ERROR';
        } else {
          errorMessage = `에러 처리 실패: ${typeof err}`;
          errorCode = 'PROCESSING_ERROR';
        }
        
        const errorObj = {
          index: i,
          product_code: product.product_code,
          result_id: product.result_id,
          success: false,
          error: errorMessage,
          error_code: errorCode
        };
        
        errors.push(errorObj);
        console.error('처리된 에러:', errorObj);
      }
    }

    console.log('=== 다중 제품 입고 처리 완료 ===');
    console.log(`성공: ${results.length}건, 실패: ${errors.length}건`);
    
    // 상세 결과 로깅
    if (results.length > 0) {
      console.log('성공한 포장공정 완료 제품들:');
      results.forEach(result => {
        console.log(`  - ${result.product_code}: ${result.lot_number}`);
      });
    }
    
    if (errors.length > 0) {
      console.log('실패한 제품들:');
      errors.forEach(error => {
        console.log(`  - ${error.product_code}: ${error.error}`);
      });
    }

    return {
      total: products.length,
      success_count: results.length,
      error_count: errors.length,
      results,
      errors
    };

  } catch (err) {
    console.error('다중 제품 입고 처리 시스템 오류:', err);
    throw err;
  }
};

module.exports = {
  // 조회 관련
  getInboundWaitingList,      // 포장공정 완료 조건 + 특정 날짜 검색
  getInboundCompletedList,    // 특정 날짜 검색
  getInboundHistory,          // 범위 검색 (기존 유지)
  checkInboundStatus,

  // 처리 관련
  processInbound,             // 순차적 LOT 번호 생성
  processMultipleInbound      // 다중 입고 처리 (포장공정 완료 조건 적용)
};