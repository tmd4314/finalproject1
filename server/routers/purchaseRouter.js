const express = require('express');
 // Express의 Router 모듈을 사용해서 라우팅 등록, 라우팅을 별도 파일로 관리
const router = express.Router();
 // 해당 라우터를 통해 제공할 서비스를 가져옴
const purchaseService = require('../services/purchaseService.js');

router.get('/purchase', async(req, res)=>{
let purchaseList = await purchaseService.findAll()
                                      .catch(err => console.log(err));
res.send(purchaseList);
});

router.get('/purchaseCheck', async(req, res)=>{
let purchaseCheckList = await purchaseService.findCheckAll()
                                      .catch(err => console.log(err));
res.send(purchaseCheckList);
});

router.get('/purchaseIn', async(req, res)=>{
let purchaseList = await purchaseService.findOrderAll()
                                      .catch(err => console.log(err));
res.send(purchaseList);
});

router.put('/purchase/:purchase_order_id', async(req, res) => {
  try{
    const puOrderId = req.params.purchase_order_id
    const result = await purchaseService.updateStatus(puOrderId);
    res.send(result);
  }catch (err) {
    console.error('수정 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
})

router.put('/puOrder/:purchase_order_id', async(req, res) => {
  try{
    const puOrderId = req.params.purchase_order_id
    const purchaseInfo = req.body
    const res1  = await purchaseService.updatePurchase(puOrderId, purchaseInfo);
    const res2 = await purchaseService.stockStatusUpdate(puOrderId);
    res.send(res1);
    res.send(res2);
  }catch (err) {
    console.error('수정 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
})


module.exports = router