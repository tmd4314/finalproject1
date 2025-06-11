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

  const data = [materialOrderCode]; // WHERE 조건 맨 뒤에

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
  updateMaterialOrderCheck
};