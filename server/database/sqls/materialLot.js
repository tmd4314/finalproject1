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
          pt.mat_qual_test_status
  FROM    purchase_order po
  JOIN    material_quality_test pt
    ON    po.material_qual_num = pt.material_qual_num
  JOIN    material pd
    ON    po.material_code = pd.material_code
  WHERE   pt.mat_qual_test_status = "합격"
    AND   po.stock_status = "수령"`
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
    SET stock_status = "입고완료"
    WHERE purchase_order_id = ?
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
  `SELECT po.purchase_order_id,
          m.material_code,
          m.material_name,
          m.material_unit,
          po.purchase_order_quantity,
          po.purchase_order_date
    FROM   purchase_order po
    JOIN   material m
      ON   po.material_code = m.material_code
    WHERE  po.stock_status = "발주"
  `
;

module.exports ={
  selectOrderList,
  insertMaterialLOT,
  updateOrder,
  selectLotList,
  orderCheck
}