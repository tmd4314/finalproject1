// database/sqls/package.js (실제 테이블 구조 기반 수정)
module.exports = {
  
  // ========== 기본 작업 관련 쿼리 (실제 테이블 구조) ==========
  
  // 작업 등록
  insertWork: `
    INSERT INTO tablets.package_work (
      work_no, work_order_no, order_detail_id, line_id, work_line, work_step, step_name, 
      step_status, input_qty, output_qty, eq_code, start_time, end_time,
      employee_id, employee_name, reg_date, upd_date, product_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'READY', ?, 0, ?, NULL, NULL, ?, ?, NOW(), NOW(), ?)
    ON DUPLICATE KEY UPDATE
      input_qty = VALUES(input_qty),
      employee_id = VALUES(employee_id),
      employee_name = VALUES(employee_name),
      upd_date = NOW()
  `,

  // 작업 목록 조회 (실제 컬럼명 사용)
  selectWorkList: `
    SELECT 
      work_no,
      work_order_no,
      order_detail_id,
      line_id,
      work_line,
      work_step,
      step_name,
      step_status,
      input_qty,
      output_qty,
      COALESCE(0) as defect_qty,
      eq_code,
      start_time,
      end_time,
      employee_id,
      employee_name,
      product_name,
      reg_date,
      upd_date,
      
      -- 기본 제품명 매핑 (product_name이 없는 경우)
      CASE 
        WHEN product_name IS NOT NULL AND product_name != '' THEN product_name
        WHEN step_name LIKE '%타이레놀%' THEN '타이레놀정500mg'
        WHEN step_name LIKE '%게보린%' THEN '게보린정'
        WHEN step_name LIKE '%부루펜%' THEN '부루펜시럽'
        WHEN step_name LIKE '%베아르%' THEN '베아르정'
        WHEN step_name LIKE '%A라인%' THEN '타이레놀정500mg'
        WHEN step_name LIKE '%B라인%' THEN '게보린정'
        WHEN step_name LIKE '%C라인%' THEN '부루펜시럽'
        ELSE COALESCE(product_name, step_name, '제품정보없음')
      END as final_product_name,
      
      -- 포장타입 결정
      CASE 
        WHEN step_name LIKE '%외포장%' OR step_name LIKE '%2차%' OR work_step LIKE '%외포장%' THEN 'OUTER'
        WHEN step_name LIKE '%내포장%' OR step_name LIKE '%1차%' OR work_step LIKE '%내포장%' THEN 'INNER'
        WHEN line_id LIKE '%OUTER%' THEN 'OUTER'
        WHEN line_id LIKE '%INNER%' THEN 'INNER'
        ELSE 'INNER'
      END as package_type,
      
      -- 라인 타입
      CASE 
        WHEN step_name LIKE '%외포장%' OR step_name LIKE '%2차%' OR work_step LIKE '%외포장%' THEN '외포장'
        WHEN step_name LIKE '%내포장%' OR step_name LIKE '%1차%' OR work_step LIKE '%내포장%' THEN '내포장'
        WHEN line_id LIKE '%OUTER%' THEN '외포장'
        WHEN line_id LIKE '%INNER%' THEN '내포장'
        ELSE '내포장'
      END as line_type,
      
      -- 기본 수량 정보
      COALESCE(input_qty, 1000) as order_qty,
      COALESCE(input_qty, 1000) as target_qty,
      
      -- 진행률 계산
      CASE 
        WHEN input_qty > 0 THEN ROUND((output_qty / input_qty * 100), 1)
        ELSE 0
      END AS progress_rate,
      
      -- 라인명 (기본)
      CASE 
        WHEN line_id LIKE 'A_%' THEN 'A라인'
        WHEN line_id LIKE 'B_%' THEN 'B라인'
        WHEN line_id LIKE 'C_%' THEN 'C라인'
        WHEN line_id LIKE 'D_%' THEN 'D라인'
        WHEN step_name LIKE '%A라인%' THEN 'A라인'
        WHEN step_name LIKE '%B라인%' THEN 'B라인'
        WHEN step_name LIKE '%C라인%' THEN 'C라인'
        ELSE CONCAT('라인', line_id)
      END as line_name,
      
      -- 작업자명
      COALESCE(employee_name, '김포장') as emp_name,
      
      -- 조인 상태 (기본값)
      1 as has_product_info,
      1 as has_order_info,
      1 as has_employee_info
      
    FROM tablets.package_work
    WHERE work_no IS NOT NULL
    ORDER BY reg_date DESC
  `,

  // 라인별 작업 목록 조회
  selectWorkOptionsByLine: `
    SELECT 
      work_no,
      work_order_no,
      COALESCE(step_name, work_no) as step_name,
      COALESCE(step_status, 'READY') as step_status,
      COALESCE(input_qty, 0) as input_qty,
      COALESCE(output_qty, 0) as output_qty,
      COALESCE(0) as defect_qty,
      COALESCE(employee_name, '작업자') as employee_name,
      COALESCE(work_step, '포장') as work_step,
      product_name,
      employee_id,
      start_time,
      end_time,
      reg_date,
      upd_date,
      
      -- 라인 정보
      line_id,
      
      -- 제품명 결정
      CASE 
        WHEN product_name IS NOT NULL AND product_name != '' THEN product_name
        WHEN step_name LIKE '%타이레놀%' THEN '타이레놀정500mg'
        WHEN step_name LIKE '%게보린%' THEN '게보린정'
        WHEN step_name LIKE '%부루펜%' THEN '부루펜시럽'
        WHEN step_name LIKE '%베아르%' THEN '베아르정'
        ELSE COALESCE(product_name, step_name, '제품명없음')
      END as final_product_name,
      
      -- 포장타입 결정
      CASE 
        WHEN step_name LIKE '%외포장%' OR step_name LIKE '%2차%' THEN 'OUTER'
        WHEN step_name LIKE '%내포장%' OR step_name LIKE '%1차%' THEN 'INNER'
        WHEN line_id LIKE '%OUTER%' THEN 'OUTER'
        WHEN line_id LIKE '%INNER%' THEN 'INNER'
        ELSE 'INNER'
      END as package_type,
      
      -- 라인 타입
      CASE 
        WHEN step_name LIKE '%외포장%' OR step_name LIKE '%2차%' THEN '외포장'
        WHEN step_name LIKE '%내포장%' OR step_name LIKE '%1차%' THEN '내포장'
        WHEN line_id LIKE '%OUTER%' THEN '외포장'
        WHEN line_id LIKE '%INNER%' THEN '내포장'
        ELSE '내포장'
      END as line_type,
      
      -- 기본 수량
      COALESCE(input_qty, 1000) as order_qty,
      COALESCE(input_qty, 1000) as target_qty,
      
      -- 작업자 정보
      COALESCE(employee_name, '작업자') as emp_name,
      
      -- 진행률
      CASE 
        WHEN input_qty > 0 THEN ROUND((output_qty / input_qty * 100), 1)
        ELSE 0
      END AS progress_rate,
      
      -- 라인명
      CASE 
        WHEN line_id LIKE 'A_%' THEN 'A라인'
        WHEN line_id LIKE 'B_%' THEN 'B라인'
        WHEN line_id LIKE 'C_%' THEN 'C라인'
        WHEN line_id LIKE 'D_%' THEN 'D라인'
        ELSE CONCAT('라인', line_id)
      END as line_name
      
    FROM tablets.package_work
    WHERE 
      line_id = ?
      AND COALESCE(step_status, 'READY') IN ('READY', 'WORKING', 'PAUSED', '준비', '진행', '일시정지', 'IN_PROGRESS', 'AVAILABLE', 'PARTIAL_COMPLETE', '부분완료')
      
    ORDER BY 
      CASE COALESCE(step_status, 'READY')
        WHEN 'WORKING' THEN 1 
        WHEN 'IN_PROGRESS' THEN 1
        WHEN '진행중' THEN 1
        WHEN 'PAUSED' THEN 2 
        WHEN '일시정지' THEN 2
        WHEN 'PARTIAL_COMPLETE' THEN 2
        WHEN '부분완료' THEN 2
        WHEN 'READY' THEN 3 
        WHEN '준비' THEN 3
        ELSE 4 
      END, 
      reg_date DESC
  `,

  // 작업 상세 조회
  selectWorkDetail: `
    SELECT 
      *,
      -- 제품명
      CASE 
        WHEN product_name IS NOT NULL AND product_name != '' THEN product_name
        WHEN step_name LIKE '%타이레놀%' THEN '타이레놀정500mg'
        WHEN step_name LIKE '%게보린%' THEN '게보린정'
        WHEN step_name LIKE '%부루펜%' THEN '부루펜시럽'
        WHEN step_name LIKE '%베아르%' THEN '베아르정'
        ELSE product_name
      END as final_product_name,
      
      COALESCE(employee_name, '작업자') as emp_name,
      COALESCE(input_qty, 1000) as order_qty,
      
      -- 라인명
      CASE 
        WHEN line_id LIKE 'A_%' THEN 'A라인'
        WHEN line_id LIKE 'B_%' THEN 'B라인'
        WHEN line_id LIKE 'C_%' THEN 'C라인'
        WHEN line_id LIKE 'D_%' THEN 'D라인'
        ELSE CONCAT('라인', line_id)
      END as line_name
      
    FROM tablets.package_work
    WHERE work_no = ?
  `,

  // 작업 업데이트 (기본)
  updateWork: `
    UPDATE tablets.package_work 
    SET 
      step_status = ?,
      output_qty = ?,
      start_time = ?,
      end_time = ?,
      upd_date = NOW()
    WHERE work_no = ?
  `,

  // 부분완료 작업 업데이트
  updatePartialWork: `
    UPDATE tablets.package_work 
    SET 
      step_status = ?,
      output_qty = ?,
      end_time = ?,
      upd_date = NOW()
    WHERE work_no = ?
  `,

  // 작업 완료
  completeWork: `
    UPDATE tablets.package_work 
    SET 
      step_status = '완료',
      output_qty = ?,
      end_time = NOW(),
      upd_date = NOW()
    WHERE work_no = ?
  `,

  // 작업 존재 확인
  checkWorkExists: `
    SELECT COUNT(*) as count 
    FROM tablets.package_work 
    WHERE work_no = ?
  `,

  // ========== 제품코드별 조회 ==========
  
  selectWorksByProductName: `
    SELECT 
      *,
      CASE 
        WHEN product_name IS NOT NULL AND product_name != '' THEN product_name
        WHEN step_name LIKE '%타이레놀%' THEN '타이레놀정500mg'
        WHEN step_name LIKE '%게보린%' THEN '게보린정'
        WHEN step_name LIKE '%부루펜%' THEN '부루펜시럽'
        WHEN step_name LIKE '%베아르%' THEN '베아르정'
        ELSE product_name
      END as final_product_name,
      CASE 
        WHEN line_id LIKE 'A_%' THEN 'A라인'
        WHEN line_id LIKE 'B_%' THEN 'B라인'
        WHEN line_id LIKE 'C_%' THEN 'C라인'
        WHEN line_id LIKE 'D_%' THEN 'D라인'
        ELSE CONCAT('라인', line_id)
      END as line_name
    FROM tablets.package_work
    WHERE product_name LIKE CONCAT('%', ?, '%')
      OR step_name LIKE CONCAT('%', ?, '%')
    ORDER BY reg_date DESC
  `,

  // ========== 포장타입별 작업 조회 ==========
  
  selectWorksByPackageType: `
    SELECT 
      work_no,
      work_order_no,
      order_detail_id,
      line_id,
      COALESCE(step_name, work_no) as step_name,
      COALESCE(step_status, 'READY') as step_status,
      COALESCE(input_qty, 0) as input_qty,
      COALESCE(output_qty, 0) as output_qty,
      COALESCE(0) as defect_qty,
      COALESCE(employee_name, '작업자') as employee_name,
      COALESCE(product_name, '') as product_name,
      COALESCE(work_step, '포장') as work_step,
      DATE_FORMAT(reg_date, '%Y-%m-%d %H:%i') as reg_date,
      
      -- 제품명
      CASE 
        WHEN product_name IS NOT NULL AND product_name != '' THEN product_name
        WHEN step_name LIKE '%타이레놀%' THEN '타이레놀정500mg'
        WHEN step_name LIKE '%게보린%' THEN '게보린정'
        WHEN step_name LIKE '%부루펜%' THEN '부루펜시럽'
        WHEN step_name LIKE '%베아르%' THEN '베아르정'
        ELSE COALESCE(product_name, step_name, '제품명없음')
      END as final_product_name,
      
      -- 포장타입 결정
      CASE 
        WHEN ? = 'OUTER' AND (step_name LIKE '%외포장%' OR step_name LIKE '%2차%' OR line_id LIKE '%OUTER%') THEN 'OUTER'
        WHEN ? = 'INNER' AND (step_name LIKE '%내포장%' OR step_name LIKE '%1차%' OR line_id LIKE '%INNER%' OR 
                             (step_name NOT LIKE '%외포장%' AND step_name NOT LIKE '%2차%')) THEN 'INNER'
        ELSE ?
      END as package_type,
      
      -- 라인 타입
      CASE 
        WHEN ? = 'OUTER' AND (step_name LIKE '%외포장%' OR step_name LIKE '%2차%' OR line_id LIKE '%OUTER%') THEN '외포장'
        WHEN ? = 'INNER' AND (step_name LIKE '%내포장%' OR step_name LIKE '%1차%' OR line_id LIKE '%INNER%' OR 
                             (step_name NOT LIKE '%외포장%' AND step_name NOT LIKE '%2차%')) THEN '내포장'
        ELSE CASE WHEN ? = 'OUTER' THEN '외포장' ELSE '내포장' END
      END as line_type,
      
      COALESCE(input_qty, 1000) as order_qty,
      COALESCE(input_qty, 1000) as target_qty,
      
      -- 진행률
      CASE 
        WHEN input_qty > 0 THEN ROUND((output_qty / input_qty * 100), 1)
        ELSE 0
      END AS progress_rate,
      
      -- 라인명
      CASE 
        WHEN line_id LIKE 'A_%' THEN 'A라인'
        WHEN line_id LIKE 'B_%' THEN 'B라인'
        WHEN line_id LIKE 'C_%' THEN 'C라인'
        WHEN line_id LIKE 'D_%' THEN 'D라인'
        ELSE CONCAT('라인', line_id)
      END as line_name
      
    FROM tablets.package_work
    WHERE 
      COALESCE(step_status, 'READY') IN ('READY', 'WORKING', 'PAUSED', '준비', '진행', '일시정지', 'IN_PROGRESS', 'AVAILABLE', 'PARTIAL_COMPLETE', '부분완료')
      AND (
        CASE 
          WHEN ? = 'INNER' THEN (step_name LIKE '%내포장%' OR step_name LIKE '%1차%' OR line_id LIKE '%INNER%' OR 
                                (step_name NOT LIKE '%외포장%' AND step_name NOT LIKE '%2차%' AND line_id NOT LIKE '%OUTER%'))
          WHEN ? = 'OUTER' THEN (step_name LIKE '%외포장%' OR step_name LIKE '%2차%' OR line_id LIKE '%OUTER%')
          ELSE 1=1
        END
      )
      
    ORDER BY reg_date DESC
  `,

  // ========== 워크플로우 관련 쿼리 ==========
  
  // 내포장 완료 정보 조회
  selectInnerCompletionByLineCode: `
    SELECT 
      work_no,
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
      
      -- 제품 정보
      CASE 
        WHEN product_name IS NOT NULL AND product_name != '' THEN product_name
        WHEN step_name LIKE '%타이레놀%' THEN '타이레놀정500mg'
        WHEN step_name LIKE '%게보린%' THEN '게보린정'
        WHEN step_name LIKE '%부루펜%' THEN '부루펜시럽'
        WHEN step_name LIKE '%베아르%' THEN '베아르정'
        ELSE step_name
      END as final_product_name
      
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

  // ========== 디버깅용 쿼리들 ==========
  
  countPackageWork: `
    SELECT COUNT(*) as total_count 
    FROM tablets.package_work
  `,
  
  selectRecentWorks: `
    SELECT 
      work_no, 
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
  
  checkJoinStatus: `
    SELECT 
      work_no,
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
    ORDER BY reg_date DESC
    LIMIT 15
  `,

  // 라인 목록 (실제 데이터 기반)
  selectAllLines: `
    SELECT 
      line_id, 
      'AVAILABLE' as line_status,
      line_id as curr_work_no,
      1000 as target_qty,
      line_id as line_code,
      CASE 
        WHEN line_id LIKE 'A_%' THEN 'A라인'
        WHEN line_id LIKE 'B_%' THEN 'B라인'
        WHEN line_id LIKE 'C_%' THEN 'C라인'
        WHEN line_id LIKE 'D_%' THEN 'D라인'
        ELSE CONCAT('라인', line_id)
      END as line_name,
      CASE 
        WHEN line_id LIKE '%INNER%' THEN 'INNER'
        WHEN line_id LIKE '%OUTER%' THEN 'OUTER'
        ELSE 'INNER'
      END as pkg_type
    FROM (
      SELECT DISTINCT line_id 
      FROM tablets.package_work 
      WHERE line_id IS NOT NULL
      UNION 
      SELECT 'A_INNER' as line_id
      UNION 
      SELECT 'A_OUTER' as line_id
      UNION 
      SELECT 'B_INNER' as line_id
      UNION 
      SELECT 'B_OUTER' as line_id
    ) as lines
    ORDER BY line_id
  `,

  countPackageLine: `
    SELECT COUNT(DISTINCT line_id) as total_count 
    FROM tablets.package_work 
    WHERE line_id IS NOT NULL
  `,

  // 부분완료 작업 상세 조회
  selectPartialWorkDetail: `
    SELECT 
      *,
      CASE 
        WHEN product_name IS NOT NULL AND product_name != '' THEN product_name
        WHEN step_name LIKE '%타이레놀%' THEN '타이레놀정500mg'
        WHEN step_name LIKE '%게보린%' THEN '게보린정'
        WHEN step_name LIKE '%부루펜%' THEN '부루펜시럽'
        WHEN step_name LIKE '%베아르%' THEN '베아르정'
        ELSE step_name
      END as final_product_name,
      COALESCE(input_qty, 1000) as order_qty,
      
      -- 부분완료 계산
      CASE 
        WHEN step_status IN ('부분완료', 'PARTIAL_COMPLETE') THEN
          COALESCE(input_qty, 1000) - COALESCE(output_qty, 0)
        ELSE 0
      END as remaining_quantity,
      
      CASE 
        WHEN step_status IN ('부분완료', 'PARTIAL_COMPLETE') AND COALESCE(input_qty, 1000) > 0 THEN
          ROUND((COALESCE(output_qty, 0) / COALESCE(input_qty, 1000)) * 100, 1)
        ELSE 0
      END as completion_rate,
      
      CASE 
        WHEN step_status IN ('부분완료', 'PARTIAL_COMPLETE') THEN 1
        ELSE 0
      END as is_partial_work
      
    FROM tablets.package_work
    WHERE work_no = ?
  `,

  // 재시작 가능한 작업 목록
  selectResumableWorks: `
    SELECT 
      work_no,
      work_order_no,
      step_name,
      step_status,
      output_qty,
      product_name,
      COALESCE(input_qty, 1000) as target_qty,
      COALESCE(input_qty, 1000) - COALESCE(output_qty, 0) as remaining_qty,
      ROUND((COALESCE(output_qty, 0) / COALESCE(input_qty, 1000)) * 100, 1) as completion_rate,
      line_id,
      CASE 
        WHEN line_id LIKE 'A_%' THEN 'A라인'
        WHEN line_id LIKE 'B_%' THEN 'B라인'
        WHEN line_id LIKE 'C_%' THEN 'C라인'
        WHEN line_id LIKE 'D_%' THEN 'D라인'
        ELSE CONCAT('라인', line_id)
      END as line_name,
      CASE 
        WHEN product_name IS NOT NULL AND product_name != '' THEN product_name
        WHEN step_name LIKE '%타이레놀%' THEN '타이레놀정500mg'
        WHEN step_name LIKE '%게보린%' THEN '게보린정'
        WHEN step_name LIKE '%부루펜%' THEN '부루펜시럽'
        WHEN step_name LIKE '%베아르%' THEN '베아르정'
        ELSE step_name
      END as final_product_name
      
    FROM tablets.package_work
    WHERE 
      step_status IN ('부분완료', 'PARTIAL_COMPLETE', '일시정지', 'PAUSED')
      AND COALESCE(input_qty, 1000) > COALESCE(output_qty, 0)
      
    ORDER BY upd_date DESC
  `,

  // 작업 삭제
  deleteWork: `
    DELETE FROM tablets.package_work 
    WHERE work_no = ?
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