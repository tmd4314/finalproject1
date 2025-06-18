// server/database/sqls/commonCode.js

module.exports = {
  selectCommonCodesByGroup: `
    SELECT code_value AS value, code_label AS label
    FROM common_code
    WHERE code_group = ?
    ORDER BY 
      CAST(SUBSTRING(code_value, 2) AS UNSIGNED)
  `,
  
  selectLinesForCommonCode: `
    SELECT 
      CAST(line_id AS CHAR) AS value, 
      CONCAT('라인 ', line_id) AS label
    FROM package_line
    WHERE line_id IS NOT NULL
    ORDER BY line_id
  `,
};