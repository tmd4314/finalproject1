const express = require('express');
const pool = require('../database/mapper');
const router = express.Router();
const sqlList = require('../database/sqlList');

// [주문 목록] GET /api/orders
router.get('/', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(sqlList.getOrderList);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// [주문 상세] GET /api/orders/:order_id/details
router.get('/:order_id/details', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    // 주문 기본정보 1건
    const [orderInfo] = await conn.query(sqlList.getOrderDetail, [req.params.order_id]);
    // 주문 품목 리스트
    const items = await conn.query(sqlList.getOrderItems, [req.params.order_id]);
    res.json({ order: orderInfo || null, items: items || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// [주문+품목목록] GET /api/orders/with-items
router.get('/with-items', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(sqlList.getOrderListWithItems);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router; // 이 파일 전체를 다른 곳에서 쓸 수 있게 내보냄