// Generated from: tests/e2e/features/dashboard/attendance-by-person.feature
import { test } from "playwright-bdd";

test.describe('Attendance by Person', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am logged in as an admin', null, { page }); 
  });
  
  test('Attendance by person page loads and shows grouping controls', { tag: ['@REQ-EVENTS-05'] }, async ({ When, Then, And, page }) => { 
    await When('I navigate to "/dashboard/events/attendance"', null, { page }); 
    await Then('I should see "Attendance by Person"', null, { page }); 
    await And('I should see "Single List"', null, { page }); 
    await And('I should see "By Patrol"', null, { page }); 
    await And('I should see "By Patrol & Event"', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests/e2e/features/dashboard/attendance-by-person.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":11,"tags":["@REQ-EVENTS-05"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am logged in as an admin","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"When I navigate to \"/dashboard/events/attendance\"","stepMatchArguments":[{"group":{"start":14,"value":"\"/dashboard/events/attendance\"","children":[{"start":15,"value":"/dashboard/events/attendance","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then I should see \"Attendance by Person\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Attendance by Person\"","children":[{"start":14,"value":"Attendance by Person","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"And I should see \"Single List\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Single List\"","children":[{"start":14,"value":"Single List","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"And I should see \"By Patrol\"","stepMatchArguments":[{"group":{"start":13,"value":"\"By Patrol\"","children":[{"start":14,"value":"By Patrol","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":16,"keywordType":"Outcome","textWithKeyword":"And I should see \"By Patrol & Event\"","stepMatchArguments":[{"group":{"start":13,"value":"\"By Patrol & Event\"","children":[{"start":14,"value":"By Patrol & Event","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end