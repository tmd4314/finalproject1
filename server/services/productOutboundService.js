// server/services/productOutboundService.js - 제품 출고 관리 서비스

const mariadb = require('../database/mapper.js');

// 출고 대기 목록 조회 (검색 기능 추가, 특정 날짜 검색)
const getOutboundWaitingList = async (searchParams = {}) => {
  try {
    const {
      product_name = '',
      product_code = '',
      delivery_date = ''  // 특정 날짜 추가
    } = searchParams;

    console.log('출고 대기 목록 조회 시작, 검색 조건:', searchParams);
    
    const params = [
      product_name, product_name,    // 제품명
      product_code, product_code,    // 제품코드
      delivery_date, delivery_date   // 납기일자 (특정 날짜)
    ];

    const result = await mariadb.query('getOutboundWaitingList', params);
    console.log(`출고 대기 목록 조회 완료: ${result.length}건`);
    
    // 조회 결과 로깅
    if (result.length > 0) {
      console.log('조회된 데이터 샘플:', {
        총건수: result.length,
        첫번째항목: {
          order_id: result[0].order_id,
          order_number: result[0].order_number,
          client_name: result[0].client_name,
          product_summary: result[0].product_summary,
          delivery_date: result[0].delivery_date
        }
      });
    }
    
    return result;
  } catch (err) {
    console.error('출고 대기 목록 조회 오류:', err);
    throw err;
  }
};

// 주문 상세 정보 조회 (모달용)
const getOrderDetails = async (orderId) => {
  try {
    console.log(`주문 상세 정보 조회 - order_id: ${orderId}`);
    
    const result = await mariadb.query('getOrderDetails', [orderId]);
    console.log(`주문 상세 조회 완료: ${result.length}건의 제품`);
    
    return result;
  } catch (err) {
    console.error('주문 상세 정보 조회 오류:', err);
    throw err;
  }
};

// 재고 부족 체크 (출고 전 검증)
const checkInventoryAvailable = async (orderIds) => {
  try {
    console.log('재고 부족 체크 시작:', orderIds);
    
    const orderIdsString = Array.isArray(orderIds) ? orderIds.join(',') : orderIds;
    const result = await mariadb.query('checkInventoryAvailable', [orderIdsString]);
    
    console.log(`재고 부족 제품: ${result.length}건`);
    
    if (result.length > 0) {
      console.log('부족 재고 상세:', result);
    }
    
    return result;
  } catch (err) {
    console.error('재고 부족 체크 오류:', err);
    throw err;
  }
};

// 출고 총계 계산
const getOutboundTotals = async (orderIds) => {
  try {
    console.log('출고 총계 계산:', orderIds);
    
    const orderIdsString = Array.isArray(orderIds) ? orderIds.join(',') : orderIds;
    const result = await mariadb.query('getOutboundTotals', [orderIdsString]);
    
    const totals = result && result.length > 0 ? result[0] : {
      total_orders: 0,
      total_products: 0,
      total_quantity: 0
    };
    
    console.log('계산된 총계:', totals);
    return totals;
  } catch (err) {
    console.error('출고 총계 계산 오류:', err);
    throw err;
  }
};

// 출고 처리 (다중 주문 지원)
const processOutbound = async (outboundData) => {
  try {
    const {
      order_ids,
      outbound_date,
      employee_id,
      notes = ''
    } = outboundData;

    console.log('=== 출고 처리 시작 ===');
    console.log('출고 데이터:', outboundData);

    // 입력값 검증
    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      throw new Error('출고할 주문을 선택해주세요.');
    }

    if (!outbound_date || !employee_id) {
      throw new Error('필수 입력값이 누락되었습니다.');
    }

    // 재고 부족 체크
    console.log('재고 부족 체크 중...');
    const shortageItems = await checkInventoryAvailable(order_ids);
    
    if (shortageItems.length > 0) {
      console.log('재고 부족 발견:', shortageItems);
      throw new Error(`재고가 부족한 제품이 있습니다: ${shortageItems.map(item => item.product_name).join(', ')}`);
    }

    // 출고 총계 계산
    const totals = await getOutboundTotals(order_ids);

    // 출고 마스터 생성
    console.log('출고 마스터 생성 중...');
    const masterParams = [
      outbound_date, outbound_date,  // 출고번호 생성용 날짜 (2번)
      outbound_date,                 // 출고일자
      totals.total_orders,           // 총 주문 수
      totals.total_products,         // 총 제품 종류
      totals.total_quantity,         // 총 출고 수량
      employee_id,                   // 담당자 ID
      notes                          // 메모
    ];

    await mariadb.query('insertOutboundMaster', masterParams);
    
    // 생성된 출고 마스터 ID 조회
    const outboundIdResult = await mariadb.query('SELECT LAST_INSERT_ID() as outbound_id');
    const outboundId = outboundIdResult[0].outbound_id;
    
    console.log('생성된 출고 ID:', outboundId);

    // 출고 상세 생성
    console.log('출고 상세 생성 중...');
    const orderIdsString = order_ids.join(',');
    await mariadb.query('insertOutboundDetail', [outboundId, orderIdsString]);

    // FIFO 방식으로 재고 차감
    console.log('FIFO 재고 차감 처리 중...');
    
    // 각 주문의 제품별로 재고 차감
    for (const orderId of order_ids) {
      const orderDetails = await getOrderDetails(orderId);
      
      for (const detail of orderDetails) {
        const { product_code, quantity } = detail;
        
        // FIFO 방식으로 재고 차감
        await mariadb.query('updateInventoryFIFO', [
          quantity,      // 차감할 수량
          product_code,  // 제품 코드
          product_code   // FIFO 조회용 제품 코드
        ]);
        
        console.log(`재고 차감 완료: ${product_code} - ${quantity}개`);
      }
    }

    // 출고 결과 조회
    const outboundResult = await mariadb.query('getOutboundDetails', [outboundId]);
    
    console.log('=== 출고 처리 완료 ===');

    return {
      success: true,
      message: '출고 처리 완료',
      outbound_id: outboundId,
      outbound_number: outboundResult[0]?.outbound_number,
      total_orders: totals.total_orders,
      total_products: totals.total_products,
      total_quantity: totals.total_quantity,
      data: outboundResult
    };

  } catch (err) {
    console.error('=== 출고 처리 오류 ===');
    console.error('오류 상세 정보:', err);
    
    // 구체적인 에러 분류 및 사용자 친화적 메시지 생성
    let userErrorMessage = '출고 처리 중 오류가 발생했습니다.';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (err?.message?.includes('재고가 부족')) {
      userErrorMessage = err.message;
      errorCode = 'INVENTORY_SHORTAGE';
    } else if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      userErrorMessage = '이미 출고 처리된 주문입니다.';
      errorCode = 'ALREADY_PROCESSED';
    } else if (err?.message) {
      userErrorMessage = err.message;
      errorCode = err.code || 'APPLICATION_ERROR';
    } else if (err?.sqlMessage) {
      userErrorMessage = `데이터베이스 오류: ${err.sqlMessage}`;
      errorCode = 'SQL_ERROR';
    }
    
    const processedError = new Error(userErrorMessage);
    processedError.code = errorCode;
    processedError.originalError = err;
    
    throw processedError;
  }
};

