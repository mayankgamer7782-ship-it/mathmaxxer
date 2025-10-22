// seed.js
// Run with: node seed.js
// Inserts a few sample questions and an admin user.

require('dotenv').config();
const knex = require('./db/knex');

async function seed() {
  try {
    // Create admin user if not exists
    const adminName = 'admin';
    const admin = await knex('users').where({ name: adminName }).first();
    if (!admin) {
      await knex('users').insert({ name: adminName, email: null, iq_rating: 100 });
      console.log('Admin user created:', adminName);
    } else {
      console.log('Admin already exists.');
    }

    // Insert sample questions if table empty
    const count = await knex('questions').count('id as c').first();
    if (count && Number(count.c) > 0) {
      console.log('Questions table already has rows, skipping sample insert.');
    } else {
      const samples = [
        { level: 'beginner', prompt: '5 + 7', canonical_answer: '12', type: 'arithmetic' },
        { level: 'beginner', prompt: '10 - 4', canonical_answer: '6', type: 'arithmetic' },
        { level: 'intermediate', prompt: '6 × 7', canonical_answer: '42', type: 'arithmetic' },
        { level: 'intermediate', prompt: '24 ÷ 6', canonical_answer: '4', type: 'arithmetic' },
        { level: 'advanced', prompt: 'Solve for x: 3x + 5 = 20', canonical_answer: '5', type: 'equation' },
        { level: 'advanced', prompt: '1/3 + 1/6 (give simplified fraction)', canonical_answer: '1/2', type: 'fraction' }
      ];
      await knex('questions').insert(samples);
      console.log('Seeded sample questions.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();