// database/sqls/line.js - line_id 필드 문제 수정

module.exports = {
  // ========== 제품코드 관리 쿼리 ==========
  
  // 안전한 제품코드 조회
  selectProductsSafe: `
    SELECT 
      product_code,
      product_name
    FROM product 
    WHERE product_code IS NOT NULL AND product_code != ''
    ORDER BY product_code ASC
  `,

  // 특정 제품 상세 조회
  selectProductByCode: `
    SELECT * FROM product WHERE product_code = ?
  `,

  // ========== 직원 관리 쿼리 ==========

  // 기본 직원 조회
  selectAllEmployees: `
    SELECT 
      employee_id,
      employee_name,
      position,
      department_code,
      employment_status
    FROM employees 
    WHERE employment_status = 'Y'
    ORDER BY employee_name ASC
  `,

  // 안전한 직원 조회
  selectEmployeesSafe: `
    SELECT 
      employee_id,
      employee_name
    FROM employees 
    WHERE employee_id IS NOT NULL
    ORDER BY employee_name ASC
  `,

  // 특정 직원 조회
  selectEmployeeById: `
    SELECT 
      employee_id,
      employee_name,
      position,
      department_code,
      employment_status
    FROM employees 
    WHERE employee_id = ?
  `,

  // ========== 실적 ID 조회 ==========
  
  // 최신 실적 ID 조회
  selectLatestResultId: `
    SELECT result_id 
    FROM work_result 
    ORDER BY result_id DESC 
    LIMIT 1
  `,

  // 특정 제품코드의 최신 실적 ID 조회
  selectLatestResultIdByProduct: `
    SELECT wr.result_id
    FROM work_result wr
    WHERE wr.process_group_code LIKE CONCAT(?, '%')
    ORDER BY wr.result_id DESC
    LIMIT 1
  `,

  // ========== 라인 목록 조회 ==========

  // 라인 목록 조회 (통합 쿼리) - line_code 필드명 사용
  selectLineListWithJoins: `
    SELECT
      m.line_masterid,
      m.line_id,
      m.line_code,
      m.line_name,
      m.line_type,
      m.eq_group_code,
      m.max_capacity,
      COALESCE(m.description, '') as description,
      COALESCE(l.line_state, 's2') as line_state,
      CASE 
        WHEN COALESCE(l.line_state, 's2') = 's1' THEN '가동 중'
        WHEN COALESCE(l.line_state, 's2') = 's2' THEN '가동대기 중'
        WHEN COALESCE(l.line_state, 's2') = 's3' THEN '가동정지'
        ELSE '가동대기 중'
      END as line_status,
      COALESCE(e.employee_name, '미배정') as employee_name,
      COALESCE(l.employee_id, NULL) as employee_id,
      COALESCE(m.product_code, '') as product_code,
      COALESCE(l.eq_name, '') as eq_name,
      COALESCE(l.current_speed, 0) as current_speed,
      COALESCE(l.target_qty, 0) as target_qty,
      DATE_FORMAT(m.reg_date, '%Y-%m-%d') as reg_date,
      COALESCE(wr.result_id, m.result_id) as result_id,
      COALESCE(p.product_name, m.product_code, '') as product_name,
      CASE 
        WHEN m.product_code LIKE 'BJA-DR-%' THEN 'BLISTER'
        WHEN m.product_code LIKE 'BJA-BT-%' THEN 'BOTTLE'
        WHEN m.product_code LIKE 'BJA-STD-%' THEN 'TABLET'
        WHEN m.product_code LIKE 'FST-%' THEN 'TABLET'
        WHEN m.product_code LIKE 'GB-%' THEN 'TABLET'
        ELSE 'TABLET'
      END as product_type,
      '' AS current_work_number,
      '' AS current_process_name,
      DATE_FORMAT(l.reg_date, '%Y-%m-%d %H:%i:%s') as work_start_time
    FROM package_master m
    LEFT JOIN package_line l ON m.line_masterid = l.line_masterid 
      AND l.line_id = (
        SELECT MAX(line_id) 
        FROM package_line pl 
        WHERE pl.line_masterid = m.line_masterid
      )
    LEFT JOIN employees e ON l.employee_id = e.employee_id
    LEFT JOIN product p ON m.product_code = p.product_code
    LEFT JOIN work_result wr ON wr.process_group_code LIKE CONCAT(m.product_code, '%')
      AND wr.result_id = (
        SELECT MAX(wr2.result_id) 
        FROM work_result wr2 
        WHERE wr2.process_group_code LIKE CONCAT(m.product_code, '%')
      )
    ORDER BY m.line_code ASC, m.line_type ASC
  `,

  // 안전한 라인 목록 조회
  selectLineListSafe: `
    SELECT
      m.line_masterid,
      m.line_id,
      m.line_code,
      m.line_name,
      m.line_type,
      m.eq_group_code,
      m.max_capacity,
      COALESCE(m.description, '') as description,
      COALESCE(l.line_state, 's2') as line_state,
      CASE 
        WHEN COALESCE(l.line_state, 's2') = 's1' THEN '가동 중'
        WHEN COALESCE(l.line_state, 's2') = 's2' THEN '가동대기 중'
        WHEN COALESCE(l.line_state, 's2') = 's3' THEN '가동정지'
        ELSE '가동대기 중'
      END as line_status,
      COALESCE(l.employee_id, NULL) as employee_id,
      COALESCE(m.product_code, '') as product_code,
      COALESCE(l.eq_name, '') as eq_name,
      COALESCE(l.current_speed, 0) as current_speed,
      COALESCE(l.target_qty, 0) as target_qty,
      DATE_FORMAT(m.reg_date, '%Y-%m-%d') as reg_date,
      m.result_id,
      '' as current_work_number,
      '' as current_process_name,
      DATE_FORMAT(l.reg_date, '%Y-%m-%d %H:%i:%s') as work_start_time
    FROM package_master m
    LEFT JOIN package_line l ON m.line_masterid = l.line_masterid 
      AND l.line_id = (
        SELECT MAX(line_id) 
        FROM package_line pl 
        WHERE pl.line_masterid = m.line_masterid
      )
    ORDER BY m.line_code ASC, m.line_type ASC
  `,

  // ========== 라인 마스터 관리 ==========

  // 🔧 수정: line_id 필드 추가 (직접 값 전달)
  insertLineMaster: `
    INSERT INTO package_master (
      line_id, line_name, eq_group_code, line_type, reg_date, result_id, 
      line_code, max_capacity, description, product_code
    ) VALUES (?, ?, 'e3', ?, NOW(), ?, ?, ?, ?, ?)
  `,

  // 🆕 추가: line_id 없이 삽입하는 대체 쿼리 (AUTO_INCREMENT가 설정된 경우)
  insertLineMasterWithoutLineId: `
    INSERT INTO package_master (
      line_name, eq_group_code, line_type, reg_date, result_id, 
      line_code, max_capacity, description, product_code
    ) VALUES (?, 'e3', ?, NOW(), ?, ?, ?, ?, ?)
  `,

  // 🆕 추가: line_id에 기본값을 설정하는 쿼리
  insertLineMasterWithDefaultLineId: `
    INSERT INTO package_master (
      line_id, line_name, eq_group_code, line_type, reg_date, result_id, 
      line_code, max_capacity, description, product_code
    ) VALUES (COALESCE(?, CONCAT(?, '_', ?)), ?, 'e3', ?, NOW(), ?, ?, ?, ?, ?)
  `,

  // 라인 마스터 목록 조회
  selectLineMasterList: `
    SELECT
      line_masterid,
      line_id,
      line_name,
      eq_group_code,
      line_type,
      DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date,
      result_id,
      line_code,
      max_capacity,
      description,
      product_code
    FROM package_master
    ORDER BY line_code ASC, line_type ASC
  `,

  // 라인 코드로 마스터 조회 (모든 타입)
  selectLineMasterByLineCode: `
    SELECT
      line_masterid,
      line_id,
      line_name,
      eq_group_code,
      line_type,
      DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date,
      result_id,
      line_code,
      max_capacity,
      description,
      product_code
    FROM package_master
    WHERE line_code = ?
    ORDER BY line_type ASC
  `,

  // 라인 마스터 ID로 조회
  selectLineMasterById: `
    SELECT
      line_masterid,
      line_id,
      line_name,
      eq_group_code,
      line_type,
      DATE_FORMAT(reg_date, '%Y-%m-%d') as reg_date,
      result_id,
      line_code,
      max_capacity,
      description,
      product_code
    FROM package_master
    WHERE line_masterid = ?
  `,

  // 라인 마스터 수정
  updateLineMaster: `
    UPDATE package_master SET
      line_name = ?,
      eq_group_code = 'e3',
      line_type = ?,
      max_capacity = ?,
      description = ?,
      product_code = ?,
      result_id = ?
    WHERE line_masterid = ?
  `,

  // 라인 마스터 삭제
  deleteLineMaster: `
    DELETE FROM package_master WHERE line_masterid = ?
  `,

  // 라인 코드 중복 확인
  checkLineCodeExists: `
    SELECT COUNT(*) as count FROM package_master WHERE line_code = ?
  `,

  // 라인 코드와 타입으로 중복 확인
  checkLineCodeAndTypeExists: `
    SELECT COUNT(*) as count FROM package_master WHERE line_code = ? AND line_type = ?
  `,

  // ========== 라인 상태 관리 ==========

  // 라인 상태 등록
  insertLine: `
    INSERT INTO package_line (
      line_masterid, pkg_type, line_state, target_qty, reg_date, 
      eq_name, current_speed, line_code, employee_id
    ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)
  `,

  // 라인 상태 수정
  updateLine: `
    UPDATE package_line SET
      pkg_type = ?,
      line_state = ?,
      employee_id = ?,
      eq_name = ?,
      current_speed = ?,
      target_qty = ?
    WHERE line_id = ?
  `,

  // 라인 상세 조회
  selectLineDetail: `
    SELECT
      l.line_id,
      l.line_masterid,
      l.pkg_type,
      l.line_state,
      CASE 
        WHEN l.line_state = 's1' THEN '가동 중'
        WHEN l.line_state = 's2' THEN '가동대기 중'
        WHEN l.line_state = 's3' THEN '가동정지'
        ELSE '가동대기 중'
      END as line_status,
      l.employee_id,
      l.eq_name,
      l.current_speed,
      l.target_qty,
      DATE_FORMAT(l.reg_date, '%Y-%m-%d %H:%i:%s') as reg_date,
      m.product_code,
      m.line_code,
      m.line_name,
      m.line_type,
      '' as current_work_number,
      '' as current_process_name
    FROM package_line l
    JOIN package_master m ON l.line_masterid = m.line_masterid
    WHERE l.line_id = ?
  `,

  // 라인 상태 삭제
  deleteLine: `
    DELETE FROM package_line WHERE line_id = ?
  `,

  // 마스터 ID로 라인 상태 삭제
  deleteLineByMasterId: `
    DELETE FROM package_line WHERE line_masterid = ?
  `,

  // 최신 라인 상태 조회
  selectLatestLineByMasterId: `
    SELECT
      line_id,
      line_masterid,
      pkg_type,
      line_state,
      employee_id,
      eq_name,
      current_speed,
      target_qty,
      DATE_FORMAT(reg_date, '%Y-%m-%d %H:%i:%s') as reg_date
    FROM package_line
    WHERE line_masterid = ?
    ORDER BY line_id DESC
    LIMIT 1
  `,

  // ========== 설비명 관리 ==========

  // 사용 중인 설비명 조회
  selectUsedEquipments: `
    SELECT DISTINCT pl.eq_name
    FROM package_line pl
    WHERE pl.eq_name IS NOT NULL 
      AND pl.eq_name != ''
      AND pl.line_state IN ('s1', 's2')
      AND pl.line_id IN (
        SELECT MAX(line_id) 
        FROM package_line 
        GROUP BY line_masterid
      )
  `,

  // 특정 라인 제외하고 사용 중인 설비명 조회
  selectUsedEquipmentsExcludeLine: `
    SELECT DISTINCT pl.eq_name
    FROM package_line pl
    JOIN package_master pm ON pl.line_masterid = pm.line_masterid
    WHERE pl.eq_name IS NOT NULL 
      AND pl.eq_name != ''
      AND pl.line_state IN ('s1', 's2')
      AND pm.line_code != ?
      AND pl.line_id IN (
        SELECT MAX(line_id) 
        FROM package_line 
        GROUP BY line_masterid
      )
  `,

  // 모든 설비명 조회 (equipment 테이블에서)
  selectAllEquipments: `
    SELECT 
      eq_name,
      eq_type_code,
      eq_group_code,
      CASE 
        WHEN eq_name LIKE '%카톤%' OR eq_name LIKE '%박스%' OR eq_type_code = 'f2' THEN 'OUTER'
        WHEN eq_name LIKE '%블리스터%' OR eq_name LIKE '%모노블럭%' OR eq_name LIKE '%병%' OR eq_type_code = 'f1' THEN 'INNER'
        ELSE 'INNER'
      END as line_type_classification,
      CASE 
        WHEN eq_name LIKE '%카톤%' THEN '외포장설비'
        WHEN eq_name LIKE '%블리스터%' THEN '내포장설비'
        WHEN eq_name LIKE '%모노블럭%' THEN '내포장설비'
        WHEN eq_name LIKE '%병%' THEN '내포장설비'
        ELSE '일반설비'
      END as equipment_category
    FROM equipment
    WHERE eq_group_code = 'e3'
    ORDER BY 
      CASE 
        WHEN eq_name LIKE '%카톤%' OR eq_name LIKE '%박스%' THEN 2
        ELSE 1
      END,
      eq_name ASC
  `,

  // ========== 통계 및 집계 쿼리 ==========

  // 라인 상태별 통계
  selectLineStatusStats: `
    SELECT 
      l.line_state,
      CASE 
        WHEN l.line_state = 's1' THEN '가동 중'
        WHEN l.line_state = 's2' THEN '가동대기 중'
        WHEN l.line_state = 's3' THEN '가동정지'
        ELSE '알 수 없음'
      END as line_status,
      COUNT(*) as count
    FROM package_master m
    LEFT JOIN package_line l ON m.line_masterid = l.line_masterid 
      AND l.line_id = (
        SELECT MAX(line_id) 
        FROM package_line pl 
        WHERE pl.line_masterid = m.line_masterid
      )
    GROUP BY l.line_state
    ORDER BY l.line_state
  `,

  // 생산 중인 라인 목록
  selectWorkingLines: `
    SELECT
      m.line_code,
      m.line_name,
      m.line_type,
      CASE 
        WHEN m.line_type = 'INNER' THEN '내포장'
        WHEN m.line_type = 'OUTER' THEN '외포장'
        ELSE m.line_type
      END as line_type_text,
      l.employee_id,
      e.employee_name,
      m.product_code,
      p.product_name,
      l.target_qty,
      l.current_speed,
      DATE_FORMAT(l.reg_date, '%Y-%m-%d %H:%i:%s') as work_start_time,
      '' as current_work_number,
      '' as current_process_name
    FROM package_master m
    JOIN package_line l ON m.line_masterid = l.line_masterid 
      AND l.line_id = (
        SELECT MAX(line_id) 
        FROM package_line pl 
        WHERE pl.line_masterid = m.line_masterid
      )
    LEFT JOIN employees e ON l.employee_id = e.employee_id
    LEFT JOIN product p ON m.product_code = p.product_code
    WHERE l.line_state = 's1'
    ORDER BY m.line_code ASC
  `,

  // 제품별 라인 사용 현황
  selectProductUsageStats: `
    SELECT 
      m.product_code,
      p.product_name,
      COUNT(DISTINCT m.line_code) as used_lines,
      GROUP_CONCAT(DISTINCT m.line_code ORDER BY m.line_code) as line_codes,
      GROUP_CONCAT(DISTINCT 
        CASE 
          WHEN m.line_type = 'INNER' THEN '내포장'
          WHEN m.line_type = 'OUTER' THEN '외포장'
          ELSE m.line_type
        END 
        ORDER BY m.line_type
      ) as line_types
    FROM package_master m
    LEFT JOIN product p ON m.product_code = p.product_code
    WHERE m.product_code IS NOT NULL AND m.product_code != ''
    GROUP BY m.product_code, p.product_name
    ORDER BY used_lines DESC, m.product_code ASC
  `,

  // 라인 타입별 개수
  selectLineTypeStats: `
    SELECT 
      line_type,
      CASE 
        WHEN line_type = 'INNER' THEN '내포장'
        WHEN line_type = 'OUTER' THEN '외포장'
        ELSE line_type
      END as line_type_text,
      COUNT(*) as count
    FROM package_master
    GROUP BY line_type
    ORDER BY line_type
  `,

  // 라인 코드로 상태 업데이트
  updateLineStateByCode: `
    UPDATE package_line pl
    JOIN package_master pm ON pl.line_masterid = pm.line_masterid
    SET pl.line_state = ?
    WHERE pm.line_code = ?
      AND pl.line_id = (
        SELECT MAX(line_id) 
        FROM package_line pl2 
        WHERE pl2.line_masterid = pm.line_masterid
      )
  `,

  // 라인별 작업 이력 조회
  selectWorkHistoryByLine: `
    SELECT 
      CONCAT('WK', pm.line_code, '_', DATE_FORMAT(pl.reg_date, '%Y%m%d')) as work_number,
      pm.result_id,
      pm.product_code,
      p.product_name,
      CASE 
        WHEN pm.line_type = 'INNER' THEN 1
        WHEN pm.line_type = 'OUTER' THEN 2
        ELSE 3
      END as process_order,
      CASE 
        WHEN pl.line_state = 's1' THEN '진행'
        WHEN pl.line_state = 's2' THEN '대기'
        WHEN pl.line_state = 's3' THEN '검사중'
        ELSE '알수없음'
      END as process_status,
      pl.reg_date as start_time,
      DATE_ADD(pl.reg_date, INTERVAL 2 HOUR) as estimated_end_time,
      pl.target_qty as completed_qty,
      pl.target_qty as target_qty
    FROM package_line pl
    JOIN package_master pm ON pl.line_masterid = pm.line_masterid
    LEFT JOIN product p ON pm.product_code = p.product_code
    WHERE pm.line_code = ?
    ORDER BY pl.reg_date DESC
    LIMIT ?
  `,

  // 최근 라인 활동 내역
  selectRecentLineActivities: `
    SELECT
      pm.line_code,
      pm.line_name,
      pm.line_type,
      CASE 
        WHEN pm.line_type = 'INNER' THEN '내포장'
        WHEN pm.line_type = 'OUTER' THEN '외포장'
        ELSE pm.line_type
      END as line_type_text,
      pl.line_state,
      CASE 
        WHEN pl.line_state = 's1' THEN '가동 중'
        WHEN pl.line_state = 's2' THEN '가동대기 중'
        WHEN pl.line_state = 's3' THEN '가동정지'
        ELSE '알 수 없음'
      END as line_status,
      e.employee_name,
      DATE_FORMAT(pl.reg_date, '%Y-%m-%d %H:%i:%s') as activity_time,
      CONCAT('WK', pm.line_code, '_', DATE_FORMAT(pl.reg_date, '%Y%m%d')) as current_work_number,
      CASE 
        WHEN pm.line_type = 'INNER' THEN '내포장공정'
        WHEN pm.line_type = 'OUTER' THEN '외포장공정'
        ELSE '일반공정'
      END as current_process_name
    FROM package_line pl
    JOIN package_master pm ON pl.line_masterid = pm.line_masterid
    LEFT JOIN employees e ON pl.employee_id = e.employee_id
    ORDER BY pl.reg_date DESC
    LIMIT ?
  `
};