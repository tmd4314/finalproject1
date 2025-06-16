//equipmentInspectionService.js

const mariadb = require('../database/mapper')

// BigInt 변환 유틸리티
const convertBigIntToString = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(convertBigIntToString);
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value);
    }
    return converted;
  }
  return obj;
};

const startInspection = async ({ eq_id, operator_id, inspection_type_code }) => {
  try {
    const start_time = new Date()
    const status_code = 'p2' // 점검 진행중
    
    const result = await mariadb.query('insertInspectionLog', [
      eq_id,
      operator_id,
      inspection_type_code,
      status_code,
      start_time
    ])

    // 유지보수 상태 업데이트
    await mariadb.query('updateMaintenanceStatus', [
      eq_id,
      'w3', // 점검 작업
      status_code,
      start_time
    ])

    // 설비 가동 상태를 '정지'로 변경 (점검 중이므로)
    await mariadb.query('updateEquipmentRunCode', ['s3', eq_id])

    return convertBigIntToString({ 
      inspection_log_id: result.insertId, 
      message: '점검이 시작되었습니다.' 
    })
  } catch (error) {
    console.error('점검 시작 실패:', error)
    throw error
  }
}

const completeInspection = async ({
  inspection_log_id,
  eq_id,
  result_code,
  inspection_remark,
  confirmer_id,
  checked_parts
}) => {
  try {
    const end_time = new Date()
    const status_code = 'p3' // 점검 완료
    
    // 점검 로그 완료 업데이트
    await mariadb.query('updateInspectionLog', [
      end_time,
      result_code,
      inspection_remark,
      confirmer_id,
      status_code,
      inspection_log_id
    ])

    // 점검 항목 결과 저장
    if (checked_parts && checked_parts.length > 0) {
      for (const part of checked_parts) {
        await mariadb.query('insertInspectPartResult', [
          inspection_log_id,
          part.inspect_part_id,
          result_code
        ])
      }
    }

    // 유지보수 상태 업데이트
    await mariadb.query('updateMaintenanceStatus', [
      eq_id,
      'w3', // 점검 작업
      status_code,
      end_time
    ])

    // 점검 완료 후 설비 가동 상태를 '가동대기중'으로 변경
    await mariadb.query('updateEquipmentRunCode', ['s2', eq_id])

    return { 
      inspection_log_id, 
      message: '점검이 완료되었습니다.' 
    }
  } catch (error) {
    console.error('점검 완료 실패:', error)
    throw error
  }
}

const getInspectionParts = async (eqTypeCode) => {
  try {
    const parts = await mariadb.query('selectInspectionPartsByType', [eqTypeCode])
    return convertBigIntToString(parts)
  } catch (error) {
    console.error('점검 항목 조회 실패:', error)
    throw error
  }
}

const getEmployeesDirect = async () => {
  try {
    const employees = await mariadb.query('selectEmployeesForDropdown')
    return convertBigIntToString(employees)
  } catch (error) {
    console.error('직원 목록 조회 실패:', error)
    throw error
  }
}

const getInProgressInspection = async (eqId) => {
  try {
    const [inspection] = await mariadb.query('selectInProgressInspection', [eqId])
    return convertBigIntToString(inspection)
  } catch (error) {
    console.error('진행 중인 점검 조회 실패:', error)
    throw error
  }
}

const getInspectionHistory = async (eqId) => {
  try {
    const history = await mariadb.query('selectInspectionHistory', [eqId])
    return convertBigIntToString(history)
  } catch (error) {
    console.error('점검 이력 조회 실패:', error)
    throw error
  }
}

module.exports = {
  startInspection,
  completeInspection,
  getInspectionParts,
  getEmployeesDirect,
  getInProgressInspection,
  getInspectionHistory
}