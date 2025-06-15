const mariadb = require("../database/mapper.js");
const { convertObjToAry } = require('../utils/converts.js')
const { formatDateToYMD } = require('../utils/dateFormat.js')


// const { convertObjToAry } = require("../utils/converts.js");

// [주문 목록 조회]
const findAllOrders = async () => {
    let list = await mariadb.query("getOrderList").catch((err) => console.log(err));
    return list;
};

// [주문 상세 조회]
const findOrderDetail = async (orderId) => {
    const [order] = (await mariadb.query("getOrderDetail", [orderId]).catch((err) => console.log(err))) || [];
    const items = (await mariadb.query("getOrderItems", [orderId]).catch((err) => console.log(err))) || [];
    return { order, items };
};

// [주문 + 품목 목록 전체 조회]
const findAllOrdersWithItems = async () => {
    let list = await mariadb.query("getOrderListWithItems").catch((err) => console.log(err));
    return list;
};

// 주문 마스터, 주문 상세 등록 같은 함수 내에서.
// 1. 주문 마스터 등록
const addOrderTransaction = async (orderData) => {
    let masterColumns = [
        'account_id',
        'order_date',
        'delivery_date',
        'status',
        'remarks',
        'reg_date',
        'created_by'
    ];
    let masterData = convertObjToAry({
        account_id: orderData.customerId.value,
        order_date: formatDateToYMD(orderData.orderDate),
        delivery_date: formatDateToYMD(orderData.deliveryDate),
        status: '대기',
        remarks: '',
        reg_date: new Date(),
        created_by: orderData.createdBy
    }, masterColumns);

    let resMaster = await mariadb.query("insertOrderMaster", masterData)
        .catch(err => {
            console.error(err);
            return null;
        });

    if (!resMaster) {
        return {
            isSuccessed: false,
            message: '주문마스터 등록 실패!!',
        };
    }

    const orderId = resMaster.insertId;

    //2. 주문상세 반복 등록
    for (const product of orderData.products) {
        let detailColumns = [
        'order_id',
        'product_code',
        'order_qty',
        'order_price',
        'progress_status',
        'delivery_qty',
        'remain_qty',
        'remarks',
        'reg_date'
    ];

    let detailData = convertObjToAry({
        order_id: orderId,
        product_code: product.productCode,
        order_qty: product.quantity,
        order_price: product.orderPrice,
        progress_status: '대기',
        delivery_qty: 0,
        remain_qty: product.quantity,
        remarks: '',
        reg_date: new Date()
    }, detailColumns);

    let resDetail = await mariadb.query("insertOrderDetail", detailData)
        .catch(err => {
            console.error(err);
            return null;
        });

    if (!resDetail || resDetail.affectedRows === 0) {
        return {
            isSuccessed: false,
            message: '주문상세 등록 실패!!'
        }
    }

}

    // 전체 성공시
    return {
        isSuccessed: true,
        orderId: orderId
    }
}




module.exports = {
    findAllOrders,
    findOrderDetail,
    findAllOrdersWithItems,
    addOrderTransaction,

};