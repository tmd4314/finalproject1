// routers/authRouter.js - 인증 관련 라우터
const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// ================================
// 🎯 간단한 토큰 생성/검증 시스템
// ================================
const activeSessions = new Map();

function generateToken(userInfo) {
  const tokenPayload = {
    employee_id: userInfo.employee_id,
    employee_name: userInfo.employee_name,
    department_code: userInfo.department_code,
    position: userInfo.position,
    timestamp: Date.now(),
    expires: Date.now() + (8 * 60 * 60 * 1000) // 8시간
  };

  // Base64 인코딩으로 간단한 토큰 생성
  const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
  
  // 메모리에 세션 저장
  activeSessions.set(token, tokenPayload);
  
  return token;
}

function verifyToken(token) {
  try {
    const sessionData = activeSessions.get(token);
    
    if (!sessionData) {
      return null;
    }
    
    // 토큰 만료 확인
    if (sessionData.expires < Date.now()) {
      activeSessions.delete(token);
      return null;
    }
    
    return sessionData;
  } catch (error) {
    return null;
  }
}

// 클라이언트 IP 주소 가져오기
function getClientIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         'unknown';
}

// ================================
// 🛡️ 인증 미들웨어
// ================================
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.',
      code: 'NO_TOKEN'
    });
  }

  try {
    // 토큰 검증
    const decodedToken = verifyToken(token);
    
    if (!decodedToken) {
      return res.status(401).json({
        success: false,
        message: '로그인이 만료되었습니다. 다시 로그인해주세요.',
        code: 'TOKEN_EXPIRED'
      });
    }

    // 사용자 정보 조회
    const userInfo = await authService.getUserById(decodedToken.employee_id);
    
    if (!userInfo) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 사용자입니다.',
        code: 'INVALID_USER'
      });
    }

    // 요청 객체에 사용자 정보 추가
    req.user = userInfo;
    req.tokenPayload = decodedToken;
    
    next();

  } catch (error) {
    console.error('인증 미들웨어 에러:', error);
    return res.status(401).json({
      success: false,
      message: '유효하지 않은 토큰입니다.',
      code: 'INVALID_TOKEN'
    });
  }
}

// ================================
// 🔐 로그인 API
// ================================
router.post('/login', async (req, res) => {
  const { employee_id, password } = req.body;
  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // 입력값 검증
  if (!employee_id || !password) {
    return res.status(400).json({
      success: false,
      message: '사원번호와 비밀번호를 모두 입력해주세요.'
    });
  }

  try {
    console.log(`로그인 시도: ${employee_id}, IP: ${clientIP}`);

    // 로그인 처리
    const loginResult = await authService.login(employee_id, password);
    
    if (!loginResult.success) {
      // 실패 로그 기록
      await authService.logLoginAttempt(
        employee_id, 
        clientIP, 
        userAgent, 
        false, 
        loginResult.message
      );
      
      return res.status(401).json({
        success: false,
        message: loginResult.message
      });
    }

    const userInfo = loginResult.user;

    // 토큰 생성
    const token = generateToken(userInfo);

    // 성공 로그 기록
    await authService.logLoginAttempt(
      employee_id, 
      clientIP, 
      userAgent, 
      true
    );

    console.log(`로그인 성공: ${employee_id} - ${userInfo.employee_name}`);

    // 성공 응답
    res.json({
      success: true,
      message: '로그인 성공',
      user: {
        employee_id: userInfo.employee_id,
        employee_name: userInfo.employee_name,
        position: userInfo.position,
        department_code: userInfo.department_code,
        department_name: userInfo.department_name,
        email: userInfo.email,
        phone: userInfo.phone
      },
      token: token
    });

  } catch (error) {
    console.error('로그인 처리 중 서버 에러:', error);
    
    // 에러 로그 기록
    await authService.logLoginAttempt(
      employee_id, 
      clientIP, 
      userAgent, 
      false, 
      '서버 내부 오류'
    );
    
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

// ================================
// 🔍 토큰 검증 API
// ================================
router.get('/verify', authMiddleware, async (req, res) => {
  try {
    const userInfo = req.user;
    
    res.json({
      success: true,
      user: {
        employee_id: userInfo.employee_id,
        employee_name: userInfo.employee_name,
        position: userInfo.position,
        department_code: userInfo.department_code,
        department_name: userInfo.department_name,
        email: userInfo.email,
        phone: userInfo.phone
      }
    });
  } catch (error) {
    console.error('토큰 검증 에러:', error);
    res.status(500).json({
      success: false,
      message: '사용자 정보 확인 중 오류가 발생했습니다.'
    });
  }
});

// ================================
// 🚪 로그아웃 API
// ================================
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const userInfo = req.user;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    // 세션에서 토큰 제거
    if (token) {
      activeSessions.delete(token);
    }
    
    console.log(`로그아웃: ${userInfo.employee_id} - ${userInfo.employee_name}`);
    
    res.json({
      success: true,
      message: '성공적으로 로그아웃되었습니다.'
    });
  } catch (error) {
    console.error('로그아웃 처리 에러:', error);
    res.status(500).json({
      success: false,
      message: '로그아웃 처리 중 오류가 발생했습니다.'
    });
  }
});

