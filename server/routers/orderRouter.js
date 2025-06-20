const express = require("express");
const router = express.Router();
const orderService = require("../services/orderService.js");

// [주문 목록 조회] GET /orders
router.get("/orders", async (req, res) => {
    let orderList = await orderService.findAllOrders().catch((err) => console.log(err));
    res.send(orderList);
});

// [주문+품목 목록] GET /orders/with-items
router.get("/orders/with-items", async (req, res) => {
    let result = await orderService.findAllOrdersWithItems().catch((err) => console.log(err));
    res.send(result);
});

// [주문 상세 조회] GET /orders/:order_id/details
router.get("/orders/:order_id/details", async (req, res) => {
    const orderId = req.params.order_id;

    let result = await orderService.findOrderDetail(orderId).catch((err) => {
        console.log(err);
        return null;
    });

    console.log("주문 상세 결과:", result);

    // result가 null이거나 order가 없는 경우
    if (!result || !result.order) {
        return res.send({ order: null, items: [] });
    }

    // orderService에서 { order: {...}, items: [...] } 형태로 반환
    const { order: orderInfo, items } = result;

    const order = {
        account_id: orderInfo.account_id,
        order_date: orderInfo.order_date,
        delivery_date: orderInfo.delivery_date,
        created_by: orderInfo.created_by
    };

    const itemsFormatted = items.map(row => ({
        product_code: row.product_code,
        product_name: row.product_name,
        product_stand: row.product_stand,
        order_qty: row.order_qty,
        unit_price: row.unit_price
    }));

    res.send({ order, items: itemsFormatted });
});

// [주문 등록] POST /orders
router.post('/orders', async (req, res) => {
    const orderData = req.body;

    try {
        const result = await orderService.addOrderTransaction(orderData);

        if (result.isSuccessed) {
            res.status(201).json({
                success: true,
                orderId: result.orderId,
                message: '주문 등록 성공'
            });
        } else {
            res.status(500).json({
                success: false,
                message: '주문 등록 실패'
            });
        }
    } catch (err) {
        console.error('주문 등록 중 에러 발생:', err);
        res.status(500).json({
            success: false,
            message: '서버 에러 발생'
        });
    }
});

// [주문 수정] PUT /orders/:order_id
router.put("/orders/:order_id", async (req, res) => {
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

// [주문 삭제] DELETE /orders/:order_id
router.delete("/orders/:order_id", async (req, res) => {
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


// [주문 상태 변경] PUT /orders/:order_id/status
router.put("/orders/:order_id/status", async (req, res) => {
    try {
        const orderId = req.params.order_id;
        const { newStatus } = req.body;
        
        console.log(`주문 상태 변경 요청 - ID: ${orderId}`, { newStatus });
        
        if (!newStatus) {
            return res.status(400).json({
                success: false,
                message: "변경할 상태를 선택해주세요."
            });
        }

        const result = await orderService.updateOrderStatusSimple(orderId, newStatus);
        
        res.json({
            success: true,
            message: "주문 상태가 변경되었습니다."
        });
        
    } catch (error) {
        console.error("주문 상태 변경 실패:", error);
        res.status(500).json({
            success: false,
            message: "주문 상태 변경에 실패했습니다.",
            error: error.message
        });
    }
});

module.exports = router;