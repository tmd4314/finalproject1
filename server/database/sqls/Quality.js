const selectWorkOrder = 
`SELECT work_order_no
FROM  work_order_master
ORDER BY work_order_no
`
;

// 작업지시마스터, 작업지시디테일, 제품검사 테이블 조인하여 작업지시서번호에 맞는 디테일정보와 검사정보 불러오기
const selectWorkOrderDetail = 
`
SELECT DISTINCT
    wm.work_order_no,
    wrd.manager_id,
    wd.product_code,
    p.product_name,
    i.insp_name,
    i.insp_value_type,
    i.insp_ref_value,
    i.insp_quantita_value,
    i.insp_qualita_value,
    i.insp_unit,
    i.insp_quantita_min,
    i.insp_quantita_max,
    i.insp_range,
    i.insp_remark
FROM work_order_master wm
JOIN work_order_detail wd ON wm.work_order_no = wd.work_order_no
JOIN product p ON wd.product_code = p.product_code
JOIN inspection_item i ON wd.product_code = i.product_code
JOIN work_result wr ON wm.work_order_no = wr.work_order_no
JOIN work_result_detail wrd ON wr.result_id = wrd.result_id
WHERE wm.work_order_no = ?;
`
;

const selectProductLists = `
  SELECT DISTINCT product_name
  FROM product
  ORDER BY product_name
`

const selectWorkOrdersByProductName = `
  SELECT DISTINCT wm.work_order_no
  FROM work_order_master wm
  JOIN work_order_detail wd ON wm.work_order_no = wd.work_order_no
  JOIN product p ON wd.product_code = p.product_code
  WHERE p.product_name = ?
  ORDER BY wm.work_order_no
`

module.exports = {
  selectWorkOrder,
  selectWorkOrderDetail,
  selectProductLists,
  selectWorkOrdersByProductName
}