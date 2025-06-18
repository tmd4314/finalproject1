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

  // 라인(상태/실시간) 등록 - 제품코드 기반
  insertLine: `
    INSERT INTO package_line (
      line_masterid, pkg_type, line_status, product_code, target_qty, reg_date, 
      eq_name, current_speed, line_code, employee_id
    ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
  `,

  // 프론트엔드용 통합 라인 목록 (제품코드 기반)
  selectLineList: `
    SELECT
      m.line_masterid,
      m.line_code as line_id,
      m.line_name,
      m.line_type,
      m.eq_group_code,
      m.max_capacity,
      COALESCE(m.description, '') as description,
      COALESCE(l.line_status, 'AVAILABLE') as line_status,
      COALESCE(e.employee_name, '') as employee_name,
      COALESCE(l.employee_id, NULL) as employee_id,
      COALESCE(l.product_code, '') as product_code,
      COALESCE(l.eq_name, '') as eq_name,
      COALESCE(l.current_speed, 0) as current_speed,
      COALESCE(l.target_qty, 0) as target_qty,
      DATE_FORMAT(m.reg_date, '%Y-%m-%d') as reg_date,
      m.result_id,
      -- 제품정보 추가
      COALESCE(p.product_name, '') as product_name,
      COALESCE(p.product_type, '') as product_type
    FROM package_master m
    LEFT JOIN package_line l ON m.line_masterid = l.line_masterid 
      AND l.line_id = (
        SELECT MAX(line_id) 
        FROM package_line pl 
        WHERE pl.line_masterid = m.line_masterid
      )
    LEFT JOIN tablets.employees e ON l.employee_id = e.employee_id
    LEFT JOIN tablets.products p ON l.product_code = p.product_code
    GROUP BY m.line_masterid, m.line_code, m.line_type
    ORDER BY m.line_code ASC, m.line_type ASC
  `,

  // 라인 상세 (상태/실적 + 사원명 + 제품정보)
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
      l.product_code,
      l.target_qty,
      DATE_FORMAT(l.reg_date, '%Y-%m-%d %H:%i:%s') as reg_date,
      -- 제품정보 추가
      p.product_name,
      p.product_type
    FROM package_line l
    LEFT JOIN tablets.employees e ON l.employee_id = e.employee_id
    LEFT JOIN tablets.products p ON l.product_code = p.product_code
    WHERE l.line_id = ?
  `,

  // 라인 수정 - 단일 라인 ID 기준으로 수정 (제품코드 기반)
  updateLine: `
    UPDATE package_line SET
      pkg_type = ?,
      line_status = ?,
      employee_id = ?,
      eq_name = ?,
      current_speed = ?,
      product_code = ?,
      target_qty = ?
    WHERE line_id = ?
  `,

  // 라인 삭제
  deleteLine: `
    DELETE FROM package_line WHERE line_id = ?
  `,

  // 라인/마스터 join 상세 조회 (제품정보 포함)
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
      -- 제품정보 추가
      p.product_name,
      p.product_type
    FROM package_line l
    JOIN package_master m ON l.line_masterid = m.line_masterid
    LEFT JOIN tablets.employees e ON l.employee_id = e.employee_id
    LEFT JOIN tablets.products p ON l.product_code = p.product_code
    WHERE l.line_id = ?
  `,

  // 특정 마스터 라인 코드로 최신 상태 조회 (제품정보 포함)
  selectLineStatusByMasterId: `
    SELECT
      l.*,
      e.employee_name,
      m.line_code as master_line_id,
      m.line_name,
      m.line_type,
      m.max_capacity,
      p.product_name,
      p.product_type
    FROM package_line l
    JOIN package_master m ON l.line_masterid = m.line_masterid
    LEFT JOIN tablets.employees e ON l.employee_id = e.employee_id
    LEFT JOIN tablets.products p ON l.product_code = p.product_code
    WHERE m.line_code = ?
    ORDER BY l.reg_date DESC, l.line_id DESC
    LIMIT 1
  `,

  // 최신 라인 상태 ID 조회
  selectLatestLineIdByMasterId: `
    SELECT pl.line_id 
    FROM package_line pl 
    JOIN package_master pm ON pl.line_masterid = pm.line_masterid 
    WHERE pm.line_code = ?
    ORDER BY pl.reg_date DESC, pl.line_id DESC
    LIMIT 1
  `,

  // 마스터 라인 코드로 최신 라인 상태 업데이트 (제품코드 기반)
  updateLineByMasterId: `
    UPDATE package_line 
    SET 
      pkg_type = ?,
      line_status = ?,
      employee_id = ?,
      eq_name = ?,
      current_speed = ?,
      product_code = ?,
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

  // 라인 상태 삭제 (마스터 라인 코드 기준)
  deleteLineByMasterId: `
    DELETE pl FROM package_line pl
    JOIN package_master pm ON pl.line_masterid = pm.line_masterid
    WHERE pm.line_code = ?
  `,

  // ========== 담당자 관리 ==========

  // 사용 가능한 담당자 목록 조회
  selectAvailableEmployees: `
    SELECT 
      employee_id,
      employee_name
    FROM tablets.employees
    ORDER BY employee_name ASC
  `,

  // ========== 설비명 관리 ==========

  // 사용 가능한 설비명 목록 조회 (package_line 테이블에서 조회)
  selectAvailableEquipments: `
    SELECT DISTINCT 
      pl.eq_name,
      pm.line_type,
      pm.line_type as eq_type
    FROM package_line pl
    JOIN package_master pm ON pl.line_masterid = pm.line_masterid
    WHERE pl.eq_name IS NOT NULL AND pl.eq_name != ''
    ORDER BY pm.line_type, pl.eq_name
  `,

  // 현재 사용 중인 설비명 조회 (단순화된 쿼리)
  selectUsedEquipments: `
    SELECT DISTINCT pl.eq_name
    FROM package_line pl
    WHERE pl.eq_name IS NOT NULL 
      AND pl.eq_name != ''
      AND pl.line_status IN ('WORKING', 'MAINTENANCE', 'AVAILABLE')
      AND pl.line_id IN (
        SELECT MAX(line_id) 
        FROM package_line 
        GROUP BY line_masterid
      )
  `,

  // 특정 라인 제외하고 사용 중인 설비명 조회 (단순화된 쿼리)
  selectUsedEquipmentsExcludeLine: `
    SELECT DISTINCT pl.eq_name
    FROM package_line pl
    JOIN package_master pm ON pl.line_masterid = pm.line_masterid
    WHERE pl.eq_name IS NOT NULL 
      AND pl.eq_name != ''
      AND pl.line_status IN ('WORKING', 'MAINTENANCE', 'AVAILABLE')
      AND pm.line_code != ?
      AND pl.line_id IN (
        SELECT MAX(line_id) 
        FROM package_line 
        GROUP BY line_masterid
      )
  `,

  // ========== 제품코드 관리 (작업결과 대신) ==========

  // 전체 제품코드 목록 조회
  selectAvailableProducts: `
    SELECT 
      p.product_code,
      p.product_name,
      p.product_type,
      p.package_type,
      -- 현재 사용 중인 라인 정보 표시
      COALESCE(
        (SELECT GROUP_CONCAT(DISTINCT pm.line_code ORDER BY pm.line_code)
         FROM package_line pl
         JOIN package_master pm ON pl.line_masterid = pm.line_masterid
         WHERE pl.product_code = p.product_code
           AND pl.line_status IN ('WORKING', 'AVAILABLE', 'MAINTENANCE')
           AND pl.line_id IN (SELECT MAX(line_id) FROM package_line GROUP BY line_masterid)
        ), ''
      ) as using_lines
    FROM tablets.products p
    WHERE p.status = 'ACTIVE'
    ORDER BY p.product_code ASC
  `,

  // 특정 라인의 사용 가능한 제품코드만 조회 (라인별 격리 정책)
  selectAvailableProductsForLine: `
    SELECT 
      p.product_code,
      p.product_name,
      p.product_type,
      p.package_type
    FROM tablets.products p
    WHERE p.status = 'ACTIVE'
      AND p.product_code NOT IN (
        -- 다른 라인에서 사용 중인 제품코드 제외
        SELECT DISTINCT pl.product_code
        FROM package_line pl
        JOIN package_master pm ON pl.line_masterid = pm.line_masterid
        WHERE pl.product_code IS NOT NULL 
          AND pl.product_code != ''
          AND pl.line_status IN ('WORKING', 'AVAILABLE', 'MAINTENANCE')
          AND pm.line_code != ?  -- 현재 라인과 다른 라인 코드
          AND pl.line_id IN (
            SELECT MAX(line_id) FROM package_line GROUP BY line_masterid
          )
      )
    ORDER BY p.product_code ASC
  `,

  // 특정 제품코드 상세 조회
  selectProductDetail: `
    SELECT 
      p.product_code,
      p.product_name,
      p.product_type,
      p.package_type,
      p.status
    FROM tablets.products p
    WHERE p.product_code = ?
  `,

  // ========== 공정흐름도 관리 (새로 추가) ==========

  // 제품코드별 공정흐름도 조회
  selectProcessFlowByProduct: `
    SELECT 
      pf.공정그룹코드,
      pf.순서,
      pf.공정코드,
      pf.공정유형코드,
      p.공정명
    FROM 공정흐름도 pf
    JOIN 공정 p ON pf.공정코드 = p.공정코드
    WHERE pf.제품코드 = ?
      AND pf.공정유형코드 = '포장'
    ORDER BY pf.순서 ASC
  `,

  // 진행중인 작업실적 조회 (공정그룹코드, 순서 기준)
  selectWorkResultByProcess: `
    SELECT 
      wr.실적ID,
      wr.공정그룹코드,
      wrd.순서,
      wrd.진행상태,
      wrd.작업번호
    FROM 작업실적 wr
    JOIN 작업실적상세 wrd ON wr.실적ID = wrd.실적ID
    WHERE wr.공정그룹코드 = ?
      AND wrd.순서 = ?
      AND wrd.진행상태 = '완료'
    ORDER BY wr.등록일시 DESC
    LIMIT 1
  `,

  // 대기중인 작업번호 조회
  selectWaitingWorkOrder: `
    SELECT 
      wrd.작업번호
    FROM 작업실적상세 wrd
    WHERE wrd.실적ID = ?
      AND wrd.순서 = ?
      AND wrd.진행상태 = '대기'
    LIMIT 1
  `,

  // 라인 작업 시작 (제품코드 기반)
  startLineWork: `
    UPDATE package_line 
    SET 
      line_status = 'WORKING',
      product_code = ?,
      work_order_no = ?,
      start_time = NOW()
    WHERE line_id = ?
  `,

  // ========== 제품코드 사용 현황 조회 (디버깅/관리용) ==========

  // 제품코드 사용 현황 확인
  checkProductCodeUsage: `
    SELECT 
      pl.product_code,
      pm.line_code,
      GROUP_CONCAT(
        CONCAT(pm.line_code, '-', pm.line_type, '(', pl.line_status, ')')
        ORDER BY pm.line_type
      ) as usage_details,
      COUNT(*) as usage_count
    FROM package_line pl
    JOIN package_master pm ON pl.line_masterid = pm.line_masterid
    WHERE pl.product_code IS NOT NULL 
      AND pl.product_code != ''
      AND pl.line_id IN (
        SELECT MAX(line_id) FROM package_line GROUP BY line_masterid
      )
    GROUP BY pl.product_code, pm.line_code
    ORDER BY pl.product_code, pm.line_code
  `,

  // 특정 제품코드가 어느 라인에서 사용 중인지 확인
  checkProductCodeLineUsage: `
    SELECT 
      pm.line_code,
      pm.line_type,
      pm.line_name,
      pl.line_status,
      e.employee_name,
      DATE_FORMAT(pl.reg_date, '%Y-%m-%d %H:%i:%s') as assigned_date
    FROM package_line pl
    JOIN package_master pm ON pl.line_masterid = pm.line_masterid
    LEFT JOIN tablets.employees e ON pl.employee_id = e.employee_id
    WHERE pl.product_code = ?
      AND pl.line_id IN (
        SELECT MAX(line_id) FROM package_line GROUP BY line_masterid
      )
    ORDER BY pm.line_code, pm.line_type
  `,

  // ========== 통계 쿼리 ==========

  // 라인별 상태 통계
  selectLineStatusStats: `
    SELECT
      COALESCE(l.line_status, 'AVAILABLE') as line_status,
      COUNT(*) as count
    FROM package_master m
    LEFT JOIN package_line l ON m.line_masterid = l.line_masterid 
      AND l.line_id = (
        SELECT MAX(line_id) 
        FROM package_line pl 
        WHERE pl.line_masterid = m.line_masterid
      )
    GROUP BY COALESCE(l.line_status, 'AVAILABLE')
    ORDER BY line_status
  `,

  // 현재 작업 중인 라인 목록 (제품정보 포함)
  selectWorkingLines: `
    SELECT
      m.line_code,
      m.line_name,
      m.line_type,
      e.employee_name,
      l.product_code,
      l.target_qty,
      l.current_speed,
      DATE_FORMAT(l.reg_date, '%Y-%m-%d %H:%i:%s') as work_start_time,
      p.product_name,
      p.product_type
    FROM package_master m
    JOIN package_line l ON m.line_masterid = l.line_masterid
      AND l.line_id = (
        SELECT MAX(line_id) 
        FROM package_line pl 
        WHERE pl.line_masterid = m.line_masterid
      )
    LEFT JOIN tablets.employees e ON l.employee_id = e.employee_id
    LEFT JOIN tablets.products p ON l.product_code = p.product_code
    WHERE l.line_status = 'WORKING'
    ORDER BY l.reg_date DESC
  `,

  // ========== 디버깅용 쿼리 (필요시 사용) ==========

  // 중복 마스터 데이터 확인
  checkDuplicateLines: `
    SELECT 
      line_code,
      line_type,
      COUNT(*) as count,
      GROUP_CONCAT(line_masterid ORDER BY line_masterid) as master_ids
    FROM package_master 
    GROUP BY line_code, line_type
    HAVING COUNT(*) > 1
    ORDER BY line_code, line_type
  `,

  // 전체 마스터 데이터 확인
  debugLineMaster: `
    SELECT 
      line_masterid,
      line_code,
      line_name,
      line_type,
      DATE_FORMAT(reg_date, '%Y-%m-%d %H:%i:%s') as reg_date
    FROM package_master 
    ORDER BY line_code, line_type, reg_date DESC
  `
};