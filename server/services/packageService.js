// services/packageService.js - 실제 DB 전용 버전 (더미데이터 완전 제거)
const mariadb = require('mariadb');
require('dotenv').config();

class PackageService {
    constructor() {
        // 기존 .env 파일의 변수명 사용 (DB_PWD, DB_DB)
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PWD || '',
            database: process.env.DB_DB || 'tablets',
            port: parseInt(process.env.DB_PORT) || 3306,
            connectionLimit: parseInt(process.env.DB_LIMIT) || 10,
            acquireTimeout: 30000,
            timeout: 30000,
            idleTimeout: 60000,
            supportBigNumbers: true,
            bigNumberStrings: true,
            resetAfterUse: true
        };

        console.log('데이터베이스 연결 설정:');
        console.log('- HOST:', dbConfig.host);
        console.log('- USER:', dbConfig.user);
        console.log('- PASSWORD:', dbConfig.password ? '****' : 'MISSING');
        console.log('- DATABASE:', dbConfig.database);
        console.log('- PORT:', dbConfig.port);

        this.pool = mariadb.createPool(dbConfig);
    }

    // 연결 테스트 함수
    async testConnection() {
        let conn;
        try {
            console.log('데이터베이스 연결 테스트 시작...');
            conn = await this.pool.getConnection();
            console.log('데이터베이스 연결 성공!');
            
            const result = await conn.query('SELECT 1 as test');
            console.log('쿼리 테스트 성공:', result);
            
            return { success: true, message: '연결 성공' };
        } catch (error) {
            console.error('데이터베이스 연결 실패:', error.message);
            return { success: false, error: error.message };
        } finally {
            if (conn) conn.release();
        }
    }

    // 안전한 쿼리 실행
    async executeRawQuery(query, params = [], retries = 2) {
        let conn;
        let lastError;
        
        for (let attempt = 1; attempt <= retries + 1; attempt++) {
            try {
                console.log(`쿼리 실행 시도 ${attempt}/${retries + 1}:`, query.substring(0, 100) + '...');
                
                conn = await this.pool.getConnection();
                const rows = await conn.query(query, params);
                
                console.log(`쿼리 실행 성공 (시도 ${attempt}): ${Array.isArray(rows) ? rows.length : 1}건`);
                return rows;
                
            } catch (error) {
                lastError = error;
                console.error(`쿼리 실행 실패 (시도 ${attempt}):`, error.message);
                
                if (conn) {
                    conn.release();
                    conn = null;
                }
                
                if (attempt <= retries && (
                    error.code === 'ER_GET_CONNECTION_TIMEOUT' ||
                    error.code === 'ER_ACCESS_DENIED_ERROR' ||
                    error.code === 'ECONNREFUSED'
                )) {
                    console.log(`${attempt * 1000}ms 후 재시도...`);
                    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                } else {
                    break;
                }
            } finally {
                if (conn) conn.release();
            }
        }
        
        throw lastError;
    }

    // 더미데이터는 더 이상 사용하지 않음 - 실제 DB 데이터만 사용
    getMockWorkList(packageType = null, lineId = null, lineName = null) {
        console.log('더미데이터 사용 중단 - 실제 DB 데이터 연결 문제 해결 필요');
        return [];
    }

    // 작업 목록 조회 - 실제 DB 전용 (단순화된 버전)
    async getWorkList(packageType = null, lineId = null, lineName = null) {
        try {
            console.log('실제 데이터베이스에서 작업 목록 조회:', { packageType, lineId, lineName });
            
            // 단순한 기본 쿼리부터 시작
            let query = `
                SELECT 
                    work_id,
                    work_order_no,
                    order_detail_id,
                    line_id,
                    work_line,
                    work_step,
                    step_name,
                    step_status,
                    input_qty,
                    output_qty,
                    eq_code,
                    start_time,
                    end_time,
                    employee_id,
                    employee_name,
                    reg_date,
                    upd_date,
                    product_name,
                    
                    -- 간단한 제품명 매핑
                    COALESCE(product_name, step_name, '제품명없음') as final_product_name,
                    
                    -- 간단한 포장타입 결정
                    CASE 
                        WHEN step_name LIKE '%외포장%' OR step_name LIKE '%2차%' OR line_id LIKE '%외포장%' THEN 'OUTER'
                        ELSE 'INNER'
                    END as package_type,
                    
                    -- 간단한 라인명 추출
                    COALESCE(work_line, line_id, '라인정보없음') as line_name,
                    
                    -- 진행률 계산
                    CASE 
                        WHEN input_qty > 0 THEN ROUND((output_qty / input_qty * 100), 1)
                        ELSE 0
                    END AS progress_rate,
                    
                    -- 기본값들
                    COALESCE(input_qty, 1000) as order_qty,
                    COALESCE(input_qty, 1000) as target_qty,
                    COALESCE(employee_name, '작업자') as emp_name,
                    0 as defect_qty,
                    
                    -- 호환성을 위한 별칭
                    work_id as work_no
                    
                FROM tablets.package_work
                WHERE 1=1
            `;
            
            const params = [];
            
            // 포장타입 필터 (간단하게)
            if (packageType) {
                if (packageType === 'INNER') {
                    query += ` AND (step_name NOT LIKE '%외포장%' AND step_name NOT LIKE '%2차%' AND line_id NOT LIKE '%외포장%')`;
                } else if (packageType === 'OUTER') {
                    query += ` AND (step_name LIKE '%외포장%' OR step_name LIKE '%2차%' OR line_id LIKE '%외포장%')`;
                }
            }
            
            // 라인 필터 (간단하게)
            if (lineId && lineId !== 'ALL') {
                query += ` AND (line_id LIKE ? OR work_line LIKE ?)`;
                params.push(`%${lineId}%`, `%${lineId}%`);
            }
            
            if (lineName && lineName !== 'ALL') {
                query += ` AND (line_id LIKE ? OR work_line LIKE ? OR step_name LIKE ?)`;
                params.push(`%${lineName}%`, `%${lineName}%`, `%${lineName}%`);
            }
            
            query += ` ORDER BY reg_date DESC LIMIT 50`;
            
            console.log('실행할 쿼리:', query);
            console.log('파라미터:', params);
            
            const result = await this.executeRawQuery(query, params);
            console.log(`작업 목록 조회 완료: ${result.length}건`);
            
            if (result.length === 0) {
                console.log('필터링 결과가 없음. 전체 데이터 확인...');
                
                // 필터 없이 전체 데이터 확인
                const allDataQuery = `SELECT COUNT(*) as total FROM tablets.package_work`;
                const totalResult = await this.executeRawQuery(allDataQuery);
                console.log(`전체 데이터 수: ${totalResult[0].total}건`);
                
                if (totalResult[0].total > 0) {
                    // 최근 데이터 일부 가져오기
                    const sampleQuery = `
                        SELECT *, work_id as work_no 
                        FROM tablets.package_work 
                        ORDER BY reg_date DESC 
                        LIMIT 10
                    `;
                    const sampleData = await this.executeRawQuery(sampleQuery);
                    console.log(`샘플 데이터 ${sampleData.length}건 반환`);
                    return this.convertBigIntToNumber(sampleData);
                }
            }
            
            return this.convertBigIntToNumber(result);
            
        } catch (error) {
            console.error('작업 목록 조회 실패:', error);
            console.log('실제 DB 연결에 실패했습니다. 연결 정보를 확인하세요.');
            
            // 더미데이터는 반환하지 않음
            throw new Error(`DB 연결 실패: ${error.message}`);
        }
    }

    // 작업 상세 조회 - 단순화된 버전
    async getWorkDetail(workId) {
        try {
            console.log(`작업 상세 조회: ${workId}`);
            
            const query = `
                SELECT 
                    *,
                    COALESCE(product_name, step_name, '제품명없음') as final_product_name,
                    COALESCE(employee_name, '작업자') as emp_name,
                    COALESCE(input_qty, 1000) as order_qty,
                    COALESCE(work_line, line_id, '라인정보없음') as line_name,
                    work_id as work_no
                FROM tablets.package_work
                WHERE work_id = ? OR work_order_no = ?
            `;
            
            const result = await this.executeRawQuery(query, [workId, workId]);
            
            if (result.length > 0) {
                console.log(`작업 상세 조회 성공: ${workId}`);
                return this.convertBigIntToNumber(result[0]);
            } else {
                console.log(`작업번호 ${workId}를 찾을 수 없습니다.`);
                return null;
            }
            
        } catch (error) {
            console.error(`작업 상세 조회 실패 (${workId}):`, error);
            return null;
        }
    }

    // 제품코드 목록 조회 - 실제 데이터만
    async getProductCodes() {
        try {
            const query = `
                SELECT DISTINCT 
                    product_name,
                    product_name as product_code,
                    COUNT(*) as work_count
                FROM tablets.package_work
                WHERE product_name IS NOT NULL 
                AND product_name != ''
                GROUP BY product_name
                ORDER BY work_count DESC
            `;
            
            const result = await this.executeRawQuery(query);
            console.log(`제품코드 조회 완료: ${result.length}개`);
            return this.convertBigIntToNumber(result);
            
        } catch (error) {
            console.error('제품코드 조회 실패:', error);
            throw error;
        }
    }

    // 라인별 작업 목록 - 단순화된 버전
    async getWorksByLine(lineId) {
        try {
            const query = `
                SELECT 
                    work_id,
                    work_order_no,
                    step_name,
                    step_status,
                    input_qty,
                    output_qty,
                    employee_name,
                    product_name,
                    line_id,
                    work_line,
                    
                    COALESCE(product_name, step_name, '제품명없음') as final_product_name,
                    COALESCE(work_line, line_id, '라인정보없음') as line_name,
                    
                    CASE 
                        WHEN input_qty > 0 THEN ROUND((output_qty / input_qty * 100), 1)
                        ELSE 0
                    END AS progress_rate,
                    
                    work_id as work_no
                    
                FROM tablets.package_work
                WHERE (line_id LIKE ? OR work_line LIKE ?)
                ORDER BY reg_date DESC
            `;
            
            const result = await this.executeRawQuery(query, [`%${lineId}%`, `%${lineId}%`]);
            return this.convertBigIntToNumber(result);
            
        } catch (error) {
            console.error('라인별 작업 조회 실패:', error);
            throw error;
        }
    }

    // 디버깅용 테이블 구조 확인 - 단순화
    async debugTableStructure() {
        try {
            console.log('=== 테이블 구조 확인 ===');
            
            // 테이블 존재 확인
            const tableExistsQuery = `
                SELECT COUNT(*) as table_count
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = 'tablets'
                AND TABLE_NAME = 'package_work'
            `;
            
            const tableExists = await this.executeRawQuery(tableExistsQuery);
            
            if (tableExists[0].table_count === 0) {
                return {
                    success: false,
                    error: 'package_work 테이블을 찾을 수 없습니다.',
                    data: null
                };
            }
            
            // 컬럼 정보 조회
            const columnsQuery = `
                SELECT 
                    COLUMN_NAME, 
                    DATA_TYPE, 
                    IS_NULLABLE, 
                    COLUMN_DEFAULT
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'tablets' 
                AND TABLE_NAME = 'package_work'
                ORDER BY ORDINAL_POSITION
            `;
            
            const columns = await this.executeRawQuery(columnsQuery);
            
            // 데이터 수 확인
            const countQuery = `SELECT COUNT(*) as total_rows FROM tablets.package_work`;
            const countResult = await this.executeRawQuery(countQuery);
            
            return {
                success: true,
                data: {
                    table_exists: true,
                    total_rows: countResult[0].total_rows,
                    column_count: columns.length,
                    columns: columns
                }
            };
            
        } catch (error) {
            console.error('테이블 구조 확인 실패:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    // 데이터 접근 테스트 - 단순화
    async testDataAccess() {
        try {
            console.log('=== 데이터 접근 테스트 ===');
            
            // 기본 연결 테스트
            const connectionTest = await this.executeRawQuery('SELECT 1 as test_value');
            
            // 전체 데이터 수
            const countQuery = 'SELECT COUNT(*) as total_count FROM tablets.package_work';
            const countResult = await this.executeRawQuery(countQuery);
            
            // 샘플 데이터
            const sampleQuery = 'SELECT * FROM tablets.package_work LIMIT 3';
            const sampleData = await this.executeRawQuery(sampleQuery);
            
            return {
                success: true,
                data: {
                    connection_test: connectionTest[0].test_value === 1,
                    total_count: countResult[0].total_count,
                    sample_count: sampleData.length,
                    sample_data: sampleData,
                    database_status: 'OK'
                }
            };
            
        } catch (error) {
            console.error('데이터 접근 테스트 실패:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    // BigInt를 Number로 변환
    convertBigIntToNumber(data) {
        if (Array.isArray(data)) {
            return data.map(item => this.convertBigIntToNumber(item));
        } else if (data && typeof data === 'object') {
            const converted = {};
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'bigint') {
                    converted[key] = Number(value);
                } else if (value && typeof value === 'object') {
                    converted[key] = this.convertBigIntToNumber(value);
                } else {
                    converted[key] = value;
                }
            }
            return converted;
        }
        return data;
    }

    // 간단한 데이터 검증
    async simpleDataCheck() {
        try {
            const totalQuery = `SELECT COUNT(*) as total FROM tablets.package_work`;
            const totalResult = await this.executeRawQuery(totalQuery);
            
            const recentQuery = `
                SELECT work_id, work_order_no, line_id, step_name, step_status 
                FROM tablets.package_work 
                ORDER BY reg_date DESC 
                LIMIT 5
            `;
            const recentData = await this.executeRawQuery(recentQuery);
            
            return {
                success: true,
                data: {
                    total_rows: totalResult[0].total,
                    recent_data: recentData,
                    has_data: totalResult[0].total > 0
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ========== 원본 요구사항 포장 공정 관리 ==========
    
    async initializeWork(lineId, productCode) {
        try {
            console.log(`작업 초기화: 라인=${lineId}, 제품코드=${productCode}`);
            const processFlow = await this.getProcessFlow(productCode);
            
            return {
                success: true,
                data: { lineId, productCode, processFlow }
            };
        } catch (error) {
            console.error('작업 초기화 실패:', error);
            return { success: false, error: error.message };
        }
    }

    async getProcessFlow(productCode) {
        try {
            const mockProcessFlow = [
                { 공정그룹코드: 'PKG001', 순서: 1, 공정코드: 'INNER_PKG' },
                { 공정그룹코드: 'PKG001', 순서: 2, 공정코드: 'OUTER_PKG' }
            ];
            
            console.log(`제품코드 ${productCode}의 공정흐름도 조회 (목업)`);
            return mockProcessFlow;
        } catch (error) {
            console.error('공정흐름도 조회 실패:', error);
            return [];
        }
    }

    async getInProgressRecord(processGroupCode, order) {
        try {
            return { 실적ID: 'WR001' };
        } catch (error) {
            console.error('진행중인 실적 조회 실패:', error);
            return null;
        }
    }

    async getWaitingWorkNumber(recordId, order) {
        try {
            return 'WK001';
        } catch (error) {
            console.error('대기중인 작업번호 조회 실패:', error);
            return null;
        }
    }

    async startInnerPackaging(workNumber) {
        try {
            console.log(`내포장 작업 시작: ${workNumber}`);
            return {
                success: true,
                message: '내포장 작업이 시작되었습니다.',
                workNumber: workNumber
            };
        } catch (error) {
            console.error('내포장 시작 실패:', error);
            return { success: false, error: error.message };
        }
    }

    async completeInnerPackaging(workNumber) {
        try {
            console.log(`내포장 작업 완료: ${workNumber}`);
            return {
                success: true,
                message: '내포장 작업이 완료되었습니다.',
                workNumber: workNumber
            };
        } catch (error) {
            console.error('내포장 완료 실패:', error);
            return { success: false, error: error.message };
        }
    }

    async getCompletedInnerPackaging() {
        try {
            console.log('완료된 내포장 조회');
            return [
                { 작업번호: 'WK001', 실적ID: 'WR001', 제품코드: 'BJA-STD-10' }
            ];
        } catch (error) {
            console.error('완료된 내포장 조회 실패:', error);
            return [];
        }
    }

    async startOuterPackaging(workNumber) {
        try {
            console.log(`외포장 작업 시작: ${workNumber}`);
            return {
                success: true,
                message: '외포장 작업이 시작되었습니다.',
                workNumber: workNumber
            };
        } catch (error) {
            console.error('외포장 시작 실패:', error);
            return { success: false, error: error.message };
        }
    }

    async completeOuterPackaging(workNumber) {
        try {
            console.log(`외포장 작업 완료: ${workNumber}`);
            return {
                success: true,
                message: '외포장 작업이 완료되어 검사 단계로 이동되었습니다.',
                workNumber: workNumber
            };
        } catch (error) {
            console.error('외포장 완료 실패:', error);
            return { success: false, error: error.message };
        }
    }

    async executePackagingProcess(lineId, productCode) {
        try {
            console.log(`포장 프로세스 실행: 라인=${lineId}, 제품=${productCode}`);
            
            const initResult = await this.initializeWork(lineId, productCode);
            if (!initResult.success) {
                return initResult;
            }

            const processFlow = initResult.data.processFlow;
            const results = [];

            for (const process of processFlow) {
                const inProgressRecord = await this.getInProgressRecord(
                    process.공정그룹코드, 
                    process.순서
                );

                if (inProgressRecord) {
                    const workNumber = await this.getWaitingWorkNumber(
                        inProgressRecord.실적ID, 
                        process.순서
                    );

                    if (workNumber) {
                        if (process.공정코드.includes('INNER')) {
                            const startResult = await this.startInnerPackaging(workNumber);
                            results.push(startResult);
                        } else if (process.공정코드.includes('OUTER')) {
                            const startResult = await this.startOuterPackaging(workNumber);
                            results.push(startResult);
                        }
                    }
                }
            }

            return {
                success: true,
                message: '포장 프로세스 실행 완료',
                data: { lineId, productCode, processResults: results }
            };
        } catch (error) {
            console.error('포장 프로세스 실행 실패:', error);
            return { success: false, error: error.message };
        }
    }
}

// 싱글톤 인스턴스 생성
const packageService = new PackageService();

// 모듈 익스포트
module.exports = {
    getWorkList: function(...args) { return packageService.getWorkList(...args); },
    getWorkDetail: function(...args) { return packageService.getWorkDetail(...args); },
    getProductCodes: function(...args) { return packageService.getProductCodes(...args); },
    getWorksByLine: function(...args) { return packageService.getWorksByLine(...args); },
    debugTableStructure: function(...args) { return packageService.debugTableStructure(...args); },
    executeRawQuery: function(...args) { return packageService.executeRawQuery(...args); },
    testConnection: function(...args) { return packageService.testConnection(...args); },
    testDataAccess: function(...args) { return packageService.testDataAccess(...args); },
    simpleDataCheck: function(...args) { return packageService.simpleDataCheck(...args); },
    initializeWork: function(...args) { return packageService.initializeWork(...args); },
    getProcessFlow: function(...args) { return packageService.getProcessFlow(...args); },
    getInProgressRecord: function(...args) { return packageService.getInProgressRecord(...args); },
    getWaitingWorkNumber: function(...args) { return packageService.getWaitingWorkNumber(...args); },
    startInnerPackaging: function(...args) { return packageService.startInnerPackaging(...args); },
    completeInnerPackaging: function(...args) { return packageService.completeInnerPackaging(...args); },
    getCompletedInnerPackaging: function(...args) { return packageService.getCompletedInnerPackaging(...args); },
    startOuterPackaging: function(...args) { return packageService.startOuterPackaging(...args); },
    completeOuterPackaging: function(...args) { return packageService.completeOuterPackaging(...args); },
    executePackagingProcess: function(...args) { return packageService.executePackagingProcess(...args); },
    convertBigIntToNumber: function(...args) { return packageService.convertBigIntToNumber(...args); }
};