// 출고 진행 중 목록 조회
const getOutboundProcessingList = async (searchParams = {}) => {
  try {
    const {
      outbound_number = '',
      product_name = '',
      outbound_date = ''
    } = searchParams;

    console.log('출고 진행 중 목록 조회 시작, 검색 조건:', searchParams);
    
    const params = [
      outbound_number, outbound_number,  // 출고번호
      product_name, product_name,        // 제품명
      outbound_date, outbound_date       // 출고일자
    ];

    const result = await mariadb.query('getOutboundProcessingList', params);
    console.log(`출고 진행 중 목록 조회 완료: ${result.length}건`);
    
    return result;
  } catch (err) {
    console.error('출고 진행 중 목록 조회 오류:', err);
    throw err;
  }
};

// 출고 완료 목록 조회
const getOutboundCompletedList = async (searchParams = {}) => {
  try {
    const {
      outbound_number = '',
      product_name = '',
      outbound_date = ''
    } = searchParams;

    console.log('출고 완료 목록 조회 시작, 검색 조건:', searchParams);
    
    const params = [
      outbound_number, outbound_number,  // 출고번호
      product_name, product_name,        // 제품명
      outbound_date, outbound_date       // 출고일자
    ];

    const result = await mariadb.query('getOutboundCompletedList', params);
    console.log(`출고 완료 목록 조회 완료: ${result.length}건`);
    
    return result;
  } catch (err) {
    console.error('출고 완료 목록 조회 오류:', err);
    throw err;
  }
};

// 출고 상세 정보 조회
const getOutboundDetails = async (outboundId) => {
  try {
    console.log(`출고 상세 정보 조회 - outbound_id: ${outboundId}`);
    
    const result = await mariadb.query('getOutboundDetails', [outboundId]);
    console.log(`출고 상세 조회 완료: ${result.length}건`);
    
    return result;
  } catch (err) {
    console.error('출고 상세 정보 조회 오류:', err);
    throw err;
  }
};

// 출고 완료 처리
const completeOutbound = async (outboundId) => {
  try {
    console.log(`출고 완료 처리 - outbound_id: ${outboundId}`);
    
    const result = await mariadb.query('completeOutbound', [outboundId]);
    
    if (result.affectedRows === 0) {
      throw new Error('출고 완료 처리할 데이터가 없습니다.');
    }
    
    console.log('출고 완료 처리 성공');
    
    return {
      success: true,
      message: '출고 완료 처리 완료',
      outbound_id: outboundId
    };
  } catch (err) {
    console.error('출고 완료 처리 오류:', err);
    throw err;
  }
};

// 출고 상태 확인
const checkOutboundStatus = async (orderId) => {
  try {
    console.log(`출고 상태 확인 - order_id: ${orderId}`);
    
    const result = await mariadb.query('checkOutboundStatus', [orderId]);
    const status = result && result.length > 0 ? result[0].outbound_status : '출고대기';
    
    console.log('출고 상태:', status);
    return status;
  } catch (err) {
    console.error('출고 상태 확인 오류:', err);
    return '출고대기';
  }
};

module.exports = {
  // 조회 관련
  getOutboundWaitingList,
  getOrderDetails,
  getOutboundProcessingList,
  getOutboundCompletedList,
  getOutboundDetails,
  checkOutboundStatus,

  // 처리 관련
  processOutbound,
  completeOutbound,
  
  // 유틸리티
  checkInventoryAvailable,
  getOutboundTotals
};