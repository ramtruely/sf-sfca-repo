const fs = require('fs');
const { execSync } = require('child_process');

console.log('Reading SFCA Report...');

const report =
JSON.parse(
    fs.readFileSync(
        'sfca-results.json',
        'utf8'
    )
);

const totalFiles = report.length;

let totalViolations = 0;

for (const file of report) {
    totalViolations += file.violations.length;
}

console.log(`Files: ${totalFiles}`);
console.log(`Violations: ${totalViolations}`);

const runName =
`SFCA-${new Date().getTime()}`;

//
// Create Analyzer Record
//

execSync(`
sf data create record \
--sobject Code_Analyzer__c \
--values "Name='${runName}' Branch__c='${process.env.GITHUB_REF_NAME}' Commit_Id__c='${process.env.GITHUB_SHA}' Total_Files__c=${totalFiles} Total_Violations__c=${totalViolations}"
`, {
    stdio: 'inherit'
});

//
// Create File Records
//

for (const file of report) {

    const fileName =
    file.fileName.split('/').pop();

    const violationCount =
    file.violations.length;

    execSync(`
sf data create record \
--sobject Code_File__c \
--values "Name='${fileName}' File_Name__c='${fileName}' Violation_Count__c=${violationCount}"
`, {
        stdio: 'inherit'
    });

    //
    // Create Violation Records
    //

    for (const violation of file.violations) {

        const cleanMessage =
        violation.message
            .replace(/\n/g, ' ')
            .replace(/"/g, '')
            .trim();

        execSync(`
sf data create record \
--sobject Code_Violation__c \
--values "Name='${violation.ruleName}' Rule_Name__c='${violation.ruleName}' Category__c='${violation.category}' Severity__c=${violation.severity} Line_Number__c=${violation.line} Message__c='${cleanMessage}'"
`, {
            stdio: 'inherit'
        });

    }

}

console.log('SFCA Data Loaded Successfully');