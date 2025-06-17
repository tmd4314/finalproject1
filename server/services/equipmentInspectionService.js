// server/services/equipmentInspectionService.js

const db = require('../database/mapper')

// BigInt 및 Date 변환 유틸리티 함수
const convertBigIntToString = (obj) => {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return obj.toString()
  if (Array.isArray(obj)) return obj.map(convertBigIntToString)
  if (typeof obj === 'object') {
    const converted = {}
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value)
    }
    return converted
  }
  return obj
}

const convertDates = (obj) => {
  if (!obj) return obj
  if (Array.isArray(obj)) return obj.map(convertDates)
  if (typeof obj === 'object') {
    const converted = {}
    for (const [key, value] of Object.entries(obj)) {
      if (key.includes('date') && value instanceof Date) {
        converted[key] = value.toISOString().split('T')[0]
      } else {
        converted[key] = convertDates(value)
      }
    }
    return converted
  }
  return obj
}

const convertData = (obj) => convertDates(convertBigIntToString(obj))

// 점검 가능한 설비 목록 조회
async function getInspectableEquipments() {
  try {
    const list = await db.query('selectInspectableEquipments')
    return convertData(list)
  } catch (error) {
    console.error('점검 가능 설비 조회 중 오류:', error)
    throw new Error('점검 가능 설비 조회에 실패했습니다.')
  }
}

// 설비 유형별 점검 항목 조회
async function getInspectionPartsByType(eq_type_code) {
  try {
    const parts = await db.query('selectInspectionPartsByType', [eq_type_code])
    return convertData(parts)
  } catch (error) {
    console.error('점검 항목 조회 중 오류:', error)
    throw new Error('점검 항목 조회에 실패했습니다.')
  }
}

// 점검 가능 여부 확인
async function checkInspectionAvailability(eq_id) {
  try {
    // 1. 설비 자체 상태 확인 (청소 진행중, 점검 진행중 등)
    const [equipmentStatus] = await db.query('checkInspectionAvailability', [eq_id])
    if (equipmentStatus.status !== 'AVAILABLE') {
      return equipmentStatus.status
    }

    // 2. 공정 진행 상태 확인 (work_result_detail 테이블)
    const [processCheck] = await db.query('checkProcessInProgress', [eq_id])
    if (processCheck.count > 0) {
      return 'PROCESS_IN_PROGRESS'
    }

    return 'AVAILABLE'
  } catch (error) {
    console.error('점검 가능 여부 확인 중 오류:', error)
    throw new Error('점검 가능 여부 확인에 실패했습니다.')
  }
}

// 점검 시작
async function startInspection({ eq_id, operator_id, inspection_type_code }) {
  try {
    // 트랜잭션 시작
    await db.query('START TRANSACTION')

    // 1. 점검 로그 추가
    await db.query('insertInspectionLog', [eq_id, operator_id, inspection_type_code])

    // 2. 설비 상태 업데이트 (점검 진행중으로 변경)
    await db.query('updateEquipmentStatusToInspection', [eq_id])

    // 트랜잭션 커밋
    await db.query('COMMIT')
    
    return { success: true, message: '점검이 시작되었습니다.' }
  } catch (error) {
    // 트랜잭션 롤백
    await db.query('ROLLBACK')
    console.error('점검 시작 중 오류:', error)
    throw new Error('점검 시작에 실패했습니다.')
  }
}

// 점검 종료
async function endInspection({ eq_id, parts }) {
  try {
    // 트랜잭션 시작
    await db.query('START TRANSACTION')

    // 1. 진행 중인 점검 로그 ID 조회
    const [logResult] = await db.query('selectLastInspectionLogId', [eq_id])
    const inspection_log_id = logResult?.id

    if (!inspection_log_id) {
      throw new Error('진행 중인 점검 이력이 없습니다.')
    }

    // 2. 체크된 점검 항목들의 결과 저장
    for (const part of parts) {
      if (!part.checked) continue // 체크되지 않은 항목은 저장하지 않음
      
      await db.query('insertInspectPartResult', [
        inspection_log_id, 
        part.part_id, 
        part.result || 'j1' // 결과가 없으면 기본값 '적합'
      ])
    }

    // 3. 점검 로그 완료 처리
    const remark = parts
      .filter(p => p.checked && p.remark)
      .map(p => `${p.name}: ${p.remark}`)
      .join('; ')

    const firstChecker = parts.find(p => p.checked && p.checker_id)?.checker_id || 0

    // 전체 결과 판정 (부적합이 하나라도 있으면 부적합)
    const hasFailure = parts.some(p => p.checked && p.result === 'j2')
    const overallResult = hasFailure ? 'j2' : 'j1'

    await db.query('completeInspectionLog', [
      overallResult,
      remark,
      firstChecker,
      inspection_log_id
    ])

    // 4. 설비 상태 업데이트 (점검 완료 후 가동대기중으로 변경)
    await db.query('updateEquipmentStatusToIdle', [eq_id])

    // 트랜잭션 커밋
    await db.query('COMMIT')
    
    return { success: true, message: '점검이 완료되었습니다.' }
  } catch (error) {
    // 트랜잭션 롤백
    await db.query('ROLLBACK')
    console.error('점검 종료 중 오류:', error)
    throw new Error('점검 종료에 실패했습니다.')
  }
}

// 모든 사원 목록 조회
async function getAllEmployees() {
  try {
    let rows
    try {
      // 먼저 employees 테이블에서 조회 시도
      rows = await db.query('selectAllEmployees')
    } catch (error) {
      // employees 테이블이 없으면 임시 데이터 사용
      console.warn('employees 테이블이 없습니다. 임시 데이터를 사용합니다.')
      rows = await db.query('selectTempEmployees')
    }
    
    return convertData(rows)
  } catch (error) {
    console.error('사원 목록 조회 중 오류:', error)
    // 최종적으로 실패하면 하드코딩된 데이터 반환
    return convertData([
      { employee_id: 'EMP001' },
      { employee_id: 'EMP002' },
      { employee_id: 'EMP003' },
      { employee_id: 'EMP004' },
      { employee_id: 'EMP005' }
    ])
  }
}

// 설비별 점검 상태 확인
async function getEquipmentInspectionStatus(eq_id) {
  try {
    const equipmentList = await db.query('selectInspectableEquipments')
    const targetEquipment = equipmentList.find(eq => eq.eq_id.toString() === eq_id.toString())
    
    if (!targetEquipment) {
      throw new Error('설비를 찾을 수 없습니다.')
    }

    const availability = await checkInspectionAvailability(eq_id)
    
    return convertData({
      equipment: targetEquipment,
      availability: availability,
      canStartInspection: availability === 'AVAILABLE'
    })
  } catch (error) {
    console.error('설비 점검 상태 확인 중 오류:', error)
    throw new Error('설비 점검 상태 확인에 실패했습니다.')
  }
}

module.exports = {
  getInspectableEquipments,
  getInspectionPartsByType,
  checkInspectionAvailability,
  startInspection,
  endInspection,
  getAllEmployees,
  getEquipmentInspectionStatus
}