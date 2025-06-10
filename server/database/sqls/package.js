// server/database/sqls/package.js
module.exports = {
  // 작업 등록 (defect_qty 제거)
  insertWork: `
    INSERT INTO package_work (
      work_no, line_id, work_line, work_step, step_name, step_status,
      input_qty, output_qty, eq_code, start_time, end_time,
      employee_no, employee_name, reg_date, upd_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL, ?, ?, NOW(), NOW())
  `,

  // 작업 목록 조회 (기본 - 성능 최적화) - BigInt 오류 수정
  selectWorkList: `
    SELECT 
      work_no, 
      work_line,
      step_name, 
      step_status,
      input_qty, 
      output_qty, 
      (input_qty - output_qty) as defect_qty,
      ROUND((CASE WHEN input_qty > 0 THEN (output_qty / input_qty * 100) ELSE 0 END), 1) AS progress_rate,
      DATE_FORMAT(start_time, '%Y-%m-%d') AS work_date,
      employee_name
    FROM package_work 
    ORDER BY start_time DESC
    LIMIT 10 OFFSET ?
  `,

  // 작업 목록 조회 (페이징 + 필터링 + 검색) - BigInt 오류 수정
  selectWorkListWithFilter: `
    SELECT 
      work_no, 
      work_line,
      step_name, 
      step_status,
      input_qty, 
      output_qty, 
      (input_qty - output_qty) as defect_qty,
      ROUND((CASE WHEN input_qty > 0 THEN (output_qty / input_qty * 100) ELSE 0 END), 1) AS progress_rate,
      DATE_FORMAT(start_time, '%Y-%m-%d') AS work_date,
      employee_name,
      eq_code,
      CAST(TIMESTAMPDIFF(MINUTE, start_time, COALESCE(end_time, NOW())) AS SIGNED) AS work_duration
    FROM package_work 
    WHERE 1=1
      AND (? = '' OR work_no LIKE CONCAT('%', ?, '%') 
           OR work_line LIKE CONCAT('%', ?, '%')
           OR step_name LIKE CONCAT('%', ?, '%') 
           OR employee_name LIKE CONCAT('%', ?, '%'))
      AND (? = 'all' OR step_status LIKE CONCAT('%', ?, '%'))
    ORDER BY 
      CASE WHEN ? = 'date_asc' THEN start_time END ASC,
      CASE WHEN ? = 'date_desc' THEN start_time END DESC,
      CASE WHEN ? = 'progress' THEN (output_qty / NULLIF(input_qty, 0)) END DESC,
      start_time DESC
    LIMIT ? OFFSET ?
  `,

  // 작업 목록 총 개수 (페이징용) - BigInt 오류 수정
  selectWorkListCount: `
    SELECT CAST(COUNT(*) AS SIGNED) as total_count
    FROM package_work 
    WHERE 1=1
      AND (? = '' OR work_no LIKE CONCAT('%', ?, '%') 
           OR work_line LIKE CONCAT('%', ?, '%')
           OR step_name LIKE CONCAT('%', ?, '%') 
           OR employee_name LIKE CONCAT('%', ?, '%'))
      AND (? = 'all' OR step_status LIKE CONCAT('%', ?, '%'))
  `,

  // 작업 상세 - BigInt 오류 수정
  selectWorkDetail: `
  SELECT 
    *, (input_qty - output_qty) as defect_qty,
    ROUND((CASE WHEN input_qty > 0 THEN (output_qty / input_qty * 100) ELSE 0 END), 1) AS progress_rate,
    CAST(TIMESTAMPDIFF(MINUTE, start_time, COALESCE(end_time, NOW())) AS SIGNED) AS work_duration,
    ROUND((CASE WHEN output_qty > 0 THEN ((input_qty - output_qty) / output_qty * 100) ELSE 0 END), 2) AS defect_rate
  FROM package_work 
  WHERE work_no = ?
`,


  // 작업 완료 처리 (defect_qty 제거)
  completeWork: `
    UPDATE package_work
    SET step_status = ?, output_qty = ?, end_time = NOW(), upd_date = NOW()
    WHERE work_no = ?
  `,

  // 작업 진행 상황 업데이트 (defect_qty 제거)
  updateWorkProgress: `
    UPDATE package_work
    SET output_qty = ?, step_status = ?, upd_date = NOW()
    WHERE work_no = ?
  `,

  // 진행 중인 작업 목록 - BigInt 오류 수정
  selectActiveWorks: `
    SELECT 
      work_no, 
      work_line,
      step_name, 
      step_status,
      input_qty, 
      output_qty, 
      (input_qty - output_qty) as defect_qty,
      ROUND((CASE WHEN input_qty > 0 THEN (output_qty / input_qty * 100) ELSE 0 END), 1) AS progress_rate,
      employee_name,
      eq_code,
      CAST(TIMESTAMPDIFF(MINUTE, start_time, NOW()) AS SIGNED) AS work_duration,
      TIME_FORMAT(SEC_TO_TIME(TIMESTAMPDIFF(SECOND, start_time, NOW())), '%H:%i') AS formatted_duration
    FROM package_work 
    WHERE step_status LIKE '%진행%' OR step_status LIKE '%지연%'
    ORDER BY start_time ASC
  `,

  // 대시보드용 현황 조회 - BigInt 오류 수정
  selectDashboardStats: `
    SELECT 
      CAST(COUNT(*) AS SIGNED) as total_works,
      CAST(SUM(CASE WHEN step_status LIKE '%완료%' THEN 1 ELSE 0 END) AS SIGNED) as completed_works,
      CAST(SUM(CASE WHEN step_status LIKE '%진행%' THEN 1 ELSE 0 END) AS SIGNED) as in_progress_works,
      CAST(SUM(CASE WHEN step_status LIKE '%지연%' THEN 1 ELSE 0 END) AS SIGNED) as delayed_works,
      CAST(SUM(input_qty) AS SIGNED) as total_input_qty,
      CAST(SUM(output_qty) AS SIGNED) as total_output_qty,
      CAST(SUM(input_qty - output_qty) AS SIGNED) as total_defect_qty,
      ROUND(AVG(CASE WHEN input_qty > 0 THEN (output_qty / input_qty * 100) ELSE 0 END), 1) as avg_progress_rate
    FROM package_work 
    WHERE DATE(start_time) = CURDATE()
  `,

  // 작업자별 현황 - BigInt 오류 수정
  selectWorkerStats: `
    SELECT 
      employee_name,
      work_line,
      CAST(COUNT(*) AS SIGNED) as total_works,
      CAST(SUM(CASE WHEN step_status LIKE '%완료%' THEN 1 ELSE 0 END) AS SIGNED) as completed_works,
      CAST(SUM(CASE WHEN step_status LIKE '%진행%' THEN 1 ELSE 0 END) AS SIGNED) as in_progress_works,
      CAST(SUM(CASE WHEN step_status LIKE '%지연%' THEN 1 ELSE 0 END) AS SIGNED) as delayed_works,
      ROUND((SUM(CASE WHEN step_status LIKE '%완료%' THEN 1 ELSE 0 END) / COUNT(*) * 100), 1) as completion_rate,
      CAST(ROUND(AVG(CASE WHEN end_time IS NOT NULL 
                THEN TIMESTAMPDIFF(MINUTE, start_time, end_time) 
                ELSE TIMESTAMPDIFF(MINUTE, start_time, NOW()) END), 0) AS SIGNED) as avg_work_time
    FROM package_work 
    WHERE DATE(start_time) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY employee_name, work_line
    ORDER BY completion_rate DESC, total_works DESC
  `,

  // 제품별 현황 (실제로는 라인별 현황) - BigInt 오류 수정
  selectProductStats: `
    SELECT 
      work_line as product_name,
      step_name,
      CAST(COUNT(*) AS SIGNED) as work_count,
      CAST(SUM(input_qty) AS SIGNED) as total_input_qty,
      CAST(SUM(output_qty) AS SIGNED) as total_output_qty,
      CAST(SUM(input_qty - output_qty) AS SIGNED) as total_defect_qty,
      ROUND((SUM(output_qty) / NULLIF(SUM(input_qty), 0) * 100), 1) as achievement_rate
    FROM package_work 
    WHERE DATE(start_time) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY work_line, step_name
    ORDER BY total_input_qty DESC
  `,

  // 시간대별 현황 - BigInt 오류 수정
  selectHourlyStats: `
    SELECT 
      CAST(HOUR(start_time) AS SIGNED) as work_hour,
      CAST(COUNT(*) AS SIGNED) as work_count,
      CAST(SUM(output_qty) AS SIGNED) as total_output_qty,
      CAST(SUM(CASE WHEN step_status LIKE '%완료%' THEN 1 ELSE 0 END) AS SIGNED) as completed_count,
      CAST(SUM(input_qty - output_qty) AS SIGNED) as total_defect_qty,
      ROUND(AVG(CASE WHEN input_qty > 0 THEN (output_qty / input_qty * 100) ELSE 0 END), 1) as efficiency
    FROM package_work 
    WHERE DATE(start_time) = CURDATE()
    GROUP BY HOUR(start_time)
    ORDER BY work_hour
  `,

  // 불량 유형별 현황 (별도 테이블이 없으므로 제거하거나 단순화) - BigInt 오류 수정
  selectDefectStats: `
    SELECT 
      'package_defect' as defect_type,
      CAST(COUNT(*) AS SIGNED) as occurrence_count,
      CAST(SUM(input_qty - output_qty) AS SIGNED) as total_defect_qty,
      ROUND((SUM(input_qty - output_qty) / (SELECT SUM(input_qty - output_qty) FROM package_work WHERE DATE(start_time) = CURDATE()) * 100), 1) as defect_ratio
    FROM package_work
    WHERE DATE(start_time) = CURDATE() AND (input_qty - output_qty) > 0
    GROUP BY 'package_defect'
    ORDER BY total_defect_qty DESC
  `,

  // 일별 생산 추이 - BigInt 오류 수정
  selectDailyTrend: `
    SELECT 
      DATE(start_time) as work_date,
      CAST(COUNT(*) AS SIGNED) as work_count,
      CAST(SUM(output_qty) AS SIGNED) as total_output_qty,
      ROUND((SUM(output_qty) / NULLIF(SUM(input_qty), 0) * 100), 1) as achievement_rate
    FROM package_work 
    WHERE DATE(start_time) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(start_time)
    ORDER BY work_date
  `
};