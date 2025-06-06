const mariadb = require('../database/mapper')
const { convertObjToAry } = require('../utils/converts')
const sql = require('../database/sqls/equipment')

const insertEquipment = async (formData) => {
  // 1. 설비명 자동번호 생성 (예: "정제기" → "정제기3")
  const baseName = formData.name
  const likePattern = `${baseName}%`
  const [countRow] = await mariadb.query('countSameNameEquipments', [likePattern])
  const count = countRow.count + 1
  const finalName = `${baseName}${count}`

  // 2. INSERT용 데이터 준비
  const insertColumns = [
    'eq_group_code', 'eq_type_code', 'eq_import_code',
    'eq_factory_code', 'eq_floor_code', 'eq_room_code',
    'eq_manufacture_date', 'eq_registration_date',
    'eq_manufacturer', 'eq_model', 'eq_serial_number',
    'eq_power_spec', 'eq_max_operation_time', 'eq_inspection_cycle',
    'eq_remark', 'eq_image_url', 'line_id'
  ]

  const values = convertObjToAry(formData, insertColumns)
  values.unshift(finalName) // 맨 앞에 eq_name 삽입
  values.push('s2')         // 맨 뒤에 eq_run_code = '가동대기 중'

  // 3. DB INSERT 실행
  const result = await mariadb.query('insertEquipment', values)
  return result
}

module.exports = {
  insertEquipment,
}
