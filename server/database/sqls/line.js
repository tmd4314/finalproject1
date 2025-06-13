// server/database/sqls/line.js
module.exports = {
  // ========== 라인 마스터 관리 ==========
  
  // 라인 마스터 등록 (실제 DB 구조에 맞춤)
  insertLineMaster: `
    INSERT INTO package_master (
      line_code, line_name, eq_group_code, line_type, max_capacity, description, reg_date, result_id
    ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
  `,

  // 라인 마스터 목록
  selectLineMasterList: `
    SELECT
      line_masterid,
      line_code,
      line_name,
      eq_group_code,
      line_type,
      max_capacity,
      description,
      DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date,
      result_id
    FROM package_master
    ORDER BY line_code ASC
  `,

  // 라인 마스터 상세
  selectLineMasterDetail: `
    SELECT
      line_masterid,
      line_code,
      line_name,
      eq_group_code,
      line_type,
      max_capacity,
      description,
      DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date,
      result_id
    FROM package_master
    WHERE line_masterid = ?
  `,

  // 라인 코드로 마스터 조회
  selectLineMasterByLineId: `
    SELECT
      line_masterid,
      line_code,
      line_name,
      eq_group_code,
      line_type,
      max_capacity,
      description,
      DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date,
      result_id
    FROM package_master
    WHERE line_code = ?
  `,

  // 라인 마스터 수정
  updateLineMaster: `
    UPDATE package_master SET
      line_name = ?,
      eq_group_code = ?,
      line_type = ?,
      max_capacity = ?,
      description = ?
    WHERE line_masterid = ?
  `,

  // 라인 마스터 삭제
  deleteLineMaster: `
    DELETE FROM package_master WHERE line_masterid = ?
  `,

  // 라인 코드 중복 체크 (기존)
  checkLineIdExists: `
    SELECT COUNT(*) as count FROM package_master WHERE line_code = ?
  `,

  // 라인 코드 + 타입 조합 중복 체크 - 🔥 새로 추가
  checkLineIdExistsByType: `
    SELECT COUNT(*) as count 
    FROM package_master 
    WHERE line_code = ? AND line_type = ?
  `,

  // 사용 가능한 라인 코드 목록 (A-Z 중 미사용)
  getAvailableLineIds: `
    SELECT 
      CHAR(65 + numbers.n) as line_code
    FROM (
      SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION
      SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION
      SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION
      SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION
      SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25
    ) numbers
    WHERE CHAR(65 + numbers.n) NOT IN (SELECT DISTINCT line_code FROM package_master WHERE line_code IS NOT NULL)
    ORDER BY numbers.n
  `,

  // ========== 라인 상태/실적 관리 ==========

  // 라인(상태/실시간) 등록
  insertLine: `
    INSERT INTO package_line (
    line_masterid, line_code, pkg_type, line_status, employee_name, eq_name, current_speed, curr_work_no, target_qty, reg_date
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `,

  // 🔥 프론트엔드용 통합 라인 목록 (마스터 + 최신 상태) - 실제 DB 구조 반영
  selectLineList: `
    SELECT
      m.line_masterid,
      m.line_code as line_id,
      m.line_name,
      m.line_type,
      m.eq_group_code,
      m.max_capacity,
      COALESCE(m.description, '') as description,
      COALESCE(latest.line_status, 'AVAILABLE') as line_status,
      COALESCE(latest.eq_name, '') as eq_name,
      COALESCE(latest.current_speed, 0) as current_speed,
      COALESCE(latest.employee_name, '') as employee_name,
      COALESCE(latest.curr_work_no, '') as curr_work_no,
      COALESCE(latest.target_qty, 0) as target_qty,
      DATE_FORMAT(m.reg_date, '%Y-%m-%d') as reg_date,
      m.result_id
    FROM package_master m
    LEFT JOIN (
      SELECT 
        line_masterid,
        line_status,
        eq_name,
        current_speed,
        employee_name,
        curr_work_no,
        target_qty,
        ROW_NUMBER() OVER (PARTITION BY line_masterid ORDER BY reg_date DESC, line_id DESC) as rn
      FROM package_line
    ) latest ON m.line_masterid = latest.line_masterid AND latest.rn = 1
    ORDER BY m.line_code ASC
  `,

  // 라인 상세 (상태/실적)
  selectLineDetail: `
    SELECT
      line_id,
      line_masterid,
      pkg_type,
      line_status,
      employee_name,
      eq_name,
      current_speed,
      curr_work_no,
      target_qty,
      DATE_FORMAT(reg_date, '%Y-%m-%d %H:%i:%s') as reg_date
    FROM package_line
    WHERE line_id = ?
  `,

  // 라인 수정
  updateLine: `
    UPDATE package_line SET
      pkg_type = ?,
      line_status = ?,
      employee_name = ?,
      eq_name = ?,
      current_speed = ?,
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
      m.line_code as master_line_id,
      m.line_name,
      m.eq_group_code,
      m.line_type,
      m.max_capacity,
      m.description
    FROM package_line l
    JOIN package_master m ON l.line_masterid = m.line_masterid
    WHERE l.line_id = ?
  `,

  // 특정 마스터 라인 코드로 상태 조회
  selectLineStatusByMasterId: `
    SELECT
      l.*,
      m.line_code as master_line_id,
      m.line_name,
      m.line_type,
      m.max_capacity
    FROM package_line l
    JOIN package_master m ON l.line_masterid = m.line_masterid
    WHERE m.line_code = ?
    ORDER BY l.reg_date DESC
    LIMIT 1
  `,

  // 라인 상태 업데이트 (특정 마스터 라인의 최신 상태만 업데이트)
  updateLineByMasterId: `
    UPDATE package_line 
    SET 
      pkg_type = ?,
      line_status = ?,
      employee_name = ?,
      eq_name = ?,
      current_speed = ?,
      curr_work_no = ?,
      target_qty = ?
    WHERE line_masterid = (SELECT line_masterid FROM package_master WHERE line_code = ?)
      AND line_id = (
        SELECT MAX(pl.line_id) 
        FROM package_line pl 
        JOIN package_master pm ON pl.line_masterid = pm.line_masterid 
        WHERE pm.line_code = ?
      )
  `,

  // 라인 상태 삭제 (마스터 라인 코드 기준)
  deleteLineByMasterId: `
    DELETE FROM package_line 
    WHERE line_masterid = (SELECT line_masterid FROM package_master WHERE line_code = ?)
  `,

  // ========== 통계 쿼리 ==========

  // 라인별 상태 통계
  selectLineStatusStats: `
    SELECT
      line_status,
      COUNT(*) as count
    FROM (
      SELECT
        COALESCE(latest.line_status, 'AVAILABLE') as line_status
      FROM package_master m
      LEFT JOIN (
        SELECT 
          line_masterid,
          line_status,
          ROW_NUMBER() OVER (PARTITION BY line_masterid ORDER BY reg_date DESC, line_id DESC) as rn
        FROM package_line
      ) latest ON m.line_masterid = latest.line_masterid AND latest.rn = 1
    ) status_summary
    GROUP BY line_status
    ORDER BY line_status
  `,

  // 현재 작업 중인 라인 목록
  selectWorkingLines: `
    SELECT
      m.line_code,
      m.line_name,
      m.line_type,
      l.employee_name,
      l.curr_work_no,
      l.target_qty,
      l.current_speed,
      DATE_FORMAT(l.reg_date, '%Y-%m-%d %H:%i:%s') as work_start_time
    FROM package_master m
    JOIN package_line l ON m.line_masterid = l.line_masterid
    WHERE l.line_status = 'WORKING'
      AND l.line_id = (
        SELECT MAX(pl.line_id) 
        FROM package_line pl 
        WHERE pl.line_masterid = l.line_masterid
      )
    ORDER BY l.reg_date DESC
  `
};