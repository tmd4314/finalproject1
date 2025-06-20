// server/services/productOutboundService.js - 주문 상태 자동 업데이트 기능 추가 (완전한 버전)

const mapper = require('../database/mapper');

// 기존 쿼리와 호환되도록 파라미터 처리 (빈 문자열 유지)
const prepareSearchParamsLegacy = (searchParams) => {
  const {
    client_name = '',
    product_name = '',
    order_date_start = '',
    order_date_end = '',
    delivery_date_start = '',
    delivery_date_end = ''
  } = searchParams;
  
  return [
    client_name, client_name, client_name,
    product_name, product_name, product_name,
    order_date_start, order_date_start, order_date_start,
    order_date_end, order_date_end, order_date_end,
    delivery_date_start, delivery_date_start, delivery_date_start,
    delivery_date_end, delivery_date_end, delivery_date_end
  ];
};

const prepareCompletedSearchParamsLegacy = (searchParams) => {
  const {
    client_name = '',
    product_name = '',
    outbound_date_start = '',
    outbound_date_end = ''
  } = searchParams;
  
  return [
    client_name, client_name, client_name,
    product_name, product_name, product_name,
    outbound_date_start, outbound_date_start, outbound_date_start,
    outbound_date_end, outbound_date_end, outbound_date_end
  ];
};

// 출고 대기 목록 조회
const getOutboundWaitingList = async (searchParams = {}) => {
  try {
    const params = prepareSearchParamsLegacy(searchParams);
    console.log('[getOutboundWaitingList] Prepared Params:', params);
    
    const result = await mapper.query('getOutboundWaitingList', params);
    
    // 결과 로깅 (디버깅용)
    console.log(`[getOutboundWaitingList] 조회 결과: ${result.length}건`);
    if (result.length > 0) {
      console.log('[getOutboundWaitingList] 첫 번째 레코드:', {
        order_id: result[0].order_id,
        order_number: result[0].order_number,
        client_name: result[0].client_name,
        product_name: result[0].product_name
      });
    }
    
    return result;
  } catch (err) {
    console.error('출고 대기 목록 조회 오류:', err);
    throw err;
  }
};

// 출고 완료 목록 조회
const getOutboundCompletedList = async (searchParams = {}) => {
  try {
    const params = prepareCompletedSearchParamsLegacy(searchParams);
    console.log('[getOutboundCompletedList] Prepared Params:', params);
    
    const result = await mapper.query('getOutboundCompletedList', params);
    
    // 결과 로깅 (디버깅용)
    console.log(`[getOutboundCompletedList] 조회 결과: ${result.length}건`);
    if (result.length > 0) {
      console.log('[getOutboundCompletedList] 첫 번째 레코드:', {
        outbound_code: result[0].outbound_code,
        client_name: result[0].client_name,
        product_name: result[0].product_name
      });
    }
    
    return result;
  } catch (err) {
    console.error('출고 완료 목록 조회 오류:', err);
    throw err;
  }
};

// 주문 상세 조회
const getOrderDetails = async (orderId) => {
  try {
    const result = await mapper.query('getOrderDetails', [orderId]);
    
    // 결과 로깅 (디버깅용)
    console.log(`[getOrderDetails] 주문 ${orderId} 조회 결과: ${result.length}건`);
    if (result.length > 0) {
      console.log('[getOrderDetails] 첫 번째 레코드:', {
        order_id: result[0].order_id,
        order_number: result[0].order_number,
        client_name: result[0].client_name
      });
    }
    
    return result;
  } catch (err) {
    console.error('주문 상세 조회 오류:', err);
    throw err;
  }
};

// 출고 상태 확인
const checkOutboundStatus = async (orderId) => {
  try {
    const result = await mapper.query('checkOutboundStatus', [orderId]);
    return result[0].status;
  } catch (err) {
    console.error('출고 상태 확인 오류:', err);
    throw err;
  }
};

// 재고 가능 여부 확인 (주문 전체)
const checkInventoryAvailable = async (orderId) => {
  try {
    const result = await mapper.query('checkInventoryAvailable', [orderId]);
    return {
      has_shortage: result.length > 0,
      shortage_items: result
    };
  } catch (err) {
    console.error('재고 확인 오류:', err);
    throw err;
  }
};

