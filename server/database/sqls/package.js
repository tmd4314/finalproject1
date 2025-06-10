module.exports = {
  // 작업 등록
  insertWork: `
    INSERT INTO package_work (
      work_no, line_id, work_line, work_step, step_name, step_status,
      input_qty, output_qty, eq_code, start_time, end_time,
      employee_no, employee_name, reg_date, upd_date
    ) VALUES (?, ?, ?, ?, ?, 'READY', ?, 0, ?, NOW(), NULL, ?, ?, NOW(), NOW())
  `,

  // 작업 상세 조회 (계산 필드 포함)
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
      employee_no,
      employee_name,
      start_time,
      end_time,
      TIMESTAMPDIFF(MINUTE, start_time, IFNULL(end_time, NOW())) AS work_duration
    FROM package_work 
    WHERE work_no = ?
  `,

  // 작업 시작
  startWork: `
    UPDATE package_work
    SET 
      step_status = 'IN_PROGRESS',
      start_time = NOW(),
      upd_date = NOW()
    WHERE work_no = ? AND step_status = 'READY'
  `,

  // 작업 진행률 업데이트
  updateWorkProgress: `
    UPDATE package_work
    SET 
      output_qty = ?, 
      step_status = ?, 
      upd_date = NOW()
    WHERE work_no = ?
  `,

  // 작업 완료
  completeWork: `
    UPDATE package_work
    SET 
      step_status = 'COMPLETED', 
      output_qty = ?, 
      end_time = NOW(), 
      upd_date = NOW()
    WHERE work_no = ?
  `,

  // 작업 일시정지
  pauseWork: `
    UPDATE package_work
    SET 
      step_status = 'PAUSED',
      upd_date = NOW()
    WHERE work_no = ? AND step_status = 'IN_PROGRESS'
  `,

  // 작업 재시작
  resumeWork: `
    UPDATE package_work
    SET 
      step_status = 'IN_PROGRESS',
      upd_date = NOW()
    WHERE work_no = ? AND step_status = 'PAUSED'
  `,

  // 작업 존재 확인
  checkWorkExists: `
    SELECT COUNT(*) as count 
    FROM package_work 
    WHERE work_no = ?
  `
};