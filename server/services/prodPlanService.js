// server/services/prodPlanService.js - employee_name으로 변경

const mariadb = require('../database/mapper.js');
const { convertObjToAry } = require('../utils/converts.js');

// 제품 검색 (모달용)
const searchProducts = async (searchTerm = '') => {
  return await mariadb.query('searchProdPlanProducts', [searchTerm, searchTerm, searchTerm])
    .catch(err => {
      throw err;
    });
};

// 주문 검색 (모달용)
const searchOrders = async (searchTerm = '') => {
  return await mariadb.query('searchProdPlanOrders', [searchTerm, searchTerm, searchTerm, searchTerm])
    .catch(err => {
      throw err;
    });
};

// 생산계획 검색 (모달용) - 파라미터 수 조정
const searchProdPlans = async (searchTerm = '') => {
  return await mariadb.query('searchProdPlanList', [searchTerm, searchTerm, searchTerm])
    .catch(err => {
      throw err;
    });
};

// 생산계획 정보 상세 조회 (작업지시와 동일한 방식 - 한 번에 모든 정보 조회)
const findPlanInfo = async (planId) => {
  return await mariadb.query('getProdPlanInfo', [planId])
    .catch(err => {
      throw err;
    });
};

// 생산계획 제품 목록만 조회 (별도 필요시)
const findPlanProducts = async (planId) => {
  return await mariadb.query('getProdPlanProducts', [planId])
    .catch(err => {
      throw err;
    });
};

// 생산계획 전체 정보 조회 - employee_name으로 변경
const findPlanDetailFull = async (planId) => {
  try {
    // 작업지시와 동일하게 한 번의 쿼리로 모든 정보 조회
    const planInfo = await findPlanInfo(planId);
    
    if (!planInfo || planInfo.length === 0) {
      return {
        master: null,
        products: []
      };
    }
    
    // 첫 번째 행을 마스터 정보로 사용 - order_id는 nullable
    const master = {
      plan_id: planInfo[0].plan_id,
      plan_name: planInfo[0].plan_name, 
      order_id: planInfo[0].order_id || '', // ✅ NULL일 때 빈 문자열로 처리
      employee_name: planInfo[0].employee_name, // writer_id → employee_name
      writer_name: planInfo[0].employee_name, // writer_name도 employee_name으로 통일
      plan_reg_dt: planInfo[0].plan_reg_dt,
      plan_start_dt: planInfo[0].plan_start_dt,
      plan_end_dt: planInfo[0].plan_end_dt,
      plan_remark: planInfo[0].plan_remark
    };
    
    // 제품 정보들을 배열로 구성 (중복 제거)
    const productMap = new Map();

    planInfo.forEach(row => {
      if (row.product_code) {
        productMap.set(row.product_code, {
          product_code: row.product_code,
          product_name: row.product_name,
          product_unit: row.product_unit,
          product_stand: row.product_stand,
          process_group_code: row.process_group_code || '',
          plan_qty: row.plan_qty
        });
      }
    });
    
    const products = Array.from(productMap.values());
    
    const result = {
      master: master,
      products: products
    };
    
    return result;
  } catch (err) {
    throw err;
  }
};

// 생산계획 목록 조회 (불러오기용) - 파라미터 수 조정
const findPlanList = async (searchTerm = '') => {
  return await mariadb.query('getProdPlanList', [searchTerm, searchTerm, searchTerm])
    .catch(err => {
      throw err;
    });
};

// 주문 정보 조회
const findOrderInfo = async (orderId) => {
  return await mariadb.query('getProdPlanOrderInfo', [orderId])
    .catch(err => {
      throw err;
    });
};

// 주문 제품 목록 조회
const findOrderProducts = async (orderId) => {
  return await mariadb.query('getProdPlanOrderProducts', [orderId])
    .catch(err => {
      throw err;
    });
};

