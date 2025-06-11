const mariadb = require('../database/mapper.js');

//검사항목 전체 조회
const selectDefectAll = async () => {
  const list = await mariadb.query("selectDefectList").catch((err) => console.log(err));
  return list;
};

module.exports = {
  selectDefectAll
}