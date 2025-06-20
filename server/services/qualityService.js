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

const insertQualTestResult = async (
  productCode,
  workOrderNo,
  measuredValue,
  result,
  processName,
  inspValueQty,
  remark
) => {
  return await mariadb.query('insertQualTestResult', [
    productCode,
    workOrderNo,
    measuredValue,
    result,
    processName,
    inspValueQty,
    remark
  ]);
};

const updateCodeValueToPass = async (workOrderNo) => {
  return await mariadb.query('updateCodeValueToPass', [workOrderNo]);
};

const updateCodeValueToFail = async (workOrderNo) => {
  return await mariadb.query('updateCodeValueToFail', [workOrderNo]);
};

module.exports = {
  selectProductList,
  selectWorkOrderNo,
  selectWorkOrderDetail,
  selectInspectionStandardByProcessName,
  insertQualTestResult,
  updateCodeValueToPass,
  updateCodeValueToFail
}