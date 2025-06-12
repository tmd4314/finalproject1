const mariadb = require("mariadb/callback");
const sqlList = require("./sqlList.js");

const connectionPool = mariadb.createPool({
    // DB에 접속하는 정보
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_DB,
    connectionLimit: process.env.DB_LIMIT,
    multipleStatements: true,

    // Object의 필드정보(Entiry)를 Query문에 있는 '?'에 자동변환 설정
    permitSetMultiParamEntries:true,
    // DML(insert, update, delete)를 실행할 경우 
    // 반환되는 Object의 insertId 속성을 Number 타입으로 자동 변환
    insertIdAsNumber:true,
    // MariaDB의 데이터 타입 중 bigInt 타입을 Javascript의 Number 타입으로 자동 변환
    // 해당 타입을 Javascript에선 자동으로 변환하지 못함
    bigIntAsNumber:true,

    logger: {
        query: console.log,
        error: console.log,
    },
});

const query = (alias, values) => {
      console.log('Executing SQL alias:', alias);
    return new Promise((resolve, reject) => {
        let executeSql = sqlList[alias];

        connectionPool.query(executeSql, values, (err, results) =>{
            if(err) {
                reject({err});
            } else{
                resolve(results);
            }
        });
    });
};
module.exports = {
    query
};
