const selectWorkOrder = 
`SELECT work_order_no
FROM  work_order_master
ORDER BY work_order_no
`
;

module.exports = {
    selectWorkOrder
}