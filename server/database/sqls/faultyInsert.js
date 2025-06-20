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

const selectWorkOrderDetailNo = 
`
SELECT DISTINCT wom.work_order_no
FROM work_order_master wom
JOIN work_order_detail wod ON wom.work_order_no = wod.work_order_no
WHERE wod.product_code = ?  
ORDER BY wom.work_order_no;
`
;


module.exports = {
  selectFaultyProductName,
  selectWorkOrderDetailNo
}

