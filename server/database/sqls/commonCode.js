// server/database/commonCode.js

module.exports = {
  selectCommonCodesByGroup: `
    SELECT code_group, code_value AS value, code_label AS label
    FROM common_code
    WHERE code_group = ?
  `,
  selectAllLines: `
    SELECT line_id
    FROM package_line
    WHERE line_id IS NOT NULL
  `,
};