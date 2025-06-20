// server/database/sqls/bom.js

// ========== 검색 관련 쿼리 ==========

// 1. 제품 검색 (모달용) - 제품코드 기반 그룹핑
const searchBomProducts = `
  SELECT DISTINCT
    SUBSTRING_INDEX(product_code, '-', 2) as base_product_code,
    product_name,
    product_unit,
    GROUP_CONCAT(DISTINCT product_stand ORDER BY product_stand SEPARATOR ',') as available_stands,
    GROUP_CONCAT(DISTINCT product_code ORDER BY product_stand SEPARATOR ',') as product_codes
  FROM tablets.product
  WHERE (? = '' OR product_name LIKE CONCAT('%', ?, '%') 
               OR product_code LIKE CONCAT('%', ?, '%'))
    AND product_name = (
      SELECT product_name 
      FROM tablets.product p2 
      WHERE SUBSTRING_INDEX(p2.product_code, '-', 2) = SUBSTRING_INDEX(tablets.product.product_code, '-', 2)
      LIMIT 1
    )
  GROUP BY SUBSTRING_INDEX(product_code, '-', 2), product_name
  ORDER BY product_name ASC
`;

// 2. 자재 검색 (모달용)
const searchBomMaterials = `
  SELECT 
    material_code,
    material_name,
    material_cls AS material_type,
    material_unit,
    material_stand
  FROM tablets.material
  WHERE (? = '' OR material_code LIKE CONCAT('%', ?, '%')
               OR material_name LIKE CONCAT('%', ?, '%'))
  ORDER BY 
    CASE 
      WHEN material_code LIKE CONCAT(?, '%') THEN 1
      WHEN material_name LIKE CONCAT(?, '%') THEN 2
      ELSE 3
    END,
    material_code ASC
  LIMIT 50
`;

// 3. BOM 검색 (모달용)
const searchBomList = `
  SELECT 
    bm.bom_code,
    bm.product_code,
    p.product_name,
    p.product_stand,
    bm.bom_reg_date,
    bm.bom_update_date,
    CONCAT(
      p.product_name,
      CASE 
        WHEN p.product_stand IS NOT NULL AND p.product_stand != '' 
        THEN CONCAT(' (', p.product_stand, ')')
        ELSE ''
      END
    ) as product_summary,
    COALESCE((SELECT COUNT(*) FROM tablets.bom_detail bd WHERE bd.bom_code = bm.bom_code), 0) as material_count
  FROM tablets.bom_master bm
  JOIN tablets.product p ON bm.product_code = p.product_code
  WHERE (? = '' OR bm.bom_code LIKE CONCAT('%', ?, '%')
               OR p.product_name LIKE CONCAT('%', ?, '%'))
  ORDER BY bm.bom_reg_date DESC, bm.bom_code DESC
`;

// ========== 조회 관련 쿼리 ==========

// 4. BOM 마스터+상세 정보 한번에 조회 (생산계획과 동일한 방식)
const getBomInfo = `
  SELECT 
    bm.bom_code,
    bm.product_code,
    bm.bom_reg_date,
    bm.bom_update_date,
    p.product_name,
    p.product_unit,
    p.product_stand,
    bd.bom_detail_id,
    bd.material_code,
    bd.usage_qty,
    bd.bom_unit,
    m.material_name,
    m.material_cls AS material_type,
    m.material_unit,
    m.material_stand
  FROM tablets.bom_master bm
  JOIN tablets.product p ON bm.product_code = p.product_code
  LEFT JOIN tablets.bom_detail bd ON bm.bom_code = bd.bom_code
  LEFT JOIN tablets.material m ON bd.material_code = m.material_code
  WHERE bm.bom_code = ?
  ORDER BY bd.bom_detail_id
`;

// 5. BOM 자재 목록만 조회
const getBomMaterials = `
  SELECT 
    bd.bom_detail_id,
    bd.bom_code,
    bd.material_code,
    bd.usage_qty,
    bd.bom_unit,
    m.material_name,
    m.material_cls AS material_type,
    m.material_unit,
    m.material_stand
  FROM tablets.bom_detail bd
  LEFT JOIN tablets.material m ON bd.material_code = m.material_code
  WHERE bd.bom_code = ?
  ORDER BY bd.bom_detail_id
`;

