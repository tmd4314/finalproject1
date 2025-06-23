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

const selectWorkOrderNosByProductCode = `
  SELECT DISTINCT work_order_no
  FROM faulty_product
  WHERE product_code = ?
  ORDER BY work_order_no;
`;

const selectFaultyDetail = `
SELECT 
  process_name,
  DATE_FORMAT(created_at, '%Y-%m-%d') AS created_at,
  quantity,
  defect_type
FROM faulty_product
WHERE product_code = ? AND work_order_no = ?
ORDER BY created_at DESC
LIMIT 1;
`;

const insertFaultyDisuse = `
INSERT INTO faulty_disuse 
(product_code, work_order_no, process_name, occur_date, defect_type, faulty_quantity, representative, disuse_reason, disuse_state) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);

`;

module.exports = {
    selectFaultyProductName,
    selectWorkOrderNosByProductCode,
    selectFaultyDetail,
    insertFaultyDisuse
};