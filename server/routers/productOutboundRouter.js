// server/routers/productOutboundRouter.js - 제품 출고 관리 라우터

const express = require('express');
const router = express.Router();
const productOutboundService = require('../services/productOutboundService');

// ========== 조회 API ==========

// [GET] /productOutbound/waiting-list - 출고 대기 목록 조회 (특정 날짜 검색)
router.get('/waiting-list', async (req, res) => {
  try {
    console.log('=== 출고 대기 목록 조회 API 호출 ===');
    
    const {
      product_name = '',
      product_code = '',
      delivery_date = ''  // 특정 날짜 추가
    } = req.query;

    const searchParams = {
      product_name,
      product_code,
      delivery_date
    };

    console.log('검색 파라미터:', searchParams);

    const result = await productOutboundService.getOutboundWaitingList(searchParams);
    
    console.log(`조회 결과: ${result.length}건`);
    
    // 주문별 요약 정보
    if (result.length > 0) {
      const clientSummary = result.reduce((acc, item) => {
        acc[item.client_name] = (acc[item.client_name] || 0) + 1;
        return acc;
      }, {});
      console.log('거래처별 요약:', clientSummary);
    }
    
    res.json(result);
  } catch (err) {
    console.error('출고 대기 목록 조회 API 오류:', err);
    res.status(500).json({ 
      error: '출고 대기 목록 조회에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productOutbound/order-details/:orderId - 주문 상세 정보 조회 (모달용)
router.get('/order-details/:orderId', async (req, res) => {
  try {
    console.log('=== 주문 상세 정보 조회 API 호출 ===');
    
    const { orderId } = req.params;
    
    console.log(`조회 대상 - order_id: ${orderId}`);
    
    const result = await productOutboundService.getOrderDetails(orderId);
    
    console.log(`주문 상세 조회 결과: ${result.length}건의 제품`);
    
    res.json(result);
  } catch (err) {
    console.error('주문 상세 정보 조회 API 오류:', err);
    res.status(500).json({ 
      error: '주문 상세 정보 조회에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productOutbound/processing-list - 출고 진행 중 목록 조회
router.get('/processing-list', async (req, res) => {
  try {
    console.log('=== 출고 진행 중 목록 조회 API 호출 ===');
    
    const {
      outbound_number = '',
      product_name = '',
      outbound_date = ''
    } = req.query;

    const searchParams = {
      outbound_number,
      product_name,
      outbound_date
    };

    console.log('검색 파라미터:', searchParams);

    const result = await productOutboundService.getOutboundProcessingList(searchParams);
    
    console.log(`출고 진행 중 목록 조회 결과: ${result.length}건`);
    
    res.json(result);
  } catch (err) {
    console.error('출고 진행 중 목록 조회 API 오류:', err);
    res.status(500).json({ 
      error: '출고 진행 중 목록 조회에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productOutbound/completed-list - 출고 완료 목록 조회
router.get('/completed-list', async (req, res) => {
  try {
    console.log('=== 출고 완료 목록 조회 API 호출 ===');
    
    const {
      outbound_number = '',
      product_name = '',
      outbound_date = ''
    } = req.query;

    const searchParams = {
      outbound_number,
      product_name,
      outbound_date
    };

    console.log('검색 파라미터:', searchParams);

    const result = await productOutboundService.getOutboundCompletedList(searchParams);
    
    console.log(`출고 완료 목록 조회 결과: ${result.length}건`);
    
    res.json(result);
  } catch (err) {
    console.error('출고 완료 목록 조회 API 오류:', err);
    res.status(500).json({ 
      error: '출고 완료 목록 조회에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productOutbound/details/:outboundId - 출고 상세 정보 조회
router.get('/details/:outboundId', async (req, res) => {
  try {
    console.log('=== 출고 상세 정보 조회 API 호출 ===');
    
    const { outboundId } = req.params;
    
    console.log(`조회 대상 - outbound_id: ${outboundId}`);
    
    const result = await productOutboundService.getOutboundDetails(outboundId);
    
    res.json(result);
  } catch (err) {
    console.error('출고 상세 정보 조회 API 오류:', err);
    res.status(500).json({ 
      error: '출고 상세 정보 조회에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productOutbound/status/:orderId - 출고 상태 확인
router.get('/status/:orderId', async (req, res) => {
  try {
    console.log('=== 출고 상태 확인 API 호출 ===');
    
    const { orderId } = req.params;
    
    console.log(`확인 대상 - order_id: ${orderId}`);
    
    const status = await productOutboundService.checkOutboundStatus(orderId);
    
    res.json({ 
      success: true,
      order_id: orderId,
      outbound_status: status 
    });
  } catch (err) {
    console.error('출고 상태 확인 API 오류:', err);
    res.status(500).json({ 
      error: '출고 상태 확인에 실패했습니다.',
      details: err.message 
    });
  }
});

// ========== 처리 API ==========

// [POST] /productOutbound/process - 출고 처리 (다중 주문 지원)
router.post('/process', async (req, res) => {
  try {
    console.log('=== 출고 처리 API 호출 ===');
    console.log('요청 데이터:', req.body);
    
    const {
      order_ids,
      outbound_date,
      employee_id,
      notes = ''
    } = req.body;

    // 필수 필드 검증
    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      console.log('주문 ID 배열 누락');
      return res.status(400).json({
        error: '출고할 주문을 선택해주세요.',
        required_fields: ['order_ids (배열)'],
        received: req.body
      });
    }

    if (!outbound_date || !employee_id) {
      console.log('필수 필드 누락');
      return res.status(400).json({
        error: '필수 정보가 누락되었습니다.',
        required_fields: ['order_ids', 'outbound_date', 'employee_id'],
        received: req.body
      });
    }

    const outboundData = {
      order_ids,
      outbound_date,
      employee_id,
      notes
    };

    console.log('처리할 출고 데이터:', outboundData);

    const result = await productOutboundService.processOutbound(outboundData);
    
    console.log('출고 처리 성공:', result);
    
    const response = {
      ...result,
      timestamp: new Date().toISOString(),
      processing_info: {
        order_count: order_ids.length,
        order_ids: order_ids,
        outbound_date,
        employee_id
      }
    };
    
    res.status(201).json(response);
    
  } catch (err) {
    console.error('출고 처리 API 오류:', err);
    
    // 재고 부족 에러 처리
    if (err.code === 'INVENTORY_SHORTAGE') {
      res.status(409).json({
        error: err.message,
        error_code: 'INVENTORY_SHORTAGE',
        suggestion: '재고를 확인한 후 다시 시도해주세요.'
      });
    } 
    // 이미 출고 처리된 주문 에러 처리
    else if (err.code === 'ALREADY_PROCESSED') {
      res.status(409).json({
        error: err.message,
        error_code: 'ALREADY_PROCESSED',
        suggestion: '출고 진행 중 목록에서 확인해주세요.'
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
        error: '출고 처리 중 오류가 발생했습니다.',
        error_code: 'PROCESSING_ERROR',
        details: err.message
      });
    }
  }
});

// [PUT] /productOutbound/complete/:outboundId - 출고 완료 처리
router.put('/complete/:outboundId', async (req, res) => {
  try {
    console.log('=== 출고 완료 처리 API 호출 ===');
    
    const { outboundId } = req.params;
    
    console.log(`완료 처리 대상 - outbound_id: ${outboundId}`);
    
    const result = await productOutboundService.completeOutbound(outboundId);
    
    console.log('출고 완료 처리 성공:', result);
    
    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('출고 완료 처리 API 오류:', err);
    res.status(500).json({ 
      error: '출고 완료 처리에 실패했습니다.',
      error_code: 'COMPLETION_ERROR',
      details: err.message 
    });
  }
});

// ========== 유틸리티 API ==========

// [POST] /productOutbound/check-inventory - 재고 부족 체크
router.post('/check-inventory', async (req, res) => {
  try {
    console.log('=== 재고 부족 체크 API 호출 ===');
    
    const { order_ids } = req.body;
    
    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({
        error: '주문 ID 배열이 필요합니다.',
        received: req.body
      });
    }
    
    console.log('체크할 주문 IDs:', order_ids);
    
    const shortageItems = await productOutboundService.checkInventoryAvailable(order_ids);
    
    res.json({
      success: true,
      has_shortage: shortageItems.length > 0,
      shortage_count: shortageItems.length,
      shortage_items: shortageItems
    });
    
  } catch (err) {
    console.error('재고 부족 체크 API 오류:', err);
    res.status(500).json({ 
      error: '재고 부족 체크에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productOutbound/test - API 연결 테스트
router.get('/test', async (req, res) => {
  try {
    console.log('=== 제품 출고 API 테스트 호출 ===');
    
    res.json({
      success: true,
      message: '제품 출고 관리 API가 정상적으로 작동합니다.',
      timestamp: new Date().toISOString(),
      version: '1.0',
      features: {
        multiple_order_outbound: true,
        fifo_inventory_management: true,
        specific_date_search: true,
        inventory_shortage_check: true
      },
      available_endpoints: [
        'GET /productOutbound/waiting-list',
        'GET /productOutbound/order-details/:orderId',
        'GET /productOutbound/processing-list',
        'GET /productOutbound/completed-list',
        'GET /productOutbound/details/:outboundId',
        'GET /productOutbound/status/:orderId',
        'POST /productOutbound/process',
        'PUT /productOutbound/complete/:outboundId',
        'POST /productOutbound/check-inventory',
        'GET /productOutbound/test'
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