const express =require('express');
 // Express의 Router 모듈을 사용해서 라우팅 등록, 라우팅을 별도 파일로 관리
const router =express.Router();
 // 해당 라우터를 통해 제공할 서비스를 가져옴
const processService =require('../services/processService.js');
 // 라우팅  = 사용자의 요청(URL+METHOD) + Service + 응답형태(View or Data)

 router.get('/process/:product_code', async(req, res)=>{
  const productCode = req.params.product_code;
  let processList = await processService.findProcess(productCode)
                                        .catch(err => console.log(err));
  res.send(processList);
 });

  router.get('/processDetail/:process_code', async(req, res)=>{
  const processCode = req.params.process_code;
  let processDetailList = await processService.findProcessDetail(processCode)
                                        .catch(err => console.log(err));
  res.send(processDetailList);
 });

router.post('/process', async (req, res) => {
  try {
    const processList = req.body;
    const result = await processService.addProcess(processList);
    res.send(result);
  } catch (err) {
    console.error('❌ 과정 등록 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
});

router.put('/process/:process_code', async (req, res) => {
  try {
    const processCode = req.params.process_code;
    const detailList = req.body;

    const result = await processService.modifyProcess(processCode, detailList);
    res.send(result);
  } catch (err) {
    console.error('❌ 수정 중 오류:', err);
    res.status(500).send({ isUpdated: false, message: '서버 오류' });
  }
});


//process_detail
router.post('/process/:process_code', async (req, res) => {
  try {
    const processCode = req.params.process_code;
    const detailList = req.body;
    console.log(detailList);
    const result = await processService.addDetailProcess(processCode, detailList);
    res.send(result);
  } catch (err) {
    console.error('❌ 과정 등록 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
});

 router.delete('/processDetail/:process_code', async(req, res)=>{
    let processCode =req.params.process_code;
    let resInfo =await processService.updateProcessDetailInfo(processCode)
                                     .catch(err =>console.log(err));
    res.send(resInfo);
 })



// 삭제    : 자원(데이터) -> product / 삭제 -> DELETE
 router.delete('/process/:process_code', async(req, res)=>{
    let processCode =req.params.process_code;
    let resInfo =await processService.removeProcessInfo(processCode)
                                     .catch(err =>console.log(err));
    res.send(resInfo);
 })

 // 삭제    : 자원(데이터) -> product / 삭제 -> DELETE
 router.delete('/processDetail/:material_code/:process_code', async(req, res)=>{
    let materialCode = req.params.material_code;
    let processCode = req.params.process_code;
    let resInfo =await processService.removeProcessDetailInfo(materialCode, processCode)
                                     .catch(err =>console.log(err));
    res.send(resInfo);
 })



  
// 실제 라우팅 등록 영역
// 해당 javascript 파일의 마지막 코드, 모듈화
// 위에 선언한 기능(변수, 함수 등)들 중 외부로 노출할 대상을 설정 
// => 다른 파일에서 require()을 통해 가져옴
module.exports =router