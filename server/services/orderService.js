const mariadb = require("../database/mapper.js");
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

module.exports = {
    findAllOrders,
    findOrderDetail,
    findAllOrdersWithItems,
};
