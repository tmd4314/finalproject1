// env 파일을 읽어들이는 코드 => 가능한 가장 첫번쨰 줄에 작성
require("dotenv").config({ path: "./database/configs/dbConfig.env" });
const express = require("express");
const app = express();

// 미들웨어 등록 영역
// 1. body parser
// 라우팅 등록 영역

// 기본 라우팅
app.get("/", (req, res) => {
    res.send("Welcome!!...");
});

 // content-type : application/x-www-form-urlencoded
app.use(express.urlencoded({ extended:false}));
 // content-type : application/json
app.use(express.json()); 
// Server 실행 
app.listen(3000, ()=>{
  console.log('Server Start');
  console.log('http://localhost:3000');
})


 // 라우팅 등록 영역   

const orderRouter = require('./routers/orderRouter.js');

const productRouter =require('./routers/productRouter.js');

const commonCodeRouter = require('./routers/commonCodeRouter');

const equipmentRouter = require('./routers/equipmentRouter');

const materialRouter =require('./routers/materialRouter.js');

const processRouter =require('./routers/processRouter.js');

const bomRouter = require('./routers/bomRouter');

const lineRouter = require('./routers/lineRouter.js')

const inspectionRouter = require('./routers/inspectionRouter.js');

const packageRouter = require('./routers/packageRouter.js');

const defectRouter = require('./routers/defectRouter.js');

 // 기본 라우팅
app.get('/', (req, res)=>{
  res.send('Welcome!!...');
 })




 // 라우터 모듈 등록
app.use('/api/orders', orderRouter);
//현석
app.use('/api/lines', lineRouter);
//다산
app.use('/bom', bomRouter);
 //라우터 모듈 등록
app.use('/', productRouter);

app.use('/', materialRouter);
app.use('/', processRouter);

//열림
app.use('/equipments', equipmentRouter);
app.use('/common-codes', commonCodeRouter);
app.use('/img', express.static('../client/public/img'));

//현석
app.use('/lines', lineRouter);
app.use('/packages', packageRouter);


//현기
app.use('/inspections', inspectionRouter);
app.use('/defects', defectRouter);
