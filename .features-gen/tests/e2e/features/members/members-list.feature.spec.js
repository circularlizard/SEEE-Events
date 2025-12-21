// Generated from: tests/e2e/features/members/members-list.feature
import { test } from "playwright-bdd";

test.describe('Members List', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am logged in as an admin', null, { page }); 
  });
  
  test('Members page loads and renders member list content', { tag: ['@REQ-ADMIN-02', '@REQ-ADMIN-03'] }, async ({ When, Then, And, page }) => { 
    await When('I navigate to "/dashboard/members"', null, { page }); 
    await Then('I should see "Members"', null, { page }); 
    await And('the members list should render appropriately for this viewport', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests/e2e/features/members/members-list.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":11,"tags":["@REQ-ADMIN-02","@REQ-ADMIN-03"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am logged in as an admin","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"When I navigate to \"/dashboard/members\"","stepMatchArguments":[{"group":{"start":14,"value":"\"/dashboard/members\"","children":[{"start":15,"value":"/dashboard/members","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then I should see \"Members\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Members\"","children":[{"start":14,"value":"Members","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"And the members list should render appropriately for this viewport","stepMatchArguments":[]}]},
]; // bdd-data-end