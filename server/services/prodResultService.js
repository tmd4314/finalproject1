// server/services/prodPlanService.js

const mariadb = require('../database/mapper.js');
const { convertObjToAry } = require('../utils/converts.js');

// 제품 검색 (모달용)
const searchResult = async (resultId) => {
  let list = await mariadb.query("selectResultList", resultId)
                            .catch(err => console.log(err));
  return list;
};

const saveWorkResult = async (workResultInfo) => {

  try {
    const { master, products } = workOrderData;
    
    // 신규 등록 시 번호가 없으면 자동 생성
    if (!master.work_order_no || master.work_order_no === '') {
      master.work_order_no = await generateWorkOrderNo();
    }
    
    // 2. 제품 정보 저장
    if (products && products.length > 0) {
      await saveWorkOrderProducts(master.work_order_no, products);
    }
    
    return { 
      success: true, 
      message: '작업지시서 저장 완료',
      work_order_no: master.work_order_no
    };
  } catch (err) {
    console.error('작업지시서 완전 저장 오류:', err);
    throw err;
  }
};

// 작업지시서 번호 자동 생성
// const generateWorkOrderNo = async () => {
//   try {
//     const result = await mariadb.query('generateWorkOrderNo', []);
    
//     if (result && result.length > 0 && result[0].next_work_order_no) {
//       return result[0].next_work_order_no;
//     } else {
//       // 기본값 생성 (해당 날짜에 첫 번째 작업지시서인 경우)
//       const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
//       return `WO${today}001`;
//     }
//   } catch (err) {
//     console.error('작업지시서 번호 생성 오류:', err);
//     // 에러 시 기본값
//     const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
//     return `WO${today}001`;
//   }
// };

// // 작업지시서 전체 저장 (마스터 + 제품)
// const saveWorkOrderComplete = async (workOrderData) => {
//   try {
//     const { master, products } = workOrderData;
    
//     // 신규 등록 시 번호가 없으면 자동 생성
//     if (!master.work_order_no || master.work_order_no === '') {
//       master.work_order_no = await generateWorkOrderNo();
//     }
    
//     // 1. 마스터 정보 저장
//     await saveWorkOrderMaster(master);
    
//     // 2. 제품 정보 저장
//     if (products && products.length > 0) {
//       await saveWorkOrderProducts(master.work_order_no, products);
//     }
    
//     return { 
//       success: true, 
//       message: '작업지시서 저장 완료',
//       work_order_no: master.work_order_no
//     };
//   } catch (err) {
//     console.error('작업지시서 완전 저장 오류:', err);
//     throw err;
//   }
// };







module.exports = {
  // 검색 관련
  searchResult,
  saveWorkResult
};