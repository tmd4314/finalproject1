// 전체조회
const selectInspectionList = 
`SELECT  insp_code,
         item_type,
         insp_name,
         insp_stad_val,
         insp_unit,
         insp_judt_type,
         insp_remark
FROM     inspection_item
ORDER BY insp_code`
;

module.exports ={
  selectInspectionList
}
