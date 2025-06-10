const express = require('express');
const router = express.Router();
const accountService = require('../services/accountService.js');

// 전체 조회
router.get('/account', async (req, res) => {
  try {
    const accountList = await accountService.findAll();
    res.json(accountList);
  } catch (err) {
    console.error(err);
    res.status(500).send('거래처 목록 조회 실패');
  }
});

// 단일 조회 (상세)
router.get('/account/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const account = await accountService.findById(id);
    if (!account) {
      res.status(404).send('거래처를 찾을 수 없음');
    } else {
      res.json(account);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('거래처 상세 조회 실패');
  }
});

// 등록
router.post('/account', async (req, res) => {
  try {
    // req.body에서 값 받기
    const result = await accountService.create(req.body);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).send('거래처 등록 실패');
  }
});

// 수정
router.put('/account/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await accountService.update(id, req.body);
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).send('거래처 수정 실패');
  }
});

// 삭제
router.delete('/account/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await accountService.remove(id);
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).send('거래처 삭제 실패');
  }
});

module.exports = router;
