// sqls/productOutbound.js - 제품 출고 관리 SQL 쿼리

// 1. 출고 대기 목록 조회 (검색 기능 추가, 특정 날짜 검색)
const getOutboundWaitingList = `
  SELECT 
    om.order_id,
    om.order_account_id as order_number,
    om.order_date,
    om.delivery_date,
    om.remarks,
    e.employee_name as client_name,
    -- 주문의 주요 제품 정보 (첫 번째 제품)
    (SELECT p.product_name 
     FROM order_detail od 
     LEFT JOIN product p ON od.product_code = p.product_code 
     WHERE od.order_id = om.order_id 
     ORDER BY od.order_detail_id LIMIT 1) as main_product_name,
    -- 제품 요약 정보
    CASE 
      WHEN (SELECT COUNT(*) FROM order_detail WHERE order_id = om.order_id) = 1 
      THEN (SELECT p.product_name 
            FROM order_detail od 
            LEFT JOIN product p ON od.product_code = p.product_code 
            WHERE od.order_id = om.order_id LIMIT 1)
      ELSE CONCAT(
        (SELECT p.product_name 
         FROM order_detail od 
         LEFT JOIN product p ON od.product_code = p.product_code 
         WHERE od.order_id = om.order_id 
         ORDER BY od.order_detail_id LIMIT 1), 
        ' 외 ', 
        (SELECT COUNT(*) - 1 FROM order_detail WHERE order_id = om.order_id), 
        '건'
      )
    END as product_summary,
    (SELECT COUNT(*) FROM order_detail WHERE order_id = om.order_id) as total_items
  FROM order_master om
  LEFT JOIN employees e ON om.order_account_id = e.employee_id
  WHERE 
    -- 주문 상태가 대기인 것만
    om.status = '대기'
    
    -- 아직 출고되지 않은 주문들만
    AND NOT EXISTS (
      SELECT 1 FROM product_outbound_detail pod 
      WHERE pod.order_id = om.order_id
    )
    
    -- 검색 조건 (특정 날짜 검색)
    AND (? = '' OR EXISTS (
      SELECT 1 FROM order_detail od 
      LEFT JOIN product p ON od.product_code = p.product_code 
      WHERE od.order_id = om.order_id 
      AND p.product_name LIKE CONCAT('%', ?, '%')
    ))
    AND (? = '' OR EXISTS (
      SELECT 1 FROM order_detail od 
      WHERE od.order_id = om.order_id 
      AND od.product_code LIKE CONCAT('%', ?, '%')
    ))
    AND (? = '' OR DATE(om.delivery_date) = ?)
    
  ORDER BY om.delivery_date ASC, om.order_date ASC
  LIMIT 50
`;

// 2. 주문 상세 정보 조회 (모달용)
const getOrderDetails = `
  SELECT 
    om.order_id,
    om.order_account_id as order_number,
    om.order_date,
    om.delivery_date,
    om.remarks,
    e.employee_name as client_name,
    od.order_detail_id,
    od.product_code,
    p.product_name,
    od.delivery_qty as quantity,
    CONCAT(p.product_pay, 'kg') as spec,
    p.product_unit as unit
  FROM order_master om
  LEFT JOIN employees e ON om.order_account_id = e.employee_id
  LEFT JOIN order_detail od ON om.order_id = od.order_id
  LEFT JOIN product p ON od.product_code = p.product_code
  WHERE om.order_id = ?
  ORDER BY od.order_detail_id
`;

// 3. 출고 처리 - 출고 마스터 생성
const insertOutboundMaster = `
  INSERT INTO product_outbound (
    outbound_number,
    outbound_date,
    outbound_status,
    total_orders,
    total_products,
    total_quantity,
    employee_id,
    notes
  ) VALUES (
    CONCAT(
      'OUT-', 
      DATE_FORMAT(?, '%Y%m%d'), 
      '-', 
      LPAD(
        COALESCE(
          (SELECT MAX(CAST(RIGHT(outbound_number, 3) AS UNSIGNED)) + 1
           FROM product_outbound po2 
           WHERE po2.outbound_number LIKE CONCAT('OUT-', DATE_FORMAT(?, '%Y%m%d'), '-%')
          ), 
          1
        ), 3, '0'
      )
    ),  -- 순차적 출고번호 생성
    ?,  -- outbound_date
    'processing',  -- outbound_status
    ?,  -- total_orders
    ?,  -- total_products  
    ?,  -- total_quantity
    ?,  -- employee_id
    ?   -- notes
  )
`;

