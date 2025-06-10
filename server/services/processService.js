const mariadb = require("../database/mapper.js");
const { convertObjToAry } = require('../utils/converts.js') 

const findProcess = async(productCode) => {
  let list = await mariadb.query("processSelect", productCode)
                          .catch(err => console.log(err));
  return list;
}

const findProcessDetail = async(processCode) => {
  let list = await mariadb.query("processDetailSelect", processCode)
                          .catch(err => console.log(err));
  return list;
}

const addProcess = async (processList) => {
  const insertColums = [
    'process_code',
    'process_name',
    'process_seq',
    'process_time',
    'code_value',
    'process_remark',
    'product_code'
  ];

  let successCount = 0;

  for (const process of processList) {

    const data = convertObjToAry(process, insertColums);

    const resInfo = await mariadb.query("processInsert", data)
    .catch(err => {
      console.error('❌ insert 실패:', err);
      return null;
    });

    if (resInfo && resInfo.affectedRows > 0) {
      successCount++;
    }
  }

  return {
    isSuccessed: successCount === processList.length,
    insertedCount: successCount,
    totalCount: processList.length,
    message: successCount === processList.length
      ? '모든 공정 등록 완료'
      : `${successCount}/${processList.length}개만 등록됨`
  };
};

const modifyProcess = async (processCode, detailList) => {
  const updateColumns = [
    'process_name',
    'process_seq',
    'process_time',
    'code_value'
  ];

  for (const detail of detailList) {
    detail.process_code = processCode;

    const values = convertObjToAry(detail, updateColumns);
    const data = [...values, processCode]; // WHERE 조건 맨 뒤에

    try {
      const resInfo = await mariadb.query("processUpdate", data);

      if (resInfo.affectedRows > 0) {
        isAnyUpdated = true;
      }
    } catch (err) {
      console.error('❌ 수정 쿼리 오류:', err);
      return {
        isSuccessed: false,
        message: '쿼리 실행 오류',
      };
    }
  }

  return {
    isSuccessed: isAnyUpdated,
    message: isAnyUpdated ? '수정 성공' : '변경된 데이터 없음',
  };
};


const addDetailProcess = async (processCode, detailList) => {
  const insertColums = [
    'BOM_code',
    'material_code',
    'name'
  ];

  let successCount = 0;

  for (const detail of detailList) {

    detail.process_code = processCode;

    const data = convertObjToAry(detail, ['process_code', ...insertColums]);

    const resInfo = await mariadb.query("processDetail", data)
    .catch(err => {
      console.error('❌ insert 실패:', err);
      return null;
    });

    if (resInfo && resInfo.affectedRows > 0) {
      successCount++;
    }
  }

  return {
    isSuccessed: successCount === detailList.length,
    insertedCount: successCount,
    totalCount: detailList.length,
    message: successCount === detailList.length
      ? '모든 공정 등록 완료'
      : `${successCount}/${detailList.length}개만 등록됨`
  };
};

const removeProcessInfo = async(processCode) => {
  let result = await mariadb.query("processDELETE", processCode)
                            .catch(err => console.log(err));
  return {
    isDeleted: Number(result.affectedRows) > 0 
  };
}

const removeProcessDetailInfo = async(processCode, materialCode) => {
  let result = await mariadb.query("processDetailDELETE", [processCode, materialCode])
                            .catch(err => console.log(err));
  return {
    isDeleted: Number(result.affectedRows) > 0 
  };
}




module.exports = {
  findProcess,
  addProcess,
  addDetailProcess,
  findProcessDetail,
  removeProcessInfo,
  removeProcessDetailInfo,
  modifyProcess
};