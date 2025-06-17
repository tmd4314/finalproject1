const mariadb = require('../database/mapper.js')

const selectWorkOrder = async () => {
  return await mariadb.query("selectWorkOrder")
}

const selectWorkOrderDetail = async (workOrderNo) => {
  return await mariadb.query("selectWorkOrderDetail", [workOrderNo])
}

// 제품명 목록 조회
const selectProductList = async () => {
  return await mariadb.query("selectProductList")
}

// 제품명으로 작업지시서 목록 조회
const selectWorkOrdersByProductName = async (productName) => {
  return await mariadb.query("selectWorkOrdersByProductName", [productName])
}

module.exports = {
  selectWorkOrder,
  selectWorkOrderDetail,
  selectProductList,
  selectWorkOrdersByProductName
}