// 4. 출고 처리 - 출고 상세 생성 (다중 주문 지원)
const insertOutboundDetail = `
  INSERT INTO product_outbound_detail (
    outbound_id,
    order_id,
    order_detail_id,
    product_code,
    product_name,
    order_quantity,
    outbound_quantity,
    unit,
    lot_number
  )
  SELECT 
    ? as outbound_id,
    od.order_id,
    od.order_detail_id,
    od.product_code,
    p.product_name,
    od.delivery_qty as order_quantity,
    od.delivery_qty as outbound_quantity,
    p.product_unit as unit,
    -- FIFO 방식으로 가장 오래된 LOT 선택
    (SELECT pl.lot_num 
     FROM product_lot pl 
     WHERE pl.product_code = od.product_code 
     AND pl.quantity > 0 
     AND pl.status = '정상'
     ORDER BY pl.inbound_date ASC 
     LIMIT 1) as lot_number
  FROM order_detail od
  LEFT JOIN product p ON od.product_code = p.product_code
  WHERE od.order_id IN (?)
`;

// 5. 재고 차감 (FIFO 방식)
const updateInventoryFIFO = `
  UPDATE product_lot pl
  SET pl.quantity = pl.quantity - ?
  WHERE pl.product_code = ?
  AND pl.quantity > 0
  AND pl.status = '정상'
  AND pl.lot_num = (
    SELECT lot_num FROM (
      SELECT lot_num 
      FROM product_lot 
      WHERE product_code = ? 
      AND quantity > 0 
      AND status = '정상'
      ORDER BY inbound_date ASC 
      LIMIT 1
    ) as oldest_lot
  )
`;

// 6. 출고 진행 중 목록 조회
const getOutboundProcessingList = `
  SELECT 
    po.outbound_id,
    po.outbound_number,
    DATE_FORMAT(po.outbound_date, '%Y-%m-%d') as outbound_date,
    po.outbound_status,
    po.total_orders,
    po.total_products,
    po.total_quantity,
    e.employee_name as employee_name,
    DATE_FORMAT(po.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
    -- 출고에 포함된 주문번호들
    GROUP_CONCAT(DISTINCT om.order_account_id ORDER BY om.order_account_id) as order_numbers,
    -- 출고에 포함된 거래처들
    GROUP_CONCAT(DISTINCT client.employee_name ORDER BY client.employee_name) as client_names,
    -- 주요 제품명
    (SELECT p.product_name 
     FROM product_outbound_detail pod2 
     LEFT JOIN product p ON pod2.product_code = p.product_code 
     WHERE pod2.outbound_id = po.outbound_id 
     ORDER BY pod2.outbound_detail_id LIMIT 1) as main_product_name
  FROM product_outbound po
  LEFT JOIN employees e ON po.employee_id = e.employee_id
  LEFT JOIN product_outbound_detail pod ON po.outbound_id = pod.outbound_id
  LEFT JOIN order_master om ON pod.order_id = om.order_id
  LEFT JOIN employees client ON om.order_account_id = client.employee_id
  WHERE 
    po.outbound_status = 'processing'
    -- 검색 조건
    AND (? = '' OR po.outbound_number LIKE CONCAT('%', ?, '%'))
    AND (? = '' OR EXISTS (
      SELECT 1 FROM product_outbound_detail pod2 
      LEFT JOIN product p ON pod2.product_code = p.product_code 
      WHERE pod2.outbound_id = po.outbound_id 
      AND p.product_name LIKE CONCAT('%', ?, '%')
    ))
    AND (? = '' OR DATE(po.outbound_date) = ?)
  GROUP BY po.outbound_id
  ORDER BY po.created_at DESC
  LIMIT 50
`;

