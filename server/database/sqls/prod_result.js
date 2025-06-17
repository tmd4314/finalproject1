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
        p.product_name,
        p.product_stand,
        pc.process_code,
        pc.process_name,
        wr.work_start_date,
        wrd.work_start_time,
        wrd.work_end_time,
        wd.work_order_qty,
        wrd.pass_qty,
        cm.code_label AS result_code_label,
        cd.code_label AS detail_code_label,
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
  WHERE  wm.work_order_no = ?
  ORDER BY pc.process_code ASC;
`
;

const selectNoList =
`
  SELECT  wm.work_order_no,
          p.product_name,
          p.product_stand
  FROM    work_order_master wm
  JOIN    work_order_detail wd
    ON    wm.work_order_no = wd.work_order_no
  JOIN    product p 
    ON    wd.product_code = p.product_code

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

module.exports = {
  selectResultList,
  insertResult,
  deleteResult,
  selectNoList,
  selectProcessList
}