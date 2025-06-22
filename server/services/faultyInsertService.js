const mariadb = require('../database/mapper');

const selectProductFaultyList = async () => {
  return await mariadb.query('selectFaultyProductName');
};

const selectWorkOrderDetailNo = async (productCode) => {
  return await mariadb.query('selectFaultyWorkOrderNo', [productCode]);
};

const selectFaultyTestDetail = async (workOrderNo) => {
  return await mariadb.query('selectFaultyTestDetail', [workOrderNo]);
};


module.exports = {
  selectProductFaultyList,
  selectWorkOrderDetailNo,
  selectFaultyTestDetail
}