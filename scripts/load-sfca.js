const fs = require('fs');
const { execSync } = require('child_process');

console.log('Reading SFCA Report...');

const report = JSON.parse(
  fs.readFileSync('sfca-results.json', 'utf8')
);

const BRANCH = process.env.BRANCH_NAME || 'unknown';
const COMMIT = process.env.COMMIT_ID || 'unknown';

const TOTAL_FILES = report.length;

let TOTAL_VIOLATIONS = 0;

report.forEach(file => {
  TOTAL_VIOLATIONS += file.violations.length;
});

console.log(`Files: ${TOTAL_FILES}`);
console.log(`Violations: ${TOTAL_VIOLATIONS}`);
console.log(`Branch: ${BRANCH}`);
console.log(`Commit: ${COMMIT}`);

try {

  console.log('Creating Analyzer Record...');

  const analyzerCmd =
    `sf data create record ` +
    `--target-org SFCA ` +
    `--sobject Code_Analyzer__c ` +
    `--values "Name='SFCA-${Date.now()}' ` +
    `Branch__c='${BRANCH}' ` +
    `Commit_Id__c='${COMMIT}' ` +
    `Run_Status__c='SUCCESS' ` +
    `Total_Files__c=${TOTAL_FILES} ` +
    `Total_Violations__c=${TOTAL_VIOLATIONS}" ` +
    `--json`;

  console.log(analyzerCmd);

  const analyzerResult = JSON.parse(
    execSync(analyzerCmd).toString()
  );

  const analyzerId = analyzerResult.result.id;

  console.log(`Analyzer Id: ${analyzerId}`);

  for (const file of report) {

    const fileName =
      file.fileName.split('/').pop();

    const violationCount =
      file.violations.length;

    console.log(
      `Creating File Record: ${fileName}`
    );

    const fileCmd =
      `sf data create record ` +
      `--target-org SFCA ` +
      `--sobject Code_File__c ` +
      `--values "Name='${fileName}' ` +
      `File_Name__c='${fileName}' ` +
      `Violation_Count__c=${violationCount} ` +
      `Analyzer__c='${analyzerId}'" ` +
      `--json`;

    const fileResult = JSON.parse(
      execSync(fileCmd).toString()
    );

    const fileId = fileResult.result.id;

    console.log(`File Id: ${fileId}`);

    for (const violation of file.violations) {

      const rule =
        violation.ruleName || 'Unknown';

      const category =
        violation.category || 'General';

      const severity =
        violation.severity || 1;

      const line =
        violation.line || 0;

      const message =
        (violation.message || '')
          .replace(/'/g, '')
          .substring(0, 250);

      console.log(
        `Creating Violation: ${rule}`
      );

      const violationCmd =
        `sf data create record ` +
        `--target-org SFCA ` +
        `--sobject Code_Violation__c ` +
        `--values "Name='${rule}' ` +
        `Rule_Name__c='${rule}' ` +
        `Category__c='${category}' ` +
        `Severity__c=${severity} ` +
        `Line_Number__c=${line} ` +
        `Message__c='${message}' ` +
        `Code_File__c='${fileId}'"`;

      execSync(
        violationCmd,
        { stdio: 'inherit' }
      );
    }
  }

  console.log('================================');
  console.log('SFCA Data Loaded Successfully');
  console.log('================================');

} catch (err) {

  console.error('===== ERROR =====');

  if (err.stdout) {
    console.error(err.stdout.toString());
  }

  if (err.stderr) {
    console.error(err.stderr.toString());
  }

  console.error(err.message);

  process.exit(1);
}