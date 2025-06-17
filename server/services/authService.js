// services/authService.js - 인증 관련 비즈니스 로직 (수정된 버전)
const mapper = require('../database/mapper');

class AuthService {
  
  // ================================
  // 로그인 처리
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
      console.log(`조회된 사용자 정보:`, {
        employee_id: user.employee_id,
        employee_name: user.employee_name,
        employment_status: user.employment_status,
        hasPassword: !!user.password
      });
      
      // 2. 재직 상태 확인 ('Y'가 재직중을 의미)
      if (user.employment_status !== 'Y') {  
        console.log(`로그인 실패: 재직중이 아님 - ${employeeId}, 상태: ${user.employment_status}`);
        return {
          success: false,
          message: '접근 권한이 없습니다. 관리자에게 문의하세요.'
        };
      }
      
      // 3. 비밀번호 검증
      console.log(`비밀번호 검증 시작 - 입력: "${password}", 저장됨: "${user.password}"`);
      const isPasswordValid = await this.verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        console.log(`로그인 실패: 비밀번호 불일치 - ${employeeId}`);
        console.log(`입력된 비밀번호: "${password}"`);
        console.log(`저장된 비밀번호: "${user.password}"`);
        console.log(`비밀번호 길이 비교: 입력(${password.length}) vs 저장(${user.password ? user.password.length : 'null'})`);
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
  // 비밀번호 검증 (개선된 버전)
  // ================================
  
  async verifyPassword(inputPassword, storedPassword) {
    try {
      // 입력값 검증
      if (!inputPassword || !storedPassword) {
        console.log('비밀번호 검증 실패: 빈 값');
        return false;
      }
      
      // 문자열로 변환 후 공백 제거
      const cleanInput = String(inputPassword).trim();
      const cleanStored = String(storedPassword).trim();
      
      console.log(`비밀번호 비교: "${cleanInput}" === "${cleanStored}"`);
      
      // 평문 비밀번호 비교
      const isMatch = cleanInput === cleanStored;
      
      console.log(`비밀번호 검증 결과: ${isMatch}`);
      return isMatch;
      
    } catch (error) {
      console.error('비밀번호 검증 에러:', error);
      return false;
    }
  }
  
  // ================================
  // 사용자 정보 조회
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
  // 전체 사원 목록 조회
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
  // 사원 검색
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
  // 부서 관련
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
  // DB 연결 테스트
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
  // 로그인 로그 관리
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
      // DB 저장 부분 주석 처리 (필요시 활성화)
      /*
      await mapper.query('insertLoginLog', [
        employeeId,
        ipAddress,
        userAgent,
        success,
        failureReason
      ]);
      */
      
      // 콘솔 로그만 남기고 DB 저장은 하지 않음
      console.log(`로그인 기록: 사원ID=${employeeId}, 성공=${success}, IP=${ipAddress}`);
      if (failureReason) {
        console.log(`실패 사유: ${failureReason}`);
      }
    } catch (error) {
      console.error('로그인 로그 기록 에러:', error);
    }
  }
  
  // ================================
  // 로그인 통계
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
  // 디버깅용 사용자 조회 (개발용)
  // ================================
  
  async debugUserInfo(employeeId) {
    try {
      console.log(`디버깅: 사원 ${employeeId} 정보 조회`);
      const users = await mapper.query('debugUserInfo', [employeeId]);
      
      if (users && users.length > 0) {
        const user = users[0];
        console.log('디버깅 결과:', {
          employee_id: user.employee_id,
          employee_name: user.employee_name,
          employment_status: user.employment_status,
          department_code: user.department_code,
          department_name: user.department_name,
          position: user.position,
          password_length: user.password_length || 0,
          password_preview: user.password ? user.password.substring(0, 3) + '...' : 'null',
          actual_password: user.password // 개발용으로만 표시
        });
        return user;
      } else {
        console.log('디버깅: 사용자를 찾을 수 없음');
        return null;
      }
    } catch (error) {
      console.error('디버깅 중 에러:', error);
      return null;
    }
  }
  
  // ================================
  // 간단한 비밀번호 변경 (필요시 사용)
  // ================================
  
  async updatePassword(employeeId, newPassword) {
    try {
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