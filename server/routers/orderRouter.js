const express = require("express");
const router = express.Router();
const orderService = require("../services/orderService.js");

// [주문 목록 조회] GET /api/orders
router.get("/", async (req, res) => {
    let orderList = await orderService.findAllOrders().catch((err) => console.log(err));
    res.send(orderList);
});

// [주문+품목 목록] GET /api/orders/with-items
router.get("/with-items", async (req, res) => {
    let result = await orderService.findAllOrdersWithItems().catch((err) => console.log(err));
    res.send(result);
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


// [주문 등록] POST /api/orders
router.post("/", async (req, res) => {
    try {
        const orderData = req.body;
        console.log("주문 등록 요청 데이터:", orderData);
        
        // 필수 데이터 검증
        if (!orderData.customerId || !orderData.orderDate || !orderData.deliveryDate) {
            return res.status(400).json({
                success: false,
                message: "필수 정보가 누락되었습니다."
            });
        }
        
        if (!orderData.products || orderData.products.length === 0) {
            return res.status(400).json({
                success: false,
                message: "제품 정보가 없습니다."
            });
        }
        
        // orderService에서 처리
        const result = await orderService.createOrder(orderData);
        
        res.status(201).json({
            success: true,
            message: "주문이 등록되었습니다.",
            orderId: result.orderId
        });
        
    } catch (error) {
        console.error("주문 등록 실패:", error);
        res.status(500).json({
            success: false,
            message: "주문 등록에 실패했습니다.",
            error: error.message
        });
    }
});

// [주문 수정] PUT /api/orders/:order_id
router.put("/:order_id", async (req, res) => {
    try {
        const orderId = req.params.order_id;
        const orderData = req.body;
        
        console.log(`주문 수정 요청 - ID: ${orderId}`, orderData);
        
        const result = await orderService.updateOrder(orderId, orderData);
        
        res.json({
            success: true,
            message: "주문이 수정되었습니다."
        });
        
    } catch (error) {
        console.error("주문 수정 실패:", error);
        res.status(500).json({
            success: false,
            message: "주문 수정에 실패했습니다.",
            error: error.message
        });
    }
});

// [주문 삭제] DELETE /api/orders/:order_id
router.delete("/:order_id", async (req, res) => {
    try {
        const orderId = req.params.order_id;
        
        await orderService.deleteOrder(orderId);
        
        res.json({
            success: true,
            message: "주문이 삭제되었습니다."
        });
        
    } catch (error) {
        console.error("주문 삭제 실패:", error);
        res.status(500).json({
            success: false,
            message: "주문 삭제에 실패했습니다.",
            error: error.message
        });
    }
});

module.exports = router;