// 개별 제품 재고 확인 (선택적 출고용)
const checkProductInventory = async (productCode, requiredQty) => {
  try {
    console.log(`[checkProductInventory] ${productCode}, 필요수량: ${requiredQty}`);
    
    const result = await mapper.query('checkProductInventoryAvailable', [
      productCode, 
      requiredQty, 
      requiredQty, 
      productCode
    ]);
    
    return {
      has_shortage: result.length > 0,
      shortage_info: result[0] || null
    };
  } catch (err) {
    console.error('개별 제품 재고 확인 오류:', err);
    throw err;
  }
};

// 선택된 제품들만 재고 확인하는 함수
const checkSelectedProductsInventory = async (products) => {
  try {
    console.log('[checkSelectedProductsInventory] 선택된 제품들:', products);
    
    const shortageItems = [];
    
    for (const product of products) {
      const { has_shortage, shortage_info } = await checkProductInventory(
        product.product_code, 
        product.quantity
      );
      
      if (has_shortage) {
        // 제품명이 없는 경우 추가
        if (!shortage_info.product_name) {
          shortage_info.product_name = product.product_name || product.product_code;
        }
        shortageItems.push(shortage_info);
      }
    }
    
    console.log('[checkSelectedProductsInventory] 재고 부족 항목들:', shortageItems);
    
    return {
      has_shortage: shortageItems.length > 0,
      shortage_items: shortageItems
    };
  } catch (err) {
    console.error('선택된 제품들 재고 확인 오류:', err);
    throw err;
  }
};

// 출고 코드 생성
const generateOutboundCode = async (date) => {
  try {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const result = await mapper.query('getNextOutboundNumber', [dateStr]);
    const nextNum = result[0]?.next_num ?? 1;
    return `OUT-${dateStr}-${String(nextNum).padStart(3, '0')}`;
  } catch (err) {
    console.error('출고 코드 생성 오류:', err);
    throw err;
  }
};

// ========== 새로 추가된 주문 상태 관련 함수들 ==========

// 주문이 완전 출고되었는지 확인
const checkOrderFullyShipped = async (orderId) => {
  try {
    console.log(`[checkOrderFullyShipped] 주문 ${orderId} 완전 출고 여부 확인`);
    
    const result = await mapper.query('checkOrderFullyShipped', [orderId]);
    
    if (result.length === 0) {
      console.log(`[checkOrderFullyShipped] 주문 ${orderId}를 찾을 수 없거나 이미 완료/취소됨`);
      return {
        order_id: orderId,
        is_fully_shipped: false,
        current_status: null,
        shipping_status: 'NOT_FOUND'
      };
    }
    
    const orderInfo = result[0];
    console.log(`[checkOrderFullyShipped] 주문 ${orderId} 정보:`, orderInfo);
    
    return {
      order_id: orderId,
      is_fully_shipped: orderInfo.shipping_status === 'FULLY_SHIPPED',
      current_status: orderInfo.current_status,
      shipping_status: orderInfo.shipping_status,
      total_items: orderInfo.total_items,
      shipped_items: orderInfo.shipped_items
    };
  } catch (err) {
    console.error('주문 완전 출고 확인 오류:', err);
    throw err;
  }
};

// 주문 상태를 완료로 업데이트
const updateOrderToCompleted = async (orderId) => {
  try {
    console.log(`[updateOrderToCompleted] 주문 ${orderId} 상태를 완료로 업데이트`);
    
    const result = await mapper.query('updateOrderToCompleted', [orderId]);
    
    if (result.affectedRows > 0) {
      console.log(`[updateOrderToCompleted] 주문 ${orderId} 상태 완료 업데이트 성공`);
      return {
        success: true,
        order_id: orderId,
        updated: true,
        message: '주문 상태가 완료로 업데이트되었습니다.'
      };
    } else {
      console.log(`[updateOrderToCompleted] 주문 ${orderId} 상태 업데이트 안됨 (이미 완료되었거나 조건 불충족)`);
      return {
        success: true,
        order_id: orderId,
        updated: false,
        message: '주문 상태 업데이트가 필요하지 않습니다.'
      };
    }
  } catch (err) {
    console.error('주문 상태 완료 업데이트 오류:', err);
    throw err;
  }
};

