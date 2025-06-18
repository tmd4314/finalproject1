// 제품 출고 관리 SQL 쿼리 

// 1. 출고 대기 목록 조회 (주문 기준)
const getOutboundWaitingList = `
  SELECT 
    om.order_id,
    om.account_id as order_number,
    om.order_date,
    om.delivery_date,
    om.remarks,
    e.employee_name as client_name,
    -- 주요 제품 정보 (첫 번째 제품)
    (SELECT p.product_name 
     FROM order_detail od 
     LEFT JOIN product p ON od.product_code = p.product_code 
     WHERE od.order_id = om.order_id 
     ORDER BY od.order_detail_id LIMIT 1) as main_product_name,
    -- 제품 요약 정보 (제품명 외 *건)
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
  LEFT JOIN employees e ON om.account_id = e.employee_id
  WHERE 
    -- 주문 상태가 대기인 것만
    om.status = 'WAIT'
    
    -- 아직 출고되지 않은 주문들만
    AND NOT EXISTS (
      SELECT 1 FROM product_outbound_detail pod 
      WHERE pod.order_id = om.order_id
    )
    
    -- 검색 조건
    AND (? = '' OR om.account_id LIKE CONCAT('%', ?, '%'))  -- 주문번호 검색
    AND (? = '' OR EXISTS (
      SELECT 1 FROM order_detail od 
      LEFT JOIN product p ON od.product_code = p.product_code 
      WHERE od.order_id = om.order_id 
      AND p.product_name LIKE CONCAT('%', ?, '%')
    ))  -- 제품명 검색
    AND (? = '' OR DATE(om.order_date) = ?)  -- 주문일 검색
    
  ORDER BY om.delivery_date ASC, om.order_date ASC
  LIMIT 50
`;

// 2. 주문 상세 정보 조회 (모달용)
const getOrderDetails = `
  SELECT 
    om.order_id,
    om.account_id as order_number,
    om.order_date,
    om.delivery_date,
    om.remarks,
    e.employee_name as client_name,
    od.order_detail_id,
    od.product_code,
    p.product_name,
    od.order_qty as quantity,
    CONCAT(p.product_pay, 'kg') as spec,
    p.product_unit as unit
  FROM order_master om
  LEFT JOIN employees e ON om.account_id = e.employee_id
  LEFT JOIN order_detail od ON om.order_id = od.order_id
  LEFT JOIN product p ON od.product_code = p.product_code
  WHERE om.order_id = ?
  ORDER BY od.order_detail_id
`;

// 3. 출고 처리 - 출고 마스터 생성 (개별 주문별로)
const insertOutboundMaster = `
  INSERT INTO product_outbound_master (
    outbound_code,
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
          (SELECT MAX(CAST(RIGHT(outbound_code, 3) AS UNSIGNED)) + 1
           FROM product_outbound_master pom2 
           WHERE pom2.outbound_code LIKE CONCAT('OUT-', DATE_FORMAT(?, '%Y%m%d'), '-%')
          ), 
          1
        ), 3, '0'
      )
    ),  -- 순차적 출고번호 생성
    ?,  -- outbound_date
    '진행중',  -- outbound_status
    1,  -- total_orders (항상 1개 주문)
    ?,  -- total_products  
    ?,  -- total_quantity
    ?,  -- employee_id
    ?   -- notes
  )
`;

// 4. 출고 처리 - 출고 상세 생성 (단일 주문)
const insertOutboundDetail = `
  INSERT INTO product_outbound_detail (
    outbound_code,
    order_id,
    order_detail_id,
    product_code,
    order_quantity,
    outbound_quantity,
    lot_number
  )
  SELECT 
    ? as outbound_code,
    od.order_id,
    od.order_detail_id,
    od.product_code,
    od.order_qty as order_quantity,
    od.order_qty as outbound_quantity,
    -- FIFO 방식으로 가장 오래된 LOT 선택
    (SELECT pl.lot_num 
     FROM product_lot pl 
     WHERE pl.product_code = od.product_code 
     AND pl.quantity > 0 
     AND pl.status = '사용가능'
     ORDER BY pl.manufacture_date ASC 
     LIMIT 1) as lot_number
  FROM order_detail od
  WHERE od.order_id = ?
`;

// 5. 재고 차감 (FIFO 방식)
const updateInventoryFIFO = `
  UPDATE product_lot pl
  SET pl.quantity = pl.quantity - ?
  WHERE pl.product_code = ?
  AND pl.quantity > 0
  AND pl.status = '사용가능'
  AND pl.lot_num = (
    SELECT lot_num FROM (
      SELECT lot_num 
      FROM product_lot 
      WHERE product_code = ? 
      AND quantity > 0 
      AND status = '사용가능'
      ORDER BY manufacture_date ASC 
      LIMIT 1
    ) as oldest_lot
  )
`;

