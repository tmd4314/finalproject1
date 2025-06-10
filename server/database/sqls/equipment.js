module.exports = {
  // 설비 등록
  insertEquipment: `
    INSERT INTO equipment (
      eq_name, eq_group_code, eq_type_code, eq_import_code, eq_factory_code,
      eq_floor_code, eq_room_code, eq_manufacture_date, eq_registration_date,
      eq_manufacturer, eq_model, eq_serial_number, eq_power_spec,
      eq_max_operation_time, eq_inspection_cycle, eq_remark, eq_image, line_id,
      eq_run_code
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  // 설비 리스트 조회 (설비 조회/관리용)
  selectEquipmentList: `
    SELECT
      e.eq_id, 
      e.eq_name, 
      e.eq_group_code, 
      e.eq_type_code, 
      e.eq_import_code,
      e.eq_factory_code, 
      e.eq_floor_code, 
      e.eq_room_code,
      e.eq_run_code,
      DATE_FORMAT(e.eq_manufacture_date, '%Y-%m-%d') as eq_manufacture_date,
      DATE_FORMAT(e.eq_registration_date, '%Y-%m-%d') as eq_registration_date, 
      e.eq_manufacturer, 
      e.eq_model,
      (SELECT code_label FROM common_code WHERE code_value = e.eq_group_code AND code_group = '0E') as eq_group_name,
      (SELECT code_label FROM common_code WHERE code_value = e.eq_type_code AND code_group = '0T') as eq_type_name,
      (SELECT code_label FROM common_code WHERE code_value = e.eq_run_code AND code_group = '0S') as eq_run_name,
      (SELECT code_label FROM common_code WHERE code_value = e.eq_factory_code AND code_group = '0F') as factory_name,
      (SELECT code_label FROM common_code WHERE code_value = e.eq_floor_code AND code_group = '0L') as floor_name,
      (SELECT code_label FROM common_code WHERE code_value = e.eq_room_code AND code_group = '0M') as room_name,
      (SELECT 
        CONCAT(
          (SELECT code_label FROM common_code WHERE code_value = eil.status_code AND code_group = '0P'),
          '(', DATE_FORMAT(eil.start_time, '%Y-%m-%d'), ')'
        ) 
       FROM equipment_inspection_log eil 
       WHERE eil.eq_id = e.eq_id 
       AND eil.inspection_type_code = 'w3'
       ORDER BY eil.inspection_log_id DESC 
       LIMIT 1) as inspection_status,
      (SELECT 
        CONCAT(
          (SELECT code_label FROM common_code WHERE code_value = ecl.status_code AND code_group = '0P'),
          '(', DATE_FORMAT(ecl.start_time, '%Y-%m-%d'), ')'
        ) 
       FROM equipment_cleaning_log ecl 
       WHERE ecl.eq_id = e.eq_id 
       AND ecl.cleaning_type_code = 'w4'
       ORDER BY ecl.cleaning_log_id DESC 
       LIMIT 1) as cleaning_status
    FROM equipment e
    ORDER BY e.eq_id DESC
  `,

  // 설비 상세 조회
  selectEquipmentDetail: `
    SELECT
      eq_id, eq_name, eq_group_code, eq_type_code, eq_import_code,
      eq_factory_code, eq_floor_code, eq_room_code, line_id,
      DATE_FORMAT(eq_manufacture_date, '%Y-%m-%d') as eq_manufacture_date,
      DATE_FORMAT(eq_registration_date, '%Y-%m-%d') as eq_registration_date,
      eq_manufacturer, eq_model, eq_serial_number, eq_power_spec,
      eq_max_operation_time, eq_inspection_cycle, eq_remark, eq_image
    FROM equipment
    WHERE eq_id = ?
  `,

  // 설비 수정 (등록일 갱신 포함)
  updateEquipment: `
    UPDATE equipment SET
      eq_name = ?, eq_group_code = ?, eq_type_code = ?, eq_import_code = ?,
      eq_factory_code = ?, eq_floor_code = ?, eq_room_code = ?, line_id = ?,
      eq_manufacture_date = ?, eq_registration_date = ?, eq_manufacturer = ?, eq_model = ?,
      eq_serial_number = ?, eq_power_spec = ?, eq_max_operation_time = ?,
      eq_inspection_cycle = ?, eq_remark = ?, eq_image = ?
    WHERE eq_id = ?
  `,

  // 설비명 중복 수
  countSameNameEquipments: `
    SELECT COUNT(*) as count FROM equipment WHERE eq_name LIKE ?
  `,

  // 단일 삭제
  deleteInspectPartResultByEquipment: `
    DELETE ipr FROM inspect_part_result ipr
    INNER JOIN equipment_inspection_log eil ON ipr.inspection_log_id = eil.inspection_log_id
    WHERE eil.eq_id = ?
  `,
  deleteCleaningPartResultByEquipment: `
    DELETE cpr FROM cleaning_part_result cpr
    INNER JOIN equipment_cleaning_log ecl ON cpr.cleaning_log_id = ecl.cleaning_log_id
    WHERE ecl.eq_id = ?
  `,
  deleteCleaningChemicalLogByEquipment: `
    DELETE ccl FROM cleaning_chemical_log ccl
    INNER JOIN equipment_cleaning_log ecl ON ccl.cleaning_log_id = ecl.cleaning_log_id
    WHERE ecl.eq_id = ?
  `,
  deleteEquipmentInspectionLog: `
    DELETE FROM equipment_inspection_log WHERE eq_id = ?
  `,
  deleteEquipmentCleaningLog: `
    DELETE FROM equipment_cleaning_log WHERE eq_id = ?
  `,
  deleteEquipmentStopLog: `
    DELETE FROM equipment_stop_log WHERE eq_id = ?
  `,
  deleteEquipmentMaintenanceStatus: `
    DELETE FROM eq_maintenance_status WHERE eq_id = ?
  `,
  deleteEquipment: `
    DELETE FROM equipment WHERE eq_id = ?
  `,

  // 다중 삭제
  deleteInspectPartResultByEqIds: `
    DELETE ipr FROM inspect_part_result ipr
    INNER JOIN equipment_inspection_log eil ON ipr.inspection_log_id = eil.inspection_log_id
    WHERE eil.eq_id IN (?)
  `,
  deleteCleaningPartResultByEqIds: `
    DELETE cpr FROM cleaning_part_result cpr
    INNER JOIN equipment_cleaning_log ecl ON cpr.cleaning_log_id = ecl.cleaning_log_id
    WHERE ecl.eq_id IN (?)
  `,
  deleteCleaningChemicalLogByEqIds: `
    DELETE ccl FROM cleaning_chemical_log ccl
    INNER JOIN equipment_cleaning_log ecl ON ccl.cleaning_log_id = ecl.cleaning_log_id
    WHERE ecl.eq_id IN (?)
  `,
  deleteEquipmentInspectionLogByEqIds: `
    DELETE FROM equipment_inspection_log WHERE eq_id IN (?)
  `,
  deleteEquipmentCleaningLogByEqIds: `
    DELETE FROM equipment_cleaning_log WHERE eq_id IN (?)
  `,
  deleteEquipmentStopLogByEqIds: `
    DELETE FROM equipment_stop_log WHERE eq_id IN (?)
  `,
  deleteEquipmentMaintenanceStatusByEqIds: `
    DELETE FROM eq_maintenance_status WHERE eq_id IN (?)
  `,
  deleteMultipleEquipments: `
    DELETE FROM equipment WHERE eq_id IN (?)
  `,
};
