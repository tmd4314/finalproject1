// server/database/sqls/bom.js

const bom = {
    //bom 조회
  getBomList: `
  SELECT 
      bm.bom_code,
      bm.product_code,
      p.product_name,
      p.product_stand,
      bd.material_code,
      bd.usage_qty
  FROM tablets.bom_master bm
  JOIN tablets.product p ON bm.product_code = p.product_code
  LEFT JOIN tablets.bom_detail bd ON bm.bom_code = bd.bom_code
  ORDER BY bm.bom_code DESC;
`,
getBomDetail: `
  SELECT 
      bm.bom_code,
      bm.product_code,
      bm.bom_reg_date
  FROM tablets.bom_master bm
  WHERE bm.bom_code = ?;
`,
getBomDetailFull: `
  SELECT 
      bm.bom_code,
      bm.product_code,
      p.product_name,
      p.product_stand,
      bd.material_code,
      m.material_name,
      m.material_unit,
      m.material_stand,
      bd.usage_qty,
      bd.bom_unit
  FROM tablets.bom_master bm
  JOIN tablets.product p ON bm.product_code = p.product_code
  JOIN tablets.bom_detail bd ON bm.bom_code = bd.bom_code
  JOIN tablets.material m ON bd.material_code = m.material_code
  WHERE bm.bom_code = ?
  ORDER BY bd.material_code;
`,
 // BOM 마스터 등록 (신규 등록 시)
  insertBomMaster: `
    INSERT INTO tablets.bom_master (
      bom_code,
      product_code,
      bom_reg_date
    ) VALUES (?, ?, NOW());
  `,

  // BOM 마스터 수정 (제품 코드 변경 등)
  updateBomMaster: `
    UPDATE tablets.bom_master
    SET product_code = ?
    WHERE bom_code = ?;
  `,

  // BOM 디테일 자재 추가
  insertBomDetail: `
    INSERT INTO tablets.bom_detail (
      bom_code,
      material_code,
      usage_qty,
      bom_unit
    ) VALUES (?, ?, ?, ?);
  `,

  // BOM 디테일 자재 수정 (투입량 또는 단위 변경)
  updateBomDetail: `
    UPDATE tablets.bom_detail
    SET usage_qty = ?, bom_unit = ?
    WHERE bom_code = ? AND material_code = ?;
  `,

  // BOM 디테일 자재 제거
  deleteBomDetail: `
    DELETE FROM tablets.bom_detail
    WHERE bom_code = ? AND material_code = ?;
  `,

  // 제품 드롭다운용
  prodDropDown: `
    SELECT product_code, product_name, product_stand
    FROM tablets.product;
  `,

  // 자재 검색/리스트
  getMaterialList: `
    SELECT 
        material_code,
        material_name,
        material_cls AS material_type,
        material_unit,
        material_stand
    FROM tablets.material
    ORDER BY material_code ASC;
  `,

  // 공정흐름도 관리 상세정보 추가를 위한 리스트
  getProcessBomList: `
    SELECT 
      bm.bom_code,
      bm.product_code,
      p.product_name,
      p.product_stand,
      bd.material_code,
      m.material_name,
      m.material_unit,
      bd.usage_qty
  FROM tablets.bom_master bm
  JOIN tablets.product p 
      ON bm.product_code = p.product_code
  LEFT JOIN tablets.bom_detail bd 
      ON bm.bom_code = bd.bom_code
  LEFT JOIN tablets.material m 
      ON bd.material_code = m.material_code  
  WHERE p.product_code = ?
  ORDER BY bm.bom_code DESC;
  `

};


module.exports = bom;