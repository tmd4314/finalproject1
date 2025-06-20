const mariadb = require('../database/mapper');

const selectProductList = async () => {
  return await mariadb.query('selectProductName');
};

const selectWorkOrderNo = async (productCode) => {
  return await mariadb.query('selectWorkOrderNo', [productCode]);
};

const selectWorkOrderDetail = async (workOrderNo) => {
  return await mariadb.query('selectWorkOrderDetail', [workOrderNo]);
};

const selectInspectionStandardByProcessName = async (processName) => {
  return await mariadb.query('selectInspectionStandardByProcessName', [processName]);
};

module.exports = {
  selectProductList,
  selectWorkOrderNo,
  selectWorkOrderDetail,
  selectInspectionStandardByProcessName
}