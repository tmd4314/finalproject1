// database/sqls/package.js (완전한 버전)
module.exports = {
  // 🔥 작업 등록
  insertWork: `
    INSERT INTO package_work (
      work_no, line_id, work_line, work_step, step_name, step_status,
      input_qty, output_qty, eq_code, start_time, end_time,
      employee_id, employee_name, reg_date, upd_date
    ) VALUES (?, ?, ?, ?, ?, 'READY', ?, 0, ?, NOW(), NULL, ?, ?, NOW(), NOW())
  `,

  // 🔥 작업 상세 조회 (계산 필드 포함)
  selectWorkDetail: `
    SELECT 
      work_no,
      line_id,
      work_line,
      work_step,
      step_name,
      step_status,
      input_qty,
      output_qty,
      (input_qty - output_qty) as defect_qty,
      IF(input_qty > 0, ROUND((output_qty / input_qty * 100), 1), 0) AS progress_rate,
      IF(input_qty > 0, ROUND(((input_qty - output_qty) / input_qty * 100), 2), 0) AS defect_rate,
      eq_code,
      employee_id,
      employee_name,
      start_time,
      end_time,
      TIMESTAMPDIFF(MINUTE, start_time, IFNULL(end_time, NOW())) AS work_duration,
      DATE_FORMAT(reg_date, '%Y-%m-%d %H:%i:%s') as reg_date,
      DATE_FORMAT(upd_date, '%Y-%m-%d %H:%i:%s') as upd_date
    FROM package_work 
    WHERE work_no = ?
  `,

  // 🔥 작업번호 목록 조회 (포장 작업 수행 페이지용)
  selectWorkList: `
    SELECT 
      work_no,
      line_id,
      work_line,
      step_name,
      step_status,
      input_qty,
      output_qty,
      IF(input_qty > 0, ROUND((output_qty / input_qty * 100), 1), 0) AS progress_rate,
      employee_name,
      DATE_FORMAT(reg_date, '%Y-%m-%d %H:%i') as reg_date
    FROM package_work 
    WHERE step_status IN ('READY', 'WORKING', 'PAUSED')
    ORDER BY 
      CASE step_status 
        WHEN 'WORKING' THEN 1 
        WHEN 'PAUSED' THEN 2 
        WHEN 'READY' THEN 3 
        ELSE 4 
      END,
      reg_date DESC
  `,

  // 🔥 진행 중인 작업 목록 (실시간 진행 상황)
  selectActiveWorks: `
    SELECT 
      work_no,
      step_name,
      step_status,
      input_qty,
      output_qty,
      IF(input_qty > 0, ROUND((output_qty / input_qty * 100), 1), 0) AS progress_rate,
      employee_name,
      TIMESTAMPDIFF(MINUTE, start_time, IFNULL(end_time, NOW())) AS work_duration,
      DATE_FORMAT(start_time, '%H:%i') as start_time_formatted
    FROM package_work 
    WHERE step_status = 'WORKING'
    ORDER BY start_time DESC
  `,

  // 🔥 작업번호 선택 옵션 (셀렉트박스용)
  selectWorkOptions: `
    SELECT 
      work_no,
      CONCAT(work_no, ' - ', step_name, ' (', 
            IF(input_qty > 0, ROUND((output_qty / input_qty * 100), 1), 0), 
            '%)') as label,
      step_name,
      step_status,
      input_qty,
      output_qty,
      IF(input_qty > 0, ROUND((output_qty / input_qty * 100), 1), 0) AS progress_rate,
      employee_name
    FROM package_work
  `,

  // 🔥 라인별 작업 조회
  selectWorksByLine: `
    SELECT 
      work_no,
      line_id,
      work_line,
      step_name,
      step_status,
      input_qty,
      output_qty,
      IF(input_qty > 0, ROUND((output_qty / input_qty * 100), 1), 0) AS progress_rate,
      employee_name,
      DATE_FORMAT(reg_date, '%Y-%m-%d %H:%i') as reg_date
    FROM package_work 
    WHERE line_id = ? AND step_status IN ('READY', 'WORKING', 'PAUSED')
    ORDER BY reg_date DESC
  `,

  // 🔥 작업 시작
  startWork: `
    UPDATE package_work
    SET 
      step_status = 'WORKING',
      start_time = NOW(),
      upd_date = NOW()
    WHERE work_no = ? AND step_status = 'READY'
  `,

  // 🔥 작업 진행률 업데이트
  updateWorkProgress: `
    UPDATE package_work
    SET 
      output_qty = ?, 
      step_status = ?, 
      upd_date = NOW()
    WHERE work_no = ?
  `,

  // 🔥 작업 완료
  completeWork: `
    UPDATE package_work
    SET 
      step_status = 'COMPLETED', 
      output_qty = ?, 
      end_time = NOW(), 
      upd_date = NOW()
    WHERE work_no = ?
  `,

  // 🔥 작업 일시정지
  pauseWork: `
    UPDATE package_work
    SET 
      step_status = 'PAUSED',
      upd_date = NOW()
    WHERE work_no = ? AND step_status = 'IN_PROGRESS'
  `,

  // 🔥 작업 재시작
  resumeWork: `
    UPDATE package_work
    SET 
      step_status = 'IN_PROGRESS',
      upd_date = NOW()
    WHERE work_no = ? AND step_status = 'PAUSED'
  `,

  // 🔥 작업 존재 확인
  checkWorkExists: `
    SELECT COUNT(*) as count 
    FROM package_work 
    WHERE work_no = ?
  `,

  // 🔥 작업 삭제 (필요시)
  deleteWork: `
    DELETE FROM package_work 
    WHERE work_no = ? AND step_status IN ('READY', 'PAUSED')
  `,

  // 🔥 완료된 작업 목록
  selectCompletedWorks: `
    SELECT 
      work_no,
      step_name,
      input_qty,
      output_qty,
      (input_qty - output_qty) as defect_qty,
      IF(input_qty > 0, ROUND((output_qty / input_qty * 100), 1), 0) AS progress_rate,
      IF(input_qty > 0, ROUND(((input_qty - output_qty) / input_qty * 100), 2), 0) AS defect_rate,
      employee_name,
      TIMESTAMPDIFF(MINUTE, start_time, end_time) AS total_duration,
      DATE_FORMAT(end_time, '%Y-%m-%d %H:%i') as completed_at
    FROM package_work 
    WHERE step_status = 'COMPLETED'
    ORDER BY end_time DESC
    LIMIT 50
  `,

  // 🔥 오늘의 작업 통계
  selectTodayWorkStats: `
    SELECT 
      COUNT(*) as total_works,
      SUM(CASE WHEN step_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_works,
      SUM(CASE WHEN step_status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as active_works,
      SUM(CASE WHEN step_status = 'PAUSED' THEN 1 ELSE 0 END) as paused_works,
      SUM(CASE WHEN step_status = 'READY' THEN 1 ELSE 0 END) as ready_works,
      SUM(input_qty) as total_input,
      SUM(output_qty) as total_output,
      SUM(input_qty - output_qty) as total_defects
    FROM package_work 
    WHERE DATE(reg_date) = CURDATE()
  `
};