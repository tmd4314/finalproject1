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

  // 설비 리스트 조회
  selectEquipmentList: `
    SELECT
      eq_id, eq_name, eq_group_code, eq_type_code, eq_import_code,
      eq_factory_code, eq_floor_code, eq_room_code,
      eq_registration_date, eq_manufacturer, eq_model
    FROM equipment
    ORDER BY eq_id DESC
  `,

  // 같은 이름 설비 몇 개인지 (ex. 혼합기%)
  countSameNameEquipments: `
    SELECT COUNT(*) as count
    FROM equipment
    WHERE eq_name LIKE ?
  `,
};
