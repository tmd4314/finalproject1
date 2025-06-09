// server/database/sqls/line.js
module.exports = {
  // 라인 마스터 등록
  insertLineMaster: `
    INSERT INTO package_master (
      line_name, eq_group_code, line_type, reg_date, result_id
    ) VALUES (?, ?, ?, NOW(), ?)
  `,

  // 라인 마스터 목록
  selectLineMasterList: `
    SELECT
      line_masterid,
      line_name,
      eq_group_code,
      line_type,
      DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date,
      result_id
    FROM package_master
    ORDER BY line_masterid DESC
  `,

  // 라인 마스터 상세
  selectLineMasterDetail: `
    SELECT
      line_masterid,
      line_name,
      eq_group_code,
      line_type,
      DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date,
      result_id
    FROM package_master
    WHERE line_masterid = ?
  `,

  // 라인 마스터 수정
  updateLineMaster: `
    UPDATE package_master SET
      line_name = ?,
      eq_group_code = ?,
      line_type = ?
    WHERE line_masterid = ?
  `,

  // 라인 마스터 삭제
  deleteLineMaster: `
    DELETE FROM package_master WHERE line_masterid = ?
  `,

  // 라인(상태/실시간) 등록
  insertLine: `
    INSERT INTO package_line (
      line_masterid, pkg_type, line_status, employee_name, curr_work_no, target_qty, reg_date
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
  `,

  // 라인 목록 (상태/실적) [마스터 join, 프론트에서 필요한 필드 모두 포함]
  selectLineList: `
    SELECT
      l.line_id,
      m.line_name,
      l.pkg_type AS line_type,
      l.line_status,
      l.curr_work_no AS work_no,
      l.employee_name,
      l.target_qty,
      DATE_FORMAT(l.reg_date, '%Y-%m-%d') as reg_date
    FROM package_line l
    JOIN package_master m ON l.line_masterid = m.line_masterid
    ORDER BY l.line_id DESC
  `,

  // 라인 상세 (상태/실적)
  selectLineDetail: `
    SELECT
      line_id,
      line_masterid,
      pkg_type,
      line_status,
      employee_name,
      curr_work_no,
      target_qty,
      DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date
    FROM package_line
    WHERE line_id = ?
  `,

  // 라인 수정
  updateLine: `
    UPDATE package_line SET
      pkg_type = ?,
      line_status = ?,
      employee_name = ?,
      curr_work_no = ?,
      target_qty = ?
    WHERE line_id = ?
  `,

  // 라인 삭제
  deleteLine: `
    DELETE FROM package_line WHERE line_id = ?
  `,

  // 라인/마스터 join 상세 조회
  selectLineWithMaster: `
    SELECT
      l.*,
      m.line_name,
      m.eq_group_code,
      m.line_type
    FROM package_line l
    JOIN package_master m ON l.line_masterid = m.line_masterid
    WHERE l.line_id = ?
  `,
};