// 6. BOM 목록 조회 (불러오기용)
const getBomList = `
  SELECT 
    bm.bom_code,
    bm.product_code,
    bm.bom_reg_date,
    bm.bom_update_date,
    p.product_name,
    p.product_unit,
    p.product_stand,
    CONCAT(
      p.product_name,
      CASE 
        WHEN p.product_stand IS NOT NULL AND p.product_stand != '' 
        THEN CONCAT(' (', p.product_stand, ')')
        ELSE ''
      END
    ) as product_summary,
    COALESCE((SELECT COUNT(*) FROM tablets.bom_detail bd WHERE bd.bom_code = bm.bom_code), 0) as material_count
  FROM tablets.bom_master bm
  JOIN tablets.product p ON bm.product_code = p.product_code
  WHERE (? = '' OR bm.bom_code LIKE CONCAT('%', ?, '%')
               OR p.product_name LIKE CONCAT('%', ?, '%')
               OR p.product_code LIKE CONCAT('%', ?, '%'))
  ORDER BY bm.bom_reg_date DESC, bm.bom_code DESC
`;

// 7. 제품 드롭다운용 - 제품코드 기반 그룹핑
const getProductList = `
  SELECT 
    product_code, 
    product_name, 
    product_unit, 
    product_stand,
    SUBSTRING_INDEX(product_code, '-', 2) as base_product_code
  FROM tablets.product
  ORDER BY product_name ASC, 
           CAST(SUBSTRING_INDEX(product_code, '-', -1) AS UNSIGNED) ASC
`;

// 8. 자재 전체 목록
const getMaterialList = `
  SELECT 
    material_code,
    material_name,
    material_cls AS material_type,
    material_unit,
    material_stand
  FROM tablets.material
  ORDER BY material_code ASC
`;

// ========== 중복 체크 관련 쿼리 ==========

// 9. 중복 BOM 체크 (동일한 제품코드로 기존 BOM이 있는지 확인)
const checkDuplicateBom = `
  SELECT bm.bom_code, bm.product_code, p.product_name
  FROM tablets.bom_master bm
  JOIN tablets.product p ON bm.product_code = p.product_code
  WHERE bm.product_code = ?
`;

// 10. BOM 코드 중복 체크
const checkBomCodeExists = `
  SELECT COUNT(*) as count
  FROM tablets.bom_master
  WHERE bom_code = ?
`;

// 11. 특정 제품의 최신 BOM 코드 조회 (순번 생성용)
const getLatestBomCodeByProduct = `
  SELECT bom_code
  FROM tablets.bom_master
  WHERE product_code = ? 
    AND bom_code LIKE CONCAT('BOM-', ?, '-', DATE_FORMAT(CURDATE(), '%Y%m%d'), '%')
  ORDER BY bom_code DESC
  LIMIT 1
`;

// ========== BOM 번호 생성 ==========

// 12. BOM 번호 자동 생성 (BOM-제품코드-YYYYMMDD 형식)
const generateBomCode = `
  SELECT 
    CONCAT('BOM-', ?, '-', DATE_FORMAT(NOW(), '%Y%m%d'),
           CASE 
             WHEN COUNT(*) > 0 
             THEN CONCAT('-', LPAD(COUNT(*) + 1, 2, '0'))
             ELSE ''
           END
    ) as next_bom_code
  FROM tablets.bom_master 
  WHERE product_code = ?
    AND bom_code LIKE CONCAT('BOM-', ?, '-', DATE_FORMAT(NOW(), '%Y%m%d'), '%')
`;

// ========== 저장 관련 쿼리 ==========

// 13. BOM 마스터 저장 (신규/수정 통합)
const saveBomMaster = `
  INSERT INTO tablets.bom_master (
    bom_code, product_code, bom_reg_date, bom_update_date
  ) VALUES (?, ?, NOW(), NULL)
  ON DUPLICATE KEY UPDATE
    product_code = VALUES(product_code),
    bom_update_date = NOW()
`;

// 14. BOM 자재 정보 저장 전 기존 데이터 삭제
const deleteBomMaterials = `DELETE FROM tablets.bom_detail WHERE bom_code = ?`;

