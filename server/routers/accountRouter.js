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
    const result = await accountService.addAccount(req.body);
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
    const result = await accountService.updateAccount(id, req.body);
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
    const result = await accountService.removeAccount(id);
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error(err);
    res.status(500).send('거래처 삭제 실패');
  }
});

// 여러 거래처 삭제
router.post('/account/delete-multiple', async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '삭제할 거래처를 선택해주세요'
      });
    }

    // 각 ID에 대해 삭제 실행
    let deletedCount = 0;
    let failedCount = 0;
    let inUseIds = [];

    for (const id of ids) {
      // DB에서 in_use 재확인 (방어코드, accountService.findInUse 참고)
      const inUse = await accountService.isAccountInUse(id);
      if (inUse) {
        failedCount++;
        inUseIds.push(id);
        continue; // 삭제하지 않고 넘어감
      }
      const result = await accountService.removeAccount(id);
      if (result.isDeleted) deletedCount++;
      else failedCount++;
    }
    res.json({
      success: true,
      deletedCount,
      failedCount,
      inUseIds, // 삭제 불가 id 리스트도 같이 반환
    });
  } catch (err) {
    console.error('다중 삭제 실패:', err);
    res.status(500).json({ success: false, message: '거래처 삭제 실패' });
  }
});

module.exports = router;
