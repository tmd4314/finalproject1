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

    logger: {
        query: console.log,
        error: console.log,
    },
});

const query = (alias, values) => {
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
