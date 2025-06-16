const purchaseList = 
` SELECT  po.purchase_order_id, 
          po.material_code,
          m.material_name,
          m.material_safty,
          m.material_unit,
          m.material_cls,
          po.purchase_order_quantity
  FROM   material m
  JOIN   purchase_order po
    ON   po.material_code = m.material_code
  JOIN   common_code co
    ON   po.code_value = co.code_value
  WHERE   co.code_label = "발주";
`
;

const purchaseInsertList = 
` SELECT  po.purchase_order_id,
          po.purchase_order_name,
          po.material_code,
          m.material_name,
          po.purchase_order_quantity,
          po.purchase_order_date,
          m.material_unit
  FROM   material m
  JOIN   purchase_order po
    ON   po.material_code = m.material_code
  JOIN   common_code co
    ON   po.code_value = co.code_value
  WHERE   co.code_label = "발주요청";
`
;

const purchaseListUpdate =
  ` UPDATE purchase_order
    SET    code_value = "y2"
    WHERE  purchase_order_id = ?
  `
;

const purchaseInsertUpdate = 
  ` UPDATE purchase_order
    SET    due_date = ?,
           name = ?,
           account_id = ?
    WHERE  purchase_order_id = ?
`
;

const purchaseStockStatusUpdate = 
  ` UPDATE purchase_order
    SET    code_value = "y3"
    WHERE  purchase_order_id = ?
`
;

const purchaseCheck =
`
  SELECT   po.purchase_order_id,
          po.purchase_order_name,
          m.material_code,
          m.material_name,
          m.material_pay,
          po.purchase_order_quantity,
          m.material_unit,
          po.purchase_order_date,
          po.due_date,
          po.account_id,
          ac.account_name,
          po.name,
          (m.material_pay * po.purchase_order_quantity) AS sumPay,
          ac.business_no,
          ac.address,
          ac.charger_name
  FROM     purchase_order po
  JOIN     material m
    ON     po.material_code = m.material_code
  JOIN     account ac
    ON     po.account_id = ac.account_id
`
;

module.exports = {
  purchaseList,
  purchaseListUpdate,
  purchaseInsertList,
  purchaseInsertUpdate,
  purchaseStockStatusUpdate,
  purchaseCheck
}