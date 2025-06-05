const mariadb = require("../database/mapper.js");
const { convertObjToAry } = require('../utils/converts.js') 

const findAll = async() => {
  let list = await mariadb.query("selectProductList")
                          .catch(err => console.log(err));
  return list;
}

const addProduct = async(ProductInfo) => {
  let insertColums = ['product_code', 'product_name', 'product_pay', 'product_atc', 'product_gred', 'product_unit', 'product_stand', 'product_pt', 'product_perdt', 'product_safty'];
  let data = convertObjToAry(ProductInfo, insertColums);

  let resInfo = await mariadb.query("productInsert", data)
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
      productCode:resInfo.affectedRows,
    }
  }else{
    result = {
      isSuccessed:false,
    }
  }
  return result;
}

const updateProductInfo = async(productCode, ProductInfo) => {
  let data = [ProductInfo, productCode];

  let resInfo = await mariadb.query("productUpdate", data)
                             .catch(err => console.log(err));
  let result = null;
  if(resInfo.affectedRows > 0) {
    ProductInfo.product_code = productCode;
    result = {
      isUpdated: true,
      ProductInfo,
    };
  } else{
    result = {
      isUpdated: false,
    };
  }
  return result;
}

const removeProductInfo = async(productCode) => {
  let result = await mariadb.query("productDelete", productCode)
                            .catch(err => console.log(err));
  return result;
}



module.exports = {
  findAll,
  addProduct,
  updateProductInfo,
  removeProductInfo
};