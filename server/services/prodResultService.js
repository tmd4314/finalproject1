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

// 공통코드 검색 
const searchenEq = async () => {
  let list = await mariadb.query("endEq")
                            .catch(err => console.log(err));
  return list;
};


// 작업지시 검색 (모달용)
const materialOutList = async (processCode) => {
  let list = await mariadb.query("materialOutList", processCode)
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
const searcheQuipmentCheck = async (eqTypeCode) => {
  let list = await mariadb.query("selectEqList", eqTypeCode)
                            .catch(err => console.log(err));
  return list;
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

const updateStatus = async(resultId) => {

  let resInfo = await mariadb.query("updateResultStatus", resultId)
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

function formatToMySQLDateTime(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}


const workStart = async(resultDetail, passQty) => {
  const updateColumns = [
   'work_start_time', 'pass_qty', 'manager_id', 'eq_id'
  ];

  
  const now = formatToMySQLDateTime(new Date());
  const updateData = { work_start_time: now, pass_qty: passQty.pass_qty, manager_id: passQty.manager_id, eq_id: passQty.eq_id };
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

const workStopEq = async(eqId, stopReason) => {

  updateColumns = [ 'stop_reason' ]
  
  const data = convertObjToAry(stopReason, updateColumns)

  let resInfo = await mariadb.query("updateStopEq", data, eqId)
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
  searchNoResult,
  searchProcessCheck,
  searcheQuipmentCheck,
  addDetail,
  workStart,
  workEq,
  workStop,
  workStopEq,
  resultEnd,
  updateStatus,
  materialOutList,
  searchenEq
};