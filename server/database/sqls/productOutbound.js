// sqls/productOutbound.js - 주문 상태 업데이트 기능 추가 (완전한 버전)

// 1. 출고 대기 목록 조회 ('완료' 상태만 제외)
const getOutboundWaitingList = `
  SELECT 
    om.order_id,
    om.order_id as order_number,
    DATE_FORMAT(om.order_date, '%Y-%m-%d') as order_date,
    DATE_FORMAT(om.delivery_date, '%Y-%m-%d') as delivery_date,
    om.remarks,
    COALESCE(a.account_name, CONCAT('거래처-', om.account_id)) as client_name,
    od.order_detail_id,
    od.product_code,
    p.product_name,
    od.order_qty as quantity,
    p.product_stand,
    p.product_unit as unit
  FROM order_master om
  LEFT JOIN order_detail od ON om.order_id = od.order_id
  LEFT JOIN product p ON od.product_code = p.product_code
  LEFT JOIN account a ON om.account_id = a.account_id
  WHERE 
    om.status NOT IN ('완료', '취소')
    AND NOT EXISTS (
      SELECT 1 FROM product_outbound po 
      WHERE po.order_id = om.order_id 
      AND po.product_code = od.product_code
    )
    AND (? = '' OR ? = '' OR COALESCE(a.account_name, CONCAT('거래처-', om.account_id)) LIKE CONCAT('%', ?, '%'))
    AND (? = '' OR ? = '' OR p.product_name LIKE CONCAT('%', ?, '%'))
    AND (? = '' OR ? = '' OR DATE(om.order_date) >= ?)
    AND (? = '' OR ? = '' OR DATE(om.order_date) <= ?)
    AND (? = '' OR ? = '' OR DATE(om.delivery_date) >= ?)
    AND (? = '' OR ? = '' OR DATE(om.delivery_date) <= ?)
  ORDER BY om.delivery_date ASC, om.order_date ASC, od.order_detail_id ASC
  LIMIT 50
`;

// 2. 주문 상세 정보 조회
const getOrderDetails = `
  SELECT 
    om.order_id,
    om.order_id as order_number,
    DATE_FORMAT(om.order_date, '%Y-%m-%d') as order_date,
    DATE_FORMAT(om.delivery_date, '%Y-%m-%d') as delivery_date,
    om.remarks,
    COALESCE(a.account_name, CONCAT('거래처-', om.account_id)) as client_name,
    od.order_detail_id,
    od.product_code,
    p.product_name,
    od.order_qty as quantity,
    p.product_stand,
    p.product_unit as unit
  FROM order_master om
  LEFT JOIN order_detail od ON om.order_id = od.order_id
  LEFT JOIN product p ON od.product_code = p.product_code
  LEFT JOIN account a ON om.account_id = a.account_id
  WHERE om.order_id = ?
  ORDER BY od.order_detail_id
`;

// 3. 출고 완료 목록 조회
const getOutboundCompletedList = `
  SELECT 
    po.outbound_code,
    DATE_FORMAT(po.outbound_date, '%Y-%m-%d') as outbound_date,
    po.product_code,
    p.product_name,
    p.product_stand,
    po.outbound_qty,
    p.product_unit as unit,
    po.lot_num,
    COALESCE(a.account_name, CONCAT('거래처-', om.account_id)) as client_name
  FROM product_outbound po
  LEFT JOIN product p ON po.product_code = p.product_code
  LEFT JOIN order_master om ON po.order_id = om.order_id
  LEFT JOIN account a ON om.account_id = a.account_id
  WHERE 
    po.outbound_status = '완료'
    AND (? = '' OR ? = '' OR COALESCE(a.account_name, CONCAT('거래처-', om.account_id)) LIKE CONCAT('%', ?, '%'))
    AND (? = '' OR ? = '' OR p.product_name LIKE CONCAT('%', ?, '%'))
    AND (? = '' OR ? = '' OR DATE(po.outbound_date) >= ?)
    AND (? = '' OR ? = '' OR DATE(po.outbound_date) <= ?)
  ORDER BY po.outbound_date DESC, po.outbound_code DESC
  LIMIT 50
`;

// 4. 출고 레코드 INSERT
const insertOutbound = `
  INSERT INTO product_outbound (
    outbound_code,
    outbound_date,
    outbound_status,
    order_id,
    order_detail_id,
    product_code,
    order_qty,
    outbound_qty,
    lot_num,
    employee_id,
    notes
  ) VALUES (?, ?, '완료', ?, ?, ?, ?, ?, ?, ?, ?)
`;

// 5. LOT 수량 차감
const updateInventoryFIFO = `
  UPDATE product_lot
  SET quantity = quantity - ?
  WHERE lot_num = ?
`;

// 6. 재고 부족 체크 (주문 전체)
const checkInventoryAvailable = `
  SELECT 
    od.product_code,
    p.product_name,
    od.order_qty as required_qty,
    COALESCE(SUM(pl.quantity), 0) as available_qty,
    CASE 
      WHEN COALESCE(SUM(pl.quantity), 0) >= od.order_qty THEN 'OK'
      ELSE 'SHORTAGE'
    END as status
  FROM order_detail od
  LEFT JOIN product p ON od.product_code = p.product_code
  LEFT JOIN product_lot pl ON od.product_code = pl.product_code 
    AND pl.quantity > 0 
    AND pl.status = '사용가능'
  WHERE od.order_id = ?
  GROUP BY od.product_code, p.product_name, od.order_qty
  HAVING status = 'SHORTAGE'
`;

