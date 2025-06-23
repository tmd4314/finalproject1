const mariadb = require('../database/mapper');

const selectProductFaultyList = async () => {
  return await mariadb.query('selectFaultyProductName');
};

const getWorkOrderNosByProductCode = async (productCode) => {
  return await mariadb.query('selectWorkOrderNosByProductCode', [productCode]);
};


const getFaultyDetail = async (productCode, workOrderNo) => {
  return await mariadb.query('selectFaultyDetail', [productCode, workOrderNo]);
};

const insertFaultyDisuseRecord = async (data) => {
  const {
    product_code,
    work_order_no,
    process_name,
    occur_date,
    defect_type,
    faulty_quantity,
    representative,
    disuse_reason,
    disuse_state
  } = data;

  return await mariadb.query('insertFaultyDisuse', [
    product_code,
    work_order_no,
    process_name,
    occur_date,
    defect_type,
    faulty_quantity,
    representative,
    disuse_reason,
    disuse_state
  ]);
};


module.exports = {
    selectProductFaultyList,
    getWorkOrderNosByProductCode,
    getFaultyDetail,
    insertFaultyDisuseRecord
}