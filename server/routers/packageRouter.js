// routers/packageRouter.js (실제 DB 연결 강화 버전)
const express = require('express');
const router = express.Router();
const packageService = require('../services/packageService');

// 헬스체크
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Package API is running (Real DB Connection)',
    timestamp: new Date().toISOString()
  });
});

// ==============================================
// 실제 데이터 기반 작업 목록 조회 (강화된 버전)
// ==============================================

// 작업 목록 조회 (실제 데이터) - 강화된 에러 처리
router.get('/works', async (req, res) => {
  try {
    const { package_type, line_id, line_name } = req.query;
    
    console.log('실제 데이터 기반 작업 목록 조회 API 호출');
    console.log('필터 파라미터:', { package_type, line_id, line_name });
    
    const workList = await packageService.getWorkList(package_type, line_id, line_name);
    
    console.log(`작업 목록 조회 성공: ${workList.length}건`);
    
    // 기본 메타데이터 생성
    const metadata = {
      total_works: workList.length,
      filters_applied: {
        package_type: package_type || 'ALL',
        line_id: line_id || 'ALL',
        line_name: line_name || 'ALL'
      },
      data_source: 'real_database',
      timestamp: new Date().toISOString()
    };
    
    // 상태별 분류 (간단하게)
    if (workList.length > 0) {
      const statusBreakdown = {};
      workList.forEach(work => {
        const status = work.step_status || 'UNKNOWN';
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });
      metadata.status_breakdown = statusBreakdown;
      metadata.data_quality = {
        with_work_no: workList.filter(w => w.work_order_no).length,
        with_product_name: workList.filter(w => w.product_name).length,
        with_line_info: workList.filter(w => w.line_id || w.line_name).length
      };
    }
    
    res.json({
      success: true,
      message: '실제 데이터 기반 작업 목록 조회 성공',
      data: workList,
      count: workList.length,
      filters: {
        package_type: package_type || 'ALL',
        line_id: line_id || 'ALL',
        line_name: line_name || 'ALL'
      },
      metadata: metadata,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('작업 목록 조회 실패:', err);
    
    // 구체적인 에러 타입별 처리
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = 500;
    
    if (err.code === 'ER_NO_SUCH_TABLE') {
      errorCode = 'TABLE_NOT_FOUND';
      statusCode = 404;
    } else if (err.code === 'ER_BAD_FIELD_ERROR') {
      errorCode = 'COLUMN_NOT_FOUND';
      statusCode = 400;
    } else if (err.code === 'ECONNREFUSED') {
      errorCode = 'DATABASE_CONNECTION_REFUSED';
      statusCode = 503;
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      errorCode = 'DATABASE_ACCESS_DENIED';
      statusCode = 401;
    }
    
    res.status(statusCode).json({
      success: false,
      message: '작업 목록 조회 실패',
      error: err.message,
      error_code: errorCode,
      data: [],
      metadata: {
        error_type: err.name || 'UnknownError',
        error_details: err.message,
        sql_error: err.sql || null,
        errno: err.errno || null
      },
      timestamp: new Date().toISOString()
    });
  }
});

// 작업 상세 조회 (실제 데이터)
router.get('/works/:workNo', async (req, res) => {
  try {
    const { workNo } = req.params;
    
    console.log(`실제 데이터 기반 작업 상세 조회: ${workNo}`);
    
    const workDetail = await packageService.getWorkDetail(workNo);
    
    if (!workDetail) {
      console.log(`작업번호 ${workNo}를 찾을 수 없습니다.`);
      return res.status(404).json({
        success: false,
        message: `작업번호 ${workNo}를 찾을 수 없습니다.`,
        error: '해당 작업번호가 데이터베이스에 존재하지 않습니다.',
        data: null,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`작업 상세 조회 성공: ${workNo}`);
    
    res.json({
      success: true,
      message: `작업번호 ${workNo} 상세 조회 성공`,
      data: workDetail,
      metadata: {
        work_no: workNo,
        data_source: 'real_database',
        retrieved_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`작업 상세 조회 실패 (${req.params.workNo}):`, err);
    res.status(500).json({
      success: false,
      message: `작업번호 ${req.params.workNo} 상세 조회 실패`,
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// ==============================================
// 연결 및 헬스체크 API
// ==============================================

// 데이터베이스 연결 테스트
router.get('/debug/connection-test', async (req, res) => {
  try {
    console.log('데이터베이스 연결 테스트 시작');
    
    // 기본 연결 테스트
    const connectionTest = await packageService.executeRawQuery('SELECT 1 as test_value');
    
    // 스키마 확인
    const schemaTest = await packageService.executeRawQuery('SELECT DATABASE() as current_db');
    
    // 테이블 확인
    const tableTest = await packageService.executeRawQuery(`
      SELECT COUNT(*) as table_count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'tablets'
    `);
    
    // package_work 테이블 데이터 수 확인
    const dataTest = await packageService.executeRawQuery(`
      SELECT COUNT(*) as total_rows 
      FROM tablets.package_work
    `);
    
    res.json({
      success: true,
      message: '데이터베이스 연결 테스트 성공',
      data: {
        connection_status: 'OK',
        test_query_result: connectionTest[0].test_value,
        current_database: schemaTest[0].current_db,
        tablets_table_count: tableTest[0].table_count,
        package_work_rows: dataTest[0].total_rows,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (err) {
    console.error('데이터베이스 연결 테스트 실패:', err);
    res.status(500).json({
      success: false,
      message: '데이터베이스 연결 테스트 실패',
      error: err.message,
      error_code: err.code || 'UNKNOWN',
      data: null
    });
  }
});

// 테이블 구조 확인
router.get('/debug/table-structure', async (req, res) => {
  try {
    console.log('테이블 구조 확인 API 호출');
    
    const result = await packageService.debugTableStructure();
    
    res.json({
      success: result.success,
      message: result.success ? '테이블 구조 확인 완료' : '테이블 구조 확인 실패',
      data: result.data,
      error: result.error || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('테이블 구조 확인 실패:', err);
    res.status(500).json({
      success: false,
      message: '테이블 구조 확인 중 오류 발생',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 단순 데이터 확인 - 실제 DB 데이터만
router.get('/debug/simple-data-check', async (req, res) => {
  try {
    console.log('단순 데이터 확인 시작');
    
    // 전체 행 수
    const totalRows = await packageService.executeRawQuery('SELECT COUNT(*) as total FROM tablets.package_work');
    
    // 최근 5개 데이터
    const recentData = await packageService.executeRawQuery(`
      SELECT work_id, work_order_no, line_id, step_name, step_status, reg_date 
      FROM tablets.package_work 
      ORDER BY reg_date DESC 
      LIMIT 5
    `);
    
    // 라인별 분포
    const lineDistribution = await packageService.executeRawQuery(`
      SELECT line_id, COUNT(*) as count 
      FROM tablets.package_work 
      GROUP BY line_id 
      ORDER BY count DESC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      message: '단순 데이터 확인 완료',
      data: {
        total_rows: totalRows[0].total,
        recent_data: recentData,
        line_distribution: lineDistribution,
        has_data: totalRows[0].total > 0
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('단순 데이터 확인 실패:', err);
    res.status(500).json({
      success: false,
      message: '단순 데이터 확인 실패',
      error: err.message,
      data: null
    });
  }
});

// 데이터 접근 테스트
router.get('/debug/data-access-test', async (req, res) => {
  try {
    console.log('데이터 접근 테스트 API 호출');
    
    const result = await packageService.testDataAccess();
    
    res.json({
      success: result.success,
      message: result.success ? '데이터 접근 테스트 완료' : '데이터 접근 테스트 실패',
      data: result.data,
      error: result.error || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('데이터 접근 테스트 실패:', err);
    res.status(500).json({
      success: false,
      message: '데이터 접근 테스트 중 오류 발생',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 원시 SQL 직접 실행 (디버깅용) - 안전한 버전
router.post('/debug/raw-sql', async (req, res) => {
  try {
    const { query, description } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'SQL 쿼리가 필요합니다.',
        data: null
      });
    }
    
    // 안전성 검사
    const lowerQuery = query.toLowerCase().trim();
    const allowedQueries = ['select', 'show', 'describe', 'explain'];
    const isAllowed = allowedQueries.some(allowed => lowerQuery.startsWith(allowed));
    
    if (!isAllowed) {
      return res.status(400).json({
        success: false,
        message: 'SELECT, SHOW, DESCRIBE, EXPLAIN 쿼리만 허용됩니다.',
        data: null
      });
    }
    
    console.log(`안전한 원시 SQL 실행: ${description || 'No description'}`);
    console.log(`쿼리: ${query}`);
    
    const result = await packageService.executeRawQuery(query);
    
    console.log(`원시 SQL 실행 성공: ${result.length}건`);
    
    res.json({
      success: true,
      message: '원시 SQL 실행 성공',
      data: {
        description: description || 'No description',
        query: query,
        result_count: Array.isArray(result) ? result.length : 1,
        result: result,
        sample_result: Array.isArray(result) && result.length > 0 ? result[0] : result
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('원시 SQL 실행 실패:', err);
    res.status(500).json({
      success: false,
      message: '원시 SQL 실행 실패',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 모든 테이블 목록 조회
router.get('/debug/tables', async (req, res) => {
  try {
    console.log('데이터베이스 테이블 목록 조회');
    
    const tablesQuery = `
      SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, UPDATE_TIME
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'tablets'
      ORDER BY TABLE_NAME
    `;
    
    const tables = await packageService.executeRawQuery(tablesQuery);
    
    console.log(`테이블 ${tables.length}개 발견`);
    
    res.json({
      success: true,
      message: '테이블 목록 조회 성공',
      data: {
        schema: 'tablets',
        table_count: tables.length,
        tables: tables,
        package_work_exists: tables.some(t => t.TABLE_NAME === 'package_work')
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('테이블 목록 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '테이블 목록 조회 실패',
      error: err.message,
      data: null
    });
  }
});

// 특정 테이블 상세 정보 조회
router.get('/debug/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    console.log(`테이블 상세 정보 조회: ${tableName}`);
    
    // 테이블명 안전성 검사
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 테이블명입니다.',
        data: null
      });
    }
    
    // 컬럼 정보 조회
    const columnsQuery = `
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT,
        EXTRA,
        ORDINAL_POSITION
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'tablets' AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;
    
    const columns = await packageService.executeRawQuery(columnsQuery, [tableName]);
    
    if (columns.length === 0) {
      return res.status(404).json({
        success: false,
        message: `테이블 '${tableName}'을 찾을 수 없습니다.`,
        data: null
      });
    }
    
    // 샘플 데이터 조회 (안전하게)
    let sampleData = [];
    let rowCount = 0;
    
    try {
      const sampleQuery = `SELECT * FROM tablets.\`${tableName}\` LIMIT 3`;
      sampleData = await packageService.executeRawQuery(sampleQuery);
      
      const countQuery = `SELECT COUNT(*) as total FROM tablets.\`${tableName}\``;
      const countResult = await packageService.executeRawQuery(countQuery);
      rowCount = countResult[0].total;
      
    } catch (dataError) {
      console.warn('샘플 데이터/행 수 조회 실패:', dataError.message);
    }
    
    res.json({
      success: true,
      message: `테이블 '${tableName}' 상세 정보 조회 성공`,
      data: {
        table_name: tableName,
        column_count: columns.length,
        row_count: rowCount,
        columns: columns,
        sample_data: sampleData,
        sample_count: sampleData.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`테이블 상세 정보 조회 실패 (${req.params.tableName}):`, err);
    res.status(500).json({
      success: false,
      message: `테이블 '${req.params.tableName}' 상세 정보 조회 실패`,
      error: err.message,
      data: null
    });
  }
});

module.exports = router;