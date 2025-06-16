const mariadb = require("../database/mapper.js");
const { convertObjToAry } = require('../utils/converts.js') 

const findOrderAll = async() => {
  let list = await mariadb.query("selectOrderList")
                          .catch(err => console.log(err));
  return list;
}

const findOrderCheck = async() => {
  let list = await mariadb.query("orderCheck")
                          .catch(err => console.log(err));
  return list;
}

const receiveQtyCheck = async(purchaseId) => {
  let list = await mariadb.query("receiveQtyCheck", purchaseId)
                          .catch(err => console.log(err));
  return list;
}

const findListAll = async() => {
  let list = await mariadb.query("selectLotList")
                          .catch(err => console.log(err));
  return list;
}

const addMaterialLOT = async(MaterialLOTInfo) => {
  let insertColums = ['lot_number', 'material_code', 'expiry_date', 'quantity', 'purchase_order_id'];
  let data = convertObjToAry(MaterialLOTInfo, insertColums);

  let resInfo = await mariadb.query("insertMaterialLOT", data)
                             .catch(err =>console.log(err));

  let result = null;
  if (resInfo.affectedRows > 0) {
    result = {
      isSuccessed: true
    }
  }else{
    result = {
      isSuccessed: false
    }
  }
  return result;
};

const updateMaterialOrder = async(materialOrderCode) => {

  const data = [materialOrderCode]; 

  let resInfo = await mariadb.query("updateOrder", data)
  .catch(err => {
    console.error(err);
    return null; // 또는 throw err;
  });

  let result = null;
  if (resInfo.affectedRows > 0) {
    result = {
      isUpdated: true
    };
  } else {
    result = {
      isUpdated: false,
    };
  }
  return result;
}

const receiveQty = async(purchaseId, body) => {
  const updateColumns = ['receive_qty'];
  const values = convertObjToAry(body, updateColumns);
  const data = [...values, purchaseId];

  try {
    const resInfo = await mariadb.query("receiveQty", data);
    return {
      isUpdated: resInfo.affectedRows > 0,
      message: resInfo.affectedRows > 0 ? '수정 성공' : '변경된 데이터 없음',
    };
  } catch (err) {
    console.error('❌ 수정 쿼리 오류:', err);
    return {
      isUpdated: false,
      message: '쿼리 실행 오류',
    };
  }
}

const qualityTest = async (quality) => {
  const insertColums = [
    'material_qual_num',
    'material_code',
    'purchase_order_id'
  ];

  const values = convertObjToAry(quality, insertColums);

  const resInfo = await mariadb.query("qualityTest", values)
  .catch(err => {
    console.error('❌ insert 실패:', err);
    return null;
  });

  let result = null;
  if (resInfo.affectedRows > 0) {
    result = {
      isSuccessed: true
    }
  }else{
    result = {
      isSuccessed: false
    }
  }
  return result;
};

const updateMaterialOrderCheck = async(materialOrderCode) => {

  const data = [materialOrderCode]; // WHERE 조건 맨 뒤에

  let resInfo = await mariadb.query("orderCheckUpdate", data)
  .catch(err => {
    console.error(err);
    return null; // 또는 throw err;
  });

  let result = null;
  if (resInfo.affectedRows > 0) {
    result = {
      isUpdated: true
    };
  } else {
    result = {
      isUpdated: false,
    };
  }
  return result;
}


module.exports = {
  findOrderAll,
  addMaterialLOT,
  updateMaterialOrder,
  findListAll,
  findOrderCheck,
  updateMaterialOrderCheck,
  receiveQtyCheck,
  receiveQty,
  qualityTest
};