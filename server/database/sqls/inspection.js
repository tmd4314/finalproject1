// 공정명 리스트
const processNameList = 
`
SELECT process_int,
       process_name
FROM   process_it
`
;

// 공정별 조건 리스트
const inspectionListByProcessName =
`
SELECT 
  insp_code,
  insp_value_type,
  insp_unit,
  insp_value_qty,
  insp_value_min,
  insp_value_max,
  insp_remark,
  process_int
FROM 
  inspection_standard
WHERE 
  process_int = ?;
`

// 검사정보 등록
const insertInspection = 
`
INSERT INTO inspection_standard (
  process_int,
  insp_value_type,
  insp_unit,
  insp_value_qty,
  insp_value_min,
  insp_value_max,
  insp_remark
) VALUES (?, ?, ?, ?, ?, ?, ?)
`
module.exports = {
  processNameList,
  inspectionListByProcessName,
  insertInspection
}
