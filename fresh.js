const fs = require('fs');
const { execSync } = require('child_process');

const data = JSON.parse(
  fs.readFileSync('./sfca_results.json', 'utf8')
);

function run(cmd) {
  console.log('\nExecuting:\n', cmd);

  const result = execSync(cmd, {
    encoding: 'utf8'
  });

  console.log(result);

  return result;
}

const severityMap = {
  1: 'BLOCKER',
  2: 'CRITICAL',
  3: 'MAJOR',
  4: 'MINOR',
  5: 'INFO'
};

console.log(
  `Found ${data.violations?.length || 0} violations`
);

console.log('Creating Analyzer Record');

const analyzerResult = run(`
sf data create record \
--sobject dx_Code_Analyzer__c \
--values "Name=SFCA_${Date.now()}
Author__c=${process.env.GITHUB_ACTOR}
Branch__c=${process.env.GITHUB_REF_NAME}
Commit_ID__c=${process.env.GITHUB_SHA}
Package__c=${process.env.GITHUB_REPOSITORY}
Pushed_Date__c=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
--target-org dxvizdev \
--json
`);

const analyzerId =
  JSON.parse(analyzerResult).result.id;

console.log(
  `Analyzer Created: ${analyzerId}`
);

const fileMap = {};

for (const violation of data.violations || []) {

  const location =
    violation.locations?.[0];

  if (!location) continue;

  if (!fileMap[location.file]) {

    console.log(
      `Creating File Record: ${location.file}`
    );

    const fileResult = run(`
sf data create record \
--sobject dx_Code_File__c \
--values "Name=${location.file.split('/').pop()}
File_Path__c=${location.file}
Language__c=Apex
File_Status__c=ACTIVE
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

  const violationKey =
    `${violation.rule}_${location.startLine}`;

  console.log(
    `Creating Violation: ${violation.rule}`
  );

  run(`
sf data create record \
--sobject dx_Code_Violation__c \
--values "Name=${violation.rule}
Rule__c=${violation.rule}
Engine__c=${violation.engine || 'SFCA'}
Message__c=${(violation.message || '')
  .replace(/"/g, '')
  .replace(/'/g, '')}
Severity__c=${severityMap[violation.severity] || 'INFO'}
Start_Line__c=${location.startLine || 0}
End_Line__c=${location.endLine || 0}
Start_Column__c=${location.startColumn || 0}
End_Column__c=${location.endColumn || 0}
Tags__c=${(violation.tags || []).join(',')}
Violation_ID__c=${violationKey}
Status__c=OPEN
Code_File__c=${fileId}" \
--target-org dxvizdev \
--json
`);
}

console.log('SFCA Upload Completed Successfully');
