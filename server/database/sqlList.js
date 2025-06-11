const product =require('./sqls/product.js');
const material =require('./sqls/material.js');
const equipment = require('./sqls/equipment.js')
const commonCode = require('./sqls/commonCode.js');
const order = require('./sqls/order.js');
const inspection = require('./sqls/inspection.js');
const processFlowChart = require('./sqls/processFlowChart.js');
const line = require('./sqls/line.js');
const bom = require('./sqls/bom.js');
const package =  require('./sqls/package.js');
const account = require('./sqls/account.js');
const defect = require('./sqls/defect.js');
const workOrder = require('./sqls/workOrder.js');



 module.exports ={
    // 펼침연산자(spread operator, ...)을 활용해 객체의 필드를 다른 객체로 쉽게 복사
     ...product, 
     ...material,
     ...equipment,
     ...commonCode,
     ...order,
     ...bom,
     ...processFlowChart,
     ...line,
     ...inspection,
     ...processFlowChart,
     ...package,
     ...processFlowChart,
     ...account,
     ...defect,
     ...workOrder
 }

