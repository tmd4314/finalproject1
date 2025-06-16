const mariadb = require("../database/mapper.js");
const { convertObjToAry } = require('../utils/converts.js') 

const findAll = async() => {
  let list = await mariadb.query("workList")
                          .catch(err => console.log(err));
  return list;
}

const findAllDe = async (workNo) => {
    let list = await mariadb.query("delList", workNo).catch(err => console.log(err));
    return list;
};

const updateWorkResult = async(orderWorkNo) => {

  let resInfo = await mariadb.query("updateResult", orderWorkNo)
  .catch(err => {
    console.error(err);
    return null;
  });

  let result = null;
  if (resInfo.affectedRows > 0) {
    result = {
      isUpdated: true,
    };
  } else {
    result = {
      isUpdated: false,
    };
  }
  return result;
}


const updateMaterial = async(materialCode, lotNumber, detailList) => {
  const updateColumns = ['quantity'];
  detailList = [detailList]; 

   let successCount = 0;
    
    for (const del of detailList) {
      del.material_code = materialCode;
      del.lot_number = lotNumber;
      const values = convertObjToAry(del, updateColumns);
      const data = [...values, materialCode, lotNumber]; // WHERE 조건 맨 뒤에
      console.log(data)

      const resInfo = await mariadb.query("updateMaterial", data)
    .catch(err => {
      console.error('❌ insert 실패:', err);
    });

    if (resInfo && resInfo.affectedRows > 0) {
      successCount++;
    }
  }
    return {
    isSuccessed: successCount === detailList.length
  };   
}



const addOutbound = async(detailList) => {
    
    const insertColums = [
      'outbound_id',
      'material_code',
      'outbound_qty',
      'name',
      'lot_number',
      'work_order_no'
    ];

    let successCount = 0;
    
    for (const del of detailList) {
      const data = convertObjToAry(del, insertColums);
      console.log(data)

      const resInfo = await mariadb.query("insertDel", data)
    .catch(err => {
      console.error('❌ insert 실패:', err);
    });

    if (resInfo && resInfo.affectedRows > 0) {
      successCount++;
    }
  }
    return {
    isSuccessed: successCount === detailList.length
  };   
};

const findCheckAll = async() => {
  let list = await mariadb.query("delCheckList")
                          .catch(err => console.log(err));
  return list;
}



module.exports = {
  findAll,
  findAllDe,
  updateMaterial,
  addOutbound,
  updateWorkResult,
  findCheckAll
};