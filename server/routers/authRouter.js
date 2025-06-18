// routers/authRouter.js - 인증 관련 라우터 (디버깅 추가 버전)
const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// ================================
// 디버깅 미들웨어 추가
// ================================
router.use((req, res, next) => {
  console.log('=== AUTH 라우터 디버깅 ===');
  console.log(`${req.method} ${req.originalUrl}`);
  console.log('Headers:', {
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? 'Bearer ***' : 'None',
    'origin': req.headers.origin,
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
  });
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  console.log('Params:', req.params);
  console.log('==========================');
  next();
});

// ================================
// 간단한 토큰 생성/검증 시스템
// ================================
const activeSessions = new Map();

function generateToken(userInfo) {
  const tokenPayload = {
    employee_id: userInfo.employee_id,
    employee_name: userInfo.employee_name,
    department_code: userInfo.department_code,
    department_name: userInfo.department_name,
    position: userInfo.position,
    timestamp: Date.now(),
    expires: Date.now() + (8 * 60 * 60 * 1000) // 8시간
  };

  // Base64 인코딩으로 간단한 토큰 생성
  const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
  
  // 메모리에 세션 저장
  activeSessions.set(token, tokenPayload);
  
  console.log(`토큰 생성됨: ${userInfo.employee_id} - 만료시간: ${new Date(tokenPayload.expires).toLocaleString()}`);
  
  return token;
}

