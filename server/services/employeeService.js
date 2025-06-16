const mariadb = require("../database/mapper.js");
const { convertObjToAry } = require('../utils/converts.js')

// 전체 사원 목록 조회
const findAll = async () => {
  let list = await mariadb.query("getEmployeesList")
                          .catch(err => {
                            console.error(err);
                            return [];
                          });
  return list;
}

// 단일 사원 조회
const findById = async (employeeId) => {
  let item = await mariadb.query("getAccountById", [employeeId])
                          .catch(err => {
                            console.error(err);
                            return null;
                          });
  // 쿼리 결과가 배열로 나오는 경우 첫 번째 값만 반환
  if (Array.isArray(item) && item.length > 0) return item[0];
  return item;
}

// 거래처 등록
const addEmployee = async (employeeInfo) => {
  let insertColumns = [
    'employee_name', 'position', 'hire_date', 'phone', 'email', 'address',
    'password', 'employment_status', 'reg_date', 'upd_date', 'gender',
    'profile_img', 'department_code', 'auth_type'
  ];
  let data = convertObjToAry(employeeInfo, insertColumns);

  let resInfo = await mariadb.query("addEmployee", data)
    .catch(err => {
      console.error(err);
      return null;
    });

  if(!resInfo) {
    return {
      isSuccessed: false,
      message: 'DB insert 실패'
    };
  }
  
  let result = null;
  if (resInfo.affectedRows > 0) {
    result = {
      isSuccessed: true,
      accountId: resInfo.insertId
    }
  } else {
    result = {
      isSuccessed: false,
    }
  }
  return result;
}

// 사원 정보 수정
const updateEmployee = async (employeeId, employeeInfo) => {
  const updateColumns = [
    'employee_name', 'position', 'hire_date', 'phone', 'email', 'address',
    'password', 'employment_status', 'reg_date', 'upd_date', 'gender',
    'profile_img', 'department_code', 'auth_type'
  ];

  const values = convertObjToAry(employeeInfo, updateColumns);
  const data = [...values, employeeId];

  let resInfo = await mariadb.query("updateEmployee", data)
    .catch(err => {
      console.error(err);
      return null;
    });
    
  let result = null;
  if(resInfo?.affectedRows > 0) {
    employeeInfo.employee_id = employeeId;
    result = {
      isUpdated: true,
      employeeInfo
    };
  } else {
    result = {
      isUpdated: false
    };
  }
  return result;
}

// 사원 삭제 (반복문 => 여러 사원 삭제)
const killTheEmployee = async (employeeId) => {
  let result = await mariadb.query("deleteEmployee", [employeeId])
    .catch(err => {
      console.error(err);
      return null;
    });
  return {
    isDeleted: Number(result?.affectedRows) > 0
  };
}

module.exports = {
  findAll,
  findById,
  addEmployee,
  updateEmployee,
  killTheEmployee
}