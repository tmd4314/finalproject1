// 거래처 전체 조회
const getAccountList =
    `SELECT   account_id,
              account_name,
              account_type,
              business_no,
              phone,
              address,
              charger_name,
              trade_status_yn,
              reg_date,
              upd_date
    FROM      account
    ORDER BY  account_id`
    ;

// 등록
const accountInsert =
    `INSERT INTO account (account_name,
                          account_type,
                          business_no,
                          phone,
                          address,
                          charger_name,
                          trade_status_yn,
                          reg_date,
                          upd_date )
    VALUES(?,?,?,?,?,?,?,?,?)`
    ;

// 거래처id로 단일 조회
const getAccountById = `
    SELECT account_id,
           account_name,
           account_type,
           business_no,
           phone,
           address,
           charger_name,
           trade_status_yn,
           reg_date,
           upd_date
      FROM account
     WHERE account_id = ?
`;

// 거래처 수정
const accountUpdate = `
    UPDATE account SET
      account_name = ?,
      account_type = ?,
      business_no = ?,
      phone = ?,
      address = ?,
      charger_name = ?,
      trade_status_yn = ?,
      upd_date = ?
    WHERE account_id = ?
`;

// 전체 거래처+in_use(사용중) 여부 한꺼번에 조회
// const getAccountListWithUsage = `
// SELECT
//   a.*,
//   CASE
//     WHEN EXISTS (SELECT 1 FROM order_master WHERE account_id = a.account_id)
//       OR EXISTS (SELECT 1 FROM purchase_order WHERE account_id = a.account_id)
//     THEN 1 ELSE 0
//   END AS in_use
// FROM account a
// ORDER BY a.account_id
// `;

// 단일 거래처가 사용중인지 체크 (삭제 방어용)
// const getAccountInUse = `
// SELECT
//   CASE
//     WHEN EXISTS (SELECT 1 FROM order_master WHERE account_id = ?)
//       OR EXISTS (SELECT 1 FROM purchase_order WHERE account_id = ?)
//     THEN 1 ELSE 0
//   END AS in_use
// `;

// 거래처가 다른 테이블에서 사용중인지 체크(사용중이면 삭제 못하게 하려고)
// const getAccountInUse = `
//   SELECT COUNT(*) > 0 AS in_use
//   FROM order_master
//   WHERE account_id = ?
// `; >>>> 매번 SELECT하면 부하가 걸리기 쉬우므로, 삭제를 시도할 때 알려주는 방식으로 바꾸기!!

// 거래처 삭제
const accountDelete = `
    DELETE FROM account WHERE account_id = ?
`;

// 내보내기
module.exports = {
  getAccountList,
  getAccountById,
  accountInsert,
  accountUpdate,
  accountDelete,
  // getAccountListWithUsage,
};