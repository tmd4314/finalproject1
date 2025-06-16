//server/database/sqls/equipmentInspection.js

module.exports = {
  // 점검 시작
  insertInspectionLog: `
    INSERT INTO equipment_inspection_log (
      eq_id, operator_id, inspection_type_code, status_code,
      start_time, end_time, result_code, inspection_remark,
      confirmer_id, is_completed
    ) VALUES (?, ?, ?, ?, ?, null, null, null, null, false)
  `,

  // 점검 완료 업데이트
  updateInspectionLog: `
    UPDATE equipment_inspection_log
    SET end_time = ?,
        result_code = ?,
        inspection_remark = ?,
        confirmer_id = ?,
        status_code = ?,
        is_completed = true
    WHERE inspection_log_id = ?
  `,

  // 점검 항목 결과 저장
  insertInspectPartResult: `
    INSERT INTO inspect_part_result (
      inspection_log_id, inspect_part_id, result_code
    ) VALUES (?, ?, ?)
  `,

  // 점검 항목 조회
  selectInspectionPartsByType: `
    SELECT 
      inspect_part_id,
      eq_type_code,
      inspect_part_name
    FROM inspection_parts
    WHERE eq_type_code = ?
    ORDER BY inspect_part_id
  `,

  // 진행 중 점검 조회
  selectInProgressInspection: `
    SELECT 
      inspection_log_id,
      eq_id,
      operator_id,
      inspection_type_code,
      status_code,
      start_time,
      result_code,
      inspection_remark,
      confirmer_id
    FROM equipment_inspection_log
    WHERE eq_id = ?
      AND is_completed = FALSE
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
      eil.is_completed,
      e1.emp_name AS operator_name,
      e2.emp_name AS confirmer_name
    FROM equipment_inspection_log eil
    LEFT JOIN common_code cc1 ON cc1.code_group = '0N' AND cc1.code_value = eil.inspection_type_code
    LEFT JOIN common_code cc2 ON cc2.code_group = '0P' AND cc2.code_value = eil.status_code
    LEFT JOIN common_code cc3 ON cc3.code_group = '0J' AND cc3.code_value = eil.result_code
    LEFT JOIN employee e1 ON e1.emp_id = eil.operator_id
    LEFT JOIN employee e2 ON e2.emp_id = eil.confirmer_id
    WHERE eil.eq_id = ?
    ORDER BY eil.inspection_log_id DESC
  `,

  // 설비 가동상태: 유지보수 작업상태 테이블 업데이트
  updateMaintenanceStatus: `
    INSERT INTO eq_maintenance_status (eq_id, work_code, work_status_code, updated_at)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      work_code = VALUES(work_code),
      work_status_code = VALUES(work_status_code),
      updated_at = VALUES(updated_at)
  `,

  // 현재 작업 중인지 확인 (work_log 테이블이 없다면 이 쿼리는 제거)
  selectActiveWorkByEqId: `
    SELECT 
      ems.eq_id,
      ems.work_code,
      ems.work_status_code
    FROM eq_maintenance_status ems
    WHERE ems.eq_id = ?
      AND ems.work_status_code = 'p2'
    ORDER BY ems.updated_at DESC
    LIMIT 1
  `,

  // 설비 테이블 가동 상태 업데이트
  updateEquipmentRunCode: `
    UPDATE equipment
    SET eq_run_code = ?
    WHERE eq_id = ?
  `,

  // 직원 드롭다운용
  selectEmployeesForDropdown: `
    SELECT emp_id, emp_name FROM employee ORDER BY emp_name ASC
  `
}