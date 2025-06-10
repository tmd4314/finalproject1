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

const processDetail =
  `INSERT INTO process_detail(
                              process_code,
                              material_code,
                              BOM_code,
                              name,
                              insert_date,
                              input_qty)
   VALUES (?, ?, ?, ?, NOW(), ?)`

module.exports ={
  processInsert,
  processDetail
}