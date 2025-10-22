exports.up = function(knex) {
  return knex.schema.createTable('player_matches', (t) => {
    t.increments('id').primary();
    t.integer('match_id').references('id').inTable('matches').onDelete('CASCADE');
    t.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('player_name').notNullable();
    t.integer('score').defaultTo(0);
    t.integer('time_left').defaultTo(0);
    t.jsonb('answers').defaultTo('[]'); // array of answer objects [{ qIndex, answer, correct, time }]
    t.integer('iq_before').nullable();
    t.integer('iq_after').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('player_matches');
};