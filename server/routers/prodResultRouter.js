const express = require('express');
const router = express.Router();
const prodResultService = require('../services/prodResultService.js');

// [GET]  공정 진행도 검색 
router.get('/prodResult/:result_id/:product_stand', async (req, res) => {
    const resultId = req.params.result_id;
    const productStand = req.params.product_stand;
    let resultList = await prodResultService.searchResult(resultId, productStand)
                                           .catch(err => console.log(err));
     res.send(resultList);
});

// [GET]  작업지시서 검색 
router.get('/prodResult', async (req, res) => {
    let resultList = await prodResultService.searchNoResult()
                                           .catch(err => console.log(err));
     res.send(resultList);
});

// [GET]  공통코드 정지 사유 검색 
router.get('/endEq', async (req, res) => {
    let resultList = await prodResultService.searchenEq()
                                           .catch(err => console.log(err));
     res.send(resultList);
});

// [GET]  자재 출고 내역 검색 
router.get('/materialOutbound/:process_code', async (req, res) => {
    const processCode = req.params.process_code
    let resultList = await prodResultService.materialOutList(processCode)
                                           .catch(err => console.log(err));
     res.send(resultList);
});


// [GET]  설비 검색 
router.get('/equipment/:eq_type_code', async (req, res) => {
    const eqTypeCode = req.params.eq_type_code;
    let resultList = await prodResultService.searcheQuipmentCheck(eqTypeCode)
                                           .catch(err => console.log(err));
     res.send(resultList);
});


router.post('/prodResultDetail', async (req, res) => {
  try {
    const detailInfo = req.body;
    const result = await prodResultService.addDetail(detailInfo);
    res.send(result);
  } catch (err) {
    console.error('❌ 제품 등록 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
});


router.put('/workResultStatus/:result_id', async (req, res) => {
  try {
    const resultId = req.params.result_id;
    const result = await prodResultService.updateStatus(resultId);
    res.send(result)
  } catch(err) {
    console.error('작업시작 실패: ', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류'});
  }
})

//작업 실적 끝내기 주입
router.put('/prodEnd/:result_id', async (req, res) => {
  try {
    const resultId = req.params.result_id;
    const passQty = req.body
    const result = await prodResultService.resultEnd(resultId, passQty);
    res.send(result)
  } catch(err) {
    console.error('작업시작 실패: ', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류'});
  }
})

router.put('/eqStatus/:eq_id', async (req, res) => {
  try {
    const eqId = req.params.eq_id;
    const stopReason = req.body
    const result = await prodResultService.workEq(stopReason, eqId);
    res.send(result)
  } catch(err) {
    console.error('작업시작 실패: ', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류'});
  }
})

//작업 시작 상태 주입
router.put('/prodResult/:result_detail', async (req, res) => {
  try {
    const resultDetail = req.params.result_detail;
    const passQty = req.body
    const result = await prodResultService.workStart(resultDetail, passQty);
    res.send(result)
  } catch(err) {
    console.error('작업시작 실패: ', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류'});
  }
})

router.put('/eqStatus/:eq_id', async (req, res) => {
  try {
    const eqId = req.params.eq_id;
    const result = await prodResultService.workEq(eqId);
    res.send(result)
  } catch(err) {
    console.error('작업시작 실패: ', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류'});
  }
})

//작업 종료 상태 주입
router.put('/prodResultStop/:result_detail', async (req, res) => {
  try {
    const resultDetail = req.params.result_detail;
    const resultRm = req.body
    const result = await prodResultService.workStop(resultDetail, resultRm);
    res.send(result)
  } catch(err) {
    console.error('작업시작 실패: ', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류'});
  }
})

router.put('/eqStop/:eq_id', async (req, res) => {
  try {
    const eqId = req.params.eq_id;
    const result = await prodResultService.workStopEq(eqId);
    res.send(result)
  } catch(err) {
    console.error('작업시작 실패: ', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류'});
  }
})



module.exports = router;