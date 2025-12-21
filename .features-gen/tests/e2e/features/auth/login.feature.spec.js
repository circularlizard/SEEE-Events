// Generated from: tests/e2e/features/auth/login.feature
import { test } from "playwright-bdd";

test.describe('Authentication and Login Flow', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am on the login page', null, { page }); 
  });
  
  test('Unauthenticated user is redirected to login', { tag: ['@REQ-AUTH-01', '@REQ-AUTH-02', '@REQ-AUTH-03'] }, async ({ When, Then, And, page }) => { 
    await When('I navigate to "/dashboard"', null, { page }); 
    await Then('I should be on "/"', null, { page }); 
    await And('I should see "Sign in with OSM"', null, { page }); 
  });

  test('User selects Administrator role and logs in', { tag: ['@REQ-AUTH-01', '@REQ-AUTH-02', '@REQ-AUTH-03'] }, async ({ When, Then, And, page }) => { 
    await When('I click "Administrator"', null, { page }); 
    await And('I click the button "Sign in with OSM"', null, { page }); 
    await Then('I should be on "/dashboard"', null, { page }); 
  });

  test('User selects Standard Viewer role and logs in', { tag: ['@REQ-AUTH-01', '@REQ-AUTH-02', '@REQ-AUTH-03'] }, async ({ When, Then, And, page }) => { 
    await When('I click "Standard Viewer"', null, { page }); 
    await And('I click the button "Sign in with OSM"', null, { page }); 
    await Then('I should be on "/dashboard"', null, { page }); 
    await When('I navigate to "/dashboard/events"', null, { page }); 
    await Then('I should be on "/dashboard/events"', null, { page }); 
  });

  test('User returns to intended page after login', { tag: ['@REQ-AUTH-01', '@REQ-AUTH-02', '@REQ-AUTH-03', '@REQ-AUTH-12'] }, async ({ When, Then, And, page }) => { 
    await When('I navigate to "/dashboard/events"', null, { page }); 
    await Then('I should be on "/"', null, { page }); 
    await When('I click "Administrator"', null, { page }); 
    await And('I click the button "Sign in with OSM"', null, { page }); 
    await Then('I should be on "/dashboard"', null, { page }); 
    await When('I navigate to "/dashboard/events"', null, { page }); 
    await Then('I should be on "/dashboard/events"', null, { page }); 
  });

  test('Session expiry redirects to login and returns to intended page after re-login', { tag: ['@REQ-AUTH-01', '@REQ-AUTH-02', '@REQ-AUTH-03', '@REQ-AUTH-11', '@REQ-AUTH-12'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am logged in as an admin', null, { page }); 
    await When('I navigate to "/dashboard/events"', null, { page }); 
    await And('my session expires', null, { page }); 
    await Then('I should be on "/"', null, { page }); 
    await And('the callbackUrl should be "/dashboard/events"', null, { page }); 
    await When('I click "Administrator"', null, { page }); 
    await And('I click the button "Sign in with OSM"', null, { page }); 
    await Then('I should be on "/dashboard/events"', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('tests/e2e/features/auth/login.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":11,"tags":["@REQ-AUTH-01","@REQ-AUTH-02","@REQ-AUTH-03"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am on the login page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Action","textWithKeyword":"When I navigate to \"/dashboard\"","stepMatchArguments":[{"group":{"start":14,"value":"\"/dashboard\"","children":[{"start":15,"value":"/dashboard","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"Then I should be on \"/\"","stepMatchArguments":[{"group":{"start":15,"value":"\"/\"","children":[{"start":16,"value":"/","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"And I should see \"Sign in with OSM\"","stepMatchArguments":[{"group":{"start":13,"value":"\"Sign in with OSM\"","children":[{"start":14,"value":"Sign in with OSM","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":16,"pickleLine":17,"tags":["@REQ-AUTH-01","@REQ-AUTH-02","@REQ-AUTH-03"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am on the login page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":18,"keywordType":"Action","textWithKeyword":"When I click \"Administrator\"","stepMatchArguments":[{"group":{"start":8,"value":"\"Administrator\"","children":[{"start":9,"value":"Administrator","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":19,"keywordType":"Action","textWithKeyword":"And I click the button \"Sign in with OSM\"","stepMatchArguments":[{"group":{"start":19,"value":"\"Sign in with OSM\"","children":[{"start":20,"value":"Sign in with OSM","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":20,"keywordType":"Outcome","textWithKeyword":"Then I should be on \"/dashboard\"","stepMatchArguments":[{"group":{"start":15,"value":"\"/dashboard\"","children":[{"start":16,"value":"/dashboard","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":22,"pickleLine":23,"tags":["@REQ-AUTH-01","@REQ-AUTH-02","@REQ-AUTH-03"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am on the login page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":23,"gherkinStepLine":24,"keywordType":"Action","textWithKeyword":"When I click \"Standard Viewer\"","stepMatchArguments":[{"group":{"start":8,"value":"\"Standard Viewer\"","children":[{"start":9,"value":"Standard Viewer","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":24,"gherkinStepLine":25,"keywordType":"Action","textWithKeyword":"And I click the button \"Sign in with OSM\"","stepMatchArguments":[{"group":{"start":19,"value":"\"Sign in with OSM\"","children":[{"start":20,"value":"Sign in with OSM","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":25,"gherkinStepLine":26,"keywordType":"Outcome","textWithKeyword":"Then I should be on \"/dashboard\"","stepMatchArguments":[{"group":{"start":15,"value":"\"/dashboard\"","children":[{"start":16,"value":"/dashboard","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":26,"gherkinStepLine":27,"keywordType":"Action","textWithKeyword":"When I navigate to \"/dashboard/events\"","stepMatchArguments":[{"group":{"start":14,"value":"\"/dashboard/events\"","children":[{"start":15,"value":"/dashboard/events","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":27,"gherkinStepLine":28,"keywordType":"Outcome","textWithKeyword":"Then I should be on \"/dashboard/events\"","stepMatchArguments":[{"group":{"start":15,"value":"\"/dashboard/events\"","children":[{"start":16,"value":"/dashboard/events","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":30,"pickleLine":31,"tags":["@REQ-AUTH-01","@REQ-AUTH-02","@REQ-AUTH-03","@REQ-AUTH-12"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am on the login page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":31,"gherkinStepLine":32,"keywordType":"Action","textWithKeyword":"When I navigate to \"/dashboard/events\"","stepMatchArguments":[{"group":{"start":14,"value":"\"/dashboard/events\"","children":[{"start":15,"value":"/dashboard/events","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":32,"gherkinStepLine":33,"keywordType":"Outcome","textWithKeyword":"Then I should be on \"/\"","stepMatchArguments":[{"group":{"start":15,"value":"\"/\"","children":[{"start":16,"value":"/","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":33,"gherkinStepLine":34,"keywordType":"Action","textWithKeyword":"When I click \"Administrator\"","stepMatchArguments":[{"group":{"start":8,"value":"\"Administrator\"","children":[{"start":9,"value":"Administrator","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":34,"gherkinStepLine":35,"keywordType":"Action","textWithKeyword":"And I click the button \"Sign in with OSM\"","stepMatchArguments":[{"group":{"start":19,"value":"\"Sign in with OSM\"","children":[{"start":20,"value":"Sign in with OSM","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":35,"gherkinStepLine":36,"keywordType":"Outcome","textWithKeyword":"Then I should be on \"/dashboard\"","stepMatchArguments":[{"group":{"start":15,"value":"\"/dashboard\"","children":[{"start":16,"value":"/dashboard","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":36,"gherkinStepLine":37,"keywordType":"Action","textWithKeyword":"When I navigate to \"/dashboard/events\"","stepMatchArguments":[{"group":{"start":14,"value":"\"/dashboard/events\"","children":[{"start":15,"value":"/dashboard/events","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":37,"gherkinStepLine":38,"keywordType":"Outcome","textWithKeyword":"Then I should be on \"/dashboard/events\"","stepMatchArguments":[{"group":{"start":15,"value":"\"/dashboard/events\"","children":[{"start":16,"value":"/dashboard/events","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":40,"pickleLine":41,"tags":["@REQ-AUTH-01","@REQ-AUTH-02","@REQ-AUTH-03","@REQ-AUTH-11","@REQ-AUTH-12"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am on the login page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":41,"gherkinStepLine":42,"keywordType":"Context","textWithKeyword":"Given I am logged in as an admin","stepMatchArguments":[]},{"pwStepLine":42,"gherkinStepLine":43,"keywordType":"Action","textWithKeyword":"When I navigate to \"/dashboard/events\"","stepMatchArguments":[{"group":{"start":14,"value":"\"/dashboard/events\"","children":[{"start":15,"value":"/dashboard/events","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":43,"gherkinStepLine":44,"keywordType":"Action","textWithKeyword":"And my session expires","stepMatchArguments":[]},{"pwStepLine":44,"gherkinStepLine":45,"keywordType":"Outcome","textWithKeyword":"Then I should be on \"/\"","stepMatchArguments":[{"group":{"start":15,"value":"\"/\"","children":[{"start":16,"value":"/","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":45,"gherkinStepLine":46,"keywordType":"Outcome","textWithKeyword":"And the callbackUrl should be \"/dashboard/events\"","stepMatchArguments":[{"group":{"start":26,"value":"\"/dashboard/events\"","children":[{"start":27,"value":"/dashboard/events","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":46,"gherkinStepLine":47,"keywordType":"Action","textWithKeyword":"When I click \"Administrator\"","stepMatchArguments":[{"group":{"start":8,"value":"\"Administrator\"","children":[{"start":9,"value":"Administrator","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":47,"gherkinStepLine":48,"keywordType":"Action","textWithKeyword":"And I click the button \"Sign in with OSM\"","stepMatchArguments":[{"group":{"start":19,"value":"\"Sign in with OSM\"","children":[{"start":20,"value":"Sign in with OSM","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":48,"gherkinStepLine":49,"keywordType":"Outcome","textWithKeyword":"Then I should be on \"/dashboard/events\"","stepMatchArguments":[{"group":{"start":15,"value":"\"/dashboard/events\"","children":[{"start":16,"value":"/dashboard/events","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end