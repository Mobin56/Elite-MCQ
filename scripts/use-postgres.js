const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

schema = schema.replace(
  /datasource db \{[\s\S]*?\}/,
  `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`
);

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Switched Prisma schema to PostgreSQL successfully.');

try {
  console.log('Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (e) {
  console.error('Generation failed:', e.message);
}
