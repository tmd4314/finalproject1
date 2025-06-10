// server/services/bomService.js

const mariadb = require('../database/mapper.js');
const { convertObjToAry } = require('../utils/converts.js');

// BOM 전체 목록 조회
const findAllBomList = async () => {
  return await mariadb.query('getBomList').catch(err => console.error(err));
};

// BOM 상세 구성 조회
const findBomDetailFull = async (bomCode) => {
  return await mariadb.query('getBomDetailFull', [bomCode]).catch(err => console.error(err));
};

// BOM 마스터 단일 정보 조회
const findBomMaster = async (bomCode) => {
  return await mariadb.query('getBomDetail', [bomCode]).catch(err => console.error(err));
};

// BOM 마스터 등록
const addBomMaster = async (bomInfo) => {
  const insertColumns = ['bom_code', 'product_code'];
  const values = convertObjToAry(bomInfo, insertColumns);
  return await mariadb.query('insertBomMaster', values).catch(err => console.error(err));
};

// BOM 마스터 수정
const updateBomMaster = async (bomCode, bomInfo) => {
  const updateColumns = ['product_code'];
  const values = convertObjToAry(bomInfo, updateColumns);
  return await mariadb.query('updateBomMaster', [...values, bomCode]).catch(err => console.error(err));
};

// BOM 자재 추가
const addBomDetail = async (detailInfo) => {
  const insertColumns = ['bom_code', 'material_code', 'usage_qty', 'bom_unit'];
  const values = convertObjToAry(detailInfo, insertColumns);
  return await mariadb.query('insertBomDetail', values).catch(err => console.error(err));
};

// BOM 자재 수정
const updateBomDetail = async (detailInfo) => {
  const updateColumns = ['usage_qty', 'bom_unit'];
  const values = convertObjToAry(detailInfo, updateColumns);
  return await mariadb.query('updateBomDetail', [...values, detailInfo.bom_code, detailInfo.material_code])
    .catch(err => console.error(err));
};

// BOM 자재 삭제
const removeBomDetail = async (bomCode, materialCode) => {
  return await mariadb.query('deleteBomDetail', [bomCode, materialCode]).catch(err => console.error(err));
};

// 제품 목록 조회 (드롭다운용)
const getProductList = async () => {
  return await mariadb.query('prodDropDown').catch(err => console.error(err));
};

// 자재 목록 조회
const getMaterialList = async () => {
  return await mariadb.query('getMaterialList').catch(err => console.error(err));
};

module.exports = {
  findAllBomList,
  findBomDetailFull,
  findBomMaster,
  addBomMaster,
  updateBomMaster,
  addBomDetail,
  updateBomDetail,
  removeBomDetail,
  getProductList,
  getMaterialList,
};
