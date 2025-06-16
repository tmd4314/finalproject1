module.exports = {
  // 점검 시작
  insertInspectionLog: `
    INSERT INTO equipment_inspection_log (
      eq_id, operator_id, inspection_type_code, status_code,
      start_time, is_completed
    ) VALUES (?, ?, ?, 'p2', ?, false)
  `,

  // 점검 완료 업데이트
  updateInspectionLog: `
    UPDATE equipment_inspection_log
    SET end_time = ?,
        result_code = ?,
        inspection_remark = ?,
        confirmer_id = ?,
        status_code = 'p3',
        is_completed = true
    WHERE inspection_log_id = ?
  `,

  // 점검 항목 결과 저장 - 수정됨
  insertInspectPartResult: `
    INSERT INTO inspect_part_result (
      inspection_log_id, inspect_part_id, result_code, inspection_remark, confirmer_id
    ) VALUES (?, ?, ?, ?, ?)
  `,

  // 설비별 점검 항목 조회
  selectInspectionPartsByType: `
    SELECT 
      inspect_part_id,
      eq_type_code,
      inspect_part_name
    FROM inspection_parts
    WHERE eq_type_code = ?
    ORDER BY inspect_part_id
  `,

  // 직원 목록 조회 - 사원 정보 직접 조회
  selectEmployeesForInspection: `
    SELECT 
      employee_id as value,
      CONCAT(employee_name, ' (', employee_id, ')') as label
    FROM employees
    WHERE employee_status = 'active'
    ORDER BY employee_name ASC
  `,

  // 설비 상태 업데이트 (점검 시작 시 정지로 변경)
  updateEquipmentStatusToStop: `
    UPDATE equipment
    SET eq_run_code = 's3'
    WHERE eq_id = ?
  `,

  // 설비 상태 업데이트 (점검 완료 시 가동대기중으로 변경)
  updateEquipmentStatusToStandby: `
    UPDATE equipment
    SET eq_run_code = 's2'
    WHERE eq_id = ?
  `,

  // 진행 중인 점검 조회
  selectInProgressInspection: `
    SELECT 
      inspection_log_id,
      eq_id,
      operator_id,
      inspection_type_code,
      status_code,
      start_time
    FROM equipment_inspection_log
    WHERE eq_id = ?
      AND is_completed = false
      AND status_code = 'p2'
    ORDER BY inspection_log_id DESC
    LIMIT 1
  `,

  // 점검 이력 조회
  selectInspectionHistory: `
    SELECT 
      eil.inspection_log_id,
      eil.eq_id,
      eil.operator_id,
      e.employee_name AS operator_name,
      eil.inspection_type_code,
      cc1.code_label AS inspection_type_name,
      eil.status_code,
      cc2.code_label AS status_name,
      DATE_FORMAT(eil.start_time, '%Y-%m-%d %H:%i:%s') AS start_time,
      DATE_FORMAT(eil.end_time, '%Y-%m-%d %H:%i:%s') AS end_time,
      eil.result_code,
      cc3.code_label AS result_name,
      eil.inspection_remark,
      eil.confirmer_id,
      ec.employee_name AS confirmer_name,
      eil.is_completed
    FROM equipment_inspection_log eil
    LEFT JOIN employees e ON e.employee_id = eil.operator_id
    LEFT JOIN employees ec ON ec.employee_id = eil.confirmer_id
    LEFT JOIN common_code cc1 ON cc1.code_group = '0N' AND cc1.code_value = eil.inspection_type_code
    LEFT JOIN common_code cc2 ON cc2.code_group = '0P' AND cc2.code_value = eil.status_code
    LEFT JOIN common_code cc3 ON cc3.code_group = '0J' AND cc3.code_value = eil.result_code
    WHERE eil.eq_id = ?
    ORDER BY eil.inspection_log_id DESC
    LIMIT 10
  `
}