const mariadb = require("../database/mapper.js");
const { convertObjToAry } = require('../utils/converts.js');

// 전체 BOM 조회 (기본 + 제품명)
const findAll = async () => {
  const list = await mariadb.query("selectAllBom")
    .catch(err => {
      console.error(err);
      return [];
    });
  return list;
};

// 단일 BOM 상세조회 (기본정보 + 자재목록)
const findBomDetail = async (bomCode) => {
  // 1. bom_master 정보
  const [[master]] = await mariadb.query("selectBomDetail", bomCode)
    .catch(err => {
      console.error(err);
      return [[]];
    });

  if (!master) return null;

  // 2. bom_detail(자재목록) 정보
  const materials = await mariadb.query("selectBomMaterials", bomCode)
    .catch(err => {
      console.error(err);
      return [];
    });

  return { ...master, materials };
};

// BOM 등록 (마스터 + 자재목록)
const addBom = async (bomInfo, materialList) => {
  // 1. 마스터 등록
  const masterCols = ['bom_code', 'product_code'];
  const masterData = convertObjToAry(bomInfo, masterCols);

  // 트랜잭션 사용!
  const conn = await mariadb.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("insertBomMaster", masterData);

    // 2. 자재 등록 (여러개)
    for (const m of materialList) {
      const detailCols = ['bom_code', 'material_code', 'usage_qty', 'bom_unit'];
      // bom_code는 bomInfo에서 받아옴
      m.bom_code = bomInfo.bom_code;
      const detailData = convertObjToAry(m, detailCols);
      await conn.query("insertBomDetail", detailData);
    }

    await conn.commit();
    return { isSuccessed: true };
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return { isSuccessed: false, message: err.message };
  } finally {
    conn.release();
  }
};

// BOM 수정 (마스터수정 + 자재전체삭제 후 재등록)
const updateBom = async (bomCode, bomInfo, materialList) => {
  // 트랜잭션 사용!
  const conn = await mariadb.getConnection();
  try {
    await conn.beginTransaction();

    // 1. 마스터 수정
    await conn.query("updateBomMaster", [bomInfo.product_code, bomCode]);
    // 2. 기존 자재 전체 삭제
    await conn.query("deleteBomDetails", [bomCode]);
    // 3. 자재 재등록
    for (const m of materialList) {
      const detailCols = ['bom_code', 'material_code', 'usage_qty', 'bom_unit'];
      m.bom_code = bomCode;
      const detailData = convertObjToAry(m, detailCols);
      await conn.query("insertBomDetail", detailData);
    }

    await conn.commit();
    return { isUpdated: true };
  } catch (err) {
    await conn.rollback();
    console.error(err);
    return { isUpdated: false, message: err.message };
  } finally {
    conn.release();
  }
};

module.exports = {
  findAll,
  findBomDetail,
  addBom,
  updateBom
};
