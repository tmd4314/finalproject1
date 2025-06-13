const mariadb = require("../database/mapper.js");
const { convertObjToAry } = require('../utils/converts.js') 

const findAll = async() => {
  let list = await mariadb.query("purchaseList")
                          .catch(err => console.log(err));
  return list;
}

const findCheckAll = async() => {
  let list = await mariadb.query("purchaseCheck")
                          .catch(err => console.log(err));
  return list;
}

const findOrderAll = async() => {
  let list = await mariadb.query("purchaseInsertList")
                          .catch(err => console.log(err));
  return list;
}

const updateStatus = async(puOrderId) => {

  let resInfo = await mariadb.query("purchaseListUpdate", puOrderId)
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

const updatePurchase = async(puOrderId, purchaseInfo) => {
  const updateColumns = ['due_date', 'name', 'account_id'];

  const values = convertObjToAry(purchaseInfo, updateColumns);
  const data = [...values, puOrderId];

  let resInfo = await mariadb.query("purchaseInsertUpdate", data)
  .catch(err => {
    console.error(err);
    return null;
  });

  let result = null;
  if (resInfo.affectedRows > 0) {
    result = {
      isSuccessed: true,
    };
  } else {
    result = {
      isSuccessed: false,
    };
  }
  return result;
}

const stockStatusUpdate = async(puOrderId) => {

  let resInfo = await mariadb.query("purchaseStockStatusUpdate", puOrderId)
  .catch(err => {
    console.error(err);
    return null;
  });

  let result = null;
  if (resInfo.affectedRows > 0) {
    result = {
      isSuccessed: true,
    };
  } else {
    result = {
      isSuccessed: false,
    };
  }
  return result;
}

module.exports = {
  findAll,
  updateStatus,
  findOrderAll,
  updatePurchase,
  stockStatusUpdate,
  findCheckAll
};