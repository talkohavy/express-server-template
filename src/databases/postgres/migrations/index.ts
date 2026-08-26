export { createUsersTable, USERS_TABLE_NAME, usersTableSchema } from './users.migration';
export { createProductsTable, PRODUCTS_TABLE_NAME, productsTableSchema } from './products.migration';
export { createOrdersTable, ORDERS_TABLE_NAME, ORDER_STATUSES, ordersTableSchema } from './orders.migration';
export { runAllMigrations } from './all.migration';
