const express = require("express");
const router = express.Router();
const mrpService = require("../services/mrpService.js");

router.get("/mrps", async (req, res) => {
    let planList = await mrpService.findAllmrps().catch((err) => console.log(err));
    res.send(planList);
});

router.get("/mrps/:plan_id", async (req, res) => {
    const planId = req.params.plan_id
    let mrpList = await mrpService.findAllNeed(planId).catch((err) => console.log(err));
    res.send(mrpList);
})

router.put("/mrps/:plan_id", async (req, res) => {
    try{
        const planId = req.params.plan_id
        let result = await mrpService.updatePlan(planId)
                                            .catch((err) => console.log(err));
        res.send(result);
    }catch (err) {
        console.error('❌ 수정 중 오류:', err);
        res.status(500).send({ isUpdated: false, message: '서버 오류' });
    }
})

router.post("/puOrder", async (req, res) => {
    try{
        const purchaseInfo = req.body;
        console.log(purchaseInfo);
        let result = await mrpService.insertPurchase(purchaseInfo)
                                     .catch((err) => console.log(err));
        res.send(result);
    } catch(err){
        console.error('수정 오류:', err);
        res.status(500).send({ isSuccessed: fasle, message: '서버 오류'})
    }
})

module.exports = router