// ================================
// 📊 DB 테스트 API
// ================================
router.get('/test-db', async (req, res) => {
  try {
    const isConnected = await authService.testConnection();
    
    if (isConnected) {
      res.json({
        success: true,
        message: 'MariaDB 연결 성공'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'MariaDB 연결 실패'
      });
    }
  } catch (error) {
    console.error('DB 연결 테스트 에러:', error);
    res.status(500).json({
      success: false,
      message: '연결 테스트 중 오류 발생'
    });
  }
});

// ================================
// 👥 사원 관리 API
// ================================

// 전체 사원 목록 조회
router.get('/employees', authMiddleware, async (req, res) => {
  try {
    const employees = await authService.getAllEmployees();
    
    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('사원 목록 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '사원 목록을 불러오는 중 오류가 발생했습니다.'
    });
  }
});

// 사원 검색
router.get('/employees/search', authMiddleware, async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '검색할 이름을 입력해주세요.'
      });
    }
    
    const employees = await authService.searchEmployeesByName(name);
    
    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('사원 검색 에러:', error);
    res.status(500).json({
      success: false,
      message: '사원 검색 중 오류가 발생했습니다.'
    });
  }
});

// 부서별 사원 목록
router.get('/employees/department/:departmentCode', authMiddleware, async (req, res) => {
  try {
    const { departmentCode } = req.params;
    const employees = await authService.getEmployeesByDepartment(departmentCode);
    
    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('부서별 사원 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '부서별 사원 조회 중 오류가 발생했습니다.'
    });
  }
});

// ================================
// 🏢 부서 관리 API
// ================================

// 전체 부서 목록
router.get('/departments', authMiddleware, async (req, res) => {
  try {
    const departments = await authService.getAllDepartments();
    
    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('부서 목록 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '부서 목록 조회 중 오류가 발생했습니다.'
    });
  }
});

// 부서별 사원 수 통계
router.get('/departments/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await authService.getEmployeeCountByDepartment();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('부서별 통계 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '부서별 통계 조회 중 오류가 발생했습니다.'
    });
  }
});

// ================================
// 📈 로그인 통계 API
// ================================

// 로그인 통계
router.get('/stats/login', authMiddleware, async (req, res) => {
  try {
    const stats = await authService.getLoginStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('로그인 통계 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '로그인 통계 조회 중 오류가 발생했습니다.'
    });
  }
});

// 부서별 로그인 통계
router.get('/stats/department-login', authMiddleware, async (req, res) => {
  try {
    const stats = await authService.getDepartmentLoginStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('부서별 로그인 통계 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '부서별 로그인 통계 조회 중 오류가 발생했습니다.'
    });
  }
});

// ================================
// 🔧 시스템 초기화 API (개발용)
// ================================

// 로그인 로그 테이블 초기화
router.post('/init/login-log-table', async (req, res) => {
  try {
    const result = await authService.initializeLoginLogTable();
    
    if (result) {
      res.json({
        success: true,
        message: '로그인 로그 테이블이 성공적으로 초기화되었습니다.'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '로그인 로그 테이블 초기화에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('테이블 초기화 에러:', error);
    res.status(500).json({
      success: false,
      message: '테이블 초기화 중 오류가 발생했습니다.'
    });
  }
});

// ================================
// 🔧 export 설정
// ================================
router.authMiddleware = authMiddleware;

module.exports = router;