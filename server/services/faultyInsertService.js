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

const selectDefectTypeList = async () => {
  return await mariadb.query('selectDefectTypeList');
};

const insertFaultyProduct = async (data) => {
  const params = [
    data.product_code,
    data.work_order_no,
    data.process_name,
    data.defect_type,
    data.defect_detail,
    data.quantity,
    data.occur_date,
    data.qual_remark,
  ];
  return await mariadb.query('insertFaultyProduct', params);
};

module.exports = {
  selectProductFaultyList,
  selectWorkOrderDetailNo,
  selectFaultyTestDetail,
  selectDefectTypeList,
  insertFaultyProduct
}