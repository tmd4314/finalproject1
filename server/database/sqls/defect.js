// 불량유형 전체 조회
const selectDefectList = 
  `SELECT   defect_type_code,
            defect_type_name,
            defect_type_remark
   FROM     defect_type
   ORDER BY defect_type_code`
  ;