// 7. 출고 완료 목록 조회
const getOutboundCompletedList = `
  SELECT 
    po.outbound_id,
    po.outbound_number,
    DATE_FORMAT(po.outbound_date, '%Y-%m-%d') as outbound_date,
    po.outbound_status,
    po.total_orders,
    po.total_products,
    po.total_quantity,
    e.employee_name as employee_name,
    DATE_FORMAT(po.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
    DATE_FORMAT(po.updated_at, '%Y-%m-%d %H:%i:%s') as completed_at,
    -- 출고에 포함된 주문번호들
    GROUP_CONCAT(DISTINCT om.order_account_id ORDER BY om.order_account_id) as order_numbers,
    -- 출고에 포함된 거래처들  
    GROUP_CONCAT(DISTINCT client.employee_name ORDER BY client.employee_name) as client_names,
    -- 주요 제품명
    (SELECT p.product_name 
     FROM product_outbound_detail pod2 
     LEFT JOIN product p ON pod2.product_code = p.product_code 
     WHERE pod2.outbound_id = po.outbound_id 
     ORDER BY pod2.outbound_detail_id LIMIT 1) as main_product_name
  FROM product_outbound po
  LEFT JOIN employees e ON po.employee_id = e.employee_id
  LEFT JOIN product_outbound_detail pod ON po.outbound_id = pod.outbound_id
  LEFT JOIN order_master om ON pod.order_id = om.order_id
  LEFT JOIN employees client ON om.order_account_id = client.employee_id
  WHERE 
    po.outbound_status = 'completed'
    -- 검색 조건
    AND (? = '' OR po.outbound_number LIKE CONCAT('%', ?, '%'))
    AND (? = '' OR EXISTS (
      SELECT 1 FROM product_outbound_detail pod2 
      LEFT JOIN product p ON pod2.product_code = p.product_code 
      WHERE pod2.outbound_id = po.outbound_id 
      AND p.product_name LIKE CONCAT('%', ?, '%')
    ))
    AND (? = '' OR DATE(po.outbound_date) = ?)
  GROUP BY po.outbound_id
  ORDER BY po.updated_at DESC
  LIMIT 50
`;

// 8. 출고 상세 정보 조회 (모달용)
const getOutboundDetails = `
  SELECT 
    po.outbound_id,
    po.outbound_number,
    DATE_FORMAT(po.outbound_date, '%Y-%m-%d') as outbound_date,
    po.outbound_status,
    po.total_orders,
    po.total_products,
    po.total_quantity,
    e.employee_name as employee_name,
    po.notes,
    pod.order_id,
    om.order_account_id as order_number,
    pod.product_code,
    pod.product_name,
    pod.order_quantity,
    pod.outbound_quantity,
    pod.unit,
    pod.lot_number,
    client.employee_name as client_name
  FROM product_outbound po
  LEFT JOIN employees e ON po.employee_id = e.employee_id
  LEFT JOIN product_outbound_detail pod ON po.outbound_id = pod.outbound_id
  LEFT JOIN order_master om ON pod.order_id = om.order_id
  LEFT JOIN employees client ON om.order_account_id = client.employee_id
  WHERE po.outbound_id = ?
  ORDER BY pod.order_id, pod.outbound_detail_id
`;

// 9. 출고 완료 처리
const completeOutbound = `
  UPDATE product_outbound 
  SET outbound_status = 'completed',
      updated_at = NOW()
  WHERE outbound_id = ?
  AND outbound_status = 'processing'
`;

// 10. 출고 상태 확인
const checkOutboundStatus = `
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM product_outbound_detail 
        WHERE order_id = ?
      ) THEN '출고완료'
      ELSE '출고대기'
    END as outbound_status
`;

// 11. 재고 부족 체크 (출고 전 검증)
const checkInventoryAvailable = `
  SELECT 
    od.product_code,
    p.product_name,
    od.delivery_qty as required_qty,
    COALESCE(SUM(pl.quantity), 0) as available_qty,
    CASE 
      WHEN COALESCE(SUM(pl.quantity), 0) >= od.delivery_qty THEN 'OK'
      ELSE 'SHORTAGE'
    END as status
  FROM order_detail od
  LEFT JOIN product p ON od.product_code = p.product_code
  LEFT JOIN product_lot pl ON od.product_code = pl.product_code 
    AND pl.quantity > 0 
    AND pl.status = '정상'
  WHERE od.order_id IN (?)
  GROUP BY od.product_code, p.product_name, od.delivery_qty
  HAVING status = 'SHORTAGE'
`;

// 12. 출고 처리 총 계산용 쿼리
const getOutboundTotals = `
  SELECT 
    COUNT(DISTINCT od.order_id) as total_orders,
    COUNT(DISTINCT od.product_code) as total_products,
    SUM(od.delivery_qty) as total_quantity
  FROM order_detail od
  WHERE od.order_id IN (?)
`;

module.exports = {
  getOutboundWaitingList,
  getOrderDetails,
  insertOutboundMaster,
  insertOutboundDetail,
  updateInventoryFIFO,
  getOutboundProcessingList,
  getOutboundCompletedList,
  getOutboundDetails,
  completeOutbound,
  checkOutboundStatus,
  checkInventoryAvailable,
  getOutboundTotals
};