// sqls/auth.js - 인증 관련 SQL 쿼리들
module.exports = {
  
  // ================================
  // 🔐 로그인 관련 쿼리
  // ================================
  
  // 로그인용 사용자 정보 조회 (부서 정보 포함)
  loginUser: `
    SELECT 
      e.employee_id,
      e.employee_name,
      e.position,
      e.department_code,
      d.department_name,
      e.password,
      e.employment_status,
      e.email,
      e.phone,
      e.hire_date,
      e.gender,
      e.profile_img
    FROM employees e
    LEFT JOIN department d ON e.department_code = d.department_code
    WHERE e.employee_id = ?
  `,
  
  // 사용자 정보 조회 (토큰 검증용)
  getUserById: `
    SELECT 
      e.employee_id,
      e.employee_name,
      e.position,
      e.department_code,
      d.department_name,
      e.employment_status,
      e.email,
      e.phone,
      e.hire_date,
      e.gender,
      e.profile_img
    FROM employees e
    LEFT JOIN department d ON e.department_code = d.department_code
    WHERE e.employee_id = ? 
      AND e.employment_status = '재직중'
  `,

  // ================================
  // 📊 로그인 로그 관련 쿼리
  // ================================
  
  // 로그인 로그 테이블 생성
  createLoginLogTable: `
    CREATE TABLE IF NOT EXISTS login_logs (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      employee_id VARCHAR(20) NOT NULL,
      ip_address VARCHAR(45) NOT NULL,
      user_agent TEXT,
      success BOOLEAN NOT NULL,
      failure_reason VARCHAR(255),
      login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_employee_time (employee_id, login_time),
      INDEX idx_ip_time (ip_address, login_time),
      INDEX idx_success_time (success, login_time)
    )
  `,
  
  // 로그인 로그 기록
  insertLoginLog: `
    INSERT INTO login_logs (
      employee_id, 
      ip_address, 
      user_agent,
      success, 
      failure_reason,
      login_time
    ) 
    VALUES (?, ?, ?, ?, ?, NOW())
  `,

  // ================================
  // 📊 통계 및 목록 조회
  // ================================
  
  // DB 연결 테스트
  testConnection: `
    SELECT COUNT(*) as count 
    FROM employees 
    WHERE employment_status = '재직중'
  `,
  
  // 전체 재직 사원 목록
  getAllEmployees: `
    SELECT 
      e.employee_id,
      e.employee_name,
      e.position,
      e.department_code,
      d.department_name,
      e.employment_status,
      e.hire_date,
      e.email,
      e.phone,
      e.gender
    FROM employees e
    LEFT JOIN department d ON e.department_code = d.department_code
    WHERE e.employment_status = '재직중'
    ORDER BY e.employee_name
  `,
  
  // 부서별 사원 수
  getEmployeeCountByDepartment: `
    SELECT 
      d.department_name,
      COUNT(e.employee_id) as employee_count
    FROM department d
    LEFT JOIN employees e ON d.department_code = e.department_code 
      AND e.employment_status = '재직중'
    GROUP BY d.department_code, d.department_name
    ORDER BY employee_count DESC
  `,

  // ================================
  // 🔍 검색 관련 쿼리
  // ================================
  
  // 사원명으로 검색
  searchEmployeesByName: `
    SELECT 
      e.employee_id,
      e.employee_name,
      e.position,
      e.department_code,
      d.department_name,
      e.employment_status
    FROM employees e
    LEFT JOIN department d ON e.department_code = d.department_code
    WHERE e.employee_name LIKE ? 
      AND e.employment_status = '재직중'
    ORDER BY e.employee_name
  `,
  
  // 특정 부서 사원 목록
  getEmployeesByDepartment: `
    SELECT 
      e.employee_id,
      e.employee_name,
      e.position,
      e.department_code,
      d.department_name,
      e.employment_status,
      e.hire_date
    FROM employees e
    LEFT JOIN department d ON e.department_code = d.department_code
    WHERE e.department_code = ? 
      AND e.employment_status = '재직중'
    ORDER BY e.employee_name
  `,

  // ================================
  // 🏢 부서 관련 쿼리
  // ================================
  
  // 전체 부서 목록
  getAllDepartments: `
    SELECT 
      department_code,
      department_name,
      department_type,
      remarks
    FROM department
    ORDER BY department_name
  `,

  // ================================
  // 📊 로그인 통계 쿼리
  // ================================
  
  // 오늘 로그인 수
  getTodayLoginCount: `
    SELECT COUNT(DISTINCT employee_id) as login_count
    FROM login_logs 
    WHERE success = true 
      AND DATE(login_time) = CURDATE()
  `,
  
  // 주간 로그인 수
  getWeeklyLoginCount: `
    SELECT COUNT(DISTINCT employee_id) as login_count
    FROM login_logs 
    WHERE success = true 
      AND login_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  `,
  
  // 월간 로그인 수
  getMonthlyLoginCount: `
    SELECT COUNT(DISTINCT employee_id) as login_count
    FROM login_logs 
    WHERE success = true 
      AND login_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `,
  
  // 실패한 로그인 시도 수
  getFailedLoginCount: `
    SELECT COUNT(*) as failed_count
    FROM login_logs 
    WHERE success = false 
      AND login_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
  `,
  
  // 부서별 로그인 통계
  getDepartmentLoginStats: `
    SELECT 
      d.department_name,
      COUNT(DISTINCT ll.employee_id) as unique_logins,
      COUNT(ll.employee_id) as total_logins
    FROM login_logs ll
    JOIN employees e ON ll.employee_id = e.employee_id
    JOIN department d ON e.department_code = d.department_code
    WHERE ll.success = true 
      AND ll.login_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY d.department_code, d.department_name
    ORDER BY total_logins DESC
  `
};