// 주문 완료 처리 (출고 후 자동 실행)
const processOrderCompletion = async (orderId) => {
  try {
    console.log(`[processOrderCompletion] 주문 ${orderId} 완료 처리 시작`);
    
    // 1. 주문이 완전 출고되었는지 확인
    const shippingCheck = await checkOrderFullyShipped(orderId);
    
    if (!shippingCheck.is_fully_shipped) {
      console.log(`[processOrderCompletion] 주문 ${orderId}는 아직 완전 출고되지 않음 (${shippingCheck.shipping_status})`);
      return {
        order_id: orderId,
        completed: false,
        reason: '아직 모든 제품이 출고되지 않음',
        shipping_status: shippingCheck.shipping_status
      };
    }
    
    // 2. 주문 상태를 완료로 업데이트
    const updateResult = await updateOrderToCompleted(orderId);
    
    console.log(`[processOrderCompletion] 주문 ${orderId} 완료 처리 결과:`, updateResult);
    
    return {
      order_id: orderId,
      completed: updateResult.updated,
      shipping_status: shippingCheck.shipping_status,
      total_items: shippingCheck.total_items,
      shipped_items: shippingCheck.shipped_items,
      message: updateResult.message
    };
    
  } catch (err) {
    console.error('주문 완료 처리 오류:', err);
    throw err;
  }
};

// ========== 업데이트된 출고 처리 함수들 ==========

// 단일 제품 출고 처리 (주문 완료 처리 추가)
const processProductOutbound = async (orderDetail, employeeId, notes = '') => {
  try {
    console.log('[processProductOutbound] 시작:', orderDetail);
    
    // 1. 개별 제품 재고 부족 체크
    const { has_shortage, shortage_info } = await checkProductInventory(
      orderDetail.product_code, 
      orderDetail.quantity
    );
    
    if (has_shortage) {
      throw new Error(`재고 부족: ${shortage_info.product_name} (${shortage_info.required_qty - shortage_info.available_qty}개 부족)`);
    }
    
    // 2. FIFO LOT 목록 조회
    const lots = await mapper.query('getFIFOLotList', [orderDetail.product_code]);
    
    if (lots.length === 0) {
      throw new Error(`사용 가능한 LOT가 없습니다: ${orderDetail.product_code}`);
    }
    
    // 3. 출고번호 생성
    const outboundDate = new Date();
    const today = outboundDate.toISOString().slice(0, 10).replace(/-/g, '');
    const nextNumResult = await mapper.query('getNextOutboundNumber', [today]);
    const nextNum = nextNumResult[0].next_num.toString().padStart(3, '0');
    const outboundCode = `OUT-${today}-${nextNum}`;
    
    let remainingQty = orderDetail.quantity;
    const outboundRecords = [];
    
    // 4. FIFO 방식으로 다중 LOT 출고 처리
    for (const lot of lots) {
      if (remainingQty <= 0) break;
      
      const outboundQty = Math.min(remainingQty, lot.quantity);
      
      // 출고 레코드 생성
      await mapper.query('insertOutbound', [
        outboundCode,
        outboundDate,
        orderDetail.order_id,
        orderDetail.order_detail_id,
        orderDetail.product_code,
        orderDetail.quantity,
        outboundQty,
        lot.lot_num,
        employeeId,
        notes
      ]);
      
      // LOT 수량 차감
      await mapper.query('updateInventoryFIFO', [outboundQty, lot.lot_num]);
      
      outboundRecords.push({
        lot_num: lot.lot_num,
        usedQty: outboundQty
      });
      
      remainingQty -= outboundQty;
    }
    
    if (remainingQty > 0) {
      throw new Error(`재고 부족으로 ${remainingQty}개를 처리할 수 없습니다.`);
    }
    
    // 5. 주문 상세 수량 갱신
    await mapper.query('updateOrderDetailQuantities', [
      orderDetail.quantity, 
      orderDetail.quantity, 
      orderDetail.order_detail_id
    ]);
    
    // ✅ 6. 주문 완료 상태 확인 및 업데이트
    let orderCompletionResult = null;
    try {
      console.log(`[processProductOutbound] 주문 ${orderDetail.order_id} 완료 상태 확인 시작`);
      orderCompletionResult = await processOrderCompletion(orderDetail.order_id);
      console.log(`[processProductOutbound] 주문 완료 처리 결과:`, orderCompletionResult);
    } catch (completionErr) {
      console.error('주문 완료 처리 중 오류 (출고는 정상 완료):', completionErr);
      // 주문 완료 처리 실패해도 출고 자체는 성공으로 처리
    }
    
    return {
      success: true,
      outbound_code: outboundCode,
      product_code: orderDetail.product_code,
      product_name: orderDetail.product_name,
      product_stand: orderDetail.product_stand,
      quantity: orderDetail.quantity,
      lots: outboundRecords,
      order_completion: orderCompletionResult,  // 주문 완료 처리 결과 추가
      message: '출고 처리가 완료되었습니다.'
    };
    
  } catch (error) {
    console.error('출고 처리 오류:', error);
    throw error;
  }
};

