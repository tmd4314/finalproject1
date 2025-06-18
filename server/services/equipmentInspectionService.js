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
async function getInspectionPartsByType(eq_type_code, eq_name = '') {
  try {
    const parts = await db.query('selectInspectionPartsByTypeFiltered', [eq_type_code, `%${eq_name}%`])
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
    console.log('점검 시작 진행')

    // 1. 점검 로그 추가 (inspection_log_id, eq_id, operator_id, inspection_type_code, start_time)
    const result = await db.query('insertInspectionLog', [eq_id, operator_id, inspection_type_code])
    console.log('점검 로그 생성 완료:', result)

    // 2. 설비 상태 업데이트 (work_code = 'w3', work_status_code = 'p2')
    await db.query('updateEquipmentStatusToInspection', [eq_id])
    console.log('설비 상태 업데이트 완료')

    return { success: true, message: '점검이 시작되었습니다.' }
  } catch (error) {
    console.error('점검 시작 중 오류:', error)
    throw new Error('점검 시작에 실패했습니다.')
  }
}

// 점검 종료 - 요구사항에 맞게 수정
async function endInspection({ eq_id, parts }) {
  try {
    console.log('=== 점검 종료 시작 ===')
    console.log('설비 ID:', eq_id)
    console.log('점검 항목 수:', parts.length)

    // 1. 데이터 유효성 검증
    if (!eq_id || !Array.isArray(parts) || parts.length === 0) {
      throw new Error('유효하지 않은 입력 데이터입니다.')
    }

    // 2. 진행 중인 점검 로그 ID 조회
    console.log('📋 점검 로그 ID 조회 중...')
    const logResults = await db.query('selectLastInspectionLogId', [eq_id])
    console.log('로그 조회 결과:', logResults)
    
    if (!logResults || logResults.length === 0) {
      throw new Error('진행 중인 점검 이력이 없습니다.')
    }
    
    const inspection_log_id = logResults[0].id
    console.log('점검 로그 ID:', inspection_log_id)

    if (!inspection_log_id) {
      throw new Error('유효하지 않은 점검 로그 ID입니다.')
    }

    // 3. 점검 항목 결과 저장 (inspect_part_result 테이블)
    console.log('📝 점검 항목 결과 저장 시작...')
    let successCount = 0
    let errorCount = 0
    let hasFailure = false // 부적합 항목이 있는지 확인

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      
      try {
        console.log(`점검 항목 처리 중 [${i}]: ${part.name}`)
        
        // 데이터 검증
        if (!part.part_id) {
          console.error(`❌ 유효하지 않은 part_id: ${part.part_id}`)
          errorCount++
          continue
        }
        
        // 체크된 항목만 결과 저장
        if (part.checked) {
          const resultCode = part.result || 'j1'
          const remark = part.remark || null
          
          // 부적합 항목 체크
          if (resultCode === 'j2') {
            hasFailure = true
          }
          
          console.log(`저장할 데이터:`, {
            inspection_log_id,
            part_id: part.part_id,
            result_code: resultCode,
            remark: remark
          })

          // inspect_part_result 테이블에 데이터 삽입
          await db.query('insertInspectPartResult', [
            inspection_log_id, 
            part.part_id, 
            resultCode,
            remark
          ])
          
          console.log(`✅ 저장 완료 [${i}]: part_id=${part.part_id}, result=${resultCode}`)
          successCount++
        } else {
          console.log(`⏭️ 건너뜀 [${i}]: 체크되지 않은 항목`)
        }
        
      } catch (partError) {
        console.error(`❌ 항목 저장 실패 [${i}]:`, partError)
        errorCount++
        continue
      }
    }

    console.log(`📊 저장 결과: 성공 ${successCount}개, 실패 ${errorCount}개, 부적합 여부: ${hasFailure}`)

    // 4. 전체 점검 결과 결정
    const overallResult = hasFailure ? 'j2' : 'j1' // 하나라도 부적합이면 전체 부적합
    console.log(`🎯 전체 점검 결과: ${overallResult}`)

    // 5. 점검 로그 완료 처리 (end_time, result_code, confirmer_id, is_completed)
    console.log('📊 점검 로그 완료 처리 중...')
    const checkedParts = parts.filter(p => p.checked)
    const remark = checkedParts
      .filter(p => p.remark)
      .map(p => `${p.name}: ${p.remark}`)
      .join('; ')

    const firstChecker = checkedParts.find(p => p.checker_id)?.checker_id || 0

    await db.query('completeInspectionLog', [
      overallResult, // result_code: 부적합이 하나라도 있으면 'j2', 없으면 'j1'
      remark,
      firstChecker,
      inspection_log_id
    ])
    console.log('✅ 점검 로그 업데이트 완료')

    // 6. 설비 상태 업데이트 (work_status_code = 'p1', eq_run_code = 's2')
    console.log('🔧 설비 상태 업데이트 중...')
    await db.query('updateEquipmentStatusToIdle', [eq_id])
    console.log('✅ 설비 상태 업데이트 완료')

    console.log('=== 점검 종료 완료 ===')
    return { 
      success: true, 
      message: '점검이 완료되었습니다.',
      details: {
        totalParts: parts.length,
        checkedParts: successCount,
        overallResult: overallResult,
        hasFailure: hasFailure
      }
    }
    
  } catch (error) {
    console.error('점검 종료 중 오류:', error)
    throw error
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