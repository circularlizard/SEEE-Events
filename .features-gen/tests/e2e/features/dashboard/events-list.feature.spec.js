// Generated from: tests/e2e/features/dashboard/events-list.feature
import { test } from "playwright-bdd";

test.describe('Events List', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am logged in as an admin', null, { page }); 
  });
  
  test('Events page loads and renders list content', { tag: ['@REQ-EVENTS-01', '@REQ-EVENTS-02', '@REQ-EVENTS-05'] }, async ({ When, Then, And, page }) => { 
    await When('I navigate to "/dashboard/events"', null, { page }); 
    await Then('I should see "Events"', null, { page }); 
    await And('the events list should render appropriately for this viewport', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests/e2e/features/dashboard/events-list.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":11,"tags":["@REQ-EVENTS-01","@REQ-EVENTS-02","@REQ-EVENTS-05"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am logged in as an admin","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"When I navigate to \"/dashboard/events\"","stepMatchArguments":[{"group":{"start":14,"value":"\"/dashboard/events\"","children":[{"start":15,"value":"/dashboard/events","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then I should see \"Events\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Events\"","children":[{"start":14,"value":"Events","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"And the events list should render appropriately for this viewport","stepMatchArguments":[]}]},
]; // bdd-data-end