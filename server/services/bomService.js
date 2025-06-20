// server/services/bomService.js

const mariadb = require('../database/mapper.js');
const { convertObjToAry } = require('../utils/converts.js');

// ========== 검색 관련 ==========

// 제품 검색 (모달용)
const searchProducts = async (searchTerm = '') => {
  return await mariadb.query('searchBomProducts', [searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// 자재 검색 (모달용)
const searchMaterials = async (searchTerm = '') => {
  return await mariadb.query('searchBomMaterials', [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// BOM 검색 (모달용)
const searchBoms = async (searchTerm = '') => {
  return await mariadb.query('searchBomList', [searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// ========== 조회 관련 ==========

// BOM 정보 상세 조회 (생산계획과 동일한 방식 - 한 번에 모든 정보 조회)
const findBomInfo = async (bomCode) => {
  return await mariadb.query('getBomInfo', [bomCode])
    .catch(err => console.error(err));
};

// BOM 자재 목록만 조회 (별도 필요시)
const findBomMaterials = async (bomCode) => {
  return await mariadb.query('getBomMaterials', [bomCode])
    .catch(err => console.error(err));
};

// BOM 전체 정보 조회 (마스터 + 자재)
const findBomDetailFull = async (bomCode) => {
  try {
    // 생산계획과 동일하게 한 번의 쿼리로 모든 정보 조회
    const bomInfo = await findBomInfo(bomCode);
    
    if (!bomInfo || bomInfo.length === 0) {
      return {
        master: null,
        materials: []
      };
    }
    
    // 첫 번째 행을 마스터 정보로 사용
    const master = {
      bom_code: bomInfo[0].bom_code,
      product_code: bomInfo[0].product_code,
      product_name: bomInfo[0].product_name,
      product_unit: bomInfo[0].product_unit,
      product_stand: bomInfo[0].product_stand,
      bom_reg_date: bomInfo[0].bom_reg_date,
      bom_update_date: bomInfo[0].bom_update_date
    };
    
    // 자재 정보들을 배열로 구성 (중복 제거)
    const materialMap = new Map();

    bomInfo.forEach(row => {
      if (row.material_code) {
        materialMap.set(row.material_code, {
          bom_detail_id: row.bom_detail_id,
          material_code: row.material_code,
          material_name: row.material_name,
          material_type: row.material_type,
          material_unit: row.material_unit,
          material_stand: row.material_stand,
          usage_qty: row.usage_qty,
          bom_unit: row.bom_unit
        });
      }
    });
    
    const materials = Array.from(materialMap.values());
    
    const result = {
      master: master,
      materials: materials
    };
    
    return result;
  } catch (err) {
    console.error('❌ BOM 상세 조회 오류:', err);
    console.error('오류 스택:', err.stack);
    throw err;
  }
};

// BOM 목록 조회 (불러오기용)
const findBomList = async (searchTerm = '') => {
  return await mariadb.query('getBomList', [searchTerm, searchTerm, searchTerm, searchTerm])
    .catch(err => console.error(err));
};

// 제품 목록 조회 (드롭다운용)
const getProductList = async () => {
  return await mariadb.query('getProductList')
    .catch(err => console.error(err));
};

// 자재 목록 조회
const getMaterialList = async () => {
  return await mariadb.query('getMaterialList')
    .catch(err => console.error(err));
};

// ========== 중복 체크 관련 ==========

// 중복 BOM 체크 (동일한 제품코드로 기존 BOM이 있는지 확인)
const checkDuplicateBom = async (productCode) => {
  return await mariadb.query('checkDuplicateBom', [productCode])
    .catch(err => console.error(err));
};

// BOM 코드 중복 체크
const checkBomCodeExists = async (bomCode) => {
  return await mariadb.query('checkBomCodeExists', [bomCode])
    .catch(err => console.error(err));
};

// 특정 제품의 최신 BOM 코드 조회 (순번 생성용)
const getLatestBomCodeByProduct = async (productCode) => {
  return await mariadb.query('getLatestBomCodeByProduct', [productCode, productCode])
    .catch(err => console.error(err));
};

// ========== BOM 코드 생성 ==========

// BOM 코드 자동 생성
const generateBomCode = async (productCode) => {
  try {
    const result = await mariadb.query('generateBomCode', [productCode, productCode, productCode]);
    
    if (result && result.length > 0 && result[0].next_bom_code) {
      return result[0].next_bom_code;
    } else {
      // 기본값 생성 (해당 날짜에 첫 번째 BOM인 경우)
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `BOM-${productCode}-${today}`;
    }
  } catch (err) {
    console.error('BOM 코드 생성 오류:', err);
    // 에러 시 기본값
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `BOM-${productCode}-${today}`;
  }
};

// ========== 저장 관련 ==========

// BOM 마스터 저장
const saveBomMaster = async (bomInfo) => {
  console.log('=== saveBomMaster 시작 ===');
  console.log('입력 데이터:', bomInfo);
  
  const insertColumns = [
    'bom_code', 'product_code'
  ];
  const values = convertObjToAry(bomInfo, insertColumns);
  
  console.log('변환된 컬럼들:', insertColumns);
  console.log('변환된 값들:', values);
  console.log('값들의 개수:', values.length);
  
  return await mariadb.query('saveBomMaster', values)
    .catch(err => {
      console.error('❌ DB 쿼리 실행 오류:', err);
      console.error('SQL:', err.sql);
      console.error('파라미터:', values);
      throw err;
    });
};

// BOM 자재 저장
const saveBomMaterials = async (bomCode, materials) => {
  try {
    console.log('saveBomMaterials - bomCode:', bomCode);
    console.log('saveBomMaterials - materials:', materials);
    
    // 1. 기존 자재 정보 삭제
    await mariadb.query('deleteBomMaterials', [bomCode]);
    
    // 2. 새로운 자재 정보 입력
    for (const material of materials) {
      const insertData = [
        bomCode,
        material.material_code,
        material.usage_qty,
        material.bom_unit
      ];
      
      console.log('insertBomMaterial - 삽입 데이터:', insertData);
      await mariadb.query('insertBomMaterial', insertData);
    }
    
    return { success: true };
  } catch (err) {
    console.error('BOM 자재 저장 오류:', err);
    throw err;
  }
};

// BOM 마스터 수정일 업데이트
const updateBomMasterDate = async (bomCode) => {
  return await mariadb.query('updateBomMasterDate', [bomCode])
    .catch(err => console.error(err));
};

// ========== 통합 저장 ==========

// BOM 전체 저장 (마스터 + 자재)
const saveBomComplete = async (bomData) => {
  try {
    const { master, materials } = bomData;
    
    console.log('saveBomComplete - 전체 데이터:', bomData);
    console.log('saveBomComplete - 마스터 데이터:', master);
    console.log('saveBomComplete - 자재 데이터:', materials);
    
    // 신규 등록 시 코드가 없으면 자동 생성
    if (!master.bom_code || master.bom_code === '') {
      master.bom_code = await generateBomCode(master.product_code);
      console.log('생성된 BOM 코드:', master.bom_code);
    }
    
    // 1. 마스터 정보 저장
    await saveBomMaster(master);
    console.log('마스터 정보 저장 완료');
    
    // 2. 자재 정보 저장
    if (materials && materials.length > 0) {
      await saveBomMaterials(master.bom_code, materials);
      console.log('자재 정보 저장 완료');
    }
    
    return { 
      success: true, 
      message: 'BOM 저장 완료',
      bom_code: master.bom_code // 생성된 코드 반환
    };
  } catch (err) {
    console.error('BOM 완전 저장 오류:', err);
    throw err;
  }
};

// ========== 통합조회 ==========

// BOM 통합조회
const findBomIntegratedList = async (searchParams = {}) => {
  try {
    const {
      bom_code = '',
      product_name = '',
      product_code = '',
      material_name = '',
      start_date = '',
      end_date = ''
    } = searchParams;

    const params = [
      bom_code, bom_code,           // BOM 코드
      product_name, product_name,   // 제품명
      product_code, product_code,   // 제품코드
      material_name, material_name, // 자재명
      start_date, start_date,       // 시작일
      end_date, end_date            // 종료일
    ];

    return await mariadb.query('getBomIntegratedList', params);
  } catch (err) {
    console.error('BOM 통합조회 목록 조회 오류:', err);
    throw err;
  }
};

// ========== 공정흐름도용 (기존 유지) ==========

// 공정흐름도 관리용 BOM 목록 조회
const findProcessBomList = async (productCode) => {
  return await mariadb.query('getProcessBomList', [productCode])
    .catch(err => console.error(err));
};

module.exports = {
  // 검색 관련
  searchProducts,
  searchMaterials,
  searchBoms,
  
  // 조회 관련
  findBomInfo,
  findBomMaterials,
  findBomDetailFull,
  findBomList,
  getProductList,
  getMaterialList,
  
  // 중복 체크 관련
  checkDuplicateBom,
  checkBomCodeExists,
  getLatestBomCodeByProduct,
  
  // 코드 생성
  generateBomCode,
  
  // 저장 관련
  saveBomMaster,
  saveBomMaterials,
  saveBomComplete,
  updateBomMasterDate,
  
  // 통합조회
  findBomIntegratedList,
  
  // 공정흐름도용
  findProcessBomList
};