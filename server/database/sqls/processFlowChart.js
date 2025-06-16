const groupInsert = `
INSERT INTO process_group (
  process_group_code,
  product_code
) VALUES (?, ?)
`;


const processInsert = 
`INSERT INTO process(
                    process_code,
                    process_name,
                    process_seq,
                    process_time,
                    code_value,
                    process_remark,
                    process_dt,
                    process_group_code)
VALUES(?, ?, ?, ?, ?, ?, NOW(), ?)`
;

const processSelect =
  `SELECT p.process_code,
          p.process_name,
          p.process_seq,
          p.process_time,
          p.code_value
   FROM   process p
   JOIN   process_group pg
     ON   p.process_group_code = pg.process_group_code
   WHERE  pg.product_code = ?`
;

const processUpdate = 
  `UPDATE process
   SET    process_name = ?,
          process_seq = ?,
          process_time = ?,
          code_value = ?
   WHERE  process_code = ?`
;

const processDELETE =
  `DELETE FROM process
   WHERE process_code = ?`
;

const processGroupSelect =
  `
   SELECT process_group_code
   FROM   process_group
   WHERE  process_group_code = ?`
;

const processDetail =
  `INSERT INTO process_detail(
                              process_code,
                              BOM_code,
                              material_code,
                              name,
                              insert_date)
   VALUES (?, ?, ?, ? ,NOW())`
;

// 상세추가시 전부 삭제후 저장(수정)
const processUpdateDetail = 
  `DELETE FROM process_detail
   WHERE process_code = ?`
;

const processDetailSelect =
  `SELECT 
      pd.material_code,
      pd.BOM_code,
      pd.name,
      bd.usage_qty,
      m.material_name,
      m.material_unit
  FROM process_detail pd
  JOIN bom_detail bd 
    ON pd.material_code = bd.material_code
  JOIN bom_master bm 
    ON pd.BOM_code = bm.bom_code AND bm.bom_code = bd.bom_code
  JOIN material m 
    ON pd.material_code = m.material_code
  WHERE pd.process_code = ?
  ORDER BY material_code`
;


const processDetailDELETE =
  `DELETE FROM process_detail
   WHERE  process_code = ?
   AND   material_code = ?`
;

module.exports ={
  groupInsert,
  processInsert,
  processDetail,
  processSelect,
  processDetailSelect,
  processDELETE,
  processDetailDELETE,
  processUpdate,
  processUpdateDetail,
  processGroupSelect
}