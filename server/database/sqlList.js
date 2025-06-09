const product =require('./sqls/product.js');
const material =require('./sqls/material.js');
const equipment = require('./sqls/equipment.js')
const commonCode = require('./sqls/commonCode.js');
const order = require('./sqls/order.js');
const processFlowChart = require('./sqls/processFlowChart.js');

 module.exports ={
    // 펼침연산자(spread operator, ...)을 활용해 객체의 필드를 다른 객체로 쉽게 복사
     ...product, 
     ...material,
     ...equipment,
     ...commonCode,
     ...order,
     ...processFlowChart
 }

