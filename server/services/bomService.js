const mariadb = require("../database/mapper.js");
const { convertObjToAry } = require('../utils/converts.js');

// [1] 전체 BOM 목록 조회 (제품명, 규격 등 포함)
const findAll = async () => {
  const list = await mariadb.query("selectAllBom")
    .catch(err => {
      console.error(err);
      return [];
    });
  return list;
};

// [2] 단일 BOM 상세 조회 (기본정보 + 자재목록)
const findBomDetail = async (bomCode) => {
  try {
    const result = await mariadb.query("selectBomDetail", bomCode);
    if (!result || result.length === 0 || result[0].length === 0) {
      return null;
    }
    const master = result[0][0];

    const materials = await mariadb.query("selectBomMaterials", bomCode)
      .catch(err => {
        console.error('[selectBomMaterials 오류]', err);
        return [];
      });

    return { ...master, materials };
  } catch (err) {
    console.error('[findBomDetail 오류]', err);
    throw err;
  }
};

// [3] BOM 등록 (마스터 + 자재목록)
const addBom = async (bomInfo, materialList) => {
  // 1. 마스터 등록 (bom_code, product_code)
  const masterCols = ['bom_code', 'product_code'];
  const masterData = convertObjToAry(bomInfo, masterCols);

  const conn = await mariadb.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("insertBomMaster", masterData);

    // 2. 자재 등록 (여러개) (bom_code, material_code, usage_qty, bom_unit)
    for (const m of materialList) {
      m.bom_code = bomInfo.bom_code; // 반드시 넣어줘야 함
      const detailCols = ['bom_code', 'material_code', 'usage_qty', 'bom_unit'];
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

// [4] BOM 수정 (마스터수정 + 자재전체삭제 후 재등록)
const updateBom = async (bomCode, bomInfo, materialList) => {
  const conn = await mariadb.getConnection();
  try {
    await conn.beginTransaction();

    // 1. 마스터 수정 (product_code만 바뀜)
    await conn.query("updateBomMaster", [bomInfo.product_code, bomCode]);
    // 2. 기존 자재 전체 삭제
    await conn.query("deleteBomDetails", [bomCode]);
    // 3. 자재 재등록
    for (const m of materialList) {
      m.bom_code = bomCode;
      const detailCols = ['bom_code', 'material_code', 'usage_qty', 'bom_unit'];
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
