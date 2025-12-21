// Generated from: tests/e2e/features/members/member-issues.feature
import { test } from "playwright-bdd";

test.describe('Member Data Issues', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am logged in as an admin', null, { page }); 
  });
  
  test('Member issues page loads', { tag: ['@REQ-ADMIN-04', '@REQ-ADMIN-05', '@REQ-ADMIN-06'] }, async ({ When, Then, page }) => { 
    await When('I navigate to "/dashboard/members/issues"', null, { page }); 
    await Then('the member issues page should load', null, { page }); 
  });

  test('Issue summary renders (either no issues or issue categories)', { tag: ['@REQ-ADMIN-04', '@REQ-ADMIN-05', '@REQ-ADMIN-06'] }, async ({ When, Then, page }) => { 
    await When('I navigate to "/dashboard/members/issues"', null, { page }); 
    await Then('the member issues summary should render', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests/e2e/features/members/member-issues.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":11,"tags":["@REQ-ADMIN-04","@REQ-ADMIN-05","@REQ-ADMIN-06"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am logged in as an admin","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"When I navigate to \"/dashboard/members/issues\"","stepMatchArguments":[{"group":{"start":14,"value":"\"/dashboard/members/issues\"","children":[{"start":15,"value":"/dashboard/members/issues","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then the member issues page should load","stepMatchArguments":[]}]},
  {"pwTestLine":15,"pickleLine":16,"tags":["@REQ-ADMIN-04","@REQ-ADMIN-05","@REQ-ADMIN-06"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am logged in as an admin","isBg":true,"stepMatchArguments":[]},{"pwStepLine":16,"gherkinStepLine":17,"keywordType":"Action","textWithKeyword":"When I navigate to \"/dashboard/members/issues\"","stepMatchArguments":[{"group":{"start":14,"value":"\"/dashboard/members/issues\"","children":[{"start":15,"value":"/dashboard/members/issues","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":18,"keywordType":"Outcome","textWithKeyword":"Then the member issues summary should render","stepMatchArguments":[]}]},
]; // bdd-data-end