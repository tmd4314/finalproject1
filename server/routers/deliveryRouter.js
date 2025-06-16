const express = require('express');

const router = express.Router();

const deliveryService =require('../services/deliveryService.js');
 // 라우팅  = 사용자의 요청(URL+METHOD) + Service + 응답형태(View or Data)

router.get('/delivery', async(req, res)=>{
let deliveryList = await deliveryService.findAll()
                                      .catch(err => console.log(err));
res.send(deliveryList);
});

router.get("/delivery/:work_order_no", async (req, res) => {
    const workNo = req.params.work_order_no
    let deList = await deliveryService.findAllDe(workNo).catch((err) => console.log(err));
    res.send(deList);
})

router.put('/delivery/:material_code/:lot_number', async (req, res) => {
  try {
    const materialCode = req.params.material_code;
    const lotNumber = req.params.lot_number;
    const detailList = req.body;

    const result = await deliveryService.updateMaterial(materialCode, lotNumber, detailList);
    res.send(result);
  } catch (err) {
    console.error('❌ 수정 중 오류:', err);
    res.status(500).send({ isUpdated: false, message: '서버 오류' });
  }
});

router.put('/delivery/:order_work_no', async (req, res) => {
  try {
    const orderWorkNo = req.params.order_work_no;

    const result = await deliveryService.updateWorkResult(orderWorkNo);
    res.send(result);
  } catch (err) {
    console.error('❌ 수정 중 오류:', err);
    res.status(500).send({ isUpdated: false, message: '서버 오류' });
  }
});


router.post('/delivery', async (req, res) => {
  try {
    const detailList = req.body;
    const result = await deliveryService.addOutbound(detailList);
    res.send(result);
  } catch (err) {
    console.error('❌ 과정 등록 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
});

router.get('/deliveryCheck', async(req, res) => {
  let deliveryCheckList = await deliveryService.findCheckAll()
                                          .catch(err => console.log(err));
  res.send(deliveryCheckList);
})

module.exports = router;