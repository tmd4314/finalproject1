const deleteResult = `DELETE FROM work_result WHERE work_order_no = ?;`;

const insertResult =
` INSERT INTO work_result (
                           work_order_no,
                           process_group_code,
                           result_id,
                           work_start_date) 
  VALUES (?, ?, ?, ?)
`
;

const selectResultList = 
`
SELECT DISTINCT
          wr.result_id,
          wrd.result_detail,
          wrd.product_qual_qty,
          p.product_name,
          p.product_stand,
          pc.process_code,
          pc.process_name,
          pc.process_time,
          eq.eq_id,
          eq.eq_name,
          wr.work_start_date,
          wrd.work_start_time,
          wrd.work_end_time,
          wd.work_order_qty,
          wrd.pass_qty,
          cm.code_label AS result_code_label,
          cd.code_label AS detail_code_label,
          cq.code_label,
          wrd.manager_id
    FROM   work_result wr
    JOIN   work_result_detail wrd
      ON   wr.result_id = wrd.result_id
    JOIN   work_order_master wm
      ON   wr.work_order_no = wm.work_order_no
    JOIN   work_order_detail wd
      ON   wm.work_order_no = wd.work_order_no
    JOIN   process_group pg
      ON   wr.process_group_code = pg.process_group_code
    JOIN   process pc
      ON   pc.process_code = wrd.process_code 
    JOIN   product p
      ON   pg.product_code = p.product_code
    JOIN   common_code cm
      ON   wr.code_value = cm.code_value
    JOIN   common_code cd
      ON   wrd.code_value = cd.code_value
    JOIN   equipment eq
      ON   wrd.eq_type_code = eq.eq_type_code
    JOIN   common_code cq
      ON   eq.eq_run_code = cq.code_value
    WHERE  wm.work_order_no = ?
      AND  p.product_stand = ?
    ORDER BY pc.process_code ASC;
`
;

const selectNoList =
`
SELECT
    wr.result_id,
    wr.work_order_no,
    p.product_name,
    p.product_stand
  FROM work_result wr
  JOIN process_group pg 
    ON wr.process_group_code = pg.process_group_code
  JOIN product p 
    ON pg.product_code = p.product_code

`
;

const selectProcessList =
`
  SELECT  pc.process_code,
          pc.process_name,
          p.product_name,
          p.product_stand
  FROM    process_group pg
  JOIN    process pc
    ON    pg.process_group_code = pc.process_group_code
  JOIN    product p
    ON    pg.product_code = p.product_code;

`
;

const selectEqList = 
`
  SELECT eq.eq_id,
         eq.eq_name,
         eq.eq_run_code,
         cm.code_label
  FROM   equipment eq
  JOIN   common_code cm
    ON   eq.eq_run_code = cm.code_value 
`
;

const insertResultDetail =
`
  INSERT INTO work_result_detail(
                            result_id,
                            pass_qty,
                            manager_id,
                            process_code,
                            eq_id)
  VALUES(?, ?, ?, ?, ?)
`
;

const updateResultStatus =
`
  UPDATE work_result
  SET    code_value = "p3"
  WHERE  result_id = ?
`
;

const updateResultDetail =
`
  UPDATE work_result_detail
  SET    manager_id = ?,
         process_code = ?,
         eq_id = ?
  WHERE  result_detail = ?
`
;

const updateStart =
`
  UPDATE work_result_detail  
  SET    work_start_time = ?,
         pass_qty = ?,
         code_value = "p3"
  WHERE  result_detail = ?
`
;

const updateStop =
`
  UPDATE work_result_detail  
  SET    work_end_time = ?,
         pass_qty = ?,
         result_remark = ?,
         code_value = "p4"
  WHERE  result_detail = ?
`
;

const updateEquipment =
`
  UPDATE equipment 
  SET    eq_run_code = "s1"
  WHERE  eq_id = ?
`
;

const updateStopEq =
`
  UPDATE equipment 
  SET    eq_run_code = "s3"
  WHERE  eq_id = ?
`

const startResultWork =
`
  UPDATE work_result
  SET    code_value = "p3"
  WHERE  result_id = ?
`

const endResultWork =
`
  UPDATE work_result
  SET    final_qty = ?,
         code_value = "p4"
  WHERE  result_id = ?
`

module.exports = {
  selectResultList,
  insertResult,
  deleteResult,
  selectNoList,
  selectProcessList,
  selectEqList,
  insertResultDetail,
  updateStart,
  updateEquipment,
  updateStop,
  updateStopEq,
  startResultWork,
  endResultWork,
  updateResultStatus,
  updateResultDetail
}