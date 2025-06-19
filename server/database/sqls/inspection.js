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
  insp_code,
  process_int,
  insp_value_type,
  insp_unit,
  insp_value_qty,
  insp_value_min,
  insp_value_max,
  insp_remark
) VALUES (
  (
    SELECT CONCAT('IC', DATE_FORMAT(NOW(), '%Y'),
           LPAD(IFNULL(MAX(CAST(SUBSTRING(insp_code, 9, 4) AS UNSIGNED)), 0) + 1, 4, '0'))
    FROM inspection_standard
    WHERE SUBSTRING(insp_code, 3, 4) = DATE_FORMAT(NOW(), '%Y')
  ),
  ?, ?, ?, ?, ?, ?, ?
)
`
module.exports = {
  processNameList,
  inspectionListByProcessName,
  insertInspection
}
