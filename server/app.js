// env 파일을 읽어들이는 코드 => 가능한 가장 첫번쨰 줄에 작성
require('dotenv').config({path : './database/configs/dbConfig.env'});

const express = require('express');
const app =express();
 // 미들웨어 등록 영역
// 1. body parser
 // content-type : application/x-www-form-urlencoded
 app.use(express.urlencoded({ extended:false}));
 // content-type : application/json
 app.use(express.json()); 
// Server 실행 
app.listen(3000, ()=>{
  console.log('Server Start');
  console.log('http://localhost:3000');
 })
