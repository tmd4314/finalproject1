module.exports = {
    // 주문 목록(좌측 리스트)
    getOrderList: `
    SELECT om.order_id, 
           ac.account_name, 
           om.order_date, 
           om.status
    FROM ORDER_MASTER om
    LEFT JOIN ACCOUNT ac ON om.account_id = ac.account_id
    ORDER BY om.order_id DESC
  `,
    // 주문 기본정보(상세 우측 헤더)
    getOrderDetail: `
    SELECT om.order_id, 
           om.order_date, 
           om.delivery_date, 
           om.status, 
           om.created_by,
           ac.account_name, 
           ac.phone, 
           ac.charger_name, 
           ac.address
    FROM ORDER_MASTER om
    LEFT JOIN ACCOUNT ac ON om.account_id = ac.account_id
    WHERE om.order_id = ?
  `,
    // 주문 품목 리스트(상세 우측 하단)
    getOrderItems: `
    SELECT od.product_code, 
           p.product_name, 
           p.product_stand, 
           od.order_qty, 
           p.stock, 
           od.remarks
    FROM ORDER_DETAIL od
    LEFT JOIN PRODUCT p ON od.product_code = p.product_code
    WHERE od.order_id = ?
  `,

    // 주문+품목 목록(주문관리화면 상단)
    getOrderListWithItems: `
    SELECT om.order_id, 
           ac.account_id,
           ac.account_name, 
           om.order_date, 
           om.delivery_date,
           p.product_name, 
           p.product_stand, 
           od.order_qty, 
           od.product_code, 
           om.status
    FROM ORDER_MASTER om
    LEFT JOIN ACCOUNT ac ON om.account_id = ac.account_id
    LEFT JOIN ORDER_DETAIL od ON om.order_id = od.order_id
    LEFT JOIN PRODUCT p ON od.product_code = p.product_code
    ORDER BY om.order_id DESC, od.order_detail_id
  `,

    // 주문 마스터 등록
    insertOrderMaster: `
    INSERT INTO order_master (
      account_id,
      order_date,
      delivery_date,
      status,
      remarks,
      reg_date,
      created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `,

    // 주문 상세 등록
    insertOrderDetail: `
    INSERT INTO order_detail (
      order_id,
      product_code,
      order_qty,
      order_price,
      progress_status,
      delivery_qty,
      remain_qty,
      remarks
    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?)
  `,

    // 주문 마스터 수정
    updateOrderMaster: `
    UPDATE order_master 
    SET account_id = ?, 
        order_date = ?, 
        delivery_date = ?, 
        status = ?,
        created_by = ?
    WHERE order_id = ?
  `,

    // 주문 상세 삭제 (주문 ID로)
    deleteOrderDetailsByOrderId: `
    DELETE FROM order_detail 
    WHERE order_id = ?
  `,

    // 주문 마스터 삭제
    deleteOrderMaster: `
    DELETE FROM order_master 
    WHERE order_id = ?
  `
};