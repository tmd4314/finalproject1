const mariadb = require('../database/mapper.js');

//검사항목 전체 조회
const selectAll = async () => {
  const list = await mariadb.query()
}