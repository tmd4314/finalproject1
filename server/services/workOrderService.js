// server/services/workOrderService.js

const mariadb = require('../database/mapper.js');
const { convertObjToAry } = require('../utils/converts.js');

// 사원 검색 (모달용)
const searchEmployees = async (searchTerm = '') => {
  return await mariadb.query('searchEmployees', [searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// 제품 검색 (모달용)
const searchProducts = async (searchTerm = '') => {
  return await mariadb.query('searchProducts', [searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// 작업지시서 검색 (모달용)
const searchWorkOrders = async (searchTerm = '') => {
  return await mariadb.query('searchWorkOrders', [searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// 계획 검색 (모달용)
const searchPlans = async (searchTerm = '') => {
  return await mariadb.query('searchPlans', [searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// 계획 정보 상세 조회
const findPlanInfo = async (planId) => {
  return await mariadb.query('getPlanInfo', [planId])
    .catch(err => console.error(err));
};

// 작업지시서 마스터 정보 조회
const findWorkOrderInfo = async (workOrderNo) => {
  return await mariadb.query('getWorkOrderInfo', [workOrderNo])
    .catch(err => console.error(err));
};

// 작업지시서 제품 목록 조회
const findWorkOrderProducts = async (workOrderNo) => {
  return await mariadb.query('getWorkOrderProducts', [workOrderNo])
    .catch(err => console.error(err));
};

// 작업지시서 전체 정보 조회 (마스터 + 제품)
const findWorkOrderDetailFull = async (workOrderNo) => {
  try {
    const masterInfo = await findWorkOrderInfo(workOrderNo);
    const productInfo = await findWorkOrderProducts(workOrderNo);
    
    return {
      master: masterInfo && masterInfo.length > 0 ? masterInfo[0] : null,
      products: productInfo || []
    };
  } catch (err) {
    console.error('작업지시서 상세 조회 오류:', err);
    throw err;
  }
};

// 작업지시서 목록 조회 (불러오기용)
const findWorkOrderList = async (searchTerm = '') => {
  return await mariadb.query('getWorkOrderList', [searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// 작업지시서 마스터 저장 (신규/수정 통합)
const saveWorkOrderMaster = async (workOrderInfo) => {
  const insertColumns = [
    'work_order_no', 'plan_id', 'writer_id', 'manager_id', 
    'start_date', 'end_date', 'order_remark'
  ];
  const values = convertObjToAry(workOrderInfo, insertColumns);
  return await mariadb.query('saveWorkOrder', values)
    .catch(err => console.error(err));
};

// 작업지시서 제품 정보 저장 (기존 삭제 후 재입력)
const saveWorkOrderProducts = async (workOrderNo, products) => {
  try {
    // 1. 기존 제품 정보 삭제
    await mariadb.query('deleteWorkOrderProducts', [workOrderNo]);
    
    // 2. 새로운 제품 정보 입력
    for (const product of products) {
      const insertData = [
        workOrderNo,
        product.product_code,
        product.product_qty,
        product.process_code || null,
        product.seq_no
      ];
      await mariadb.query('insertWorkOrderProduct', insertData);
    }
    
    return { success: true };
  } catch (err) {
    console.error('작업지시서 제품 저장 오류:', err);
    throw err;
  }
};

// 작업지시서 전체 저장 (마스터 + 제품)
const saveWorkOrderComplete = async (workOrderData) => {
  try {
    const { master, products } = workOrderData;
    
    // 1. 마스터 정보 저장
    await saveWorkOrderMaster(master);
    
    // 2. 제품 정보 저장
    if (products && products.length > 0) {
      await saveWorkOrderProducts(master.work_order_no, products);
    }
    
    return { success: true, message: '작업지시서 저장 완료' };
  } catch (err) {
    console.error('작업지시서 완전 저장 오류:', err);
    throw err;
  }
};

module.exports = {
  // 검색 관련
  searchEmployees,
  searchProducts,
  searchWorkOrders,
  searchPlans,
  
  // 조회 관련
  findPlanInfo,
  findWorkOrderInfo,
  findWorkOrderProducts,
  findWorkOrderDetailFull,
  findWorkOrderList,
  
  // 저장 관련
  saveWorkOrderMaster,
  saveWorkOrderProducts,
  saveWorkOrderComplete
};