function verifyToken(token) {
  try {
    const sessionData = activeSessions.get(token);
    
    if (!sessionData) {
      console.log('토큰 검증 실패: 세션 없음');
      return null;
    }
    
    // 토큰 만료 확인
    if (sessionData.expires < Date.now()) {
      console.log('토큰 검증 실패: 만료됨');
      activeSessions.delete(token);
      return null;
    }
    
    return sessionData;
  } catch (error) {
    console.log('토큰 검증 에러:', error);
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
// 인증 미들웨어
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
// 테스트 엔드포인트 추가
// ================================
router.get('/test', (req, res) => {
  console.log('AUTH 테스트 엔드포인트 호출됨');
  res.json({
    success: true,
    message: 'Auth 라우터 작동 중',
    timestamp: new Date().toISOString(),
    activeSessions: activeSessions.size,
    path: req.originalUrl
  });
});

// ================================
// 로그인 API (디버깅 강화)
// ================================
router.post('/login', async (req, res) => {
  console.log('로그인 API 호출됨');
  console.log('요청 바디:', req.body);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Origin:', req.headers.origin);
  
  const { employee_id, password } = req.body;
  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  console.log('추출된 값들:');
  console.log('  - employee_id:', employee_id, `(타입: ${typeof employee_id})`);
  console.log('  - password:', password ? '***' + password.slice(-2) : 'undefined', `(타입: ${typeof password})`);
  console.log('  - IP:', clientIP);

  // 입력값 검증
  if (!employee_id || !password) {
    console.log('로그인 실패: 빈 입력값');
    console.log('  - employee_id 체크:', !!employee_id);
    console.log('  - password 체크:', !!password);
    
    return res.status(400).json({
      success: false,
      message: '사원번호와 비밀번호를 모두 입력해주세요.',
      debug: {
        received_employee_id: employee_id,
        received_password: password ? '***' : 'undefined',
        body_keys: Object.keys(req.body),
        content_type: req.headers['content-type']
      }
    });
  }

  // 입력값 정리
  const cleanEmployeeId = String(employee_id).trim();
  const cleanPassword = String(password).trim();

  console.log('정리된 값들:');
  console.log('  - cleanEmployeeId:', cleanEmployeeId);
  console.log('  - cleanPassword 길이:', cleanPassword.length);

  try {
    console.log(`로그인 시도: ${cleanEmployeeId}, IP: ${clientIP}`);
    console.log(`입력된 비밀번호 길이: ${cleanPassword.length}`);

    // 디버깅용 사용자 정보 확인
    console.log('사용자 정보 디버깅 시작...');
    await authService.debugUserInfo(cleanEmployeeId);

    // 로그인 처리
    console.log('로그인 서비스 호출...');
    const loginResult = await authService.login(cleanEmployeeId, cleanPassword);
    
    console.log('로그인 결과:', {
      success: loginResult.success,
      message: loginResult.message,
      hasUser: !!loginResult.user
    });
    
    if (!loginResult.success) {
      console.log(`로그인 실패: ${loginResult.message}`);
      
      // 실패 로그 기록
      await authService.logLoginAttempt(
        cleanEmployeeId, 
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
    console.log('로그인 성공 사용자:', {
      employee_id: userInfo.employee_id,
      employee_name: userInfo.employee_name,
      department: userInfo.department_name
    });

    // 토큰 생성
    console.log('토큰 생성 중...');
    const token = generateToken(userInfo);

    // 성공 로그 기록
    await authService.logLoginAttempt(
      cleanEmployeeId, 
      clientIP, 
      userAgent, 
      true
    );

    console.log(`로그인 성공: ${cleanEmployeeId} - ${userInfo.employee_name}`);

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
        phone: userInfo.phone,
        employment_status: userInfo.employment_status
      },
      token: token
    });

  } catch (error) {
    console.error('로그인 처리 중 서버 에러:', error);
    console.error('에러 스택:', error.stack);
    
    // 에러 로그 기록
    await authService.logLoginAttempt(
      cleanEmployeeId, 
      clientIP, 
      userAgent, 
      false, 
      '서버 내부 오류'
    );
    
    res.status(500).json({
      success: false,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      debug: process.env.NODE_ENV === 'development' ? {
        error: error.message,
        stack: error.stack
      } : undefined
    });
  }
});

// ================================
// 토큰 검증 API
// ================================
router.get('/verify', authMiddleware, async (req, res) => {
  try {
    const userInfo = req.user;
    
    console.log(`토큰 검증 성공: ${userInfo.employee_id}`);
    
    res.json({
      success: true,
      user: {
        employee_id: userInfo.employee_id,
        employee_name: userInfo.employee_name,
        position: userInfo.position,
        department_code: userInfo.department_code,
        department_name: userInfo.department_name,
        email: userInfo.email,
        phone: userInfo.phone,
        employment_status: userInfo.employment_status
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
// 로그아웃 API
// ================================
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const userInfo = req.user;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    // 세션에서 토큰 제거
    if (token) {
      activeSessions.delete(token);
      console.log(`토큰 삭제됨: ${userInfo.employee_id}`);
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
// DB 테스트 API
// ================================
router.get('/test-db', async (req, res) => {
  try {
    console.log('DB 연결 테스트 시작...');
    const isConnected = await authService.testConnection();
    
    console.log('DB 연결 결과:', isConnected);
    
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
      message: '연결 테스트 중 오류 발생',
      error: error.message
    });
  }
});

// ================================
// 사용자 디버깅 API (개발용)
// ================================
router.get('/debug/user/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    console.log(`사용자 디버깅 요청: ${employeeId}`);
    
    const userInfo = await authService.debugUserInfo(employeeId);
    
    res.json({
      success: true,
      data: userInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('사용자 디버깅 에러:', error);
    res.status(500).json({
      success: false,
      message: '사용자 정보 디버깅 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// ================================
// 헬스체크 API
// ================================
router.get('/health', (req, res) => {
  console.log('헬스체크 호출됨');
  res.json({
    status: 'OK',
    service: 'Authentication API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      login: 'POST /auth/login',
      logout: 'POST /auth/logout',
      verify: 'GET /auth/verify',
      debug: 'GET /auth/debug/user/:employeeId',
      testDb: 'GET /auth/test-db',
      health: 'GET /auth/health',
      test: 'GET /auth/test'
    },
    activeSessions: activeSessions.size,
    uptime: process.uptime()
  });
});

// ================================
// 에러 처리 (라우터 레벨)
// ================================
router.use((err, req, res, next) => {
  console.error('Auth Router 에러:', err);
  res.status(500).json({
    success: false,
    message: '인증 처리 중 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// ================================
// 중요: module.exports 
// ================================
module.exports = router;