// 15. BOM 자재 정보 저장
const insertBomMaterial = `
  INSERT INTO tablets.bom_detail (
    bom_code, material_code, usage_qty, bom_unit
  ) VALUES (?, ?, ?, ?)
`;

// 16. BOM 마스터 수정일 업데이트
const updateBomMasterDate = `
  UPDATE tablets.bom_master
  SET bom_update_date = NOW()
  WHERE bom_code = ?
`;

// ========== 통합조회 관련 쿼리 ==========

// 17. BOM 통합조회 목록
const getBomIntegratedList = `
  SELECT 
    bm.bom_code,
    bm.product_code,
    bm.bom_reg_date,
    bm.bom_update_date,
    p.product_name,
    p.product_unit,
    p.product_stand,
    
    -- 자재 정보 (자재명과 투입량 포함)
    COALESCE(
      (SELECT GROUP_CONCAT(
        CONCAT(m2.material_name, '(', bd2.usage_qty, bd2.bom_unit, ')')
        ORDER BY bd2.bom_detail_id
        SEPARATOR ', '
      )
      FROM tablets.bom_detail bd2 
      LEFT JOIN tablets.material m2 ON bd2.material_code = m2.material_code 
      WHERE bd2.bom_code = bm.bom_code),
      '자재없음'
    ) as material_summary,
    
    -- 전체 자재 개수
    COALESCE(
      (SELECT COUNT(*) FROM tablets.bom_detail bd3 WHERE bd3.bom_code = bm.bom_code), 
      0
    ) as material_count

  FROM tablets.bom_master bm
  JOIN tablets.product p ON bm.product_code = p.product_code
  WHERE 1=1
    AND (? = '' OR bm.bom_code LIKE CONCAT('%', ?, '%'))
    AND (? = '' OR p.product_name LIKE CONCAT('%', ?, '%'))
    AND (? = '' OR p.product_code LIKE CONCAT('%', ?, '%'))
    AND (? = '' OR EXISTS (
      SELECT 1 FROM tablets.bom_detail bd
      LEFT JOIN tablets.material m ON bd.material_code = m.material_code
      WHERE bd.bom_code = bm.bom_code 
      AND COALESCE(m.material_name, '') LIKE CONCAT('%', ?, '%')
    ))
    AND (? = '' OR DATE(bm.bom_reg_date) >= ?)
    AND (? = '' OR DATE(bm.bom_reg_date) <= ?)
    
  ORDER BY bm.bom_reg_date DESC, bm.bom_code DESC
`;

// ========== 공정흐름도 관리용 (기존 유지) ==========

// 18. 공정흐름도 관리 상세정보 추가를 위한 리스트
const getProcessBomList = `
  SELECT 
    bm.bom_code,
    bm.product_code,
    p.product_name,
    p.product_stand,
    bd.material_code,
    m.material_name,
    m.material_unit,
    m.material_stand,
    m.material_cls,
    bd.usage_qty,
    bm.bom_reg_date,
    bm.bom_update_date
  FROM tablets.bom_master bm
  JOIN tablets.product p ON bm.product_code = p.product_code
  LEFT JOIN tablets.bom_detail bd ON bm.bom_code = bd.bom_code
  LEFT JOIN tablets.material m ON bd.material_code = m.material_code  
  WHERE p.product_code = ?
  ORDER BY bm.bom_code DESC
`;

// 모든 쿼리 객체 내보내기
module.exports = {
  // 검색 관련
  searchBomProducts,
  searchBomMaterials,
  searchBomList,
  
  // 조회 관련
  getBomInfo,
  getBomMaterials,
  getBomList,
  getProductList,
  getMaterialList,
  
  // 중복 체크 관련
  checkDuplicateBom,
  checkBomCodeExists,
  getLatestBomCodeByProduct,
  
  // 번호 생성
  generateBomCode,
  
  // 저장 관련
  saveBomMaster,
  deleteBomMaterials,
  insertBomMaterial,
  updateBomMasterDate,
  
  // 통합조회
  getBomIntegratedList,
  
  // 공정흐름도용 (기존)
  getProcessBomList
};