const fs = require('fs');

const report = JSON.parse(
  fs.readFileSync('sfca-results.json', 'utf8')
);

console.log('SFCA report loaded');

const violations =
  report.violations ||
  report.result ||
  [];

console.log(
  `Violations found: ${violations.length}`
);

/*
Next step:

Insert records into

Code_Analyzer__c
Code_File__c
Code_Violation__c

using jsforce.

For POC start with parsing.
*/