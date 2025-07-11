// utils/dateUtils.js

function formatDateToYMD(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = ('0' + (d.getMonth() + 1)).slice(-2);
  const day = ('0' + (d.getDate())).slice(-2);
  return `${year}-${month}-${day}`;
}

module.exports = { formatDateToYMD };
