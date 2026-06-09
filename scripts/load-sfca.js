const fs = require('fs');
const { execSync } = require('child_process');

console.log('Reading SFCA Report...');

const report = JSON.parse(
  fs.readFileSync('sfca-results.json', 'utf8')
);

const totalFiles = report.length;

let totalViolations = 0;

for (const file of report) {
  totalViolations += file.violations.length;
}

console.log(`Files: ${totalFiles}`);
console.log(`Violations: ${totalViolations}`);

const runName = `SFCA-${Date.now()}`;

try {

  console.log('Creating Analyzer Record...');

  execSync(
    `sf data create record \
      --target-org SFCA \
      --sobject Code_Analyzer__c \
      --values "Name='${runName}'"`,
    { stdio: 'inherit' }
  );

  for (const file of report) {

    const fileName =
      file.fileName.split('/').pop();

    console.log(`Creating File Record: ${fileName}`);

    execSync(
      `sf data create record \
        --target-org SFCA \
        --sobject Code_File__c \
        --values "Name='${fileName}'"`,
      { stdio: 'inherit' }
    );

    for (const violation of file.violations) {

      console.log(
        `Creating Violation: ${violation.ruleName}`
      );

      execSync(
        `sf data create record \
          --target-org SFCA \
          --sobject Code_Violation__c \
          --values "Name='${violation.ruleName}'"`,
        { stdio: 'inherit' }
      );
    }
  }

  console.log('================================');
  console.log('SFCA Data Loaded Successfully');
  console.log('================================');

} catch (err) {

  console.error('Load Failed');
  console.error(err.message);

  process.exit(1);
}