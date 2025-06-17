// server/routers/productInboundRouter.js - 제품 입고 관리 라우터

const express = require('express');
const router = express.Router();
const productInboundService = require('../services/productInboundService');

// ========== 조회 API ==========

// [GET] /productInbound/waiting-list - 입고 대기 목록 조회 (특정 날짜 검색)
router.get('/waiting-list', async (req, res) => {
  try {
    console.log('=== 입고 대기 목록 조회 API 호출 ===');
    
    const {
      result_id = '',
      product_name = '',
      product_code = '',
      request_date = ''  // 특정 날짜 추가
    } = req.query;

    const searchParams = {
      result_id,
      product_name,
      product_code,
      request_date
    };

    console.log('검색 파라미터:', searchParams);

    const result = await productInboundService.getInboundWaitingList(searchParams);
    
    console.log(`조회 결과: ${result.length}건 (중복 제거 적용)`);
    
    // 중복 제거 상태 체크
    if (result.length > 0) {
      const uniqueKeys = new Set();
      const duplicates = [];
      
      result.forEach((item, index) => {
        const key = `${item.work_order_no}-${item.product_code}-${item.result_id}`;
        if (uniqueKeys.has(key)) {
          duplicates.push({ index, key, item: item });
        }
        uniqueKeys.add(key);
      });
      
      if (duplicates.length > 0) {
        console.warn('⚠️ 중복 데이터 발견:', duplicates.length, '건');
        console.warn('중복 상세:', duplicates);
      } else {
        console.log('✅ 중복 제거 성공: 고유 조합', uniqueKeys.size, '건');
      }
    }
    
    res.json(result);
  } catch (err) {
    console.error('입고 대기 목록 조회 API 오류:', err);
    res.status(500).json({ 
      error: '입고 대기 목록 조회에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productInbound/completed-list - 입고 완료 목록 조회 (특정 날짜 검색)
router.get('/completed-list', async (req, res) => {
  try {
    console.log('=== 입고 완료 목록 조회 API 호출 ===');
    
    const {
      lot_num = '',
      product_name = '',
      product_code = '',
      inbound_date = ''  // 특정 날짜
    } = req.query;

    const searchParams = {
      lot_num,
      product_name,
      product_code,
      inbound_date
    };

    console.log('검색 파라미터:', searchParams);

    const result = await productInboundService.getInboundCompletedList(searchParams);
    
    console.log(`입고 완료 목록 조회 결과: ${result.length}건`);
    
    // 완료 목록 요약 정보
    if (result.length > 0) {
      const statusSummary = result.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});
      console.log('상태별 요약:', statusSummary);
      
      // 날짜별 요약 정보
      if (searchParams.inbound_date) {
        console.log(`${searchParams.inbound_date} 입고 실적:`, {
          총건수: result.length,
          상태별분포: statusSummary
        });
      }
    }
    
    res.json(result);
  } catch (err) {
    console.error('입고 완료 목록 조회 API 오류:', err);
    res.status(500).json({ 
      error: '입고 완료 목록 조회에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productInbound/history - 입고 이력 조회 (범위 검색 유지)
router.get('/history', async (req, res) => {
  try {
    console.log('=== 입고 이력 조회 API 호출 ===');
    
    const {
      lot_num = '',
      product_name = '',
      start_date = '',
      end_date = ''
    } = req.query;

    const searchParams = {
      lot_num,
      product_name,
      start_date,
      end_date
    };

    console.log('검색 파라미터 (범위 검색):', searchParams);

    const result = await productInboundService.getInboundHistory(searchParams);
    
    console.log(`입고 이력 조회 결과: ${result.length}건`);
    
    // 범위 검색 요약 정보
    if (result.length > 0 && (searchParams.start_date || searchParams.end_date)) {
      console.log('기간별 이력 요약:', {
        조회기간: `${searchParams.start_date || '시작일 미지정'} ~ ${searchParams.end_date || '종료일 미지정'}`,
        총건수: result.length,
        첫번째입고일: result[result.length - 1]?.inbound_date?.split(' ')[0],
        마지막입고일: result[0]?.inbound_date?.split(' ')[0]
      });
    }
    
    res.json(result);
  } catch (err) {
    console.error('입고 이력 조회 API 오류:', err);
    res.status(500).json({ 
      error: '입고 이력 조회에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productInbound/status/:resultId/:productCode - 입고 상태 확인
router.get('/status/:resultId/:productCode', async (req, res) => {
  try {
    console.log('=== 입고 상태 확인 API 호출 ===');
    
    const { resultId, productCode } = req.params;
    
    console.log(`확인 대상 - result_id: ${resultId}, product_code: ${productCode}`);
    
    const status = await productInboundService.checkInboundStatus(resultId, productCode);
    
    res.json({ 
      success: true,
      result_id: resultId,
      product_code: productCode,
      inbound_status: status 
    });
  } catch (err) {
    console.error('입고 상태 확인 API 오류:', err);
    res.status(500).json({ 
      error: '입고 상태 확인에 실패했습니다.',
      details: err.message 
    });
  }
});

// ========== 처리 API ==========

// [POST] /productInbound/process - 단일 제품 입고 처리 (순차적 LOT 번호 생성)
router.post('/process', async (req, res) => {
  try {
    console.log('=== 단일 제품 입고 처리 API 호출 ===');
    console.log('요청 데이터:', req.body);
    
    const {
      result_id,
      product_code,
      inbound_qty,
      manufacture_datetime,
      work_order_no
    } = req.body;

    // 필수 필드 검증
    if (!result_id || !product_code || !inbound_qty || !manufacture_datetime || !work_order_no) {
      console.log('필수 필드 누락');
      return res.status(400).json({
        error: '필수 정보가 누락되었습니다.',
        required_fields: ['result_id', 'product_code', 'inbound_qty', 'manufacture_datetime', 'work_order_no'],
        received: req.body
      });
    }

    // 수량 검증
    const qty = parseInt(inbound_qty);
    if (isNaN(qty) || qty <= 0) {
      console.log('유효하지 않은 수량:', inbound_qty);
      return res.status(400).json({
        error: '입고 수량은 0보다 큰 숫자여야 합니다.',
        received_qty: inbound_qty
      });
    }

    const inboundData = {
      result_id,
      product_code,
      inbound_qty: qty,
      manufacture_datetime,
      work_order_no
    };

    console.log('처리할 입고 데이터:', inboundData);

    const result = await productInboundService.processInbound(inboundData);
    
    console.log('입고 처리 성공:', result);
    
    // 성공 응답에 추가 정보 포함
    const response = {
      ...result,
      timestamp: new Date().toISOString(),
      processing_info: {
        result_id,
        product_code,
        quantity: qty,
        generated_lot: result.lot_number
      }
    };
    
    res.status(201).json(response);
    
  } catch (err) {
    console.error('단일 제품 입고 처리 API 오류:', err);
    
    // LOT 번호 중복 에러 처리
    if (err.code === 'DUPLICATE_LOT_NUMBER') {
      res.status(409).json({
        error: err.message,
        error_code: 'DUPLICATE_LOT_NUMBER',
        retry_suggestion: '잠시 후 다시 시도해주세요.'
      });
    } 
    // 이미 입고 처리된 제품 에러 처리
    else if (err.code === 'ALREADY_PROCESSED') {
      res.status(409).json({
        error: err.message,
        error_code: 'ALREADY_PROCESSED',
        suggestion: '입고 완료 목록에서 확인해주세요.'
      });
    } 
    // 기타 중복 에러
    else if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({
        error: '중복된 데이터가 있습니다.',
        error_code: 'DUPLICATE_DATA',
        details: err.message
      });
    } 
    // 입력값 에러
    else if (err.message.includes('필수 입력값')) {
      res.status(400).json({
        error: err.message,
        error_code: 'VALIDATION_ERROR'
      });
    } 
    // 기타 서버 에러
    else {
      res.status(500).json({
        error: '입고 처리 중 오류가 발생했습니다.',
        error_code: 'PROCESSING_ERROR',
        details: err.message
      });
    }
  }
});

// [POST] /productInbound/process-multiple - 다중 제품 입고 처리
router.post('/process-multiple', async (req, res) => {
  try {
    console.log('=== 다중 제품 입고 처리 API 호출 ===');
    console.log('요청 데이터:', req.body);
    
    const { products } = req.body;

    // 입력값 검증
    if (!products || !Array.isArray(products)) {
      console.log('products 배열이 없음');
      return res.status(400).json({
        error: 'products 배열이 필요합니다.',
        received: req.body
      });
    }

    if (products.length === 0) {
      console.log('빈 products 배열');
      return res.status(400).json({
        error: '처리할 제품이 없습니다.',
        received_count: 0
      });
    }

    // 각 제품의 필수 필드 검증
    const invalidProducts = [];
    products.forEach((product, index) => {
      const { result_id, product_code, inbound_qty, manufacture_datetime, work_order_no } = product;
      if (!result_id || !product_code || !inbound_qty || !manufacture_datetime || !work_order_no) {
        invalidProducts.push({
          index,
          product,
          missing_fields: {
            result_id: !result_id,
            product_code: !product_code,
            inbound_qty: !inbound_qty,
            manufacture_datetime: !manufacture_datetime,
            work_order_no: !work_order_no
          }
        });
      }
    });

    if (invalidProducts.length > 0) {
      console.log('유효하지 않은 제품들:', invalidProducts);
      return res.status(400).json({
        error: '일부 제품에 필수 정보가 누락되었습니다.',
        invalid_products: invalidProducts
      });
    }

    console.log(`처리할 제품 수: ${products.length}개`);

    const result = await productInboundService.processMultipleInbound(products);
    
    console.log('다중 입고 처리 완료:', result);
    
    // 부분 성공인 경우 206 상태 코드 사용
    const statusCode = result.error_count > 0 ? 206 : 201;
    
    // 응답에 추가 정보 포함
    const response = {
      message: `전체 ${result.total}건 중 ${result.success_count}건 성공, ${result.error_count}건 실패`,
      timestamp: new Date().toISOString(),
      processing_summary: {
        total_requested: products.length,
        success_count: result.success_count,
        error_count: result.error_count,
        success_rate: `${((result.success_count / result.total) * 100).toFixed(1)}%`
      },
      ...result
    };
    
    res.status(statusCode).json(response);

  } catch (err) {
    console.error('다중 제품 입고 처리 API 오류:', err);
    res.status(500).json({ 
      error: '다중 제품 입고 처리 중 오류가 발생했습니다.',
      error_code: 'MULTIPLE_PROCESSING_ERROR',
      details: err.message 
    });
  }
});

// ========== 유틸리티 API ==========

// [GET] /productInbound/test - API 연결 테스트
router.get('/test', async (req, res) => {
  try {
    console.log('=== 제품 입고 API 테스트 호출 ===');
    
    res.json({
      success: true,
      message: '제품 입고 관리 API가 정상적으로 작동합니다.',
      timestamp: new Date().toISOString(),
      version: '2.0',
      features: {
        sequential_lot_generation: true,
        specific_date_search: true,
        duplicate_prevention: true,
        multiple_inbound_processing: true
      },
      available_endpoints: [
        'GET /productInbound/waiting-list',
        'GET /productInbound/completed-list',
        'GET /productInbound/history',
        'GET /productInbound/status/:resultId/:productCode',
        'POST /productInbound/process',
        'POST /productInbound/process-multiple',
        'GET /productInbound/test'
      ]
    });
  } catch (err) {
    console.error('API 테스트 오류:', err);
    res.status(500).json({ 
      error: 'API 테스트 실패',
      details: err.message 
    });
  }
});

module.exports = router;