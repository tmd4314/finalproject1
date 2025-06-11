// 불량유형 전체 조회
const selectDefectList =
`SELECT   defect_type_code,
          defect_type_name,
          defect_type_remark
 FROM     defect_type
 ORDER BY defect_type_code`
 ;

// 불량유형 추가
const insertDefect = 
`INSERT INTO defect_type(
                         defect_type_code,
                         defect_type_name,
                         defect_type_remark
                         )
VALUES(?,?,?)`
;

const updateDefect = 
`UPDATE defect_type
 SET    defect_type_name = ?,
        defect_type_remark =?
 WHERE  defect_type_code =?`
;

 module.exports = {
  selectDefectList,
  insertDefect,
  updateDefect
 }