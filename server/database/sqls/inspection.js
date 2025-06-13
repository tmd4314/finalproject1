// 전체 조회

const selectInspectionList = 
`SELECT   insp_code,
          insp_name,
          insp_value_type,
          insp_ref_value,
          insp_quantita_value,
          insp_qualita_value,
          insp_unit,
          insp_quantita_min,
          insp_quantita_max,
          insp_range,
          insp_remark
FROM      inspection_item
ORDER BY insp_code`
;




module.exports = {
  selectInspectionList
}
