# sf-sfca-repo

---
{
  "name": "dx-sample-test",
  "version": "1.0.0",
  "description": "SFCA Upload",
  "main": "scripts/load-sfca.js",
  "scripts": {
    "load-sfca": "node scripts/load-sfca.js"
  }
}

---
- name: Test Analyzer Insert
  run: |
    sf data create record \
      --sobject dx_Code_Analyzer__c \
      --values "Name=TestAnalyzer" \
      --target-org dxvizdev \
      --json
  --
  - name: Describe Object
  run: |
    sf schema sobject describe \
      --sobject dx_Code_Analyzer__c \
      --target-org dxvizdev
