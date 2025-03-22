#!/usr/bin/env node

/**
 * This script helps deploy the database schema and stored procedures
 * to Supabase for the Future Sentiment Analytics application.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const scriptOutput = path.join(__dirname, 'deploy-output.log');

// Check if the migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  console.error(`Migrations directory not found: ${migrationsDir}`);
  process.exit(1);
}

// Get a list of all migration files
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort(); // Sort alphabetically to ensure consistent order

if (migrationFiles.length === 0) {
  console.error('No migration files found in the directory.');
  process.exit(1);
}

console.log('Found migration files:');
migrationFiles.forEach((file, index) => {
  console.log(`${index + 1}. ${file}`);
});

// Create an interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask for Supabase project reference
rl.question('\nEnter your Supabase project reference ID (or press Enter to use environment variable): ', (projectRef) => {
  // Use environment variable if not provided
  projectRef = projectRef.trim() || process.env.SUPABASE_PROJECT_REF;
  
  if (!projectRef) {
    console.error('No Supabase project reference provided. Please provide a project reference or set SUPABASE_PROJECT_REF environment variable.');
    rl.close();
    process.exit(1);
  }
  
  console.log(`\nDeploying migrations to Supabase project: ${projectRef}`);
  console.log('----------------------------------------------------');
  
  // File to store the combined SQL
  const combinedSqlFile = path.join(__dirname, 'combined-migration.sql');
  let combinedSql = '';
  
  // Combine all migration SQL files
  migrationFiles.forEach(file => {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    combinedSql += `-- Start of ${file}\n${sql}\n-- End of ${file}\n\n`;
  });
  
  // Write the combined SQL to a file
  fs.writeFileSync(combinedSqlFile, combinedSql);
  console.log(`Combined SQL written to: ${combinedSqlFile}`);
  
  // Deploy to Supabase using the Supabase CLI
  console.log('\nDeploying schema changes to Supabase...');
  
  const execOptions = {
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large outputs
  };
  
  // Use Supabase CLI to run the migrations
  const command = `npx supabase db push --db-url postgres://postgres:postgres@db.${projectRef}.supabase.co:5432/postgres`;
  
  exec(command, execOptions, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running migrations: ${error.message}`);
      console.log('\nAlternative approach: Use the SQL Editor in Supabase Dashboard');
      console.log(`1. Go to https://supabase.com/dashboard/project/${projectRef}/sql`);
      console.log(`2. Copy the SQL from ${combinedSqlFile}`);
      console.log('3. Paste it into the SQL Editor and click "Run"');
      rl.close();
      return;
    }
    
    // Log the output
    fs.writeFileSync(scriptOutput, `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`);
    
    console.log('\nMigrations completed successfully!');
    console.log(`See detailed output at: ${scriptOutput}`);
    console.log('\nNext steps:');
    console.log('1. Verify tables in the Supabase Dashboard');
    console.log('2. Check that stored procedures are working');
    console.log('3. Use the Data Sync service to populate initial data');
    rl.close();
  });
});

// Handle close event
rl.on('close', () => {
  console.log('\nDeployment process completed.');
}); 