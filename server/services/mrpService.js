const mariadb = require("../database/mapper.js");
const { convertObjToAry } = require('../utils/converts.js') 

const findAllmrps = async () => {
    let list = await mariadb.query("planList").catch((err) => console.log(err));
    return list;
};

const findAllNeed = async (planId) => {
    let list = await mariadb.query("needMaterialList", planId).catch(err => console.log(err));
    return list;
};

const updatePlan = async (planId) => {

    let resInfo = await mariadb.query("planListUpdate", planId).catch(err => console.log(err));
    let result = null;

    if(resInfo.affectedRows > 0){
        result = {
            isUpdated: true
        };
    } else {
        result = {
            isUpdated: false
        };
    }
    return result;
}

const insertPurchase = async(purchaseInfo) => {
    let insertColums = ['purchase_order_id', 'purchase_order_name', 'purchase_order_quantity', 'material_code']

    let successCount = 0;

    for (const purchase of purchaseInfo) {
    const data = convertObjToAry(purchase, insertColums);
    console.log(data)

    const resInfo = await mariadb.query("purchaseInsert", data)
    .catch(err => {
      console.error('❌ insert 실패:', err);
    });

    if (resInfo && resInfo.affectedRows > 0) {
      successCount++;
    }
  }
   return {
    isSuccessed: successCount === purchaseInfo.length
  };    
};



module.exports = {
    findAllmrps,
    findAllNeed,
    updatePlan,
    insertPurchase
};
