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

const insertInspectionList = 
`INSERT INTO inspection_item(
                             insp_code,
                             item_type,
                             insp_name,
                             insp_stad_val,
                             insp_unit,
                             insp_judt_type,
                             insp_remark
                             )
VALUES(?,?,?,?,?,?,?)`
;

const updateInspection = `
  UPDATE inspection_item
  SET item_type = ?,
      insp_name = ?,
      insp_stad_val = ?,
      insp_unit = ?,
      insp_judt_type = ?,
      insp_remark = ?
  WHERE insp_code = ?
`;

  const deleteInspection = `
    DELETE FROM inspection_item
    WHERE insp_code = ?
  `
  ;

module.exports ={
  selectInspectionList,
  insertInspectionList,
  updateInspection,
  deleteInspection
}
