const mariadb = require('../database/mapper.js');

// 자재명만 전체 조회
const materialAll = async () => {
  const list = await mariadb.query("materialList").catch((err) => console.log(err))
  return list;
};

module.exports={
  materialAll
};