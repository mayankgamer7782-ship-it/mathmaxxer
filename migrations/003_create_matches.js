exports.up = function(knex) {
  return knex.schema.createTable('matches', (t) => {
    t.increments('id').primary();
    t.timestamp('started_at').defaultTo(knex.fn.now());
    t.timestamp('finished_at');
    t.string('preset').notNullable();
    t.integer('winner_id').nullable();
    t.jsonb('meta').defaultTo('{}');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('matches');
};