exports.up = function(knex) {
  return knex.schema.createTable('questions', (t) => {
    t.increments('id').primary();
    t.string('level').notNullable().index(); // beginner/intermediate/advanced
    t.text('prompt').notNullable();
    t.text('canonical_answer').notNullable();
    t.string('type').defaultTo('arithmetic'); // metadata: arithmetic, fraction, equation, word
    t.jsonb('meta').defaultTo('{}');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('questions');
};