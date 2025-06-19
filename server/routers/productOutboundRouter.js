const express = require('express');
const router = express.Router();
const productOutboundService = require('../services/productOutboundService');

// ========== 출고 대기 목록 조회 ==========
router.get('/waiting-list', async (req, res) => {
  try {
    console.log('=== 출고 대기 목록 조회 API 호출 ===');
    console.log('req.query:', req.query);
    
    const searchParams = {
      client_name: req.query.client_name || '',
      product_name: req.query.product_name || '',
      order_date_start: req.query.order_date_start || '',
      order_date_end: req.query.order_date_end || '',
      delivery_date_start: req.query.delivery_date_start || '',
      delivery_date_end: req.query.delivery_date_end || ''
    };

    console.log('Search params:', searchParams);
    const result = await productOutboundService.getOutboundWaitingList(searchParams);
    
    console.log(`조회 결과: ${result.length}건`);
    res.json({
      success: true,
      data: result,
      count: result.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('출고 대기 목록 조회 오류:', err);
    res.status(500).json({
      success: false,
      error: '출고 대기 목록 조회에 실패했습니다.',
      error_code: 'GET_WAITING_LIST_FAILED',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== 주문 상세 정보 조회 ==========
router.get('/order-details/:orderId', async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      error: '주문 ID가 필요합니다.',
      error_code: 'MISSING_ORDER_ID',
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log('=== 주문 상세 정보 조회 API 호출 ===');
    console.log('Order ID:', orderId);
    
    const result = await productOutboundService.getOrderDetails(orderId);
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: '해당 주문이 존재하지 않습니다.',
        error_code: 'ORDER_NOT_FOUND',
        order_id: orderId,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: result,
      order_id: orderId,
      count: result.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('주문 상세 정보 조회 오류:', err);
    res.status(500).json({
      success: false,
      error: '주문 상세 정보 조회에 실패했습니다.',
      error_code: 'GET_ORDER_DETAILS_FAILED',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== 출고 완료 목록 조회 ==========
router.get('/completed-list', async (req, res) => {
  try {
    console.log('=== 출고 완료 목록 조회 API 호출 ===');
    console.log('req.query:', req.query);

    const searchParams = {
      client_name: req.query.client_name || '',
      product_name: req.query.product_name || '',
      outbound_date_start: req.query.outbound_date_start || '',
      outbound_date_end: req.query.outbound_date_end || ''
    };

    console.log('Search params:', searchParams);
    const result = await productOutboundService.getOutboundCompletedList(searchParams);
    
    console.log(`조회 결과: ${result.length}건`);
    res.json({
      success: true,
      data: result,
      count: result.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('출고 완료 목록 조회 오류:', err);
    res.status(500).json({
      success: false,
      error: '출고 완료 목록 조회에 실패했습니다.',
      error_code: 'GET_COMPLETED_LIST_FAILED',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== 출고 상태 확인 ==========
router.get('/status/:orderId', async (req, res) => {
  const { orderId } = req.params;
  
  if (!orderId) {
    return res.status(400).json({
      success: false,
      error: '주문 ID가 필요합니다.',
      error_code: 'MISSING_ORDER_ID',
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log('=== 출고 상태 확인 API 호출 ===');
    console.log('Order ID:', orderId);
    
    const status = await productOutboundService.checkOutboundStatus(orderId);
    
    res.json({
      success: true,
      order_id: orderId,
      outbound_status: status,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('출고 상태 확인 오류:', err);
    res.status(500).json({
      success: false,
      error: '출고 상태 확인에 실패했습니다.',
      error_code: 'CHECK_STATUS_FAILED',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== 재고 부족 여부 확인 (기존 - 주문 ID 기반) ==========
router.post('/check-inventory', async (req, res) => {
  const { order_ids } = req.body;

  if (!Array.isArray(order_ids) || order_ids.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'order_ids 배열이 필요합니다.',
      error_code: 'INVALID_ORDER_IDS',
      received: req.body,
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log('=== 재고 부족 여부 확인 API 호출 ===');
    console.log('Order IDs:', order_ids);

    let hasShortage = false;
    const shortage_items = [];

    for (const id of order_ids) {
      const { has_shortage, shortage_items: items } = await productOutboundService.checkInventoryAvailable(id);
      if (has_shortage) {
        hasShortage = true;
        shortage_items.push(...items);
      }
    }

    res.json({
      success: true,
      has_shortage: hasShortage,
      shortage_items,
      checked_orders: order_ids.length,
      shortage_count: shortage_items.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('재고 부족 확인 오류:', err);
    res.status(500).json({
      success: false,
      error: '재고 부족 확인 중 오류가 발생했습니다.',
      error_code: 'CHECK_INVENTORY_FAILED',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== ✅ 선택된 제품들의 재고 부족 여부 확인 (신규) ==========
router.post('/check-selected-inventory', async (req, res) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'products 배열이 필요합니다.',
      error_code: 'INVALID_PRODUCTS_ARRAY',
      received: req.body,
      timestamp: new Date().toISOString()
    });
  }

  // 각 제품의 필수 필드 검증
  const requiredFields = ['product_code', 'quantity'];
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const missingFields = requiredFields.filter(field => !product[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `제품 [${i}]에 다음 필드들이 필요합니다: ${missingFields.join(', ')}`,
        error_code: 'MISSING_PRODUCT_FIELDS',
        product_index: i,
        missing_fields: missingFields,
        invalid_product: product,
        timestamp: new Date().toISOString()
      });
    }
  }

  try {
    console.log('=== 선택된 제품들 재고 부족 여부 확인 API 호출 ===');
    console.log('Products:', products);

    const result = await productOutboundService.checkSelectedProductsInventory(products);

    res.json({
      success: true,
      has_shortage: result.has_shortage,
      shortage_items: result.shortage_items,
      checked_products: products.length,
      shortage_count: result.shortage_items.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('선택된 제품들 재고 확인 오류:', err);
    res.status(500).json({
      success: false,
      error: '선택된 제품들 재고 확인 중 오류가 발생했습니다.',
      error_code: 'CHECK_SELECTED_INVENTORY_FAILED',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== 단일 제품 출고 처리 ==========
router.post('/process-product', async (req, res) => {
  const { product, employee_id, notes = '' } = req.body;

  if (!product || typeof product !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'product 객체가 필요합니다.',
      error_code: 'INVALID_PRODUCT_OBJECT',
      received: req.body,
      timestamp: new Date().toISOString()
    });
  }

  if (!employee_id) {
    return res.status(400).json({
      success: false,
      error: 'employee_id가 필요합니다.',
      error_code: 'MISSING_EMPLOYEE_ID',
      timestamp: new Date().toISOString()
    });
  }

  const requiredFields = ['order_id', 'order_detail_id', 'product_code', 'quantity'];
  const missingFields = requiredFields.filter(field => !product[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `제품에 다음 필드들이 필요합니다: ${missingFields.join(', ')}`,
      error_code: 'MISSING_PRODUCT_FIELDS',
      missing_fields: missingFields,
      received_product: product,
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log('=== 단일 제품 출고 처리 API 호출 ===');
    console.log('Product:', product);
    console.log('Employee ID:', employee_id);

    const result = await productOutboundService.processProductOutbound(product, employee_id, notes);

    res.status(201).json({
      success: true,
      message: '제품 출고가 성공적으로 완료되었습니다.',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('단일 제품 출고 처리 오류:', err);
    
    // 재고 부족 등의 비즈니스 로직 에러
    if (err.message.includes('재고 부족') || err.message.includes('LOT이 없습니다')) {
      return res.status(400).json({
        success: false,
        error: err.message,
        error_code: 'INSUFFICIENT_INVENTORY',
        product_code: product.product_code,
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      success: false,
      error: '제품 출고 처리 중 오류가 발생했습니다.',
      error_code: 'PROCESS_PRODUCT_FAILED',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== 선택된 제품 일괄 출고 처리 (개선됨) ==========
router.post('/process-products', async (req, res) => {
  const { products, employee_id, notes = '' } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'products 배열이 필요합니다.',
      error_code: 'INVALID_PRODUCTS_ARRAY',
      received: req.body,
      timestamp: new Date().toISOString()
    });
  }

  if (!employee_id) {
    return res.status(400).json({
      success: false,
      error: 'employee_id가 필요합니다.',
      error_code: 'MISSING_EMPLOYEE_ID',
      timestamp: new Date().toISOString()
    });
  }

  // 각 제품의 필수 필드 검증
  const requiredFields = ['order_id', 'order_detail_id', 'product_code', 'quantity'];
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const missingFields = requiredFields.filter(field => !product[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `제품 [${i}]에 다음 필드들이 필요합니다: ${missingFields.join(', ')}`,
        error_code: 'INVALID_PRODUCT_FIELDS',
        product_index: i,
        missing_fields: missingFields,
        invalid_product: product,
        timestamp: new Date().toISOString()
      });
    }
  }

  try {
    console.log('=== 선택된 제품 일괄 출고 처리 API 호출 ===');
    console.log('Products count:', products.length);
    console.log('Employee ID:', employee_id);
    console.log('Selected products:', products.map(p => `${p.product_code}(${p.quantity})`));

    const result = await productOutboundService.processSelectedProducts(products, employee_id, notes);

    // 응답 상태 코드 결정
    let statusCode = 201; // 전체 성공
    if (result.error_count > 0 && result.success_count > 0) {
      statusCode = 206; // 부분 성공
    } else if (result.error_count > 0 && result.success_count === 0) {
      statusCode = 400; // 전체 실패
    }

    // ✅ 재고 부족으로 실패한 경우 특별 처리
    if (!result.success && result.shortage_items) {
      return res.status(400).json({
        success: false,
        message: result.message,
        error_code: 'INSUFFICIENT_INVENTORY',
        shortage_items: result.shortage_items,
        summary: {
          total: result.total,
          success: result.success_count,
          failure: result.error_count,
          success_rate: '0.0%'
        },
        results: result.results,
        timestamp: new Date().toISOString()
      });
    }

    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      summary: {
        total: result.total,
        success: result.success_count,
        failure: result.error_count,
        success_rate: `${((result.success_count / result.total) * 100).toFixed(1)}%`
      },
      results: result.results,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('일괄 출고 처리 오류:', err);
    
    res.status(500).json({
      success: false,
      error: '일괄 출고 처리 중 시스템 오류가 발생했습니다.',
      error_code: 'PROCESS_PRODUCTS_FAILED',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ========== API 연결 테스트 ==========
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '제품 출고 관리 API가 정상적으로 작동합니다.',
    timestamp: new Date().toISOString(),
    version: 'v4.0',
    features: [
      '트랜잭션 기반 안전한 출고 처리',
      '다중 LOT FIFO 처리',
      '선택적 제품 출고 처리', // ✅ 새로 추가된 기능
      '개별 제품 재고 체크',   // ✅ 새로 추가된 기능
      '일괄 출고 처리',
      '재고 부족 사전 체크',
      '개선된 에러 처리'
    ],
    available_endpoints: [
      'GET /productOutbound/waiting-list - 출고 대기 목록 조회',
      'GET /productOutbound/order-details/:orderId - 주문 상세 정보 조회',
      'GET /productOutbound/completed-list - 출고 완료 목록 조회',
      'GET /productOutbound/status/:orderId - 출고 상태 확인',
      'POST /productOutbound/check-inventory - 재고 부족 여부 확인 (주문별)',
      'POST /productOutbound/check-selected-inventory - 선택된 제품 재고 확인', // ✅ 새로 추가
      'POST /productOutbound/process-product - 단일 제품 출고 처리',
      'POST /productOutbound/process-products - 일괄 제품 출고 처리',
      'GET /productOutbound/test - API 테스트'
    ]
  });
});

// ========== 헬스 체크 ==========
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'product-outbound-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;