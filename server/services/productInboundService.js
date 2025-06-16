// server/services/productInboundService.js - 제품 입고 관리 서비스

const mariadb = require('../database/mapper.js');

// 입고 대기 목록 조회
const getInboundWaitingList = async () => {
  try {
    console.log('입고 대기 목록 조회 시작');
    const result = await mariadb.query('getInboundWaitingList', []);
    console.log(`입고 대기 목록 조회 완료: ${result.length}건`);
    return result;
  } catch (err) {
    console.error('입고 대기 목록 조회 오류:', err);
    throw err;
  }
};

// 제품 입고 처리 (화면에서 생성된 LOT 번호 사용)
const processInbound = async (inboundData) => {
  try {
    const {
      result_id,
      product_code,
      inbound_qty,
      manufacture_datetime,
      lot_number,  // 화면에서 생성된 LOT 번호
      work_order_no  // work_order_no 추가
    } = inboundData;

    console.log('=== 입고 처리 시작 ===');
    console.log('입고 데이터:', inboundData);

    // 입력값 검증
    if (!result_id || !product_code || !inbound_qty || !manufacture_datetime || !lot_number || !work_order_no) {
      throw new Error('필수 입력값이 누락되었습니다.');
    }

    if (inbound_qty <= 0) {
      throw new Error('입고 수량은 0보다 커야 합니다.');
    }

    console.log('사용할 LOT 번호:', lot_number);
    console.log('작업지시번호:', work_order_no);
    console.log('제품코드:', product_code);

    // 날짜 계산
    const manufactureDate = new Date(manufacture_datetime);
    const expiryDate = new Date(manufactureDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 3); // 3년 추가

    console.log('제조일자:', manufactureDate.toISOString().split('T')[0]);
    console.log('유통기한:', expiryDate.toISOString().split('T')[0]);

    // 사용가능 여부 판단 (유통기한 이내인지 확인)
    const currentDate = new Date();
    const status = expiryDate > currentDate ? '사용가능' : '유통기한초과';
    console.log('상태:', status);

    // product_lot 테이블에 INSERT (화면에서 생성된 LOT 번호 사용)
    const insertParams = [
      lot_number,                                   // lot_num (화면에서 생성된 번호)
      product_code,                                 // product_code
      manufactureDate.toISOString().split('T')[0],  // manufacture_date (YYYY-MM-DD)
      expiryDate.toISOString().split('T')[0],       // expiry_date (YYYY-MM-DD)
      parseInt(inbound_qty),                        // quantity
      new Date(),                                   // inbound_date (현재 시간)
      status,                                       // status
      result_id                                     // result_id
    ];

    console.log('INSERT 파라미터:', insertParams);

    await mariadb.query('insertProductInbound', insertParams);
    console.log('product_lot 테이블 INSERT 완료');

    // 입고 결과 조회 및 확인
    const result = await mariadb.query('getInboundResult', [result_id, product_code]);
    console.log('입고 결과 조회:', result);

    console.log('=== 입고 처리 완료 ===');

    return {
      success: true,
      message: '제품 입고 처리 완료',
      lot_number: lot_number,  // 화면에서 생성된 LOT 번호 반환
      work_order_no: work_order_no,  // 작업지시번호 반환
      data: result && result.length > 0 ? result[0] : null
    };

  } catch (err) {
    console.error('=== 제품 입고 처리 오류 ===');
    console.error('오류 객체:', err);
    console.error('오류 메시지:', err.message || err.sqlMessage);
    console.error('오류 코드:', err.code || err.errno);
    
    // LOT 번호 중복 에러 특별 처리
    if ((err.code === 'ER_DUP_ENTRY' || err.errno === 1062) && 
        (err.message || err.sqlMessage || '').includes('lot_num')) {
      const duplicateError = new Error('LOT 번호가 중복되었습니다. 새로운 LOT 번호를 생성해주세요.');
      duplicateError.code = 'DUPLICATE_LOT_NUMBER';
      throw duplicateError;
    }
    
    // result_id와 product_code 조합 중복 에러 처리
    if ((err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
      const duplicateError = new Error('이미 입고 처리된 제품입니다.');
      duplicateError.code = 'ALREADY_PROCESSED';
      throw duplicateError;
    }
    
    throw err;
  }
};

// 입고 이력 조회
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



module.exports = {
  // 조회 관련
  getInboundWaitingList,
  getInboundHistory,
  checkInboundStatus,

  // 처리 관련
  processInbound,
  
};