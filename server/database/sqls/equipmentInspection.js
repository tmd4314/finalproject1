// server/database/sqls/equipmentInspection.js

module.exports = {
  // 점검 가능한 설비 목록 조회
  selectInspectableEquipments: `
    SELECT
      e.eq_id,
      e.eq_name,
      e.eq_group_code,
      e.eq_type_code,
      e.eq_run_code,
      e.work_code,
      e.work_status_code,
      (SELECT code_label FROM common_code WHERE code_value = e.eq_group_code AND code_group = '0E') as eq_group_name,
      (SELECT code_label FROM common_code WHERE code_value = e.eq_run_code AND code_group = '0S') as eq_run_name
    FROM equipment e
    WHERE e.eq_run_code = 's3'
      AND (
        e.work_code IS NULL OR 
        e.work_status_code IS NULL OR 
        NOT (e.work_code = 'w4' AND e.work_status_code = 'p2')
      )
    ORDER BY e.eq_id DESC
  `,

  // 점검 항목 조회 (설비별)
  selectInspectionPartsByTypeFiltered: `
    SELECT inspect_part_id, inspect_part_name
    FROM inspection_parts
    WHERE eq_type_code = ? 
      AND (filter_keyword IS NULL OR filter_keyword = '' OR ? LIKE CONCAT('%', filter_keyword, '%'))
    ORDER BY inspect_part_id ASC
  `,

  // 점검 시작 시 로그 추가 - LAST_INSERT_ID() 반환
  insertInspectionLog: `
    INSERT INTO equipment_inspection_log (
      eq_id, 
      operator_id, 
      inspection_type_code, 
      status_code, 
      start_time, 
      result_code, 
      confirmer_id, 
      is_completed
    )
    VALUES (?, ?, ?, 'p2', NOW(), '', 0, FALSE)
  `,

  // 방금 생성한 로그 ID 가져오기
  selectLastInspectionLogId: `
    SELECT MAX(inspection_log_id) AS id
    FROM equipment_inspection_log
    WHERE eq_id = ? AND is_completed = FALSE
  `,

  // 설비 상태 업데이트 (점검 시작) - work_code = 'w3', work_status_code = 'p2'
  updateEquipmentStatusToInspection: `
    UPDATE equipment
    SET work_code = 'w3', work_status_code = 'p2', eq_run_code = 's3'
    WHERE eq_id = ?
  `,

  // 점검 항목 결과 저장 - inspect_part_result 테이블
  insertInspectPartResult: `
    INSERT INTO inspect_part_result (
      inspection_log_id, 
      inspect_part_id, 
      result_code, 
      remark
    )
    VALUES (?, ?, ?, ?)
  `,

  // 점검 종료 시 로그 업데이트 - end_time, result_code, confirmer_id, is_completed
  completeInspectionLog: `
    UPDATE equipment_inspection_log
    SET 
      end_time = NOW(), 
      result_code = ?, 
      inspection_remark = ?, 
      confirmer_id = ?, 
      is_completed = TRUE,
      status_code = 'p3'
    WHERE inspection_log_id = ?
  `,

  // 설비 상태 업데이트 (점검 종료) - work_status_code = 'p1', eq_run_code = 's2'
  updateEquipmentStatusToIdle: `
    UPDATE equipment
    SET 
      eq_run_code = 's2',
      work_code = 'w3', 
      work_status_code = 'p1',
      last_inspection_time = NOW()
    WHERE eq_id = ?
  `,

  // 사원 목록 조회 (employees 테이블이 없을 경우 대비)
  selectAllEmployees: `
    SELECT DISTINCT employee_id 
    FROM employees
    WHERE employee_id IS NOT NULL
    ORDER BY employee_id
  `,

  // employees 테이블이 없을 경우 임시 사원 데이터
  selectTempEmployees: `
    SELECT 'EMP001' as employee_id UNION ALL
    SELECT 'EMP002' as employee_id UNION ALL  
    SELECT 'EMP003' as employee_id UNION ALL
    SELECT 'EMP004' as employee_id UNION ALL
    SELECT 'EMP005' as employee_id
    ORDER BY employee_id
  `,

  // 점검 가능 여부 확인 (청소 진행 중이거나 다른 공정 진행 중인지)
  checkInspectionAvailability: `
    SELECT 
      CASE 
        WHEN work_code = 'w4' AND work_status_code = 'p2' THEN 'CLEANING_IN_PROGRESS'
        WHEN work_code = 'w3' AND work_status_code = 'p2' THEN 'INSPECTION_IN_PROGRESS'
        ELSE 'AVAILABLE'
      END as status
    FROM equipment
    WHERE eq_id = ?
  `,

  // 공정 진행 상태 확인 (work_result_detail 테이블)
  checkProcessInProgress: `
    SELECT COUNT(*) as count
    FROM work_result_detail wrd
    WHERE wrd.eq_id = ? AND wrd.code_value = 'p2'
  `,

  // 디버깅용: 설비 현재 상태 확인
  selectEquipmentCurrentStatus: `
    SELECT 
      eq_id,
      eq_name,
      eq_run_code,
      work_code,
      work_status_code,
      last_inspection_time
    FROM equipment
    WHERE eq_id = ?
  `,

  // 디버깅용: 진행 중인 점검 로그 확인
  selectInProgressInspectionLog: `
    SELECT 
      inspection_log_id,
      eq_id,
      operator_id,
      inspection_type_code,
      status_code,
      start_time,
      is_completed
    FROM equipment_inspection_log
    WHERE eq_id = ? AND is_completed = FALSE
    ORDER BY inspection_log_id DESC
  `,

  // 디버깅용: 특정 점검 로그의 모든 결과 확인
  selectInspectionResults: `
    SELECT 
      ipr.inspect_part_result_id,
      ipr.inspection_log_id,
      ipr.inspect_part_id,
      ipr.result_code,
      ipr.remark,
      ip.inspect_part_name
    FROM inspect_part_result ipr
    LEFT JOIN inspection_parts ip ON ipr.inspect_part_id = ip.inspect_part_id
    WHERE ipr.inspection_log_id = ?
    ORDER BY ipr.inspect_part_id
  `
}