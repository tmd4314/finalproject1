const selectProductName = `
SELECT 
  MIN(product_code) AS product_code, 
  product_name
FROM 
  product
GROUP BY 
  product_name
ORDER BY 
  product_name;
`;

const selectWorkOrderNo = 
`
SELECT DISTINCT wom.work_order_no
FROM work_order_master wom
JOIN work_order_detail wod ON wom.work_order_no = wod.work_order_no
WHERE wod.product_code = ?  -- 여기에 선택한 product_code가 들어갑니다
ORDER BY wom.work_order_no;
`
;

const selectWorkOrderDetail =
`
SELECT 
  wrd.pass_qty,
  wrd.manager_id,
  p.process_name
FROM 
  work_result wr
JOIN 
  work_result_detail wrd ON wr.result_id = wrd.result_id
LEFT JOIN 
  process p ON wrd.process_code = p.process_code
WHERE 
  wr.work_order_no = ?
  AND wrd.code_value = 'p4';
`
;

const selectInspectionStandardByProcessName = `
SELECT 
  i.insp_value_type,
  i.insp_unit,
  i.insp_value_qty,
  i.insp_value_min,
  i.insp_value_max
FROM 
  inspection_standard i
JOIN 
  process_it pit ON i.process_int = pit.process_int
WHERE 
  pit.process_name = ?;
`;

module.exports = {
  selectProductName,
  selectWorkOrderNo,
  selectWorkOrderDetail,
  selectInspectionStandardByProcessName
};