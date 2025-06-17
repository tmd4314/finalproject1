// server/services/prodPlanService.js

const mariadb = require('../database/mapper.js');
const { convertObjToAry } = require('../utils/converts.js');

// 공정 진행도 검색 
const searchResult = async (resultId, productStand) => {
  let list = await mariadb.query("selectResultList", [resultId, productStand])
                            .catch(err => console.log(err));
  return list;
};

// 작업지시 검색 (모달용)
const searchNoResult = async () => {
  let list = await mariadb.query("selectNoList")
                            .catch(err => console.log(err));
  return list;
};

// 공정흐름도 검색 (모달용)
const searchProcessCheck = async () => {
  let list = await mariadb.query("selectProcessList")
                            .catch(err => console.log(err));
  return list;
};


// 설비 검색 (모달용)
const searcheQuipmentCheck = async () => {
  let list = await mariadb.query("selectEqList")
                            .catch(err => console.log(err));
  return list;
};



const saveWorkResult = async (workResultInfo) => {

  try {
    const { master, products } = workResultInfo;
    
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
const generateWorkOrderNo = async () => {
  try {
    const result = await mariadb.query('generateWorkOrderNo', []);
    
    if (result && result.length > 0 && result[0].next_work_order_no) {
      return result[0].next_work_order_no;
    } else {
      // 기본값 생성 (해당 날짜에 첫 번째 작업지시서인 경우)
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `WO${today}001`;
    }
  } catch (err) {
    console.error('작업지시서 번호 생성 오류:', err);
    // 에러 시 기본값
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `WO${today}001`;
  }
};

// 작업지시서 제품 정보 저장 (기존 삭제 후 재입력)
const saveWorkOrderProducts = async (workOrderNo, products) => {
  try {
    // 1. 기존 제품 정보 삭제
    await mariadb.query('deleteResult', [workOrderNo]);
    
    // 2. 새로운 제품 정보 입력
    for (const product of products) {
      const insertData = [
        workOrderNo,
        product.process_group_code,
        product.result_id,
        product.work_order_date
      ];
      console.log(insertData);
      await mariadb.query('insertResult', insertData);
    }
    
    return { success: true };
  } catch (err) {
    console.error('작업지시서 제품 저장 오류:', err);
    throw err;
  }
};



const addDetail = async(detailInfo) => {
  let insertColums = ['result_id', 'pass_qty', 'manager_id', 'process_code', 'eq_id'];
  let data = convertObjToAry(detailInfo, insertColums);

  let resInfo = await mariadb.query("insertResultDetail", data)
  .catch(err => {
    console.error(err);
    return null; // 또는 throw err;
  });

  if (!resInfo) {
    return {
      isSuccessed: false,
      message: 'DB insert 실패',
    };
}
  let result = null;
  if(resInfo.affectedRows > 0){
    result = {
      isSuccessed:true,
    }
  }else{
    result = {
      isSuccessed:false,
    }
  }
  return result;
}

function formatToMySQLDateTime(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}


const workStart = async(resultDetail, passQty) => {
  const updateColumns = [
   'work_start_time', 'pass_qty'
  ];

  
  const now = formatToMySQLDateTime(new Date());
  const updateData = { work_start_time: now, pass_qty: passQty.pass_qty };
  const values = convertObjToAry(updateData, updateColumns);
  const data = [...values, resultDetail]; // WHERE 조건 맨 뒤에
  let resInfo = await mariadb.query("updateStart", data)
  .catch(err => {
    console.error(err);
    return null; // 또는 throw err;
  });

  let result = null;
  if (resInfo?.affectedRows > 0) {
    result = {
      isSuccessed: true,
    };
  } else {
    result = {
      isSuccessed: false,
    };
  }
  return result;
}

const workEq = async(eqId) => {

  let resInfo = await mariadb.query("updateEquipment", eqId)
  .catch(err => {
    console.error(err);
    return null; // 또는 throw err;
  });

  let result = null;
  if (resInfo?.affectedRows > 0) {
    result = {
      isSuccessed: true,
    };
  } else {
    result = {
      isSuccessed: false,
    };
  }
  return result;
}

const workStop = async (resultDetail, resultRm) => {
  const updateColumns = ['work_end_time', 'pass_qty', 'result_remark']

  const now = formatToMySQLDateTime(new Date()) // YYYY-MM-DD HH:MM:SS 형태로 변환
  const updateData = {
    work_end_time: now,
    pass_qty: resultRm.pass_qty,
    result_remark: resultRm.result_remark
  }

  const values = convertObjToAry(updateData, updateColumns)
  const data = [...values, resultDetail] // 마지막에 WHERE 조건으로 result_detail

  let resInfo = await mariadb.query("updateStop", data).catch(err => {
    console.error(err)
    return null
  })

  let result = null
  if (resInfo?.affectedRows > 0) {
    result = { isSuccessed: true }
  } else {
    result = { isSuccessed: false }
  }
  return result
}

const workStopEq = async(eqId) => {

  let resInfo = await mariadb.query("updateStopEq", eqId)
  .catch(err => {
    console.error(err);
    return null; // 또는 throw err;
  });

  let result = null;
  if (resInfo?.affectedRows > 0) {
    result = {
      isSuccessed: true,
    };
  } else {
    result = {
      isSuccessed: false,
    };
  }
  return result;
}

const resultEnd = async (resultId, passQty) => {
  const updateColumns = [ 'final_qty']

  const values = convertObjToAry(passQty, updateColumns)
  const data = [...values, resultId] // 마지막에 WHERE 조건으로 result_detail

  let resInfo = await mariadb.query("endResultWork", data).catch(err => {
    console.error(err)
    return null
  })

  let result = null
  if (resInfo?.affectedRows > 0) {
    result = { isSuccessed: true }
  } else {
    result = { isSuccessed: false }
  }
  return result
}



module.exports = {
  // 검색 관련
  searchResult,
  saveWorkResult,
  searchNoResult,
  searchProcessCheck,
  searcheQuipmentCheck,
  addDetail,
  workStart,
  workEq,
  workStop,
  workStopEq,
  resultEnd
};