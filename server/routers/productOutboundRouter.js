// server/routers/productOutboundRouter.js

const express = require('express');
const router = express.Router();
const productOutboundService = require('../services/productOutboundService');

// [GET] /productOutbound/waiting-list - 출고 대기 목록 조회
router.get('/waiting-list', async (req, res) => {
  try {
    const {
      order_number = '',
      product_name = '',
      order_date = ''
    } = req.query;

    const searchParams = {
      order_number,
      product_name,
      order_date
    };

    const result = await productOutboundService.getOutboundWaitingList(searchParams);
    
    res.json(result);
  } catch (err) {
    console.error('출고 대기 목록 조회 API 오류:', err);
    res.status(500).json({ 
      error: '출고 대기 목록 조회에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productOutbound/order-details/:orderId - 주문 상세 정보 조회 (출고 대기용 모달)
router.get('/order-details/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        error: '주문 ID가 필요합니다.',
        received: { orderId }
      });
    }

    const result = await productOutboundService.getOrderDetails(orderId);
    
    if (result.length === 0) {
      return res.status(404).json({
        error: '주문을 찾을 수 없습니다.',
        order_id: orderId
      });
    }
    
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
    const {
      outbound_number = '',
      product_name = '',
      request_date = ''
    } = req.query;

    const searchParams = {
      outbound_number,
      product_name,
      request_date
    };

    const result = await productOutboundService.getOutboundProcessingList(searchParams);
    
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

    const result = await productOutboundService.getOutboundCompletedList(searchParams);
    
    res.json(result);
  } catch (err) {
    console.error('출고 완료 목록 조회 API 오류:', err);
    res.status(500).json({ 
      error: '출고 완료 목록 조회에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productOutbound/outbound-details/:outboundCode - 출고 상세 정보 조회 (진행중/완료용 모달)
router.get('/outbound-details/:outboundCode', async (req, res) => {
  try {
    const { outboundCode } = req.params;

    if (!outboundCode) {
      return res.status(400).json({
        error: '출고 코드가 필요합니다.',
        received: { outboundCode }
      });
    }

    const result = await productOutboundService.getOutboundDetails(outboundCode);
    
    if (result.length === 0) {
      return res.status(404).json({
        error: '출고 정보를 찾을 수 없습니다.',
        outbound_code: outboundCode
      });
    }
    
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
    const { orderId } = req.params;
    
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

// [POST] /productOutbound/check-inventory - 재고 부족 체크
router.post('/check-inventory', async (req, res) => {
  try {
    const { order_ids } = req.body;

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({
        error: '주문 ID 목록이 필요합니다.',
        received: req.body
      });
    }

    const results = [];
    let hasOverallShortage = false;

    for (const orderId of order_ids) {
      const result = await productOutboundService.checkInventoryAvailable(orderId);
      if (result.has_shortage) {
        hasOverallShortage = true;
        results.push(...result.shortage_items);
      }
    }

    const response = {
      has_shortage: hasOverallShortage,
      shortage_items: results
    };

    res.json(response);
  } catch (err) {
    console.error('재고 부족 체크 API 오류:', err);
    res.status(500).json({ 
      error: '재고 부족 체크에 실패했습니다.',
      details: err.message 
    });
  }
});

// [POST] /productOutbound/process-single - 단일 주문 출고 처리
router.post('/process-single', async (req, res) => {
  try {
    const {
      order_id,
      employee_id,
      notes = ''
    } = req.body;

    if (!order_id || !employee_id) {
      return res.status(400).json({
        error: '주문 ID와 직원 ID가 필요합니다.',
        required_fields: ['order_id', 'employee_id'],
        received: req.body
      });
    }

    // 재고 체크
    const inventoryCheck = await productOutboundService.checkInventoryAvailable(order_id);
    if (inventoryCheck.has_shortage) {
      return res.status(400).json({
        error: '재고가 부족합니다.',
        shortage_items: inventoryCheck.shortage_items
      });
    }

    const result = await productOutboundService.processOutbound(order_id, employee_id, notes);
    
    const response = {
      ...result,
      timestamp: new Date().toISOString(),
      processing_info: {
        order_id,
        employee_id,
        generated_outbound_code: result.outbound_code
      }
    };
    
    res.status(201).json(response);
    
  } catch (err) {
    console.error('단일 주문 출고 처리 API 오류:', err);
    
    if (err.message.includes('주문 ID와 직원 ID')) {
      res.status(400).json({
        error: err.message,
        error_code: 'VALIDATION_ERROR'
      });
    } else {
      res.status(500).json({
        error: '출고 처리 중 오류가 발생했습니다.',
        error_code: 'PROCESSING_ERROR',
        details: err.message
      });
    }
  }
});

// [POST] /productOutbound/process - 다중 주문 출고 처리
router.post('/process', async (req, res) => {
  try {
    const {
      order_ids,
      employee_id,
      notes = ''
    } = req.body;

    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return res.status(400).json({
        error: '주문 ID 목록이 필요합니다.',
        received: req.body
      });
    }

    if (!employee_id) {
      return res.status(400).json({
        error: '직원 ID가 필요합니다.',
        received: req.body
      });
    }

    const result = await productOutboundService.processMultipleOutbound(order_ids, employee_id, notes);
    
    // 부분 성공인 경우 206 상태 코드 사용
    const statusCode = result.error_count > 0 ? 206 : 201;
    
    const response = {
      message: `전체 ${result.total}건 중 ${result.success_count}건 성공, ${result.error_count}건 실패`,
      timestamp: new Date().toISOString(),
      processing_summary: {
        total_requested: order_ids.length,
        success_count: result.success_count,
        error_count: result.error_count,
        success_rate: `${((result.success_count / result.total) * 100).toFixed(1)}%`
      },
      ...result
    };
    
    res.status(statusCode).json(response);

  } catch (err) {
    console.error('다중 주문 출고 처리 API 오류:', err);
    res.status(500).json({ 
      error: '다중 주문 출고 처리 중 오류가 발생했습니다.',
      error_code: 'MULTIPLE_PROCESSING_ERROR',
      details: err.message 
    });
  }
});

// [PUT] /productOutbound/complete/:outboundCode - 단일 출고 완료 처리
router.put('/complete/:outboundCode', async (req, res) => {
  try {
    const { outboundCode } = req.params;

    if (!outboundCode) {
      return res.status(400).json({
        error: '출고 코드가 필요합니다.',
        received: { outboundCode }
      });
    }

    const result = await productOutboundService.completeOutbound([outboundCode]);
    
    if (result.affected_rows === 0) {
      return res.status(404).json({
        error: '출고 완료 처리할 수 없습니다.',
        message: '해당 출고가 존재하지 않거나 이미 완료되었습니다.',
        outbound_code: outboundCode
      });
    }
    
    res.json(result);
    
  } catch (err) {
    console.error('출고 완료 처리 API 오류:', err);
    res.status(500).json({ 
      error: '출고 완료 처리에 실패했습니다.',
      details: err.message 
    });
  }
});

// [PUT] /productOutbound/complete-multiple - 다중 출고 완료 처리
router.put('/complete-multiple', async (req, res) => {
  try {
    const { outbound_codes } = req.body;

    if (!outbound_codes || !Array.isArray(outbound_codes) || outbound_codes.length === 0) {
      return res.status(400).json({
        error: '출고 코드 목록이 필요합니다.',
        received: req.body
      });
    }

    const result = await productOutboundService.completeOutbound(outbound_codes);
    
    if (result.affected_rows === 0) {
      return res.status(404).json({
        error: '출고 완료 처리할 수 없습니다.',
        message: '해당 출고들이 존재하지 않거나 이미 완료되었습니다.',
        outbound_codes: outbound_codes
      });
    }
    
    res.json(result);
    
  } catch (err) {
    console.error('다중 출고 완료 처리 API 오류:', err);
    res.status(500).json({ 
      error: '다중 출고 완료 처리에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productOutbound/test - API 연결 테스트
router.get('/test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: '제품 출고 관리 API가 정상적으로 작동합니다.',
      timestamp: new Date().toISOString(),
      version: '1.0',
      features: {
        individual_outbound_code_generation: true,
        fifo_inventory_management: true,
        multiple_order_processing: true,
        inventory_shortage_check: true
      },
      available_endpoints: [
        'GET /productOutbound/waiting-list',
        'GET /productOutbound/order-details/:orderId',
        'GET /productOutbound/processing-list',
        'GET /productOutbound/completed-list',
        'GET /productOutbound/outbound-details/:outboundCode',
        'GET /productOutbound/status/:orderId',
        'POST /productOutbound/check-inventory',
        'POST /productOutbound/process-single',
        'POST /productOutbound/process',
        'PUT /productOutbound/complete/:outboundCode',
        'PUT /productOutbound/complete-multiple',
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