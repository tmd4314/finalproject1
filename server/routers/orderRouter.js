const express = require("express");
const router = express.Router();
const orderService = require("../services/order_service.js");

// [주문 목록 조회] GET /api/orders
router.get("/", async (req, res) => {
    let orderList = await orderService.findAllOrders().catch((err) => console.log(err));
    res.send(orderList);
});

// [주문 상세 조회] GET /api/orders/:order_id/details
router.get("/:order_id/details", async (req, res) => {
    const orderId = req.params.order_id;
    let detail = await orderService.findOrderDetail(orderId).catch((err) => {
        console.log(err);
        return null;
    });

    console.log("주문 상세 결과:", detail);

    res.send(detail);
});

// [주문+품목 목록] GET /api/orders/with-items
router.get("/with-items", async (req, res) => {
    let result = await orderService.findAllOrdersWithItems().catch((err) => console.log(err));
    res.send(result);
});

module.exports = router;
