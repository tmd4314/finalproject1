// database/sqls/package.js (실제 테이블 구조 기반 단순화 버전)
module.exports = {
  
  // ========== 기본 작업 관련 쿼리 (실제 테이블 구조 기반) ==========
  
  // 작업 목록 조회 (단순화된 버전)
  selectWorkList: `
    SELECT 
      work_id,
      work_order_no,
      order_detail_id,
      line_id,
      work_line,
      work_step,
      step_name,
      step_status,
      input_qty,
      output_qty,
      eq_code,
      start_time,
      end_time,
      employee_id,
      employee_name,
      product_name,
      reg_date,
      upd_date,
      
      -- 기본 제품명 설정
      COALESCE(product_name, step_name, '제품명없음') as final_product_name,
      
      -- 포장타입 결정 (단순화)
      CASE 
        WHEN step_name LIKE '%외포장%' OR step_name LIKE '%2차%' THEN 'OUTER'
        ELSE 'INNER'
      END as package_type,
      
      -- 라인명 추출 (단순화)
      COALESCE(work_line, line_id, '라인정보없음') as line_name,
      
      -- 진행률 계산
      CASE 
        WHEN input_qty > 0 THEN ROUND((output_qty / input_qty * 100), 1)
        ELSE 0
      END AS progress_rate,
      
      -- 기본 수량 정보
      COALESCE(input_qty, 1000) as order_qty,
      COALESCE(input_qty, 1000) as target_qty,
      COALESCE(employee_name, '작업자') as emp_name,
      0 as defect_qty,
      
      -- 호환성을 위한 별칭
      work_id as work_no
      
    FROM tablets.package_work
    WHERE work_id IS NOT NULL
    ORDER BY reg_date DESC
  `,

  // 작업 상세 조회 (단순화)
  selectWorkDetail: `
    SELECT 
      *,
      COALESCE(product_name, step_name, '제품명없음') as final_product_name,
      COALESCE(employee_name, '작업자') as emp_name,
      COALESCE(input_qty, 1000) as order_qty,
      COALESCE(work_line, line_id, '라인정보없음') as line_name,
      work_id as work_no
    FROM tablets.package_work
    WHERE work_id = ?
  `,

  // 작업 등록 (기본)
  insertWork: `
    INSERT INTO tablets.package_work (
      work_order_no, order_detail_id, line_id, work_line, work_step, step_name, 
      step_status, input_qty, output_qty, eq_code, start_time, end_time,
      employee_id, employee_name, reg_date, upd_date, product_name
    ) VALUES (?, ?, ?, ?, ?, ?, 'READY', ?, 0, ?, NULL, NULL, ?, ?, NOW(), NOW(), ?)
  `,

  // 작업 업데이트
  updateWork: `
    UPDATE tablets.package_work 
    SET 
      step_status = ?,
      output_qty = ?,
      start_time = ?,
      end_time = ?,
      upd_date = NOW()
    WHERE work_id = ?
  `,

  // 작업 완료
  completeWork: `
    UPDATE tablets.package_work 
    SET 
      step_status = '완료',
      output_qty = ?,
      end_time = NOW(),
      upd_date = NOW()
    WHERE work_id = ?
  `,

  // 작업 존재 확인
  checkWorkExists: `
    SELECT COUNT(*) as count 
    FROM tablets.package_work 
    WHERE work_id = ?
  `,

  // ========== 필터링 관련 쿼리 ==========

  // 포장타입별 작업 조회 (단순화)
  selectWorksByPackageType: `
    SELECT 
      work_id,
      work_order_no,
      line_id,
      step_name,
      step_status,
      input_qty,
      output_qty,
      employee_name,
      product_name,
      reg_date,
      
      COALESCE(product_name, step_name, '제품명없음') as final_product_name,
      
      CASE 
        WHEN ? = 'OUTER' AND (step_name LIKE '%외포장%' OR step_name LIKE '%2차%') THEN 'OUTER'
        WHEN ? = 'INNER' AND (step_name NOT LIKE '%외포장%' AND step_name NOT LIKE '%2차%') THEN 'INNER'
        ELSE ?
      END as package_type,
      
      COALESCE(work_line, line_id, '라인정보없음') as line_name,
      
      CASE 
        WHEN input_qty > 0 THEN ROUND((output_qty / input_qty * 100), 1)
        ELSE 0
      END AS progress_rate,
      
      work_id as work_no
      
    FROM tablets.package_work
    WHERE work_id IS NOT NULL
    ORDER BY reg_date DESC
  `,

  // 라인별 작업 목록 조회 (단순화)
  selectWorksByLine: `
    SELECT 
      work_id,
      work_order_no,
      step_name,
      step_status,
      input_qty,
      output_qty,
      employee_name,
      product_name,
      line_id,
      work_line,
      
      COALESCE(product_name, step_name, '제품명없음') as final_product_name,
      COALESCE(work_line, line_id, '라인정보없음') as line_name,
      
      CASE 
        WHEN input_qty > 0 THEN ROUND((output_qty / input_qty * 100), 1)
        ELSE 0
      END AS progress_rate,
      
      work_id as work_no
      
    FROM tablets.package_work
    WHERE (line_id LIKE ? OR work_line LIKE ?)
    ORDER BY reg_date DESC
  `,

  // ========== 디버깅용 쿼리들 ==========
  
  countPackageWork: `
    SELECT COUNT(*) as total_count 
    FROM tablets.package_work
  `,
  
  selectRecentWorks: `
    SELECT 
      work_id, 
      work_order_no,
      step_name, 
      step_status, 
      input_qty, 
      output_qty,
      product_name,
      line_id,
      DATE_FORMAT(reg_date, '%Y-%m-%d %H:%i:%s') as reg_date
    FROM tablets.package_work 
    ORDER BY reg_date DESC 
    LIMIT 10
  `,
  
  checkDataStatus: `
    SELECT 
      work_id,
      work_order_no,
      step_name,
      product_name,
      line_id,
      step_status,
      CASE 
        WHEN product_name IS NOT NULL AND product_name != '' THEN '제품명있음'
        ELSE '제품명없음'
      END as product_status
    FROM tablets.package_work
    WHERE work_id IS NOT NULL
    ORDER BY reg_date DESC
    LIMIT 15
  `,

  // 부분완료 작업 조회
  selectPartialWorks: `
    SELECT 
      work_id,
      work_order_no,
      step_name,
      step_status,
      input_qty,
      output_qty,
      COALESCE(input_qty, 1000) - COALESCE(output_qty, 0) as remaining_qty,
      CASE 
        WHEN input_qty > 0 THEN ROUND((output_qty / input_qty * 100), 1)
        ELSE 0
      END AS completion_rate,
      
      COALESCE(product_name, step_name, '제품명없음') as final_product_name,
      COALESCE(work_line, line_id, '라인정보없음') as line_name,
      work_id as work_no
      
    FROM tablets.package_work
    WHERE 
      step_status IN ('부분완료', 'PARTIAL_COMPLETE', '일시정지', 'PAUSED')
      AND COALESCE(input_qty, 1000) > COALESCE(output_qty, 0)
    ORDER BY upd_date DESC
  `,

  // 작업 삭제
  deleteWork: `
    DELETE FROM tablets.package_work 
    WHERE work_id = ?
  `,

  // ========== 제품코드별 조회 ==========
  
  selectWorksByProductName: `
    SELECT 
      *,
      COALESCE(product_name, step_name, '제품명없음') as final_product_name,
      COALESCE(work_line, line_id, '라인정보없음') as line_name,
      work_id as work_no
    FROM tablets.package_work
    WHERE product_name LIKE CONCAT('%', ?, '%')
      OR step_name LIKE CONCAT('%', ?, '%')
    ORDER BY reg_date DESC
  `,

  // ========== 라인 목록 (실제 데이터 기반) ==========
  
  selectAllLines: `
    SELECT 
      line_id, 
      'AVAILABLE' as line_status,
      line_id as curr_work_no,
      1000 as target_qty,
      line_id as line_code,
      COALESCE(work_line, line_id, '라인정보없음') as line_name,
      CASE 
        WHEN line_id LIKE '%INNER%' OR step_name LIKE '%내포장%' THEN 'INNER'
        WHEN line_id LIKE '%OUTER%' OR step_name LIKE '%외포장%' THEN 'OUTER'
        ELSE 'INNER'
      END as pkg_type
    FROM (
      SELECT DISTINCT line_id, work_line, step_name
      FROM tablets.package_work 
      WHERE line_id IS NOT NULL
      UNION 
      SELECT 'A_INNER' as line_id, 'A라인' as work_line, '내포장' as step_name
      UNION 
      SELECT 'A_OUTER' as line_id, 'A라인' as work_line, '외포장' as step_name
      UNION 
      SELECT 'B_INNER' as line_id, 'B라인' as work_line, '내포장' as step_name
      UNION 
      SELECT 'B_OUTER' as line_id, 'B라인' as work_line, '외포장' as step_name
    ) as lines
    ORDER BY line_id
  `,

  countPackageLine: `
    SELECT COUNT(DISTINCT line_id) as total_count 
    FROM tablets.package_work 
    WHERE line_id IS NOT NULL
  `,

  // ========== 워크플로우 관련 쿼리 (향후 확장용) ==========
  
  // 내포장 완료 정보 조회
  selectInnerCompletionByLineCode: `
    SELECT 
      work_id,
      step_name,
      output_qty,
      end_time as completion_time,
      step_status,
      line_id,
      ? as line_code,
      CONCAT(?, ' 내포장') as line_name,
      
      -- 완료 타입
      CASE 
        WHEN output_qty >= input_qty THEN 'complete'
        WHEN output_qty > 0 THEN 'partial'
        ELSE 'none'
      END as completion_type,
      
      -- 달성률
      CASE 
        WHEN input_qty > 0 THEN ROUND((output_qty / input_qty * 100), 1)
        ELSE 0
      END as completion_rate,
      
      COALESCE(product_name, step_name, '제품명없음') as final_product_name
      
    FROM tablets.package_work
    WHERE 
      (line_id LIKE CONCAT(?, '%') OR step_name LIKE CONCAT('%', ?, '%'))
      AND (step_name LIKE '%내포장%' OR line_id LIKE '%INNER%' OR step_name NOT LIKE '%외포장%')
      AND step_status IN ('완료', 'COMPLETED', '부분완료', 'PARTIAL_COMPLETE')
      AND output_qty > 0
      
    ORDER BY end_time DESC
    LIMIT 1
  `,

  // 외포장에 내포장 완료수량 연계
  linkInnerToOuter: `
    UPDATE tablets.package_work 
    SET 
      input_qty = ?,
      upd_date = NOW()
    WHERE 
      (line_id LIKE CONCAT(?, '%') OR step_name LIKE CONCAT('%', ?, '%'))
      AND (step_name LIKE '%외포장%' OR line_id LIKE '%OUTER%')
      AND step_status IN ('READY', '준비')
  `,

  // ========== 피드백 기반 실적 테이블 연동 쿼리 (향후 확장용) ==========
  
  // 공정흐름도에서 제품코드 기반 공정 정보 가져오기
  selectProcessFlow: `
    SELECT 공정그룹코드, 순서, 공정코드
    FROM tablets.공정흐름도
    WHERE 제품코드 = ?
    AND 공정유형코드 = ?
  `,
  
  // 작업실적에서 진행중인 실적 가져오기  
  selectActiveWorkResult: `
    SELECT 작업실적.실적ID
    FROM tablets.작업실적 
    JOIN tablets.작업실적상세 ON 작업실적.실적ID = 작업실적상세.실적ID
    WHERE 작업실적.공정그룹코드 = ?
    AND 작업실적상세.순서 = ?
    AND 작업실적상세.진행상태 = '완료'
  `,
  
  // 작업실적상세에서 작업번호 가져오기
  selectWorkNumber: `
    SELECT 작업번호
    FROM tablets.작업실적상세
    WHERE 실적ID = ?
    AND 순서 = ?
    AND 진행상태 = '대기'
  `,
  
  // 내포장 작업 시작
  startInnerPackaging: `
    UPDATE tablets.작업실적상세
    SET 진행상태 = '진행'
    WHERE 작업번호 = ?
  `,
  
  // 외포장 공정 종료시 상태 업데이트
  updateOuterPackagingToInspection: `
    UPDATE tablets.작업실적상세
    SET 진행상태 = '검사중'
    WHERE 작업번호 = ?
  `
};