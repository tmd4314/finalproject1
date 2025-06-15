// server/services/prodPlanService.js

const mariadb = require('../database/mapper.js');
const { convertObjToAry } = require('../utils/converts.js');

// 제품 검색 (모달용)
const searchProducts = async (searchTerm = '') => {
  return await mariadb.query('searchProdPlanProducts', [searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// 주문 검색 (모달용)
const searchOrders = async (searchTerm = '') => {
  return await mariadb.query('searchProdPlanOrders', [searchTerm, searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// 생산계획 검색 (모달용) - 파라미터 수 조정
const searchProdPlans = async (searchTerm = '') => {
  return await mariadb.query('searchProdPlanList', [searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// 생산계획 정보 상세 조회 (작업지시와 동일한 방식 - 한 번에 모든 정보 조회)
const findPlanInfo = async (planId) => {
  return await mariadb.query('getProdPlanInfo', [planId])
    .catch(err => console.error(err));
};

// 생산계획 제품 목록만 조회 (별도 필요시)
const findPlanProducts = async (planId) => {
  return await mariadb.query('getProdPlanProducts', [planId])
    .catch(err => console.error(err));
};

// 생산계획 전체 정보 조회 - plan_name과 order_id, plan_priority 추가
const findPlanDetailFull = async (planId) => {
  try {
    console.log('=== findPlanDetailFull 시작 ===');
    console.log('요청된 planId:', planId);
    console.log('planId 타입:', typeof planId);
    
    // 작업지시와 동일하게 한 번의 쿼리로 모든 정보 조회
    const planInfo = await findPlanInfo(planId);
    console.log('DB 쿼리 결과 원본:', planInfo);
    console.log('계획 정보 개수:', planInfo ? planInfo.length : 0);
    
    // 각 행의 상세 정보 출력
    if (planInfo && planInfo.length > 0) {
      planInfo.forEach((row, index) => {
        console.log(`행 ${index}:`, row);
      });
    }
    
    if (!planInfo || planInfo.length === 0) {
      console.log('❌ 조회된 데이터가 없습니다.');
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
      writer_id: planInfo[0].writer_id,
      writer_name: planInfo[0].writer_name || planInfo[0].employee_name,
      plan_reg_dt: planInfo[0].plan_reg_dt,
      plan_start_dt: planInfo[0].plan_start_dt,
      plan_end_dt: planInfo[0].plan_end_dt,
      plan_remark: planInfo[0].plan_remark,
      plan_status: planInfo[0].plan_status
    };
    
    console.log('✅ 구성된 마스터 정보:', master);
    
    // 제품 정보들을 배열로 구성 (중복 제거) - plan_priority 추가
    const productMap = new Map();

    planInfo.forEach(row => {
      console.log('제품 행 처리:', {
        product_code: row.product_code,
        product_name: row.product_name,
        plan_qty: row.plan_qty,
        plan_priority: row.plan_priority
      });
      
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
    
    console.log('✅ 구성된 제품 정보:', products);
    console.log('제품 개수:', products.length);
    
    const result = {
      master: master,
      products: products
    };
    
    console.log('=== 최종 반환 데이터 ===');
    console.log(JSON.stringify(result, null, 2));
    
    return result;
  } catch (err) {
    console.error('❌ 생산계획 상세 조회 오류:', err);
    console.error('오류 스택:', err.stack);
    throw err;
  }
};

// 생산계획 목록 조회 (불러오기용) - 파라미터 수 조정
const findPlanList = async (searchTerm = '') => {
  return await mariadb.query('getProdPlanList', [searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// 주문 정보 조회
const findOrderInfo = async (orderId) => {
  return await mariadb.query('getProdPlanOrderInfo', [orderId])
    .catch(err => console.error(err));
};

// 주문 제품 목록 조회
const findOrderProducts = async (orderId) => {
  return await mariadb.query('getProdPlanOrderProducts', [orderId])
    .catch(err => console.error(err));
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
    console.error('주문 상세 조회 오류:', err);
    throw err;
  }
};

// 생산계획 마스터 저장 - order_id null 처리
const savePlanMaster = async (planInfo) => {
  console.log('=== savePlanMaster 시작 ===');
  console.log('입력 데이터:', planInfo);
  
  // order_id 처리: 빈 문자열이면 null로 변환
  if (planInfo.order_id === '' || planInfo.order_id === undefined) {
    planInfo.order_id = null;
  }
  
  const insertColumns = [
    'plan_id', 'plan_name', 'order_id', 'writer_id', 'plan_reg_dt',
    'plan_start_dt', 'plan_end_dt', 'plan_remark'
  ];
  const values = convertObjToAry(planInfo, insertColumns);
  
  console.log('변환된 컬럼들:', insertColumns);
  console.log('변환된 값들:', values);
  console.log('값들의 개수:', values.length);
  
  return await mariadb.query('saveProdPlan', values)
    .catch(err => {
      console.error('❌ DB 쿼리 실행 오류:', err);
      console.error('SQL:', err.sql);
      console.error('파라미터:', values);
      throw err;
    });
};

// 생산계획 제품 저장 - plan_priority와 process_group_code 추가
const savePlanProducts = async (planId, products) => {
  try {
    console.log('savePlanProducts - planId:', planId);
    console.log('savePlanProducts - products:', products);
    
    // 1. 기존 제품 정보 삭제
    await mariadb.query('deleteProdPlanProducts', [planId]);
    
    // 2. 새로운 제품 정보 입력
    for (const product of products) {
      const insertData = [
        planId,
        product.product_code,
        product.plan_qty
      ];
      
      console.log('insertProdPlanProduct - 삽입 데이터:', insertData);
      await mariadb.query('insertProdPlanProduct', insertData);
    }
    
    return { success: true };
  } catch (err) {
    console.error('생산계획 제품 저장 오류:', err);
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
    console.error('생산계획 번호 생성 오류:', err);
    // 에러 시 기본값
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PL${today}001`;
  }
};

// 생산계획 전체 저장 (마스터 + 제품)
const savePlanComplete = async (planData) => {
  try {
    const { master, products } = planData;
    
    console.log('savePlanComplete - 전체 데이터:', planData);
    console.log('savePlanComplete - 마스터 데이터:', master);
    console.log('savePlanComplete - 제품 데이터:', products);
    
    // 신규 등록 시 번호가 없으면 자동 생성
    if (!master.plan_id || master.plan_id === '') {
      master.plan_id = await generatePlanId();
      console.log('생성된 계획 번호:', master.plan_id);
    }
    
    // 1. 마스터 정보 저장
    await savePlanMaster(master);
    console.log('마스터 정보 저장 완료');
    
    // 2. 제품 정보 저장
    if (products && products.length > 0) {
      await savePlanProducts(master.plan_id, products);
      console.log('제품 정보 저장 완료');
    }
    
    return { 
      success: true, 
      message: '생산계획 저장 완료',
      plan_id: master.plan_id // 생성된 번호 반환
    };
  } catch (err) {
    console.error('생산계획 완전 저장 오류:', err);
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
};