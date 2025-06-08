 // Table : t_book_01
 // 각 변수별로 SQL문을 등록할 떄 백틱(``)을 사용하는 이유는 줄바꿈 허용을 허용하기 떄문.
 // ( 따옴표는 줄을 바꿀 경우 값이 깨지면서 에러발생 )
 // 조건없이 전체조회
const selectMaterialList =
 `SELECT   material_code,
           material_name,
           material_pay,
           material_cls,
           material_stand,
           material_unit,
           material_safty
  FROM     material
  ORDER BY material_code`
  ;
 // 등록
const materialInsert = 
`INSERT INTO material (material_code,
                      material_name,
                      material_pay,
                      material_cls,
                      material_stand,
                      material_unit,
                      material_safty,
                      material_img)
VALUES(?, ?, ?, ?, ?, ?, ?, ?)`
;
 // 수정
 const materialUpdate = 
 `  UPDATE material 
  SET 
    material_name = ?,
    material_pay = ?,
    material_cls = ?,
    material_stand = ?,
    material_unit = ?,
    material_safty = ?,
    material_img = ?
  WHERE material_code = ?
`
 ;
 const materialDelete = 
 `DELETE FROM material
  WHERE material_code = ?`
 ;

 module.exports ={
    selectMaterialList,
    materialInsert,
    materialUpdate,
    materialDelete
 }