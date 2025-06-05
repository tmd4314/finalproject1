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
           p.spec, 
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
           ac.account_name, 
           om.order_date, 
           om.delivery_date,
           p.product_name, 
           p.spec, od.order_qty, 
           od.product_code, 
           om.status
    FROM ORDER_MASTER om
    LEFT JOIN ACCOUNT ac ON om.account_id = ac.account_id
    LEFT JOIN ORDER_DETAIL od ON om.order_id = od.order_id
    LEFT JOIN PRODUCT p ON od.product_code = p.product_code
    ORDER BY om.order_id DESC, od.order_detail_id
  `
};
