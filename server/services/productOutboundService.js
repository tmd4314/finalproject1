// services/productOutboundService.js - 제품 출고 관리 서비스 (수정된 버전)

const mapper = require('../database/mapper'); // 기존 mapper 사용

class ProductOutboundService {
  
  // ========================================
  // 출고 대기 목록 조회
  // ========================================
  async getOutboundWaitingList(searchParams = {}) {
    try {
      const { order_number = '', product_name = '', order_date = '' } = searchParams;
      
      const params = [
        product_name, product_name,
        product_name, product_name,
        order_date, order_date
      ];
      
      const result = await mapper.query('getOutboundWaitingList', params);
      return result;
      
    } catch (error) {
      console.error('출고 대기 목록 조회 오류:', error);
      throw new Error('출고 대기 목록 조회에 실패했습니다.');
    }
  }

  // ========================================
  // 주문 상세 정보 조회 (출고 대기용 모달)
  // ========================================
  async getOrderDetails(orderId) {
    try {
      const result = await mapper.query('getOrderDetails', [orderId]);
      return result;
      
    } catch (error) {
      console.error('주문 상세 정보 조회 오류:', error);
      throw new Error('주문 상세 정보 조회에 실패했습니다.');
    }
  }

  // ========================================
  // 재고 부족 체크
  // ========================================
  async checkInventoryAvailable(orderId) {
    try {
      const result = await mapper.query('checkInventoryAvailable', [orderId]);
      return {
        has_shortage: result.length > 0,
        shortage_items: result
      };
      
    } catch (error) {
      console.error('재고 부족 체크 오류:', error);
      throw new Error('재고 부족 체크에 실패했습니다.');
    }
  }

  // ========================================
  // 출고 처리 (단일 주문)
  // ========================================
  async processOutbound(orderId, employeeId, notes = '') {
    try {
      // 1. 출고 총계 계산
      const totalsResult = await mapper.query('getOutboundTotals', [orderId]);
      const totals = totalsResult[0];
      
      // 2. 출고 마스터 생성
      const outboundDate = new Date().toISOString().split('T')[0];
      
      const masterParams = [
        outboundDate, outboundDate, outboundDate,
        totals.total_orders,
        totals.total_products,
        totals.total_quantity,
        employeeId,
        notes
      ];
      
      await mapper.query('insertOutboundMaster', masterParams);
      
      // 3. 생성된 출고번호 조회 (최신 것)
      const codeResult = await mapper.query('getLatestOutboundCode', [outboundDate]);
      const outboundCode = codeResult[0].outbound_code;
      
      // 4. 출고 상세 생성
      await mapper.query('insertOutboundDetail', [outboundCode, orderId]);
      
      // 5. 재고 차감 (FIFO)
      const orderDetails = await mapper.query('getOrderDetailsForInventory', [orderId]);
      
      for (const detail of orderDetails) {
        await mapper.query('updateInventoryFIFO', [
          detail.order_qty,
          detail.product_code,
          detail.product_code
        ]);
      }
      
      return {
        success: true,
        outbound_code: outboundCode,
        message: '출고 처리가 완료되었습니다.'
      };
      
    } catch (error) {
      console.error('출고 처리 오류:', error);
      throw new Error('출고 처리에 실패했습니다.');
    }
  }

  // ========================================
  // 출고 진행 중 목록 조회
  // ========================================
  async getOutboundProcessingList(searchParams = {}) {
    try {
      const { outbound_number = '', product_name = '', request_date = '' } = searchParams;
      
      const params = [
        outbound_number, outbound_number,
        product_name, product_name,
        request_date, request_date
      ];
      
      const result = await mapper.query('getOutboundProcessingList', params);
      return result;
      
    } catch (error) {
      console.error('출고 진행 중 목록 조회 오류:', error);
      throw new Error('출고 진행 중 목록 조회에 실패했습니다.');
    }
  }

  // ========================================
  // 출고 완료 목록 조회
  // ========================================
  async getOutboundCompletedList(searchParams = {}) {
    try {
      const { outbound_number = '', product_name = '', outbound_date = '' } = searchParams;
      
      const params = [
        outbound_number, outbound_number,
        product_name, product_name,
        outbound_date, outbound_date
      ];
      
      const result = await mapper.query('getOutboundCompletedList', params);
      return result;
      
    } catch (error) {
      console.error('출고 완료 목록 조회 오류:', error);
      throw new Error('출고 완료 목록 조회에 실패했습니다.');
    }
  }

  // ========================================
  // 출고 상세 정보 조회 (진행중/완료용 모달)
  // ========================================
  async getOutboundDetails(outboundCode) {
    try {
      const result = await mapper.query('getOutboundDetails', [outboundCode]);
      return result;
      
    } catch (error) {
      console.error('출고 상세 정보 조회 오류:', error);
      throw new Error('출고 상세 정보 조회에 실패했습니다.');
    }
  }

  // ========================================
  // 출고 완료 처리 (다중 선택)
  // ========================================
  async completeOutbound(outboundCodes) {
    try {
      const result = await mapper.query('completeOutbound', [outboundCodes]);
      
      return {
        success: true,
        affected_rows: result.affectedRows,
        message: `${result.affectedRows}건의 출고가 완료되었습니다.`
      };
      
    } catch (error) {
      console.error('출고 완료 처리 오류:', error);
      throw new Error('출고 완료 처리에 실패했습니다.');
    }
  }

  // ========================================
  // 출고 상태 확인
  // ========================================
  async checkOutboundStatus(orderId) {
    try {
      const result = await mapper.query('checkOutboundStatus', [orderId]);
      return result[0].outbound_status;
      
    } catch (error) {
      console.error('출고 상태 확인 오류:', error);
      throw new Error('출고 상태 확인에 실패했습니다.');
    }
  }

  // ========================================
  // 다중 주문 출고 처리
  // ========================================
  async processMultipleOutbound(orderIds, employeeId, notes = '') {
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const orderId of orderIds) {
      try {
        // 재고 체크
        const inventoryCheck = await this.checkInventoryAvailable(orderId);
        if (inventoryCheck.has_shortage) {
          results.push({
            order_id: orderId,
            success: false,
            error: '재고 부족',
            shortage_items: inventoryCheck.shortage_items
          });
          errorCount++;
          continue;
        }
        
        // 출고 처리
        const result = await this.processOutbound(orderId, employeeId, notes);
        results.push({
          order_id: orderId,
          success: true,
          outbound_code: result.outbound_code
        });
        successCount++;
        
      } catch (error) {
        results.push({
          order_id: orderId,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }
    
    return {
      total: orderIds.length,
      success_count: successCount,
      error_count: errorCount,
      results: results
    };
  }
}

module.exports = new ProductOutboundService();