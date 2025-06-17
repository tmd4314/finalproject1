// sqls/productInbound.js - 제품 입고 관리 SQL 쿼리

// 1. 입고 대기 목록 조회 (work_order_detail에서 product_code 가져오기)
const getInboundWaitingList = `
  SELECT 
    wr.result_id,
    wr.work_order_no,
    wod.product_code,  -- work_order_detail에서 직접 가져오기
    p.product_name,
    p.product_unit,
    p.product_stand,
    wrd.pass_qty as inbound_qty,
    DATE_FORMAT(wrd.work_end_time, '%Y-%m-%d') as request_date,
    wrd.work_end_time as manufacture_datetime,
    -- LOT 번호 기본 부분만 생성 (LOTYYYYMMDD), 난수는 화면에서 처리
    CONCAT('LOT', DATE_FORMAT(wrd.work_end_time, '%Y%m%d')) as lot_base
  FROM work_result wr
  JOIN work_result_detail wrd ON wr.result_id = wrd.result_id
  JOIN work_order_detail wod ON wr.work_order_no = wod.work_order_no
  LEFT JOIN product p ON wod.product_code = p.product_code
  WHERE 
    -- 작업이 완료된 것들
    wrd.work_end_time IS NOT NULL
    AND wrd.pass_qty > 0
    
    -- ========== 더미 포장품질검사 합격 조건 ==========
    -- 실제 포장품질검사 테이블 생성 후 아래 주석 해제하고 더미 조건 삭제
    /*
    AND EXISTS (
      SELECT 1 FROM packaging_quality_check pqc 
      WHERE pqc.result_id = wr.result_id 
      AND pqc.product_code = wod.product_code
      AND pqc.quality_result = '합격'
    )
    */
    
    -- 더미 조건: 모든 완료된 작업을 합격으로 간주 (테스트용)
    AND (1 = 1)
    -- ========================================
    
    -- 아직 입고되지 않은 제품들만 (work_order_no + product_code 조합으로 중복 체크)
    AND NOT EXISTS (
      SELECT 1 FROM product_lot pl 
      JOIN work_result wr2 ON pl.result_id = wr2.result_id
      WHERE wr2.work_order_no = wr.work_order_no
      AND pl.product_code = wod.product_code
    )
    
  ORDER BY wrd.work_end_time DESC
  LIMIT 50
`;

// 2. 제품 입고 처리 (product_lot 테이블에 INSERT)
const insertProductInbound = `
  INSERT INTO product_lot (
    lot_num,
    product_code,
    manufacture_date,
    expiry_date,
    quantity,
    inbound_date,
    status,
    result_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`;

// 3. 입고 완료 확인 조회
const getInboundResult = `
  SELECT 
    pl.lot_num,
    pl.product_code,
    p.product_name,
    p.product_unit,
    p.product_stand,
    pl.quantity,
    DATE_FORMAT(pl.manufacture_date, '%Y-%m-%d') as manufacture_date,
    DATE_FORMAT(pl.expiry_date, '%Y-%m-%d') as expiry_date,
    DATE_FORMAT(pl.inbound_date, '%Y-%m-%d %H:%i:%s') as inbound_date,
    pl.status,
    pl.result_id
  FROM product_lot pl
  JOIN product p ON pl.product_code = p.product_code
  WHERE pl.result_id = ? AND pl.product_code = ?
  ORDER BY pl.inbound_date DESC
  LIMIT 1
`;

// 4. 입고 이력 조회
const getInboundHistory = `
  SELECT 
    pl.lot_num,
    pl.product_code,
    p.product_name,
    pl.quantity,
    DATE_FORMAT(pl.manufacture_date, '%Y-%m-%d') as manufacture_date,
    DATE_FORMAT(pl.expiry_date, '%Y-%m-%d') as expiry_date,
    DATE_FORMAT(pl.inbound_date, '%Y-%m-%d %H:%i:%s') as inbound_date,
    pl.status,
    pl.result_id
  FROM product_lot pl
  JOIN product p ON pl.product_code = p.product_code
  WHERE 
    (? = '' OR pl.lot_num LIKE CONCAT('%', ?, '%'))
    AND (? = '' OR p.product_name LIKE CONCAT('%', ?, '%'))
    AND (? = '' OR DATE(pl.inbound_date) >= ?)
    AND (? = '' OR DATE(pl.inbound_date) <= ?)
  ORDER BY pl.inbound_date DESC
  LIMIT 100
`;

// 5. 특정 실적의 입고 상태 확인
const checkInboundStatus = `
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM product_lot 
        WHERE result_id = ? AND product_code = ?
      ) THEN '입고완료'
      ELSE '입고대기'
    END as inbound_status
`;

module.exports = {
  getInboundWaitingList,
  insertProductInbound,
  getInboundResult,
  getInboundHistory,
  checkInboundStatus
};