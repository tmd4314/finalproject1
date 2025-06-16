// 전체 조회

const selectInspectionList = 
`SELECT   insp_code,
          insp_name,
          insp_value_type,
          insp_ref_value,
          insp_quantita_value,
          insp_qualita_value,
          insp_unit,
          insp_quantita_min,
          insp_quantita_max,
          insp_range,
          insp_remark
FROM      inspection_item
ORDER BY insp_code`
;

const productNameList = 
`SELECT product_name, MIN(product_code) AS product_code
FROM product
GROUP BY product_name
ORDER BY product_name;
`
;

const insertInspection =
`INSERT INTO inspection_item (
  product_code,          
  insp_code,
  insp_name,
  insp_value_type,
  insp_ref_value,
  insp_quantita_value,
  insp_qualita_value,
  insp_unit,
  insp_quantita_min,
  insp_quantita_max,
  insp_range,
  insp_remark
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`
;

module.exports = {
  selectInspectionList,
  productNameList,
  insertInspection
}
