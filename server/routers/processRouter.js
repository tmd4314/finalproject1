const express =require('express');
 // Express의 Router 모듈을 사용해서 라우팅 등록, 라우팅을 별도 파일로 관리
const router =express.Router();
 // 해당 라우터를 통해 제공할 서비스를 가져옴
const processService =require('../services/processService.js');
 // 라우팅  = 사용자의 요청(URL+METHOD) + Service + 응답형태(View or Data)

//  router.get('/process', async(req, res)=>{
//   let materialList = await materialService.findAll()
//                                         .catch(err => console.log(err));
//   res.send(materialList);
//  });

router.post('/process', async (req, res) => {
  try {
    const processList = req.body;
    console.log(processList);
    const result = await processService.addProcess(processList);
    res.send(result);
  } catch (err) {
    console.error('❌ 과정 등록 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
});

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

  
// 실제 라우팅 등록 영역
// 해당 javascript 파일의 마지막 코드, 모듈화
// 위에 선언한 기능(변수, 함수 등)들 중 외부로 노출할 대상을 설정 
// => 다른 파일에서 require()을 통해 가져옴
module.exports =router