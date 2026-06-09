const fs = require('fs');
const { execSync } = require('child_process');

const data = JSON.parse(
    fs.readFileSync('./sfca_results.json', 'utf8')
);

const severityMap = {
    1: 'BLOCKER',
    2: 'CRITICAL',
    3: 'MAJOR',
    4: 'MINOR',
    5: 'INFO'
};

function run(cmd) {
    return execSync(cmd, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
    });
}

function sanitize(value) {
    if (!value) return '';

    return String(value)
        .replace(/"/g, '')
        .replace(/'/g, '')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .trim();
}

console.log('====================================');
console.log('Creating Analyzer Record');
console.log('====================================');

const analyzerResult = run(`
sf data create record \
--sobject dx_Code_Analyzer__c \
--values "Name=SFCA_${Date.now()}
Author__c=${process.env.GITHUB_ACTOR}
Branch__c=${process.env.GITHUB_REF_NAME}
Commit_ID__c=${process.env.GITHUB_SHA}
Package__c=${process.env.GITHUB_REPOSITORY}" \
--target-org dxvizdev \
--json
`);

const analyzerId =
    JSON.parse(analyzerResult).result.id;

console.log(`Analyzer Created: ${analyzerId}`);

const fileMap = {};

for (const violation of data.violations || []) {

    const location =
        violation.locations?.[0];

    if (!location) {
        continue;
    }

    const filePath =
        sanitize(location.file);

    if (!fileMap[filePath]) {

        console.log(
            `Creating File Record: ${filePath}`
        );

        const fileResult = run(`
sf data create record \
--sobject dx_Code_File__c \
--values "Name=${sanitize(filePath.split('/').pop())}
File_Path__c=${filePath}
Language__c=Apex
File_Status__c=Active
Author__c=${process.env.GITHUB_ACTOR}
Code_Analyzer__c=${analyzerId}" \
--target-org dxvizdev \
--json
`);

        fileMap[filePath] =
            JSON.parse(fileResult).result.id;
    }

    const fileId =
        fileMap[filePath];

    const violationId =
        `${sanitize(violation.rule)}_${location.startLine}`
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .substring(0, 50);

    console.log(
        `Creating Violation: ${violation.rule}`
    );

    try {

        run(`
sf data create record \
--sobject dx_Code_Violation__c \
--values "Name=${sanitize(violation.rule)}
Rule__c=${sanitize(violation.rule)}
Engine__c=${sanitize(violation.engine)}
Issue_Type__c=${sanitize(violation.engine)}
Message__c=${sanitize(violation.message)}
Severity__c=${severityMap[violation.severity] || 'INFO'}
Start_Line__c=${location.startLine || 0}
End_Line__c=${location.endLine || 0}
Start_Column__c=${location.startColumn || 0}
End_Column__c=${location.endColumn || 0}
Tags__c=${sanitize(
            (violation.tags || []).join(',')
        )}
Violation_ID__c=${violationId}
Status__c=OPEN
Code_File__c=${fileId}" \
--target-org dxvizdev
`);

    } catch (error) {

        console.error(
            `Failed to insert violation: ${violation.rule}`
        );

        console.error(
            error.stdout?.toString() ||
            error.message
        );
    }
}

console.log('====================================');
console.log('SFCA Upload Completed Successfully');
console.log('====================================');
