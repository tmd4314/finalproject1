// database/sqls/line.js - 작업번호 완전 제거 및 에러 수정 버전

module.exports = {
  // ========== 기본 연결 및 테스트 쿼리 ==========
  
  testConnection: `SELECT 1 as test`,
  
  showTables: `SHOW TABLES`,
  
  // ========== 제품코드 관리 쿼리 ==========
  
  // 1. 기본 제품코드 조회 (모든 컬럼)
  selectAllProducts: `
    SELECT 
      product_code,
      product_name,
      product_qty,
      product_ac,
      product_pay,
      product_standard,
      product_safety,
      product_ct,
      product_perdit
    FROM product 
    WHERE product_code IS NOT NULL 
    ORDER BY product_code ASC
  `,

  // 2. 안전한 제품코드 조회 (핵심 컬럼만)
  selectProductsSafe: `
    SELECT 
      product_code,
      product_name
    FROM product 
    WHERE product_code IS NOT NULL AND product_code != ''
    ORDER BY product_code ASC
  `,

  // 3. 최소한의 제품코드 조회
  selectProductsMinimal: `
    SELECT product_code FROM product LIMIT 10
  `,

  // 4. 제품코드 개수 확인
  countProducts: `
    SELECT COUNT(*) as total FROM product
  `,

  // 5. 제품 테이블 구조 확인
  showProductColumns: `
    SHOW COLUMNS FROM product
  `,

  // 6. 샘플 제품 데이터 조회
  selectProductSample: `
    SELECT * FROM product LIMIT 5
  `,

  // 7. 특정 제품 상세 조회
  selectProductByCode: `
    SELECT * FROM product WHERE product_code = ?
  `,

  // ========== 직원 관리 쿼리 ==========

  // 1. 기본 직원 조회
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

  // 2. 안전한 직원 조회 (핵심 컬럼만)
  selectEmployeesSafe: `
    SELECT 
      employee_id,
      employee_name
    FROM employees 
    WHERE employee_id IS NOT NULL
    ORDER BY employee_name ASC
  `,

  // 3. 직원 개수 확인
  countEmployees: `
    SELECT COUNT(*) as total FROM employees
  `,

  // 4. 특정 직원 조회
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

  // ========== 최적화된 라인 관리 쿼리 (작업번호 완전 제거) ==========

  // 라인 목록 조회 - 작업번호 필드 완전 삭제
  selectLineListWithJoins: `
    SELECT
      m.line_masterid,
      m.line_code as line_id,
      m.line_name,
      m.line_type,
      m.eq_group_code,
      m.max_capacity,
      COALESCE(m.description, '') as description,
      COALESCE(l.line_state, 's2') as line_state,
      CASE 
        WHEN COALESCE(l.line_state, 's2') = 's1' THEN '생산'
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
      m.result_id,
      COALESCE(p.product_name, m.product_code, '') as product_name,
      CASE 
        WHEN m.product_code LIKE 'BJA-DR-%' THEN 'BLISTER'
        WHEN m.product_code LIKE 'BJA-BT-%' THEN 'BOTTLE'
        WHEN m.product_code LIKE 'BJA-STD-%' THEN 'TABLET'
        WHEN m.product_code LIKE 'FST-%' THEN 'TABLET'
        WHEN m.product_code LIKE 'GB-%' THEN 'TABLET'
        ELSE 'TABLET'
      END as product_type,
      
      -- 작업번호 관련 필드를 완전 제거하고 빈 문자열로 고정
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
    ORDER BY m.line_code ASC, m.line_type ASC
  `,

  // 안전한 라인 목록 조회 (JOIN 실패 대비)
  selectLineListSafe: `
    SELECT
      m.line_masterid,
      m.line_code as line_id,
      m.line_name,
      m.line_type,
      m.eq_group_code,
      m.max_capacity,
      COALESCE(m.description, '') as description,
      COALESCE(l.line_state, 's2') as line_state,
      CASE 
        WHEN COALESCE(l.line_state, 's2') = 's1' THEN '생산'
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
      '' as current_work_number,  -- 빈 값으로 고정
      '' as current_process_name, -- 빈 값으로 고정
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

  // ========== 테스트 쿼리들 ==========

  // product 테이블 존재 확인
  testProductTableExists: `
    SELECT 1 FROM product LIMIT 1
  `,

  // employees 테이블 존재 확인  
  testEmployeesTableExists: `
    SELECT 1 FROM employees LIMIT 1
  `,

  // package_master 테이블 확인
  testPackageMasterExists: `
    SELECT COUNT(*) as total FROM package_master
  `,

  // package_line 테이블 확인
  testPackageLineExists: `
    SELECT COUNT(*) as total FROM package_line
  `,

  // ========== 라인 마스터 관리 CRUD ==========

  // 라인 마스터 등록 - line_id에 숫자값 추가
  insertLineMaster: `
    INSERT INTO package_master (
      line_name, eq_group_code, line_type, reg_date, result_id, 
      line_code, line_id, max_capacity, description, product_code
    ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)
  `,

  // 라인 마스터 등록 - line_id를 NULL로 시도하는 대안
  insertLineMasterWithNullId: `
    INSERT INTO package_master (
      line_name, eq_group_code, line_type, reg_date, result_id, 
      line_code, line_id, max_capacity, description, product_code
    ) VALUES (?, ?, ?, NOW(), ?, ?, NULL, ?, ?, ?)
  `,

  // 라인 마스터 등록 - line_id 컬럼 제외하는 대안
  insertLineMasterNoId: `
    INSERT INTO package_master (
      line_name, eq_group_code, line_type, reg_date, result_id, 
      line_code, max_capacity, description, product_code
    ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?)
  `,

  // 라인 마스터 목록 조회
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
      description,
      product_code
    FROM package_master
    ORDER BY line_code ASC
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
      description,
      product_code
    FROM package_master
    WHERE line_code = ?
  `,

  // 라인 마스터 ID로 조회
  selectLineMasterById: `
    SELECT
      line_masterid,
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
      eq_group_code = ?,
      line_type = ?,
      max_capacity = ?,
      description = ?,
      product_code = ?
    WHERE line_masterid = ?
  `,

  // 라인 마스터 삭제
  deleteLineMaster: `
    DELETE FROM package_master WHERE line_masterid = ?
  `,

  // 라인 코드 중복 확인
  checkLineIdExists: `
    SELECT COUNT(*) as count FROM package_master WHERE line_code = ?
  `,

  // 라인 코드와 타입으로 중복 확인
  checkLineIdAndTypeExists: `
    SELECT COUNT(*) as count FROM package_master WHERE line_code = ? AND line_type = ?
  `,

  // ========== 라인 상태 관리 (작업번호 완전 제거) ==========

  // 라인 상태 등록 - work_order_no 필드 완전 제거
  insertLine: `
    INSERT INTO package_line (
      line_masterid, pkg_type, line_state, target_qty, reg_date, 
      eq_name, current_speed, line_code, employee_id
    ) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?)
  `,

  // 라인 상태 수정 - work_order_no 필드 완전 제거
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

  // 라인 상세 조회 - 작업번호는 빈 값으로 반환
  selectLineDetail: `
    SELECT
      l.line_id,
      l.line_masterid,
      l.pkg_type,
      l.line_state,
      CASE 
        WHEN l.line_state = 's1' THEN '생산'
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
      '' as current_work_number,  -- 빈 값으로 고정
      '' as current_process_name  -- 빈 값으로 고정
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

  // 사용 중인 설비명 조회 (가동대기중, 가동중인 라인만)
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

  // 모든 설비명 조회 (중복 제거)
  selectAllEquipments: `
    SELECT DISTINCT eq_name
    FROM package_line
    WHERE eq_name IS NOT NULL AND eq_name != ''
    ORDER BY eq_name ASC
  `,

  // ========== 통계 및 집계 쿼리 ==========

  // 라인 상태별 통계
  selectLineStatusStats: `
    SELECT 
      l.line_state,
      CASE 
        WHEN l.line_state = 's1' THEN '생산'
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

  // 생산 중인 라인 목록 (작업번호 없이)
  selectWorkingLines: `
    SELECT
      m.line_code,
      m.line_name,
      m.line_type,
      l.employee_id,
      e.employee_name,
      m.product_code,
      p.product_name,
      l.target_qty,
      l.current_speed,
      DATE_FORMAT(l.reg_date, '%Y-%m-%d %H:%i:%s') as work_start_time,
      '' as current_work_number,  -- 빈 값으로 고정
      '' as current_process_name  -- 빈 값으로 고정
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
      GROUP_CONCAT(DISTINCT m.line_code ORDER BY m.line_code) as line_codes
    FROM package_master m
    LEFT JOIN product p ON m.product_code = p.product_code
    WHERE m.product_code IS NOT NULL AND m.product_code != ''
    GROUP BY m.product_code, p.product_name
    ORDER BY used_lines DESC, m.product_code ASC
  `,

  // ========== 공통 코드 및 기타 ==========

  // 라인 타입별 개수
  selectLineTypeStats: `
    SELECT 
      line_type,
      COUNT(*) as count
    FROM package_master
    GROUP BY line_type
    ORDER BY line_type
  `,

  // 부서별 담당 라인 현황
  selectDepartmentLineStats: `
    SELECT 
      e.department_code,
      COUNT(DISTINCT m.line_code) as managed_lines,
      GROUP_CONCAT(DISTINCT m.line_code ORDER BY m.line_code) as line_codes
    FROM package_master m
    JOIN package_line l ON m.line_masterid = l.line_masterid
    JOIN employees e ON l.employee_id = e.employee_id
    WHERE l.line_id IN (
      SELECT MAX(line_id) 
      FROM package_line 
      GROUP BY line_masterid
    )
    GROUP BY e.department_code
    ORDER BY managed_lines DESC
  `,

  // 최근 라인 활동 내역 (작업번호 없이)
  selectRecentLineActivities: `
    SELECT
      m.line_code,
      m.line_name,
      l.line_state,
      CASE 
        WHEN l.line_state = 's1' THEN '생산'
        WHEN l.line_state = 's2' THEN '가동대기 중'
        WHEN l.line_state = 's3' THEN '가동정지'
        ELSE '알 수 없음'
      END as line_status,
      e.employee_name,
      DATE_FORMAT(l.reg_date, '%Y-%m-%d %H:%i:%s') as activity_time,
      '' as current_work_number,  -- 빈 값으로 고정
      '' as current_process_name  -- 빈 값으로 고정
    FROM package_line l
    JOIN package_master m ON l.line_masterid = m.line_masterid
    LEFT JOIN employees e ON l.employee_id = e.employee_id
    ORDER BY l.reg_date DESC
    LIMIT ?
  `,

  // ========== 더미 작업번호 조회 쿼리들 (항상 빈 결과 반환) ==========
  
  // 더미 작업번호 조회 - 실제로는 빈 결과만 반환
  getCurrentWorkNumber: `
    SELECT '' as 작업번호 WHERE 1=0
  `,

  // 더미 모든 작업번호 조회 - 실제로는 빈 결과만 반환
  getAllWorkNumbers: `
    SELECT 
      '' as 작업번호, 
      0 as 순서, 
      '' as 진행상태, 
      '' as 공정코드,
      '' as 시작일시
    WHERE 1=0
  `,

  // 더미 작업 진행상황 조회 - 실제로는 빈 결과만 반환
  getLineWorkProgress: `
    SELECT 
      '' as 실적ID,
      '' as 제품코드,
      '' as 라인코드,
      '' as 작업번호,
      0 as 순서,
      '' as 공정코드,
      '' as 진행상태,
      '' as 시작일시,
      '' as 완료일시,
      '' as 공정명
    WHERE 1=0
  `,

  // 더미 공정흐름도 조회 - 실제로는 빈 결과만 반환
  getProcessFlow: `
    SELECT 
      '' as 공정그룹코드, 
      0 as 순서, 
      '' as 공정코드
    WHERE 1=0
  `,

  // 더미 진행중인 작업실적 조회 - 실제로는 빈 결과만 반환
  getOngoingWorkResults: `
    SELECT '' as 실적ID WHERE 1=0
  `,

  // 더미 대기중인 작업번호 조회 - 실제로는 빈 결과만 반환
  getWaitingWorkNumbers: `
    SELECT '' as 작업번호 WHERE 1=0
  `,

  // 더미 작업실적 테이블 확인 - 항상 실패
  checkWorkResultTable: `
    SELECT 1 FROM non_existent_table LIMIT 1
  `,

  // 더미 작업실적상세 테이블 확인 - 항상 실패
  checkWorkResultDetailTable: `
    SELECT 1 FROM non_existent_table LIMIT 1
  `
};