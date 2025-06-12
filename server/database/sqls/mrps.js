const planList =
` SELECT 
    ppm.plan_id,
    ppm.plan_name,
    ppm.plan_reg_dt,
    ppd.product_code,
    p.product_name,
    p.product_safty,
    pl.quantity
  FROM production_plan_master ppm
  JOIN production_plan_detail ppd 
    ON ppm.plan_id = ppd.plan_id
  JOIN product p 
    ON ppd.product_code = p.product_code
  JOIN product_lot pl 
    ON ppd.product_code = pl.product_code
  WHERE ppm.check_ordered = 0
`
;

const needMaterialList = 
`SELECT
      pm.plan_id,
      pd.product_code,
      p.product_name,
      pd.plan_qty,
      md.material_code,
      m.material_name,
      m.material_unit,
      m.material_cls,
      md.usage_qty,
      (md.usage_qty * pd.plan_qty) AS total_needed_qty,
      IFNULL(SUM(ml.quantity), 0) AS current_stock_qty,
      (md.usage_qty * pd.plan_qty) - IFNULL(SUM(ml.quantity), 0) AS shortage_qty
  FROM production_plan_master pm
  JOIN production_plan_detail pd 
    ON pm.plan_id = pd.plan_id
  JOIN product p 
    ON pd.product_code = p.product_code
  JOIN bom_master bm 
    ON bm.product_code = pd.product_code
  JOIN bom_detail md 
    ON md.bom_code = bm.bom_code
  JOIN material m 
    ON m.material_code = md.material_code
  LEFT JOIN material_lot ml 
    ON ml.material_code = m.material_code
  WHERE pm.plan_id = ?
  GROUP BY md.material_code
  HAVING shortage_qty > 0
`
;

const planListUpdate = 
` UPDATE production_plan_master
  SET    check_ordered = 1
  WHERE  plan_id = ?
`
;

const purchaseInsert =
` INSERT INTO purchase_order (purchase_order_id,
                              purchase_order_name,
                              purchase_order_quantity,
                              purchase_order_date,
                              material_code) 
  VALUES (?, ?, ?, NOW(), ?)
`
;

module.exports ={
  planList,
  needMaterialList,
  planListUpdate,
  purchaseInsert
}