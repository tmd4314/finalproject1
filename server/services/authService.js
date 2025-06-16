// services/authService.js - 인증 관련 비즈니스 로직
const mapper = require('../database/mapper');

class AuthService {
  
  // ================================
  // 🔐 로그인 처리
  // ================================
  
  async login(employeeId, password) {
    try {
      console.log(`로그인 시도: ${employeeId}`);
      
      // 1. 사용자 정보 조회
      const users = await mapper.query('loginUser', [employeeId]);
      
      if (!users || users.length === 0) {
        console.log(`로그인 실패: 사용자를 찾을 수 없음 - ${employeeId}`);
        return {
          success: false,
          message: '사원번호 또는 비밀번호가 올바르지 않습니다.'
        };
      }
      
      const user = users[0];
      
      // 2. 재직 상태 확인
      if (user.employment_status !== '재직중') {
        console.log(`로그인 실패: 재직중이 아님 - ${employeeId}, 상태: ${user.employment_status}`);
        return {
          success: false,
          message: '접근 권한이 없습니다. 관리자에게 문의하세요.'
        };
      }
      
      // 3. 비밀번호 검증
      const isPasswordValid = await this.verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        console.log(`로그인 실패: 비밀번호 불일치 - ${employeeId}`);
        return {
          success: false,
          message: '사원번호 또는 비밀번호가 올바르지 않습니다.'
        };
      }
      
      // 4. 성공 시 민감한 정보 제거
      const { password: _, ...userInfo } = user;
      
      console.log(`로그인 성공: ${employeeId} - ${userInfo.employee_name}`);
      
      return {
        success: true,
        message: '로그인 성공',
        user: userInfo
      };
      
    } catch (error) {
      console.error('로그인 처리 중 에러:', error);
      throw new Error('로그인 처리 중 오류가 발생했습니다.');
    }
  }
  
  // ================================
  // 🔑 비밀번호 검증 (평문 비교)
  // ================================
  
  async verifyPassword(inputPassword, storedPassword) {
    try {
      // 평문 비밀번호 비교
      return inputPassword === storedPassword;
      
    } catch (error) {
      console.error('비밀번호 검증 에러:', error);
      return false;
    }
  }
  
  // ================================
  // 👤 사용자 정보 조회
  // ================================
  
  async getUserById(employeeId) {
    try {
      const users = await mapper.query('getUserById', [employeeId]);
      return users && users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('사용자 정보 조회 에러:', error);
      throw new Error('사용자 정보 조회 중 오류가 발생했습니다.');
    }
  }
  
  // ================================
  // 📊 전체 사원 목록 조회
  // ================================
  
  async getAllEmployees() {
    try {
      const employees = await mapper.query('getAllEmployees');
      return employees || [];
    } catch (error) {
      console.error('사원 목록 조회 에러:', error);
      throw new Error('사원 목록 조회 중 오류가 발생했습니다.');
    }
  }
  
  // ================================
  // 🔍 사원 검색
  // ================================
  
  async searchEmployeesByName(name) {
    try {
      const employees = await mapper.query('searchEmployeesByName', [`%${name}%`]);
      return employees || [];
    } catch (error) {
      console.error('사원 검색 에러:', error);
      throw new Error('사원 검색 중 오류가 발생했습니다.');
    }
  }
  
  async getEmployeesByDepartment(departmentCode) {
    try {
      const employees = await mapper.query('getEmployeesByDepartment', [departmentCode]);
      return employees || [];
    } catch (error) {
      console.error('부서별 사원 조회 에러:', error);
      throw new Error('부서별 사원 조회 중 오류가 발생했습니다.');
    }
  }
  
  // ================================
  // 🏢 부서 관련
  // ================================
  
  async getAllDepartments() {
    try {
      const departments = await mapper.query('getAllDepartments');
      return departments || [];
    } catch (error) {
      console.error('부서 목록 조회 에러:', error);
      throw new Error('부서 목록 조회 중 오류가 발생했습니다.');
    }
  }
  
  async getEmployeeCountByDepartment() {
    try {
      const stats = await mapper.query('getEmployeeCountByDepartment');
      return stats || [];
    } catch (error) {
      console.error('부서별 사원 수 조회 에러:', error);
      throw new Error('부서별 사원 수 조회 중 오류가 발생했습니다.');
    }
  }
  
  // ================================
  // 🔧 DB 연결 테스트
  // ================================
  
  async testConnection() {
    try {
      const result = await mapper.query('testConnection');
      console.log('DB 연결 테스트 성공:', result[0]);
      return true;
    } catch (error) {
      console.error('DB 연결 테스트 실패:', error);
      return false;
    }
  }
  
  // ================================
  // 📊 로그인 로그 관리
  // ================================
  
  async initializeLoginLogTable() {
    try {
      await mapper.query('createLoginLogTable');
      console.log('로그인 로그 테이블 초기화 완료');
      return true;
    } catch (error) {
      console.error('로그인 로그 테이블 초기화 실패:', error);
      return false;
    }
  }
  
  async logLoginAttempt(employeeId, ipAddress, userAgent, success, failureReason = null) {
    try {
      await mapper.query('insertLoginLog', [
        employeeId,
        ipAddress,
        userAgent,
        success,
        failureReason
      ]);
      
      console.log(`로그인 로그 기록: ${employeeId}, 성공: ${success}`);
    } catch (error) {
      console.error('로그인 로그 기록 에러:', error);
      // 로그 기록 실패는 전체 로그인 프로세스를 중단시키지 않음
    }
  }
  
  // ================================
  // 📈 로그인 통계
  // ================================
  
  async getLoginStats() {
    try {
      const [todayCount, weeklyCount, monthlyCount, failedCount] = await Promise.all([
        mapper.query('getTodayLoginCount'),
        mapper.query('getWeeklyLoginCount'),
        mapper.query('getMonthlyLoginCount'),
        mapper.query('getFailedLoginCount')
      ]);
      
      return {
        today: todayCount[0]?.login_count || 0,
        weekly: weeklyCount[0]?.login_count || 0,
        monthly: monthlyCount[0]?.login_count || 0,
        failed: failedCount[0]?.failed_count || 0
      };
    } catch (error) {
      console.error('로그인 통계 조회 에러:', error);
      return {
        today: 0,
        weekly: 0,
        monthly: 0,
        failed: 0
      };
    }
  }
  
  async getDepartmentLoginStats() {
    try {
      const stats = await mapper.query('getDepartmentLoginStats');
      return stats || [];
    } catch (error) {
      console.error('부서별 로그인 통계 조회 에러:', error);
      return [];
    }
  }
  
  // ================================
  // 🔐 간단한 비밀번호 변경 (필요시 사용)
  // ================================
  
  async updatePassword(employeeId, newPassword) {
    try {
      // 실제 구현 시 employees 테이블의 password 컬럼 업데이트
      // 현재는 로직만 제공 (SQL 쿼리는 필요시 auth.js에 추가)
      console.log(`비밀번호 변경 요청: ${employeeId}`);
      
      // TODO: 실제 DB 업데이트 로직 구현
      // await mapper.query('updateEmployeePassword', [newPassword, employeeId]);
      
      return true;
    } catch (error) {
      console.error('비밀번호 변경 에러:', error);
      throw new Error('비밀번호 변경 중 오류가 발생했습니다.');
    }
  }
}

module.exports = new AuthService();