const workList =
`
    SELECT     wm.work_order_no,
               p.product_unit,
               p.product_name,
               p.product_stand,
               wr.production_qty,
               wm.order_start_dt
        FROM   work_order_master wm
        JOIN   work_order_detail wd
          ON   wm.work_order_no = wd.work_order_no
        JOIN   product p
          ON   wd.product_code = p.product_code
        JOIN   work_result wr
          ON   wm.work_order_no = wr.work_order_no
        JOIN   common_code co
          ON   wr.code_value = co.code_value
        WHERE  co.code_label = "대기 중"
`
;

const delList =
`
    SELECT wm.work_order_no,
           m.material_code,
           m.material_name,
           wr.production_qty,
           m.material_unit,
           (bd.usage_qty * wr.production_qty) AS qty,
           ml.quantity,
           ml.lot_number
    FROM   work_order_master wm
    JOIN   work_order_detail wd
      ON   wm.work_order_no = wd.work_order_no
    JOIN   work_result wr
      ON   wm.work_order_no = wr.work_order_no
    JOIN   bom_master bm
      ON   wd.product_code = bm.product_code
    JOIN   bom_detail bd
      ON   bm.bom_code = bd.bom_code
    JOIN   material m
      ON   bd.material_code = m.material_code
    JOIN   material_lot ml
      ON   m.material_code = ml.material_code
    WHERE  wm.work_order_no = ?
`
;

const insertDel = 
`
  INSERT INTO material_outbound(outbound_id,
                                material_code,
                                outbound_date,
                                outbound_qty,
                                name,
                                lot_number,
                                work_order_no)
  VALUES(?, ?, NOW(), ?, ?, ?, ?)
`
;

const updateMaterial =
` UPDATE material_lot
  SET    quantity = ?
  WHERE  material_code = ?
    AND  lot_number =?
`
;

const updateResult = 
` UPDATE work_result 
  SET    code_value = "p2"
  WHERE  work_order_no = ?
`
;

const delCheckList =
`
  SELECT mo.outbound_id,
        mo.material_code,
        m.material_name,
        m.material_unit,
        m.material_cls,
        mo.outbound_date,
        mo.outbound_qty,
        mo.lot_number
  FROM   material_outbound mo
  JOIN   material m
    ON   mo.material_code = m.material_code;
`
;

module.exports = {
    workList,
    delList,
    insertDel,
    updateMaterial,
    updateResult,
    delCheckList
}