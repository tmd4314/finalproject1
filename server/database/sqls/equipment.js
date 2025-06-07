// server/database/sqls/equipment.js
module.exports = {
  // 설비 등록
  insertEquipment: `
    INSERT INTO equipment (
      eq_name, eq_group_code, eq_type_code, eq_import_code, eq_factory_code,
      eq_floor_code, eq_room_code, eq_manufacture_date, eq_registration_date,
      eq_manufacturer, eq_model, eq_serial_number, eq_power_spec,
      eq_max_operation_time, eq_inspection_cycle, eq_remark, eq_image_url, line_id,
      eq_run_code
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  // 설비 리스트 조회 (설비 조회/관리용) - 날짜 포맷팅 추가
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
      -- 최근 점검 정보 (작업유형 w3=점검)
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
      -- 최근 청소 정보 (작업유형 w4=청소)
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
      eq_max_operation_time, eq_inspection_cycle, eq_remark, eq_image_url
    FROM equipment
    WHERE eq_id = ?
  `,

  // 설비 수정
  updateEquipment: `
    UPDATE equipment SET
      eq_name = ?, eq_group_code = ?, eq_type_code = ?, eq_import_code = ?,
      eq_factory_code = ?, eq_floor_code = ?, eq_room_code = ?, line_id = ?,
      eq_manufacture_date = ?, eq_manufacturer = ?, eq_model = ?,
      eq_serial_number = ?, eq_power_spec = ?, eq_max_operation_time = ?,
      eq_inspection_cycle = ?, eq_remark = ?, eq_image_url = ?
    WHERE eq_id = ?
  `,

  // 설비 삭제
  deleteEquipment: `
    DELETE FROM equipment
    WHERE eq_id = ?
  `,

  // 같은 이름 설비 몇 개인지 (ex. 혼합기%)
  countSameNameEquipments: `
    SELECT COUNT(*) as count
    FROM equipment
    WHERE eq_name LIKE ?
  `,
};