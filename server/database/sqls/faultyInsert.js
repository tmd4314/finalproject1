//품질검사 불합판정된 정보 리스트
const selectFaultyProductName = `
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

const selectFaultyWorkOrderNo = 
`
SELECT DISTINCT wom.work_order_no
FROM work_order_master wom
JOIN work_order_detail wod ON wom.work_order_no = wod.work_order_no
JOIN work_result wr ON wom.work_order_no = wr.work_order_no
JOIN work_result_detail wrd ON wr.result_id = wrd.result_id
WHERE wod.product_code = ?
  AND wrd.code_value = 'p7'
ORDER BY wom.work_order_no;
`
;

const selectFaultyTestDetail = `
SELECT 
  process_name,
  insp_value_qty,
  DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at,
  qual_remark
FROM 
  quality_test
WHERE 
  work_order_no = ? 
  AND qual_result = '불합'
LIMIT 1;
`;

module.exports = {
  selectFaultyProductName,
  selectFaultyWorkOrderNo,
  selectFaultyTestDetail
}