// 여러 제품 일괄 출고 처리 (주문 완료 처리 추가)
const processSelectedProducts = async (products, employeeId, notes = '') => {
  try {
    console.log('[processSelectedProducts] 시작:', products.length, '개 제품');
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    const processedOrders = new Set(); // 처리된 주문 ID 추적
    const orderCompletionResults = []; // 주문 완료 처리 결과들
    
    // 선택된 제품들만 재고 부족 체크
    console.log('[processSelectedProducts] 선택된 제품들 재고 체크 시작');
    const inventoryCheck = await checkSelectedProductsInventory(products);
    
    if (inventoryCheck.has_shortage) {
      // 재고 부족 정보를 상세하게 포함한 응답
      const shortageDetails = inventoryCheck.shortage_items.map(item => ({
        product_code: item.product_code,
        product_name: item.product_name,
        required_qty: item.required_qty,
        available_qty: item.available_qty,
        shortage_qty: item.required_qty - item.available_qty
      }));
      
      return {
        success: false,
        total: products.length,
        success_count: 0,
        error_count: products.length,
        message: '재고 부족으로 출고 처리를 할 수 없습니다.',
        shortage_items: shortageDetails,
        results: products.map(p => ({
          ...p,
          success: false,
          error: '재고 부족'
        }))
      };
    }
    
    // 개별 제품 출고 처리
    for (const product of products) {
      try {
        console.log(`[processSelectedProducts] 제품 ${product.product_code} 출고 시작`);
        
        const result = await processProductOutbound(product, employeeId, notes);
        results.push({ ...result, order_id: product.order_id });
        successCount++;
        
        // 주문 완료 처리 결과 수집 (중복 제거)
        if (result.order_completion && !processedOrders.has(product.order_id)) {
          processedOrders.add(product.order_id);
          orderCompletionResults.push(result.order_completion);
        }
        
        console.log(`[processSelectedProducts] 제품 ${product.product_code} 출고 완료`);
        
      } catch (err) {
        console.error(`[processSelectedProducts] 제품 ${product.product_code} 출고 실패:`, err.message);
        results.push({ 
          ...product, 
          success: false, 
          error: err.message 
        });
        errorCount++;
      }
    }
    
    // 완료된 주문 수 계산
    const completedOrdersCount = orderCompletionResults.filter(r => r.completed).length;
    
    return {
      success: errorCount === 0,
      total: products.length,
      success_count: successCount,
      error_count: errorCount,
      completed_orders_count: completedOrdersCount, // 완료된 주문 수 추가
      order_completions: orderCompletionResults,     // 주문 완료 처리 결과들 추가
      message: errorCount === 0 
        ? `${successCount}건의 출고가 성공적으로 완료되었습니다.${completedOrdersCount > 0 ? ` (${completedOrdersCount}개 주문 완료됨)` : ''}`
        : `${successCount}건 성공, ${errorCount}건 실패${completedOrdersCount > 0 ? ` (${completedOrdersCount}개 주문 완료됨)` : ''}`,
      results
    };
    
  } catch (error) {
    console.error('일괄 출고 처리 오류:', error);
    throw error;
  }
};

module.exports = {
  // 기존 함수들
  getOutboundWaitingList,
  getOutboundCompletedList,
  getOrderDetails,
  checkOutboundStatus,
  checkInventoryAvailable,
  checkProductInventory,
  checkSelectedProductsInventory,
  generateOutboundCode,
  processProductOutbound,
  processSelectedProducts,
  
  // 새로 추가된 주문 완료 처리 함수들
  checkOrderFullyShipped,
  updateOrderToCompleted,
  processOrderCompletion
};