module.exports = {
  // ========== 라인 마스터 관리 ==========

  // 라인 마스터 등록
  insertLineMaster: `
    INSERT INTO package_master (
      line_name, eq_group_code, line_type, reg_date, result_id, line_code, max_capacity, description
    ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)
  `,

  // 라인 마스터 목록
  selectLineMasterList: `
    SELECT
      line_masterid,
      line_name,
      eq_group_code,
      line_type,
      DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date,
      result_id,
      line_code,
      max_capacity,
      description
    FROM package_master
    ORDER BY line_code ASC
  `,

  // 라인 마스터 상세
  selectLineMasterDetail: `
    SELECT
      line_masterid,
      line_name,
      eq_group_code,
      line_type,
      DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date,
      result_id,
      line_code,
      max_capacity,
      description
    FROM package_master
    WHERE line_masterid = ?
  `,

  // 라인 코드로 마스터 조회
  selectLineMasterByLineId: `
    SELECT
      line_masterid,
      line_name,
      eq_group_code,
      line_type,
      DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date,
      result_id,
      line_code,
      max_capacity,
      description
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

  // 라인 코드 중복 체크
  checkLineIdExists: `
    SELECT COUNT(*) as count FROM package_master WHERE line_code = ?
  `,

  // 라인 코드 + 타입 조합 중복 체크
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
      line_masterid, pkg_type, line_status, curr_work_no, target_qty, reg_date, 
      eq_name, current_speed, line_code, employee_id
    ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
  `,

  // 🔥 프론트엔드용 통합 라인 목록 (마스터 + 최신 상태 + 사원명 + 작업결과 정보 + employee_id 추가)
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
      COALESCE(e.employee_name, '') as employee_name,
      COALESCE(latest.employee_id, NULL) as employee_id,
      COALESCE(latest.curr_work_no, '') as curr_work_no,
      COALESCE(latest.eq_name, '') as eq_name,
      COALESCE(latest.current_speed, 0) as current_speed,
      COALESCE(latest.target_qty, 0) as target_qty,
      DATE_FORMAT(m.reg_date, '%Y-%m-%d') as reg_date,
      m.result_id,
      -- 🔥 작업 결과 정보 추가 (work_result 조인)
      COALESCE(wr.process_group_code, '') as process_group_code,
      COALESCE(wr.result_remark, '') as result_remark,
      COALESCE(wr.code_value, '') as code_value,
      COALESCE(DATE_FORMAT(wr.work_start_date, '%Y-%m-%d %H:%i:%s'), '') as work_start_date
    FROM package_master m
    LEFT JOIN (
      SELECT 
        line_masterid,
        line_status,
        eq_name,
        current_speed,
        employee_id,
        curr_work_no,
        target_qty,
        ROW_NUMBER() OVER (PARTITION BY line_masterid ORDER BY reg_date DESC, line_id DESC) as rn
      FROM package_line
    ) latest ON m.line_masterid = latest.line_masterid AND latest.rn = 1
    LEFT JOIN tablets.employees e ON latest.employee_id = e.employee_id
    LEFT JOIN tablets.work_result wr ON latest.curr_work_no = wr.work_order_no
    ORDER BY m.line_code ASC
  `,

  // 라인 상세 (상태/실적 + 사원명 + 작업결과)
  selectLineDetail: `
    SELECT
      l.line_id,
      l.line_masterid,
      l.pkg_type,
      l.line_status,
      l.employee_id,
      e.employee_name,
      l.eq_name,
      l.current_speed,
      l.curr_work_no,
      l.target_qty,
      DATE_FORMAT(l.reg_date, '%Y-%m-%d %H:%i:%s') as reg_date,
      -- 🔥 작업 결과 정보 추가
      wr.process_group_code,
      wr.result_remark,
      wr.code_value,
      DATE_FORMAT(wr.work_start_date, '%Y-%m-%d %H:%i:%s') as work_start_date
    FROM package_line l
    LEFT JOIN tablets.employees e ON l.employee_id = e.employee_id
    LEFT JOIN tablets.work_result wr ON l.curr_work_no = wr.work_order_no
    WHERE l.line_id = ?
  `,

  // 🔥 라인 수정 - 단일 라인 ID 기준으로 수정
  updateLine: `
    UPDATE package_line SET
      pkg_type = ?,
      line_status = ?,
      employee_id = ?,
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

  // 라인/마스터 join 상세 조회 (작업결과 포함)
  selectLineWithMaster: `
    SELECT
      l.*,
      e.employee_name,
      m.line_code as master_line_id,
      m.line_name,
      m.eq_group_code,
      m.line_type,
      m.max_capacity,
      m.description,
      -- 🔥 작업 결과 정보 추가
      wr.process_group_code,
      wr.result_remark,
      wr.code_value,
      DATE_FORMAT(wr.work_start_date, '%Y-%m-%d %H:%i:%s') as work_start_date
    FROM package_line l
    JOIN package_master m ON l.line_masterid = m.line_masterid
    LEFT JOIN tablets.employees e ON l.employee_id = e.employee_id
    LEFT JOIN tablets.work_result wr ON l.curr_work_no = wr.work_order_no
    WHERE l.line_id = ?
  `,

  // 🔥 특정 마스터 라인 코드로 최신 상태 조회 (수정됨)
  selectLineStatusByMasterId: `
    SELECT
      l.*,
      e.employee_name,
      m.line_code as master_line_id,
      m.line_name,
      m.line_type,
      m.max_capacity,
      wr.process_group_code,
      wr.result_remark,
      wr.code_value,
      DATE_FORMAT(wr.work_start_date, '%Y-%m-%d %H:%i:%s') as work_start_date
    FROM package_line l
    JOIN package_master m ON l.line_masterid = m.line_masterid
    LEFT JOIN tablets.employees e ON l.employee_id = e.employee_id
    LEFT JOIN tablets.work_result wr ON l.curr_work_no = wr.work_order_no
    WHERE m.line_code = ?
    ORDER BY l.reg_date DESC, l.line_id DESC
    LIMIT 1
  `,

  // 🔥 최신 라인 상태 ID 조회 (새로운 쿼리 추가)
  selectLatestLineIdByMasterId: `
    SELECT pl.line_id 
    FROM package_line pl 
    JOIN package_master pm ON pl.line_masterid = pm.line_masterid 
    WHERE pm.line_code = ?
    ORDER BY pl.reg_date DESC, pl.line_id DESC
    LIMIT 1
  `,

  // 🔥 마스터 라인 코드로 최신 라인 상태 업데이트 (수정됨)
  updateLineByMasterId: `
    UPDATE package_line 
    SET 
      pkg_type = ?,
      line_status = ?,
      employee_id = ?,
      eq_name = ?,
      current_speed = ?,
      curr_work_no = ?,
      target_qty = ?
    WHERE line_id = (
      SELECT latest_line_id FROM (
        SELECT pl.line_id as latest_line_id
        FROM package_line pl 
        JOIN package_master pm ON pl.line_masterid = pm.line_masterid 
        WHERE pm.line_code = ?
        ORDER BY pl.reg_date DESC, pl.line_id DESC
        LIMIT 1
      ) AS latest_line
    )
  `,

  // 🔥 라인 상태 삭제 (마스터 라인 코드 기준) - 모든 관련 상태 삭제
  deleteLineByMasterId: `
    DELETE pl FROM package_line pl
    JOIN package_master pm ON pl.line_masterid = pm.line_masterid
    WHERE pm.line_code = ?
  `,

  // ========== 담당자 관리 ==========

  // 🔥 사용 가능한 담당자 목록 조회 (새로 추가)
  selectAvailableEmployees: `
    SELECT 
      employee_id,
      employee_name
    FROM tablets.employees
    ORDER BY employee_name ASC
  `,

  // ========== 작업결과 관리 ==========

  // 🔥 사용 가능한 작업 결과 목록 조회
  selectAvailableWorkResults: `
    SELECT 
      work_order_no,
      process_group_code,
      result_remark,
      code_value,
      DATE_FORMAT(work_start_date, '%Y-%m-%d %H:%i:%s') as work_start_date
    FROM tablets.work_result
    WHERE work_order_no NOT IN (
      SELECT DISTINCT curr_work_no 
      FROM package_line 
      WHERE curr_work_no IS NOT NULL AND curr_work_no != ''
      AND line_status = 'WORKING'
    )
    ORDER BY work_start_date DESC, work_order_no DESC
  `,

  // 🔥 특정 작업 결과 상세 조회
  selectWorkResultDetail: `
    SELECT 
      work_order_no,
      process_group_code,
      result_remark,
      code_value,
      DATE_FORMAT(work_start_date, '%Y-%m-%d %H:%i:%s') as work_start_date
    FROM tablets.work_result
    WHERE work_order_no = ?
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

  // 현재 작업 중인 라인 목록 (작업결과 포함)
  selectWorkingLines: `
    SELECT
      m.line_code,
      m.line_name,
      m.line_type,
      e.employee_name,
      l.curr_work_no,
      l.target_qty,
      l.current_speed,
      DATE_FORMAT(l.reg_date, '%Y-%m-%d %H:%i:%s') as work_start_time,
      wr.process_group_code,
      wr.result_remark,
      wr.code_value,
      DATE_FORMAT(wr.work_start_date, '%Y-%m-%d %H:%i:%s') as work_order_start_date
    FROM package_master m
    JOIN (
      SELECT 
        line_masterid,
        line_status,
        employee_id,
        curr_work_no,
        target_qty,
        current_speed,
        reg_date,
        ROW_NUMBER() OVER (PARTITION BY line_masterid ORDER BY reg_date DESC, line_id DESC) as rn
      FROM package_line
      WHERE line_status = 'WORKING'
    ) l ON m.line_masterid = l.line_masterid AND l.rn = 1
    LEFT JOIN tablets.employees e ON l.employee_id = e.employee_id
    LEFT JOIN tablets.work_result wr ON l.curr_work_no = wr.work_order_no
    ORDER BY l.reg_date DESC
  `
};