const fs = require('fs');
const { execSync } = require('child_process');

const data = JSON.parse(
    fs.readFileSync('./sfca_results.json', 'utf8')
);

function run(cmd) {
    return execSync(cmd, {
        encoding: 'utf8'
    });
}

console.log('Creating Analyzer');

const analyzerResult = run(`
sf data create record \
--sobject dx_Code_Analyzer__c \
--values "Author__c=${process.env.GITHUB_ACTOR}
Branch__c=${process.env.GITHUB_REF_NAME}
Commit_ID__c=${process.env.GITHUB_SHA}
Package__c=${process.env.GITHUB_REPOSITORY}
Pushed_Date__c=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
--target-org dxvizdev \
--json
`);

const analyzerId =
    JSON.parse(analyzerResult).result.id;

const fileMap = {};

for (const violation of data.violations) {

    const location =
        violation.locations?.[0];

    if (!location) continue;

    if (!fileMap[location.file]) {

        const fileResult = run(`
sf data create record \
--sobject dx_Code_File__c \
--values "Name=${location.file.split('/').pop()}
File_Path__c=${location.file}
Language__c=Apex
File_Status__c=Active
Author__c=${process.env.GITHUB_ACTOR}
Code_Analyzer__c=${analyzerId}" \
--target-org dxvizdev \
--json
`);

        fileMap[location.file] =
            JSON.parse(fileResult).result.id;
    }

    const fileId =
        fileMap[location.file];

    const violationId =
        `${violation.rule}_${location.startLine}`;

    run(`
sf data create record \
--sobject dx_Code_Violation__c \
--values "Name=${violation.rule}
Rule__c=${violation.rule}
Engine__c=${violation.engine}
Message__c='${(violation.message || '').replace(/'/g,'')}
Severity__c=${violation.severity}
Start_Line__c=${location.startLine}
End_Line__c=${location.endLine}
Start_Column__c=${location.startColumn}
End_Column__c=${location.endColumn}
Tags__c='${(violation.tags || []).join(',')}'
Violation_ID__c=${violationId}
Status__c=Open
Code_File__c=${fileId}" \
--target-org dxvizdev
`);
}

console.log('SFCA Upload Completed');
