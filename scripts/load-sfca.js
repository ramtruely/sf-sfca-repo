const fs = require('fs');
const { execSync } = require('child_process');

console.log('Reading SFCA Report...');

const report = JSON.parse(
  fs.readFileSync('sfca-results.json', 'utf8')
);

const BRANCH =
  process.env.BRANCH_NAME || 'unknown';

const COMMIT =
  process.env.COMMIT_ID || 'unknown';

const RUN_DATE =
  new Date().toISOString();

const RUN_STATUS =
  'SUCCESS';

const TOTAL_FILES =
  report.length;

let TOTAL_VIOLATIONS = 0;

report.forEach(file => {
  TOTAL_VIOLATIONS +=
    file.violations.length;
});

console.log(`Files: ${TOTAL_FILES}`);
console.log(`Violations: ${TOTAL_VIOLATIONS}`);

try {

  console.log('Creating Analyzer Record...');

  const analyzerResult = JSON.parse(
    execSync(
      `sf data create record \
      --target-org SFCA \
      --sobject Code_Analyzer__c \
      --values "Name='SFCA-${Date.now()}' \
      Branch__c='${BRANCH}' \
      Commit_Id__c='${COMMIT}' \
      Run_Date__c='${RUN_DATE}' \
      Run_Status__c='${RUN_STATUS}' \
      Total_Files__c=${TOTAL_FILES} \
      Total_Violations__c=${TOTAL_VIOLATIONS}" \
      --json`
    ).toString()
  );

  const analyzerId =
    analyzerResult.result.id;

  console.log(
    `Analyzer Id: ${analyzerId}`
  );

  for (const file of report) {

    const fileName =
      file.fileName.split('/').pop();

    const violationCount =
      file.violations.length;

    console.log(
      `Creating File Record: ${fileName}`
    );

    const fileResult = JSON.parse(
      execSync(
        `sf data create record \
        --target-org SFCA \
        --sobject Code_File__c \
        --values "Name='${fileName}' \
        File_Name__c='${fileName}' \
        Violation_Count__c=${violationCount} \
        Analyzer__c='${analyzerId}'" \
        --json`
      ).toString()
    );

    const fileId =
      fileResult.result.id;

    console.log(
      `File Id: ${fileId}`
    );

    for (const violation of file.violations) {

      const rule =
        violation.ruleName || '';

      const category =
        violation.category || '';

      const severity =
        violation.severity || 0;

      const line =
        violation.line || 0;

      const message =
        (violation.message || '')
          .replace(/'/g, '');

      console.log(
        `Creating Violation: ${rule}`
      );

      execSync(
        `sf data create record \
        --target-org SFCA \
        --sobject Code_Violation__c \
        --values "Name='${rule}' \
        Rule_Name__c='${rule}' \
        Category__c='${category}' \
        Severity__c=${severity} \
        Line_Number__c=${line} \
        Message__c='${message}' \
        Code_File__c='${fileId}'"`
      );
    }
  }

  console.log(
    '================================'
  );

  console.log(
    'SFCA Data Loaded Successfully'
  );

  console.log(
    '================================'
  );

} catch (err) {

  console.error(err.message);

  process.exit(1);
}