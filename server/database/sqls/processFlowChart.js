const processInsert = 
  `INSERT INTO process(
                      process_code,
                      process_name,
                      process_seq,
                      process_time,
                      code_value,
                      process_remark,
                      process_dt,
                      product_code)
  VALUES(?, ?, ?, ?, ?, ?, NOW(), ?)`
  ;

const processSelect =
  `SELECT process_code,
          process_name,
          process_seq,
          process_time,
          code_value
   FROM   process
   WHERE  product_code = ?`
;

const processUpdate = 
  `UPDATE process
   SET
   WHERE`

const processDELETE =
  `DELETE FROM process
   WHERE process_code = ?`
;

const processDetail =
  `INSERT INTO process_detail(
                              process_code,
                              material_code,
                              BOM_code,
                              name,
                              insert_date,
                              input_qty)
   VALUES (?, ?, ?, ?, NOW(), ?)`
;

const processDetailSelect =
  `SELECT material_code,
          BOM_code,
          input_qty,
          name
   FROM   process_detail
   WHERE  process_code = ?`
;


const processDetailDELETE =
  `DELETE FROM process_detail
   WHERE  process_code = ?
   AND   material_code = ?`
;

module.exports ={
  processInsert,
  processDetail,
  processSelect,
  processDetailSelect,
  processDELETE,
  processDetailDELETE
}