const mariadb = require('../database/mapper.js');

//작업지시서 조회
const selectWorkOrder = async () => {
    const workOrderList = await mariadb.query("selectWorkOrder").catch((err) => console.log(err));
    return workOrderList;
};

module.exports = {
    selectWorkOrder
}