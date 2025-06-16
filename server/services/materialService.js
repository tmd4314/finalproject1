const mariadb = require("../database/mapper.js");
const { convertObjToAry } = require('../utils/converts.js') 

const findAll = async() => {
  let list = await mariadb.query("selectMaterialList")
                          .catch(err => console.log(err));
  return list;
}

const findCheckAll = async() => {
  let list = await mariadb.query("MaterialAllList")
                          .catch(err => console.log(err));
  return list;
}

const addMaterial = async(MaterialInfo) => {
  let insertColums = ['material_code', 'material_name', 'material_pay', 'material_cls', 'material_stand', 'material_unit', 'material_safty', 'material_img'];
  let data = convertObjToAry(MaterialInfo, insertColums);

  let resInfo = await mariadb.query("materialInsert", data)
  .catch(err => {
    console.error(err);
    return null; // 또는 throw err;
  });

if (!resInfo) {
  return {
    isSuccessed: false,
    message: 'DB insert 실패',
  };
}
  

  let result = null;
  if(resInfo.affectedRows > 0){
    result = {
      isSuccessed:true,
      materialCode:resInfo.affectedRows,
    }
  }else{
    result = {
      isSuccessed:false,
    }
  }
  return result;
}

const updateMaterialInfo = async(materialCode, MaterialInfo) => {
  const updateColumns = [
    'material_name', 'material_pay', 'material_cls', 'material_stand',
    'material_unit', 'material_safty', 'material_img'
  ];

  const values = convertObjToAry(MaterialInfo, updateColumns);
  const data = [...values, materialCode]; // WHERE 조건 맨 뒤에

  let resInfo = await mariadb.query("materialUpdate", data)
  .catch(err => {
    console.error(err);
    return null; // 또는 throw err;
  });

  let result = null;
  if (resInfo?.affectedRows > 0) {
    MaterialInfo.material_code = materialCode;
    result = {
      isUpdated: true,
      MaterialInfo,
    };
  } else {
    result = {
      isUpdated: false,
    };
  }
  return result;
}

const removeMaterialInfo = async(materialCode) => {
  let result = await mariadb.query("materialDelete", materialCode)
                            .catch(err => console.log(err));
  return {
    isDeleted: Number(result?.affectedRows) > 0 //  BigInt → Number
  };
}



module.exports = {
  findAll,
  addMaterial,
  updateMaterialInfo,
  removeMaterialInfo,
  findCheckAll
};