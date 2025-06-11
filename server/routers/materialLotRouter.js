const express = require('express');

const router = express.Router();

const materialLotService =require('../services/materialLotService.js');
 // 라우팅  = 사용자의 요청(URL+METHOD) + Service + 응답형태(View or Data)

router.get('/materialLot', async(req, res)=>{
let materialOrderList = await materialLotService.findOrderAll()
                                      .catch(err => console.log(err));
res.send(materialOrderList);
});

router.get('/materialLotList', async(req, res)=>{
let materialLotList = await materialLotService.findListAll()
                                      .catch(err => console.log(err));
res.send(materialLotList);
});

router.get('/orderCheck', async(req, res)=>{
let orderCheck = await materialLotService.findOrderCheck()
                                      .catch(err => console.log(err));
res.send(orderCheck);
});

router.post('/materialLot', async (req, res) => {
  try {
    const MaterialLOTInfo = req.body;

    const result = await materialLotService.addMaterialLOT(MaterialLOTInfo);
    res.send(result);
  } catch (err) {
    console.error('❌ 제품 등록 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
});

router.put('/materialLot/:purchase_order_id', async (req, res) => {
  try {
    const materialOrderCode = req.params.purchase_order_id;

    const result = await materialLotService.updateMaterialOrder(materialOrderCode);
    res.send(result);
  } catch (err) {
    console.error('❌ 제품 등록 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
});

module.exports = router;