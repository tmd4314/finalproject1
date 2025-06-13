const selectOrderList =
 `SELECT  po.purchase_order_id,
          po.purchase_order_name,
          po.purchase_order_quantity,
          po.purchase_order_date,
          po.due_date,
          po.name,
          po.material_code,
          pd.material_name,
          pd.material_unit,
          pt.material_qual_num,
          pt.material_expiration_date
  FROM    purchase_order po
  JOIN    material_quality_test pt
    ON    po.purchase_order_id = pt.purchase_order_id
  JOIN    material pd
    ON    po.material_code = pd.material_code
  JOIN    common_code co
    ON    po.code_value = co.code_value 
  JOIN    common_code cq
    ON    pt.code_value = cq.code_value
  WHERE   co.code_label = "수령"
   AND    cq.code_label = "합격"`
  ;

const insertMaterialLOT =
  ` INSERT INTO material_lot(
                              lot_number,
                              material_code,
                              received_date,
                              expiry_date,
                              quantity,
                              purchase_order_id)
    VALUES (?, ?, NOW(), ?, ?, ?)
  `
;

const updateOrder = 
  ` UPDATE purchase_order
    SET    code_value = "y5"
    WHERE  purchase_order_id = ?
  `
;

const selectLotList = 
  `SELECT  mt.lot_number,
          m.material_code,
          m.material_name,
          m.material_unit,
          mt.quantity,
          m.material_cls,
          mt.received_date
  FROM material_lot mt
  JOIN material m
    ON m.material_code = mt.material_code;
  `
;

const orderCheck =
  `SELECT  po.purchase_order_id,
           m.material_code,
           m.material_name,
           m.material_unit,
           po.purchase_order_quantity,
           po.purchase_order_date,
           po.account_id,
           ac.account_name
    FROM   purchase_order po
    JOIN   material m
      ON   po.material_code = m.material_code
    JOIN   account ac
      ON   po.account_id = ac.account_id
    JOIN   common_code co
      ON   po.code_value = co.code_value
    WHERE  co.code_label = "발주완료"
  `
;

const orderCheckUpdate =
  ` UPDATE purchase_order
    SET    code_value = "y4"
    WHERE  purchase_order_id = ?
  `
;

module.exports ={
  selectOrderList,
  insertMaterialLOT,
  updateOrder,
  selectLotList,
  orderCheck,
  orderCheckUpdate
}