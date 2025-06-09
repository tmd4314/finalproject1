const mariadb = require('mariadb/callback');

const orderSql = require('./sqls/order');

const connectionPool = mariadb.createPool({
  // DB에 접속하는 정보
  host : process.env.DB_HOST,
  port : process.env.DB_PORT,
  user : process.env.DB_USER,
  password : process.env.DB_PWD,
  database : process.env.DB_DB,
  connectionLimit : process.env.DB_LIMIT,

  logger:{
    query : console.log,
    error : console.log,
  }
});

const query = (alias, values)=>{ 
  return new Promise((resolve, reject)=> {
    connectionPool.query(alias, values, (err, results)=>{
       if(err) {
        // error 발생시 
        reject({err});
      }else{
        // SQL문을 정상적으로 실행한 경우
        resolve(results);
      }
    });
})
};

module.exports = {
  query,
  orderSql,
}