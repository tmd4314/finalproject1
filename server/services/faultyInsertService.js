const mariadb = require('../database/mapper');

const selectProductFaultyList = async () => {
  return await mariadb.query('selectFaultyProductName');
};

const selectWorkOrderDetailNo = async (productCode) => {
  return await mariadb.query('selectWorkOrderDetailNo', [productCode]);
};

module.exports = {
  selectProductFaultyList,
  selectWorkOrderDetailNo

}