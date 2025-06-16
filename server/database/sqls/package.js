// database/sqls/package.js (워크플로우 연계 쿼리 추가 버전)
module.exports = {
  
  // 🔥 기존 쿼리들...
  insertWork: `
    INSERT INTO tablets.package_work (
      work_no, order_detail_id, line_id, work_line, work_step, step_name, 
      step_status, input_qty, output_qty, eq_code, start_time, end_time,
      employee_id, employee_name, reg_date, upd_date, product_code
    ) VALUES (?, ?, ?, ?, ?, ?, 'READY', ?, 0, ?, NULL, NULL, ?, ?, NOW(), NOW(), ?)
    ON DUPLICATE KEY UPDATE
      input_qty = VALUES(input_qty),
      employee_id = VALUES(employee_id),
      employee_name = VALUES(employee_name),
      upd_date = NOW()
  `,

  // 🔥 NEW: line_code 기준 워크플로우 연계 조회
  selectWorkflowByLineCode: `
    SELECT 
      -- 내포장 정보
      w_inner.work_no as inner_work_no,
      w_inner.step_name as inner_step_name,
      w_inner.step_status as inner_status,
      w_inner.input_qty as inner_input_qty,
      w_inner.output_qty as inner_output_qty,
      w_inner.end_time as inner_completion_time,
      
      -- 외포장 정보  
      w_outer.work_no as outer_work_no,
      w_outer.step_name as outer_step_name,
      w_outer.step_status as outer_status,
      w_outer.input_qty as outer_input_qty,
      w_outer.output_qty as outer_output_qty,
      w_outer.start_time as outer_start_time,
      
      -- 라인 정보
      l_inner.line_id as inner_line_id,
      l_outer.line_id as outer_line_id,
      l_inner.line_code,
      COALESCE(m.line_name, CONCAT(l_inner.line_code, ' 라인')) as base_line_name,
      
      -- 워크플로우 연계 상태
      CASE 
        WHEN w_inner.step_status IN ('완료', 'COMPLETED') AND w_outer.step_status IN ('READY', '준비') 
        THEN '외포장_준비'
        WHEN w_inner.step_status IN ('완료', 'COMPLETED') AND w_outer.step_status IN ('WORKING', '진행중')
        THEN '외포장_진행중'
        WHEN w_inner.step_status IN ('완료', 'COMPLETED') AND w_outer.step_status IN ('완료', 'COMPLETED')
        THEN '전체_완료'
        WHEN w_inner.step_status IN ('WORKING', '진행중')
        THEN '내포장_진행중'
        ELSE '내포장_준비'
      END as workflow_status,
      
      -- 연계 가능 여부
      CASE 
        WHEN w_inner.output_qty > 0 AND w_outer.input_qty = 0 
        THEN w_inner.output_qty
        ELSE 0
      END as linkable_qty
      
    FROM tablets.package_line l_inner
    INNER JOIN tablets.package_work w_inner ON l_inner.curr_work_no = w_inner.work_no
    LEFT JOIN tablets.package_line l_outer ON l_inner.line_code = l_outer.line_code AND l_outer.pkg_type = 'OUTER'
    LEFT JOIN tablets.package_work w_outer ON l_outer.curr_work_no = w_outer.work_no
    LEFT JOIN tablets.package_master m ON l_inner.line_code = m.line_code
    
    WHERE 
      l_inner.pkg_type = 'INNER'
      AND l_inner.line_code = ?
      
    ORDER BY w_inner.reg_date DESC
    LIMIT 1
  `,

  // 🔥 NEW: 같은 line_code의 내포장 완료 정보 조회 (외포장에서 사용)
  selectInnerCompletionByLineCode: `
    SELECT 
      w.work_no as inner_work_no,
      w.step_name as inner_step_name,
      w.output_qty as inner_output_qty,
      w.end_time as inner_completion_time,
      w.step_status as inner_status,
      l.line_id as inner_line_id,
      l.line_code,
      COALESCE(m.line_name, CONCAT(l.line_code, ' 내포장')) as inner_line_name,
      
      -- 완료 타입
      CASE 
        WHEN w.output_qty >= w.input_qty THEN 'complete'
        WHEN w.output_qty > 0 THEN 'partial'
        ELSE 'none'
      END as completion_type,
      
      -- 달성률
      CASE 
        WHEN w.input_qty > 0 THEN ROUND((w.output_qty / w.input_qty * 100), 1)
        ELSE 0
      END as completion_rate
      
    FROM tablets.package_line l
    INNER JOIN tablets.package_work w ON l.curr_work_no = w.work_no
    LEFT JOIN tablets.package_master m ON l.line_code = m.line_code
    
    WHERE 
      l.pkg_type = 'INNER'
      AND l.line_code = ?
      AND w.step_status IN ('완료', 'COMPLETED', '부분완료', 'PARTIAL_COMPLETE')
      AND w.output_qty > 0
      
    ORDER BY w.end_time DESC
    LIMIT 1
  `,

  // 🔥 NEW: 외포장 라인에 내포장 완료수량 연계
  linkInnerToOuter: `
    UPDATE tablets.package_work w
    INNER JOIN tablets.package_line l ON w.work_no = l.curr_work_no
    SET 
      w.input_qty = ?,
      w.upd_date = NOW()
    WHERE 
      l.pkg_type = 'OUTER'
      AND l.line_code = ?
      AND w.step_status IN ('READY', '준비')
  `,

  // 🔥 NEW: line_code별 워크플로우 상태 업데이트
  updateWorkflowStatus: `
    INSERT INTO tablets.workflow_linkage (
      line_code, base_line_name, inner_work_no, outer_work_no,
      inner_output_qty, inner_completion_time, linkage_status,
      created_by, reg_date, upd_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      outer_work_no = VALUES(outer_work_no),
      inner_output_qty = VALUES(inner_output_qty),
      inner_completion_time = VALUES(inner_completion_time),
      linkage_status = VALUES(linkage_status),
      upd_date = NOW()
  `,

  // 🔥 NEW: 라인별 워크플로우 연계 작업 조회 (라인 선택 페이지용)
  selectWorkflowLinkedWorks: `
    SELECT 
      -- 기본 작업 정보
      w.work_no,
      w.step_name,
      w.step_status,
      w.input_qty,
      w.output_qty,
      w.employee_name,
      w.work_step,
      
      -- 라인 정보
      l.line_id,
      l.pkg_type,
      l.line_code,
      l.target_qty,
      COALESCE(m.line_name, CONCAT(l.line_code, ' ', 
        CASE l.pkg_type WHEN 'INNER' THEN '내포장' ELSE '외포장' END
      )) as line_name,
      
      -- 제품명
      COALESCE(p.product_name, w.step_name, '제품명없음') as product_name,
      
      -- 워크플로우 연계 정보
      linked.inner_work_no,
      linked.inner_output_qty,
      linked.inner_completion_time,
      linked.linkage_status,
      
      -- 연계 가능 여부
      CASE 
        WHEN l.pkg_type = 'OUTER' AND linked.inner_output_qty > 0 AND w.input_qty = 0
        THEN 1
        ELSE 0
      END as can_link_workflow,
      
      -- 권장 투입수량 (외포장용)
      CASE 
        WHEN l.pkg_type = 'OUTER' AND linked.inner_output_qty > 0
        THEN linked.inner_output_qty
        ELSE w.input_qty
      END as recommended_input_qty,
      
      -- 워크플로우 단계
      CASE 
        WHEN l.pkg_type = 'INNER' THEN 'INNER'
        WHEN l.pkg_type = 'OUTER' AND linked.inner_work_no IS NOT NULL THEN 'OUTER'
        ELSE 'STANDALONE'
      END as workflow_step
      
    FROM tablets.package_work w
    INNER JOIN tablets.package_line l ON w.work_no = l.curr_work_no
    LEFT JOIN tablets.package_master m ON l.line_code = m.line_code
    LEFT JOIN tablets.product p ON w.product_code = p.product_code
    LEFT JOIN (
      -- 워크플로우 연계 정보 서브쿼리
      SELECT 
        l_outer.line_code,
        w_inner.work_no as inner_work_no,
        w_inner.output_qty as inner_output_qty,
        w_inner.end_time as inner_completion_time,
        'linked' as linkage_status
      FROM tablets.package_line l_inner
      INNER JOIN tablets.package_work w_inner ON l_inner.curr_work_no = w_inner.work_no
      INNER JOIN tablets.package_line l_outer ON l_inner.line_code = l_outer.line_code
      WHERE 
        l_inner.pkg_type = 'INNER'
        AND l_outer.pkg_type = 'OUTER'
        AND w_inner.step_status IN ('완료', 'COMPLETED', '부분완료', 'PARTIAL_COMPLETE')
        AND w_inner.output_qty > 0
    ) linked ON l.line_code = linked.line_code AND l.pkg_type = 'OUTER'
    
    WHERE 
      COALESCE(l.line_status, 'AVAILABLE') = 'AVAILABLE'
      AND COALESCE(w.step_status, 'READY') IN ('READY', 'WORKING', 'PAUSED', '준비', '진행중', '일시정지', 'IN_PROGRESS')
      
    ORDER BY 
      l.line_code ASC,
      CASE l.pkg_type WHEN 'INNER' THEN 1 ELSE 2 END,
      w.reg_date DESC
  `,

  // 🔥 기존 쿼리들 (수정됨)
  selectWorkList: `
    SELECT 
      w.work_no,
      w.order_detail_id,
      w.line_id,
      w.work_line,
      w.work_step,
      w.step_name,
      w.step_status,
      w.input_qty,
      w.output_qty,
      w.eq_code,
      w.start_time,
      w.end_time,
      w.employee_id,
      w.employee_name,
      w.product_code,
      w.reg_date,
      w.upd_date,
      
      -- 라인 정보
      l.pkg_type,
      l.target_qty,
      l.current_speed,
      l.line_code,
      l.line_status,
      
      -- 라인명
      COALESCE(m.line_name, CONCAT(l.line_code, ' ', 
        CASE l.pkg_type WHEN 'INNER' THEN '내포장' ELSE '외포장' END
      )) as line_name,
      
      -- 제품 정보
      COALESCE(p.product_name, w.step_name, '제품정보없음') as product_name,
      
      -- 포장타입
      CASE 
        WHEN l.pkg_type = 'INNER' THEN 'INNER'
        WHEN l.pkg_type = 'OUTER' THEN 'OUTER'
        ELSE 'INNER'
      END as package_type,
      
      -- 라인 타입
      CASE 
        WHEN l.pkg_type = 'INNER' THEN '내포장'
        WHEN l.pkg_type = 'OUTER' THEN '외포장'
        ELSE '내포장'
      END as line_type,
      
      -- 주문 정보
      COALESCE(od.order_qty, l.target_qty, w.input_qty, 0) as order_qty,
      
      -- 🔥 워크플로우 연계 정보 추가
      linked_inner.inner_work_no,
      linked_inner.inner_output_qty,
      linked_inner.inner_completion_time,
      CASE 
        WHEN l.pkg_type = 'OUTER' AND linked_inner.inner_output_qty > 0 
        THEN linked_inner.inner_output_qty
        ELSE NULL
      END as workflow_input_qty,
      
      -- 작업자 정보
      COALESCE(e.employee_name, w.employee_name, '작업자') as emp_name
      
    FROM tablets.package_work w
    LEFT JOIN tablets.package_line l ON w.work_no = l.curr_work_no
    LEFT JOIN tablets.package_master m ON l.line_code = m.line_code
    LEFT JOIN tablets.product p ON w.product_code = p.product_code
    LEFT JOIN tablets.order_detail od ON w.order_detail_id = od.order_detail_id
    LEFT JOIN tablets.employees e ON w.employee_id = e.employee_id
    LEFT JOIN (
      -- 🔥 같은 line_code의 내포장 완료 정보
      SELECT 
        l_outer.line_code,
        w_inner.work_no as inner_work_no,
        w_inner.output_qty as inner_output_qty,
        w_inner.end_time as inner_completion_time
      FROM tablets.package_line l_inner
      INNER JOIN tablets.package_work w_inner ON l_inner.curr_work_no = w_inner.work_no
      INNER JOIN tablets.package_line l_outer ON l_inner.line_code = l_outer.line_code
      WHERE 
        l_inner.pkg_type = 'INNER'
        AND l_outer.pkg_type = 'OUTER'
        AND w_inner.step_status IN ('완료', 'COMPLETED', '부분완료', 'PARTIAL_COMPLETE')
        AND w_inner.output_qty > 0
    ) linked_inner ON l.line_code = linked_inner.line_code AND l.pkg_type = 'OUTER'
    
    ORDER BY w.reg_date DESC
  `,

  // 🔥 기존 쿼리들 (나머지는 동일)
  checkWorkExists: `
    SELECT COUNT(*) as count 
    FROM tablets.package_work 
    WHERE work_no = ?
  `,

  selectWorkOptions: `
    SELECT 
      w.work_no,
      w.step_name,
      w.step_status,
      w.input_qty,
      w.output_qty,
      w.employee_name,
      w.work_step,
      
      -- 라인 정보
      l.line_id,
      l.pkg_type,
      l.curr_work_no,
      l.target_qty,
      l.current_speed,
      l.line_code,
      l.line_status,
      
      -- 라인명
      COALESCE(m.line_name, CONCAT(l.line_code, ' ', 
        CASE l.pkg_type WHEN 'INNER' THEN '내포장' ELSE '외포장' END
      )) as line_name,
      
      -- 제품명
      COALESCE(p.product_name, 
        CASE 
          WHEN w.step_name LIKE '%타이레놀%' THEN '타이레놀정500mg'
          WHEN w.step_name LIKE '%게보린%' THEN '게보린정'
          WHEN w.step_name LIKE '%부루펜%' THEN '부루펜시럽'
          WHEN w.step_name LIKE '%베아르%' THEN '베아르정'
          ELSE COALESCE(w.step_name, '제품명없음')
        END
      ) as product_name,
      
      -- 포장타입
      l.pkg_type as package_type,
      
      -- 라인 타입
      CASE 
        WHEN l.pkg_type = 'INNER' THEN '내포장'
        WHEN l.pkg_type = 'OUTER' THEN '외포장'
        ELSE '내포장'
      END as line_type,
      
      -- 주문 정보
      COALESCE(od.order_qty, l.target_qty, w.input_qty, 0) as order_qty,
      
      -- 작업자 정보
      COALESCE(e.employee_name, w.employee_name, '작업자') as emp_name,
      
      -- 🔥 수정된 진행률 계산 (지시수량 기준)
      COALESCE(
        CASE 
          WHEN COALESCE(od.order_qty, l.target_qty, w.input_qty, 0) > 0 THEN
            ROUND((w.output_qty / COALESCE(od.order_qty, l.target_qty, w.input_qty, 1) * 100), 1)
          ELSE 0
        END, 
        0
      ) AS progress_rate,
      
      -- 🔥 워크플로우 연계 정보
      linked_inner.inner_work_no,
      linked_inner.inner_output_qty,
      CASE 
        WHEN l.pkg_type = 'OUTER' AND linked_inner.inner_output_qty > 0 
        THEN linked_inner.inner_output_qty
        ELSE NULL
      END as workflow_input_qty
      
    FROM tablets.package_work w
    INNER JOIN tablets.package_line l ON w.work_no = l.curr_work_no
    LEFT JOIN tablets.package_master m ON l.line_code = m.line_code
    LEFT JOIN tablets.product p ON w.product_code = p.product_code
    LEFT JOIN tablets.order_detail od ON w.order_detail_id = od.order_detail_id
    LEFT JOIN tablets.employees e ON w.employee_id = e.employee_id
    LEFT JOIN (
      -- 🔥 워크플로우 연계 서브쿼리
      SELECT 
        l_outer.line_code,
        w_inner.work_no as inner_work_no,
        w_inner.output_qty as inner_output_qty
      FROM tablets.package_line l_inner
      INNER JOIN tablets.package_work w_inner ON l_inner.curr_work_no = w_inner.work_no
      INNER JOIN tablets.package_line l_outer ON l_inner.line_code = l_outer.line_code
      WHERE 
        l_inner.pkg_type = 'INNER'
        AND l_outer.pkg_type = 'OUTER'
        AND w_inner.step_status IN ('완료', 'COMPLETED', '부분완료', 'PARTIAL_COMPLETE')
        AND w_inner.output_qty > 0
    ) linked_inner ON l.line_code = linked_inner.line_code AND l.pkg_type = 'OUTER'
    
    WHERE COALESCE(l.line_status, 'AVAILABLE') = 'AVAILABLE'
    ORDER BY l.line_id ASC, w.reg_date DESC
  `,

  // 🔥 나머지 기존 쿼리들...
  selectWorkOptionsByLine: `
    SELECT 
      w.work_no,
      COALESCE(w.step_name, w.work_no) as step_name,
      COALESCE(w.step_status, 'READY') as step_status,
      COALESCE(w.input_qty, 0) as input_qty,
      COALESCE(w.output_qty, 0) as output_qty,
      COALESCE(w.employee_name, '작업자') as employee_name,
      COALESCE(w.work_step, '포장') as work_step,
      
      l.line_id,
      l.pkg_type,
      l.curr_work_no,
      l.target_qty,
      l.current_speed,
      l.line_code,
      
      COALESCE(m.line_name, CONCAT(l.line_code, ' ', 
        CASE l.pkg_type WHEN 'INNER' THEN '내포장' ELSE '외포장' END
      )) as line_name,
      
      COALESCE(p.product_name,
        CASE 
          WHEN w.step_name LIKE '%타이레놀%' THEN '타이레놀정500mg'
          WHEN w.step_name LIKE '%게보린%' THEN '게보린정'
          WHEN w.step_name LIKE '%부루펜%' THEN '부루펜시럽'
          WHEN w.step_name LIKE '%베아르%' THEN '베아르정'
          ELSE COALESCE(w.step_name, '제품명없음')
        END
      ) as product_name,
      
      CASE 
        WHEN l.pkg_type = 'INNER' OR l.pkg_type LIKE '%내포장%' THEN 'INNER'
        WHEN l.pkg_type = 'OUTER' OR l.pkg_type LIKE '%외포장%' THEN 'OUTER'
        ELSE 'INNER'
      END as package_type,
      
      CASE 
        WHEN l.pkg_type = 'INNER' OR l.pkg_type LIKE '%내포장%' THEN '내포장'
        WHEN l.pkg_type = 'OUTER' OR l.pkg_type LIKE '%외포장%' THEN '외포장'
        ELSE '내포장'
      END as line_type,
      
      COALESCE(od.order_qty, l.target_qty, w.input_qty, 0) as order_qty,
      COALESCE(e.employee_name, w.employee_name, '작업자') as emp_name,
      
      COALESCE(
        IF(w.input_qty > 0, ROUND((w.output_qty / w.input_qty * 100), 1), 0), 
        0
      ) AS progress_rate
      
    FROM tablets.package_work w
    INNER JOIN tablets.package_line l ON w.work_no = l.curr_work_no
    LEFT JOIN tablets.package_master m ON l.line_code = m.line_code
    LEFT JOIN tablets.product p ON w.product_code = p.product_code
    LEFT JOIN tablets.order_detail od ON w.order_detail_id = od.order_detail_id
    LEFT JOIN tablets.employees e ON w.employee_id = e.employee_id
    
    WHERE 
      l.line_id = ?
      AND COALESCE(l.line_status, 'AVAILABLE') = 'AVAILABLE'
      AND COALESCE(w.step_status, 'READY') IN ('READY', 'WORKING', 'PAUSED', '준비', '진행', '일시정지', 'IN_PROGRESS', 'AVAILABLE')
      
    ORDER BY 
      CASE COALESCE(w.step_status, 'READY')
        WHEN 'WORKING' THEN 1 
        WHEN 'IN_PROGRESS' THEN 1
        WHEN 'PAUSED' THEN 2 
        WHEN 'READY' THEN 3 
        WHEN 'AVAILABLE' THEN 3
        ELSE 4 
      END, 
      COALESCE(w.reg_date, NOW()) DESC
  `,

  selectWorksByPackageType: `
    SELECT 
      w.work_no,
      COALESCE(w.order_detail_id, 0) as order_detail_id,
      l.line_id,
      COALESCE(m.line_name, CONCAT(l.line_code, ' ', 
        CASE l.pkg_type WHEN 'INNER' THEN '내포장' ELSE '외포장' END
      )) as line_name,
      COALESCE(w.step_name, w.work_no) as step_name,
      COALESCE(w.step_status, 'READY') as step_status,
      COALESCE(w.input_qty, 0) as input_qty,
      COALESCE(w.output_qty, 0) as output_qty,
      COALESCE(w.employee_name, '작업자') as employee_name,
      COALESCE(w.product_code, '') as product_code,
      COALESCE(w.work_step, '포장') as work_step,
      COALESCE(DATE_FORMAT(w.reg_date, '%Y-%m-%d %H:%i'), '') as reg_date,
      
      l.pkg_type,
      l.curr_work_no,
      l.target_qty,
      l.line_code,
      
      COALESCE(p.product_name,
        CASE 
          WHEN w.step_name LIKE '%타이레놀%' THEN '타이레놀정500mg'
          WHEN w.step_name LIKE '%게보린%' THEN '게보린정'
          WHEN w.step_name LIKE '%부루펜%' THEN '부루펜시럽'
          WHEN w.step_name LIKE '%베아르%' THEN '베아르정'
          ELSE COALESCE(w.step_name, '제품명없음')
        END
      ) as product_name,
      
      CASE 
        WHEN l.pkg_type = 'INNER' OR l.pkg_type LIKE '%내포장%' THEN 'INNER'
        WHEN l.pkg_type = 'OUTER' OR l.pkg_type LIKE '%외포장%' THEN 'OUTER'
        ELSE 'INNER'
      END as package_type,
      
      CASE 
        WHEN l.pkg_type = 'INNER' OR l.pkg_type LIKE '%내포장%' THEN '내포장'
        WHEN l.pkg_type = 'OUTER' OR l.pkg_type LIKE '%외포장%' THEN '외포장'
        ELSE '내포장'
      END as line_type,
      
      COALESCE(od.order_qty, l.target_qty, w.input_qty, 0) as order_qty,
      
      -- 🔥 워크플로우 연계 정보
      linked_inner.inner_work_no,
      linked_inner.inner_output_qty,
      CASE 
        WHEN l.pkg_type = 'OUTER' AND linked_inner.inner_output_qty > 0 
        THEN linked_inner.inner_output_qty
        ELSE NULL
      END as workflow_input_qty
      
    FROM tablets.package_work w
    INNER JOIN tablets.package_line l ON w.work_no = l.curr_work_no
    LEFT JOIN tablets.package_master m ON l.line_code = m.line_code
    LEFT JOIN tablets.product p ON w.product_code = p.product_code
    LEFT JOIN tablets.order_detail od ON w.order_detail_id = od.order_detail_id
    LEFT JOIN tablets.employees e ON w.employee_id = e.employee_id
    LEFT JOIN (
      SELECT 
        l_outer.line_code,
        w_inner.work_no as inner_work_no,
        w_inner.output_qty as inner_output_qty
      FROM tablets.package_line l_inner
      INNER JOIN tablets.package_work w_inner ON l_inner.curr_work_no = w_inner.work_no
      INNER JOIN tablets.package_line l_outer ON l_inner.line_code = l_outer.line_code
      WHERE 
        l_inner.pkg_type = 'INNER'
        AND l_outer.pkg_type = 'OUTER'
        AND w_inner.step_status IN ('완료', 'COMPLETED', '부분완료', 'PARTIAL_COMPLETE')
        AND w_inner.output_qty > 0
    ) linked_inner ON l.line_code = linked_inner.line_code AND l.pkg_type = 'OUTER'
    
    WHERE 
      COALESCE(l.line_status, 'AVAILABLE') = 'AVAILABLE'
      AND COALESCE(w.step_status, 'READY') IN ('READY', 'WORKING', 'PAUSED', '준비', '진행', '일시정지', 'IN_PROGRESS', 'AVAILABLE')
      AND (
        CASE 
          WHEN ? = 'INNER' THEN (l.pkg_type = 'INNER' OR l.pkg_type LIKE '%내포장%')
          WHEN ? = 'OUTER' THEN (l.pkg_type = 'OUTER' OR l.pkg_type LIKE '%외포장%')
          ELSE 1=1
        END
      )
      
    ORDER BY 
      l.line_id ASC,
      COALESCE(w.reg_date, NOW()) DESC
  `,

  selectWorkDetail: `
    SELECT 
      w.*,
      l.pkg_type,
      l.target_qty as line_target_qty,
      l.current_speed,
      l.line_code,
      COALESCE(m.line_name, CONCAT(l.line_code, ' ', 
        CASE l.pkg_type WHEN 'INNER' THEN '내포장' ELSE '외포장' END
      )) as line_name,
      COALESCE(p.product_name, w.step_name, '제품명없음') as product_name,
      COALESCE(e.employee_name, w.employee_name, '작업자') as emp_name,
      COALESCE(od.order_qty, l.target_qty, w.input_qty, 0) as order_qty,
      
      -- 🔥 워크플로우 연계 정보
      linked_inner.inner_work_no,
      linked_inner.inner_output_qty,
      linked_inner.inner_completion_time,
      CASE 
        WHEN l.pkg_type = 'OUTER' AND linked_inner.inner_output_qty > 0 
        THEN linked_inner.inner_output_qty
        ELSE NULL
      END as workflow_input_qty
      
    FROM tablets.package_work w
    LEFT JOIN tablets.package_line l ON w.work_no = l.curr_work_no
    LEFT JOIN tablets.package_master m ON l.line_code = m.line_code
    LEFT JOIN tablets.product p ON w.product_code = p.product_code
    LEFT JOIN tablets.order_detail od ON w.order_detail_id = od.order_detail_id
    LEFT JOIN tablets.employees e ON w.employee_id = e.employee_id
    LEFT JOIN (
      SELECT 
        l_outer.line_code,
        w_inner.work_no as inner_work_no,
        w_inner.output_qty as inner_output_qty,
        w_inner.end_time as inner_completion_time
      FROM tablets.package_line l_inner
      INNER JOIN tablets.package_work w_inner ON l_inner.curr_work_no = w_inner.work_no
      INNER JOIN tablets.package_line l_outer ON l_inner.line_code = l_outer.line_code
      WHERE 
        l_inner.pkg_type = 'INNER'
        AND l_outer.pkg_type = 'OUTER'
        AND w_inner.step_status IN ('완료', 'COMPLETED', '부분완료', 'PARTIAL_COMPLETE')
        AND w_inner.output_qty > 0
    ) linked_inner ON l.line_code = linked_inner.line_code AND l.pkg_type = 'OUTER'
    
    WHERE w.work_no = ?
  `,

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

  // updatePartialWork는 그대로 유지 (이미 있음)
  updatePartialWork: `
    UPDATE tablets.package_work 
    SET 
      step_status = ?,
      output_qty = ?,
      defect_qty = ?,
      end_time = ?,
      upd_date = NOW()
    WHERE work_no = ?
  `,
  completeWork: `
    UPDATE tablets.package_work 
    SET 
      step_status = '완료',
      output_qty = ?,
      end_time = NOW(),
      upd_date = NOW()
    WHERE work_no = ?
  `,

  deleteWork: `
    DELETE FROM tablets.package_work 
    WHERE work_no = ?
  `,

  // 디버깅용 쿼리들
  countPackageWork: `
    SELECT COUNT(*) as total_count 
    FROM tablets.package_work
  `,
  
  countPackageLine: `
    SELECT COUNT(*) as total_count 
    FROM tablets.package_line
  `,
  
  selectRecentWorks: `
    SELECT work_no, step_name, step_status, input_qty, 
           DATE_FORMAT(reg_date, '%Y-%m-%d %H:%i:%s') as reg_date
    FROM tablets.package_work 
    ORDER BY reg_date DESC 
    LIMIT 10
  `,
  
  selectAllLines: `
    SELECT line_id, pkg_type, line_status, curr_work_no, target_qty, line_code
    FROM tablets.package_line
    ORDER BY line_code, line_id
  `,
  
  checkJoinStatus: `
    SELECT 
      w.work_no,
      w.step_name,
      l.curr_work_no,
      l.line_id,
      l.pkg_type,
      l.line_code,
      CASE 
        WHEN l.curr_work_no IS NOT NULL THEN '연결됨'
        ELSE '연결안됨'
      END as join_status
    FROM tablets.package_work w
    LEFT JOIN tablets.package_line l ON w.work_no = l.curr_work_no
    ORDER BY l.line_code, w.work_no
    LIMIT 10
  `,

  // 🔥 NEW: 워크플로우 연계 디버깅 쿼리
  checkWorkflowLinkage: `
    SELECT 
      l.line_code,
      l.pkg_type,
      l.line_id,
      w.work_no,
      w.step_name,
      w.step_status,
      w.output_qty,
      COALESCE(m.line_name, CONCAT(l.line_code, ' ', 
        CASE l.pkg_type WHEN 'INNER' THEN '내포장' ELSE '외포장' END
      )) as line_name
    FROM tablets.package_line l
    LEFT JOIN tablets.package_work w ON l.curr_work_no = w.work_no
    LEFT JOIN tablets.package_master m ON l.line_code = m.line_code
    ORDER BY l.line_code, l.pkg_type
  `,
  selectPartialWorkDetail: `
  SELECT 
    w.*,
    l.pkg_type,
    l.target_qty as line_target_qty,
    l.line_code,
    COALESCE(m.line_name, CONCAT(l.line_code, ' ', 
      CASE l.pkg_type WHEN 'INNER' THEN '내포장' ELSE '외포장' END
    )) as line_name,
    COALESCE(p.product_name, w.step_name, '제품명없음') as product_name,
    COALESCE(od.order_qty, l.target_qty, w.input_qty, 0) as order_qty,
    
    -- 🔥 부분완료 작업 전용 계산 필드들
    CASE 
      WHEN w.step_status IN ('부분완료', 'PARTIAL_COMPLETE') THEN
        COALESCE(od.order_qty, l.target_qty, w.input_qty, 0) - COALESCE(w.output_qty, 0)
      ELSE 0
    END as remaining_quantity,
    
    CASE 
      WHEN w.step_status IN ('부분완료', 'PARTIAL_COMPLETE') AND COALESCE(od.order_qty, l.target_qty, w.input_qty, 0) > 0 THEN
        ROUND((COALESCE(w.output_qty, 0) / COALESCE(od.order_qty, l.target_qty, w.input_qty, 1)) * 100, 1)
      ELSE 0
    END as completion_rate,
    
    CASE 
      WHEN w.step_status IN ('부분완료', 'PARTIAL_COMPLETE') THEN 1
      ELSE 0
    END as is_partial_work
    
  FROM tablets.package_work w
  LEFT JOIN tablets.package_line l ON w.work_no = l.curr_work_no
  LEFT JOIN tablets.package_master m ON l.line_code = m.line_code
  LEFT JOIN tablets.product p ON w.product_code = p.product_code
  LEFT JOIN tablets.order_detail od ON w.order_detail_id = od.order_detail_id
  WHERE w.work_no = ?
`,

// 부분완료 작업 업데이트 (상태 + 수량)
updatePartialWork: `
  UPDATE tablets.package_work 
  SET 
    step_status = ?,
    output_qty = ?,
    defect_qty = ?,
    end_time = ?,
    upd_date = NOW()
  WHERE work_no = ?
`,

// 부분완료 작업 목록 조회 (재시작 가능한 작업들)
selectResumableWorks: `
  SELECT 
    w.work_no,
    w.step_name,
    w.step_status,
    w.output_qty,
    COALESCE(od.order_qty, l.target_qty, w.input_qty, 0) as target_qty,
    COALESCE(od.order_qty, l.target_qty, w.input_qty, 0) - COALESCE(w.output_qty, 0) as remaining_qty,
    ROUND((COALESCE(w.output_qty, 0) / COALESCE(od.order_qty, l.target_qty, w.input_qty, 1)) * 100, 1) as completion_rate,
    l.pkg_type,
    l.line_code,
    COALESCE(m.line_name, CONCAT(l.line_code, ' ', 
      CASE l.pkg_type WHEN 'INNER' THEN '내포장' ELSE '외포장' END
    )) as line_name
    
  FROM tablets.package_work w
  INNER JOIN tablets.package_line l ON w.work_no = l.curr_work_no
  LEFT JOIN tablets.package_master m ON l.line_code = m.line_code
  LEFT JOIN tablets.order_detail od ON w.order_detail_id = od.order_detail_id
  
  WHERE 
    w.step_status IN ('부분완료', 'PARTIAL_COMPLETE', '일시정지', 'PAUSED')
    AND COALESCE(l.line_status, 'AVAILABLE') = 'AVAILABLE'
    AND COALESCE(od.order_qty, l.target_qty, w.input_qty, 0) > COALESCE(w.output_qty, 0)
    
  ORDER BY w.upd_date DESC
`
};