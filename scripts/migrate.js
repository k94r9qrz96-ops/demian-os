import { openDb } from '../server/db.js';
import { seedCompanies, seedRoster } from '../server/agents/roster.js';
import { config } from '../server/config.js';

openDb();
seedCompanies();
seedRoster();
console.log(`Migraciones aplicadas en ${config.dbPath}`);
