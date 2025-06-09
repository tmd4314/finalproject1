const express = require('express');
const { query, orderSql } = require('../database/mapper');
const router = express.Router();

// 주문 목록
router.get('/api/orders', async (req, res) => {
  try {
    const rows = await query(orderSql.getOrderList);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

// 주문 상세
router.get('/api/orders/:order_id/details', async (req, res) => {
  try {
    const [order] = await query(orderSql.getOrderDetail, [req.params.order_id]);
    const items = await query(orderSql.getOrderItems, [req.params.order_id]);
    res.json({ order: order || null, items: items || [] });
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

// 주문 + 품목 목록
router.get('/api/orders/with-items', async (req, res) => {
  try {
    const rows = await query(orderSql.getOrderListWithItems);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message || err });
  }
});

module.exports = router;
