// server/services/bomService.js

const mariadb = require('../database/mapper.js');
const { convertObjToAry } = require('../utils/converts.js');

// ========== 검색 관련 ==========

const searchProducts = async (searchTerm = '') => {
  return await mariadb.query('searchBomProducts', [searchTerm, searchTerm, searchTerm]);
};

const searchMaterials = async (searchTerm = '') => {
  return await mariadb.query('searchBomMaterials', [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]);
};

const searchBoms = async (searchTerm = '') => {
  return await mariadb.query('searchBomList', [searchTerm, searchTerm, searchTerm]);
};

// ========== 조회 관련 ==========

const findBomInfo = async (bomCode) => {
  return await mariadb.query('getBomInfo', [bomCode]);
};

const findBomMaterials = async (bomCode) => {
  return await mariadb.query('getBomMaterials', [bomCode]);
};

const findBomDetailFull = async (bomCode) => {
  try {
    const bomInfo = await findBomInfo(bomCode);
    if (!bomInfo || bomInfo.length === 0) {
      return {
        master: null,
        materials: []
      };
    }
    const master = {
      bom_code: bomInfo[0].bom_code,
      product_code: bomInfo[0].product_code,
      product_name: bomInfo[0].product_name,
      product_unit: bomInfo[0].product_unit,
      product_stand: bomInfo[0].product_stand,
      bom_reg_date: bomInfo[0].bom_reg_date,
      bom_update_date: bomInfo[0].bom_update_date
    };
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
    return {
      master,
      materials
    };
  } catch (err) {
    throw err;
  }
};

const findBomList = async (searchTerm = '') => {
  return await mariadb.query('getBomList', [searchTerm, searchTerm, searchTerm, searchTerm]);
};

const getProductList = async () => {
  return await mariadb.query('getProductList');
};

const getMaterialList = async () => {
  return await mariadb.query('getMaterialList');
};

// ========== 중복 체크 관련 ==========

const checkDuplicateBom = async (productCode) => {
  return await mariadb.query('checkDuplicateBom', [productCode]);
};

const checkBomCodeExists = async (bomCode) => {
  return await mariadb.query('checkBomCodeExists', [bomCode]);
};

const getLatestBomCodeByProduct = async (productCode) => {
  return await mariadb.query('getLatestBomCodeByProduct', [productCode, productCode]);
};

// ========== BOM 코드 생성 ==========

const generateBomCode = async (productCode) => {
  try {
    const result = await mariadb.query('generateBomCode', [productCode, productCode, productCode]);
    if (result && result.length > 0 && result[0].next_bom_code) {
      return result[0].next_bom_code;
    } else {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `BOM-${productCode}-${today}`;
    }
  } catch (err) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `BOM-${productCode}-${today}`;
  }
};

// ========== 저장 관련 ==========

const saveBomMaster = async (bomInfo) => {
  const insertColumns = [
    'bom_code', 'product_code'
  ];
  const values = convertObjToAry(bomInfo, insertColumns);
  return await mariadb.query('saveBomMaster', values);
};

const saveBomMaterials = async (bomCode, materials) => {
  try {
    await mariadb.query('deleteBomMaterials', [bomCode]);
    for (const material of materials) {
      const insertData = [
        bomCode,
        material.material_code,
        material.usage_qty,
        material.bom_unit
      ];
      await mariadb.query('insertBomMaterial', insertData);
    }
    return { success: true };
  } catch (err) {
    throw err;
  }
};

const updateBomMasterDate = async (bomCode) => {
  return await mariadb.query('updateBomMasterDate', [bomCode]);
};

// ========== 통합 저장 ==========

const saveBomComplete = async (bomData) => {
  try {
    const { master, materials } = bomData;
    if (!master.bom_code || master.bom_code === '') {
      master.bom_code = await generateBomCode(master.product_code);
    }
    await saveBomMaster(master);
    if (materials && materials.length > 0) {
      await saveBomMaterials(master.bom_code, materials);
    }
    return { 
      success: true, 
      message: 'BOM 저장 완료',
      bom_code: master.bom_code
    };
  } catch (err) {
    throw err;
  }
};

// ========== 통합조회 ==========

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
      bom_code, bom_code,
      product_name, product_name,
      product_code, product_code,
      material_name, material_name,
      start_date, start_date,
      end_date, end_date
    ];
    return await mariadb.query('getBomIntegratedList', params);
  } catch (err) {
    throw err;
  }
};

// ========== 공정흐름도용 ==========

const findProcessBomList = async (productCode) => {
  return await mariadb.query('getProcessBomList', [productCode]);
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
