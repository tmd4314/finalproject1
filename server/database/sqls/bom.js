// server/database/sqls/bom.js
module.exports = {
  // BOM 전체 리스트 + 제품명
  selectAllBom: `
    SELECT bm.bom_code, bm.product_code, p.product_name, bm.bom_reg_date
    FROM bom_master bm
    LEFT JOIN product p ON bm.product_code = p.product_code
    ORDER BY bm.bom_code
  `,
  // 특정 BOM 상세
  selectBomDetail: `
    SELECT bom_code, product_code, bom_reg_date
    FROM bom_master
    WHERE bom_code = ?
  `,
  // BOM에 속한 자재 목록
  selectBomMaterials: `
    SELECT bd.material_code, m.material_name, bd.usage_qty, bd.bom_unit
    FROM bom_detail bd
    LEFT JOIN material m ON bd.material_code = m.material_code
    WHERE bd.bom_code = ?
  `,
  // BOM 신규등록
  insertBomMaster: `
    INSERT INTO bom_master (bom_code, product_code, bom_reg_date)
    VALUES (?, ?, NOW())
  `,
  // BOM 자재등록
  insertBomDetail: `
    INSERT INTO bom_detail (bom_code, material_code, usage_qty, bom_unit)
    VALUES (?, ?, ?, ?)
  `,
  // BOM 기본정보 수정
  updateBomMaster: `
    UPDATE bom_master SET product_code = ? WHERE bom_code = ?
  `,
  // BOM 자재 전체 삭제(수정시)
  deleteBomDetails: `
    DELETE FROM bom_detail WHERE bom_code = ?
  `,
};
