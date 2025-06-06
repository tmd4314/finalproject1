const db = require('../database/mapper');

async function getCommonCodes(groups) {
  const result = {};

  for (const group of groups) {
    if (group === 'line') {
      const rows = await db.query('selectAllLines');
      result.line = rows.map(row => ({
        value: String(row.line_id),        
        label: `라인 ${row.line_id}`,
        text: `라인 ${row.line_id}`  
      }));
    } else {
      const rows = await db.query('selectCommonCodesByGroup', [group]);
    
      result[group] = rows.map(row => ({
        value: String(row.value),
        label: row.label,
        text: row.label  
      }));
    }
  }

  return result;
}

module.exports = {
  getCommonCodes,
};