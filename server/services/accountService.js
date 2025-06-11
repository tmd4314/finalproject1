const mariadb = require("../database/mapper.js");
const { convertObjToAry } = require('../utils/converts.js')

// 전체 거래처 목록 조회
const findAll = async () => {
  let list = await mariadb.query("getAccountList")
                          .catch(err => {
                            console.error(err);
                            return [];
                          });
  return list;
}

// 단일 거래처 조회 (PK)
const findById = async (accountId) => {
  let item = await mariadb.query("getAccountById", [accountId])
                          .catch(err => {
                            console.error(err);
                            return null;
                          });
  // 쿼리 결과가 배열로 나오는 경우 첫 번째 값만 반환
  if (Array.isArray(item) && item.length > 0) return item[0];
  return item;
}

// 거래처 등록
const addAccount = async (accountInfo) => {
  // 컬럼 순서와 맞춰서 배열로 변환
  let insertColumns = [
    'account_name', 'account_type', 'business_no', 'phone', 'address',
    'charger_name', 'trade_status_yn', 'reg_date', 'upd_date'
  ];
  let data = convertObjToAry(accountInfo, insertColumns);

  let resInfo = await mariadb.query("accountInsert", data)
    .catch(err => {
      console.error(err);
      return null;
    });

  if (!resInfo) {
    return {
      isSuccessed: false, 
      message: 'DB insert 실패',
    };
  }

  let result = null;
  if (resInfo.affectedRows > 0) {
    result = {
      isSuccessed: true,
      accountId: resInfo.insertId, // 자동증가 PK면 insertId 반환
    }
  } else {
    result = {
      isSuccessed: false,
    }
  }
  return result;
}

// 거래처 정보 수정
const updateAccount = async (accountId, accountInfo) => {
  const updateColumns = [
    'account_name', 'account_type', 'business_no', 'phone', 'address',
    'charger_name', 'trade_status_yn', 'upd_date'
  ];
  const values = convertObjToAry(accountInfo, updateColumns);
  const data = [...values, accountId]; // WHERE 조건에 id 추가

  let resInfo = await mariadb.query("accountUpdate", data)
    .catch(err => {
      console.error(err);
      return null;
    });

  let result = null;
  if (resInfo?.affectedRows > 0) {
    accountInfo.account_id = accountId;
    result = {
      isUpdated: true,
      accountInfo,
    };
  } else {
    result = {
      isUpdated: false,
    };
  }
  return result;
}

// 1) 전체 거래처+in_use 목록 조회 (거래처 리스트 화면용)
const findAllWithUsage = async () => {
  let list = await mariadb.query("getAccountListWithUsage")
    .catch(err => { console.error(err); return []; });
  return list;
}

// 2) 특정 거래처가 사용중인지 개별 확인 (삭제 API 서버 방어용)
const isAccountInUse = async (accountId) => {
  // getAccountInUse는 ? 파라미터 2개 받음!
  let [result] = await mariadb.query("getAccountInUse", [accountId, accountId]);
  return result?.in_use === 1; // true면 사용중, false면 사용 안함
}


// 거래처 삭제
const removeAccount = async (accountId) => {
  let result = await mariadb.query("accountDelete", [accountId])
    .catch(err => {
      console.error(err);
      return null;
    });
  return {
    isDeleted: Number(result?.affectedRows) > 0
  };
}

// 여러 거래처 삭제
const removeMultiple = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return { affectedRows: 0 }
  let totalAffected = 0
  for (const id of ids) {
    const result = await mariadb.query("accountDelete", [id])
      .catch(err => { console.error(err); return { affectedRows: 0 } })
    totalAffected += Number(result.affectedRows)
  }
  return { affectedRows: totalAffected }
}


// 외부에서 함수로 쓸 수 있게 내보내기
module.exports = {
  findAll,
  findById,
  addAccount,
  updateAccount,
  removeAccount,
  removeMultiple,
  isAccountInUse,
  findAllWithUsage
};