// 6. 출고 진행 중 목록 조회
const getOutboundProcessingList = `
  SELECT 
    pom.outbound_code,
    DATE_FORMAT(pom.outbound_date, '%Y-%m-%d') as outbound_date,
    pom.outbound_status,
    om.account_id as order_number,
    -- 제품 요약 정보
    CASE 
      WHEN (SELECT COUNT(*) FROM product_outbound_detail WHERE outbound_code = pom.outbound_code) = 1 
      THEN (SELECT p.product_name 
            FROM product_outbound_detail pod2 
            LEFT JOIN product p ON pod2.product_code = p.product_code 
            WHERE pod2.outbound_code = pom.outbound_code LIMIT 1)
      ELSE CONCAT(
        (SELECT p.product_name 
         FROM product_outbound_detail pod2 
         LEFT JOIN product p ON pod2.product_code = p.product_code 
         WHERE pod2.outbound_code = pom.outbound_code 
         ORDER BY pod2.outbound_detail_id LIMIT 1), 
        ' 외 ', 
        (SELECT COUNT(*) - 1 FROM product_outbound_detail WHERE outbound_code = pom.outbound_code), 
        '건'
      )
    END as product_summary,
    e.employee_name as client_name,
    om.order_date as request_date,
    DATE_FORMAT(pom.created_at, '%Y-%m-%d %H:%i:%s') as created_at
  FROM product_outbound_master pom
  LEFT JOIN product_outbound_detail pod ON pom.outbound_code = pod.outbound_code
  LEFT JOIN order_master om ON pod.order_id = om.order_id
  LEFT JOIN employees e ON om.account_id = e.employee_id
  WHERE 
    pom.outbound_status = '진행중'
    -- 검색 조건
    AND (? = '' OR pom.outbound_code LIKE CONCAT('%', ?, '%'))  -- 출고번호
    AND (? = '' OR EXISTS (
      SELECT 1 FROM product_outbound_detail pod2 
      LEFT JOIN product p ON pod2.product_code = p.product_code 
      WHERE pod2.outbound_code = pom.outbound_code 
      AND p.product_name LIKE CONCAT('%', ?, '%')
    ))  -- 제품명
    AND (? = '' OR DATE(om.order_date) = ?)  -- 요청일
  GROUP BY pom.outbound_code
  ORDER BY pom.created_at DESC
  LIMIT 50
`;

// 7. 출고 완료 목록 조회
const getOutboundCompletedList = `
  SELECT 
    pom.outbound_code,
    DATE_FORMAT(pom.outbound_date, '%Y-%m-%d') as outbound_date,
    pom.outbound_status,
    om.account_id as order_number,
    -- 제품 요약 정보
    CASE 
      WHEN (SELECT COUNT(*) FROM product_outbound_detail WHERE outbound_code = pom.outbound_code) = 1 
      THEN (SELECT p.product_name 
            FROM product_outbound_detail pod2 
            LEFT JOIN product p ON pod2.product_code = p.product_code 
            WHERE pod2.outbound_code = pom.outbound_code LIMIT 1)
      ELSE CONCAT(
        (SELECT p.product_name 
         FROM product_outbound_detail pod2 
         LEFT JOIN product p ON pod2.product_code = p.product_code 
         WHERE pod2.outbound_code = pom.outbound_code 
         ORDER BY pod2.outbound_detail_id LIMIT 1), 
        ' 외 ', 
        (SELECT COUNT(*) - 1 FROM product_outbound_detail WHERE outbound_code = pom.outbound_code), 
        '건'
      )
    END as product_summary,
    e.employee_name as client_name,
    om.order_date as request_date,
    DATE_FORMAT(pom.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
    DATE_FORMAT(pom.updated_at, '%Y-%m-%d %H:%i:%s') as completed_at
  FROM product_outbound_master pom
  LEFT JOIN product_outbound_detail pod ON pom.outbound_code = pod.outbound_code
  LEFT JOIN order_master om ON pod.order_id = om.order_id
  LEFT JOIN employees e ON om.account_id = e.employee_id
  WHERE 
    pom.outbound_status = '완료'
    -- 검색 조건
    AND (? = '' OR pom.outbound_code LIKE CONCAT('%', ?, '%'))  -- 출고번호
    AND (? = '' OR EXISTS (
      SELECT 1 FROM product_outbound_detail pod2 
      LEFT JOIN product p ON pod2.product_code = p.product_code 
      WHERE pod2.outbound_code = pom.outbound_code 
      AND p.product_name LIKE CONCAT('%', ?, '%')
    ))  -- 제품명
    AND (? = '' OR DATE(pom.outbound_date) = ?)  -- 출고일
  GROUP BY pom.outbound_code
  ORDER BY pom.updated_at DESC
  LIMIT 50
`;

// 8. 출고 상세 정보 조회 (모달용)
const getOutboundDetails = `
  SELECT 
    pom.outbound_code,
    DATE_FORMAT(pom.outbound_date, '%Y-%m-%d') as outbound_date,
    pom.outbound_status,
    e.employee_name as employee_name,
    pom.notes,
    pod.order_id,
    om.account_id as order_number,
    pod.product_code,
    p.product_name,
    pod.order_quantity,
    pod.outbound_quantity,
    CONCAT(p.product_pay, 'kg') as spec,
    p.product_unit as unit,
    pod.lot_number,
    client.employee_name as client_name
  FROM product_outbound_master pom
  LEFT JOIN employees e ON pom.employee_id = e.employee_id
  LEFT JOIN product_outbound_detail pod ON pom.outbound_code = pod.outbound_code
  LEFT JOIN order_master om ON pod.order_id = om.order_id
  LEFT JOIN employees client ON om.account_id = client.employee_id
  LEFT JOIN product p ON pod.product_code = p.product_code
  WHERE pom.outbound_code = ?
  ORDER BY pod.outbound_detail_id
`;

// 9. 출고 완료 처리 (다중 선택)
const completeOutbound = `
  UPDATE product_outbound_master 
  SET outbound_status = '완료',
      updated_at = NOW()
  WHERE outbound_code IN (?)
  AND outbound_status = '진행중'
`;

// 10. 재고 부족 체크 (출고 전 검증)
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

// 11. 출고 처리 총 계산용 쿼리 (단일 주문)
const getOutboundTotals = `
  SELECT 
    1 as total_orders,
    COUNT(DISTINCT od.product_code) as total_products,
    SUM(od.order_qty) as total_quantity
  FROM order_detail od
  WHERE od.order_id = ?
`;

// 12. 출고 상태 확인
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