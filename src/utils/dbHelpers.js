const db = require('../config/database');

/**
 * Build a parameterized INSERT query
 * @param {string} table - Table name
 * @param {object} data - Key-value pairs to insert
 * @returns {object} - { text, values }
 */
function buildInsertQuery(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const columns = keys.join(', ');

  return {
    text: `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
    values
  };
}

/**
 * Build a parameterized UPDATE query
 * @param {string} table - Table name
 * @param {object} data - Key-value pairs to update
 * @param {object} where - Where conditions
 * @returns {object} - { text, values }
 */
function buildUpdateQuery(table, data, where) {
  const dataKeys = Object.keys(data);
  const dataValues = Object.values(data);
  const whereKeys = Object.keys(where);
  const whereValues = Object.values(where);

  const setClause = dataKeys.map((key, i) => `${key} = $${i + 1}`).join(', ');
  const whereClause = whereKeys
    .map((key, i) => `${key} = $${dataKeys.length + i + 1}`)
    .join(' AND ');

  return {
    text: `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`,
    values: [...dataValues, ...whereValues]
  };
}

/**
 * Build a parameterized SELECT query with pagination
 * @param {string} table - Table name
 * @param {object} options - Query options
 * @returns {object} - { text, values }
 */
function buildSelectQuery(table, options = {}) {
  const { where = {}, orderBy, limit, offset, columns = '*' } = options;
  const whereKeys = Object.keys(where);
  const whereValues = Object.values(where);

  let text = `SELECT ${Array.isArray(columns) ? columns.join(', ') : columns} FROM ${table}`;
  const values = [];

  if (whereKeys.length > 0) {
    const whereClause = whereKeys.map((key, i) => {
      values.push(whereValues[i]);
      return `${key} = $${i + 1}`;
    }).join(' AND ');
    text += ` WHERE ${whereClause}`;
  }

  if (orderBy) {
    text += ` ORDER BY ${orderBy}`;
  }

  if (limit) {
    values.push(limit);
    text += ` LIMIT $${values.length}`;
  }

  if (offset) {
    values.push(offset);
    text += ` OFFSET $${values.length}`;
  }

  return { text, values };
}

/**
 * Find one record by conditions
 */
async function findOne(table, where) {
  const query = buildSelectQuery(table, { where, limit: 1 });
  const result = await db.query(query.text, query.values);
  return result.rows[0] || null;
}

/**
 * Find multiple records
 */
async function findMany(table, options = {}) {
  const query = buildSelectQuery(table, options);
  const result = await db.query(query.text, query.values);
  return result.rows;
}

/**
 * Insert a new record
 */
async function insert(table, data) {
  const query = buildInsertQuery(table, data);
  const result = await db.query(query.text, query.values);
  return result.rows[0];
}

/**
 * Update records
 */
async function update(table, data, where) {
  const query = buildUpdateQuery(table, data, where);
  const result = await db.query(query.text, query.values);
  return result.rows[0] || null;
}

/**
 * Delete records
 */
async function remove(table, where) {
  const whereKeys = Object.keys(where);
  const whereValues = Object.values(where);
  const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

  const result = await db.query(
    `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`,
    whereValues
  );
  return result.rows[0] || null;
}

module.exports = {
  buildInsertQuery,
  buildUpdateQuery,
  buildSelectQuery,
  findOne,
  findMany,
  insert,
  update,
  remove
};