// 7. 개별 제품 재고 부족 체크 (선택적 출고용)
const checkProductInventoryAvailable = `
  SELECT 
    ? as product_code,
    p.product_name,
    ? as required_qty,
    COALESCE(SUM(pl.quantity), 0) as available_qty,
    CASE 
      WHEN COALESCE(SUM(pl.quantity), 0) >= ? THEN 'OK'
      ELSE 'SHORTAGE'
    END as status
  FROM product p
  LEFT JOIN product_lot pl ON p.product_code = pl.product_code 
    AND pl.quantity > 0 
    AND pl.status = '사용가능'
  WHERE p.product_code = ?
  GROUP BY p.product_code, p.product_name
  HAVING status = 'SHORTAGE'
`;

// 8. 단일 FIFO LOT 조회
const getFIFOLotNumber = `
  SELECT pl.lot_num 
  FROM product_lot pl 
  WHERE pl.product_code = ? 
  AND pl.quantity > 0 
  AND pl.status = '사용가능'
  ORDER BY pl.manufacture_date ASC 
  LIMIT 1
`;

// 9. 다중 FIFO LOT 목록 조회
const getFIFOLotList = `
  SELECT lot_num, quantity
  FROM product_lot
  WHERE product_code = ?
    AND quantity > 0
    AND status = '사용가능'
  ORDER BY manufacture_date ASC
`;

// 10. 출고번호 생성
const getNextOutboundNumber = `
  SELECT COALESCE(MAX(CAST(RIGHT(outbound_code, 3) AS UNSIGNED)), 0) + 1 as next_num
  FROM product_outbound 
  WHERE outbound_code LIKE CONCAT('OUT-', ?, '-%')
`;

// 11. 출고 상태 확인
const checkOutboundStatus = `
  SELECT 
    COUNT(*) as total_items,
    COUNT(po.outbound_code) as completed_items,
    CASE 
      WHEN COUNT(*) = COUNT(po.outbound_code) THEN '완료'
      WHEN COUNT(po.outbound_code) > 0 THEN '부분완료'
      ELSE '대기'
    END as status
  FROM order_detail od
  LEFT JOIN product_outbound po ON od.order_id = po.order_id 
    AND od.product_code = po.product_code
    AND po.outbound_status = '완료'
  WHERE od.order_id = ?
`;

// 12. 출고 수량 반영
const updateOrderDetailQuantities = `
  UPDATE order_detail
  SET 
    delivery_qty = delivery_qty + ?,
    remain_qty = remain_qty - ?
  WHERE order_detail_id = ?
`;

// ========== 새로 추가되는 주문 상태 관련 쿼리들 ==========

// 13. 주문의 모든 제품이 출고 완료되었는지 확인
const checkOrderFullyShipped = `
  SELECT 
    om.order_id,
    om.status as current_status,
    COUNT(od.order_detail_id) as total_items,
    COUNT(po.outbound_code) as shipped_items,
    CASE 
      WHEN COUNT(od.order_detail_id) = COUNT(po.outbound_code) THEN 'FULLY_SHIPPED'
      WHEN COUNT(po.outbound_code) > 0 THEN 'PARTIALLY_SHIPPED'
      ELSE 'NOT_SHIPPED'
    END as shipping_status
  FROM order_master om
  LEFT JOIN order_detail od ON om.order_id = od.order_id
  LEFT JOIN product_outbound po ON od.order_id = po.order_id 
    AND od.product_code = po.product_code
    AND po.outbound_status = '완료'
  WHERE om.order_id = ?
    AND om.status NOT IN ('완료', '취소')  -- 이미 완료되거나 취소된 주문은 제외
  GROUP BY om.order_id, om.status
`;

// 14. 주문 상태를 완료로 업데이트
const updateOrderToCompleted = `
  UPDATE order_master 
  SET 
    status = '완료',
    complete_date = NOW()
  WHERE 
    order_id = ? 
    AND status NOT IN ('완료', '취소')  -- 이미 완료되거나 취소된 주문은 업데이트하지 않음
`;

// 15. 주문 상태 확인 (현재 상태만 조회)
const getOrderStatus = `
  SELECT 
    order_id,
    status,
    complete_date
  FROM order_master 
  WHERE order_id = ?
`;

// 16. 부분 출고 상태 업데이트 (선택사항)
const updateOrderToPartiallyShipped = `
  UPDATE order_master 
  SET status = '부분출고'
  WHERE 
    order_id = ? 
    AND status NOT IN ('완료', '취소', '부분출고')
`;

module.exports = {
  // 조회 쿼리들
  getOutboundWaitingList,
  getOrderDetails,
  getOutboundCompletedList,
  checkInventoryAvailable,
  checkProductInventoryAvailable,
  getFIFOLotNumber,
  getFIFOLotList,
  getNextOutboundNumber,
  checkOutboundStatus,
  
  // 처리 쿼리들
  insertOutbound,
  updateInventoryFIFO,
  updateOrderDetailQuantities,
  
  // 새로 추가된 주문 상태 관련 쿼리들
  checkOrderFullyShipped,
  updateOrderToCompleted,
  getOrderStatus,
  updateOrderToPartiallyShipped
};