// 주문 전체 정보 조회 (마스터 + 제품)
const findOrderDetailFull = async (orderId) => {
  try {
    const orderInfo = await findOrderInfo(orderId);
    const productInfo = await findOrderProducts(orderId);
    
    return {
      master: orderInfo && orderInfo.length > 0 ? orderInfo[0] : null,
      products: productInfo || []
    };
  } catch (err) {
    throw err;
  }
};

// 생산계획 마스터 저장 - employee_name으로 변경
const savePlanMaster = async (planInfo) => {
  // order_id 처리: 빈 문자열이면 null로 변환
  if (planInfo.order_id === '' || planInfo.order_id === undefined) {
    planInfo.order_id = null;
  }
  
  const insertColumns = [
    'plan_id', 'plan_name', 'order_id', 'employee_name', 'plan_reg_dt',
    'plan_start_dt', 'plan_end_dt', 'plan_remark'
  ];
  const values = convertObjToAry(planInfo, insertColumns);
  
  return await mariadb.query('saveProdPlan', values)
    .catch(err => {
      throw err;
    });
};

// 생산계획 제품 저장
const savePlanProducts = async (planId, products) => {
  try {
    // 1. 기존 제품 정보 삭제
    await mariadb.query('deleteProdPlanProducts', [planId]);
    
    // 2. 새로운 제품 정보 입력
    for (const product of products) {
      const insertData = [
        planId,
        product.product_code,
        product.plan_qty
      ];
      
      await mariadb.query('insertProdPlanProduct', insertData);
    }
    
    return { success: true };
  } catch (err) {
    throw err;
  }
};

// 생산계획 번호 자동 생성
const generatePlanId = async () => {
  try {
    const result = await mariadb.query('generateProdPlanId', []);
    
    if (result && result.length > 0 && result[0].next_plan_id) {
      return result[0].next_plan_id;
    } else {
      // 기본값 생성 (해당 날짜에 첫 번째 생산계획인 경우)
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `PL${today}001`;
    }
  } catch (err) {
    // 에러 시 기본값
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PL${today}001`;
  }
};

// 생산계획 전체 저장 (마스터 + 제품)
const savePlanComplete = async (planData) => {
  try {
    const { master, products } = planData;
    
    // 신규 등록 시 번호가 없으면 자동 생성
    if (!master.plan_id || master.plan_id === '') {
      master.plan_id = await generatePlanId();
    }
    
    // 1. 마스터 정보 저장
    await savePlanMaster(master);
    
    // 2. 제품 정보 저장
    if (products && products.length > 0) {
      await savePlanProducts(master.plan_id, products);
    }
    
    return { 
      success: true, 
      message: '생산계획 저장 완료',
      plan_id: master.plan_id // 생성된 번호 반환
    };
  } catch (err) {
    throw err;
  }
};

// 생산계획 통합조회
const findPlanIntegratedList = async (searchParams = {}) => {
  try {
    const {
      plan_id = '',
      plan_name = '',
      product_name = '',
      start_date = '',
      end_date = ''
    } = searchParams;

    const params = [
      plan_id, plan_id,           // 계획번호
      plan_name, plan_name,       // 계획명
      product_name, product_name, // 제품명
      start_date, start_date,     // 시작일
      end_date, end_date          // 종료일
    ];

    return await mariadb.query('getProdPlanIntegratedList', params);
  } catch (err) {
    throw err;
  }
};

module.exports = {
  // 검색 관련
  searchProducts,
  searchOrders,
  searchProdPlans,
  
  // 조회 관련
  findPlanInfo,
  findPlanProducts,
  findPlanDetailFull,
  findPlanList,
  findOrderInfo,
  findOrderProducts,
  findOrderDetailFull,

  // 저장 관련
  savePlanMaster,
  savePlanProducts,
  savePlanComplete,

  // 번호 생성
  generatePlanId,

  // 통합조회
  findPlanIntegratedList,
};