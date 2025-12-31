## Login

* The current selector is too complicated. We should simply show 3 cards
    * Expedition viewer
        * Needs only read access to events
        * Does not need access to members, patrols, flexi, programme
        * Tied to the SEEE section
    * Expedition planner
        * Needs at least read access to members, events, patrols, flexi, programme, badges
        * with potential future write access based on OSM permissions returned in the startup data
        * Will also include data quality viewer
        * Populates patrol cache
        * Tied to the SEEE section
    * OSM data quality viewer
        * Needs at least read access to members, events, patrols, flexi, programme, badges
        * Populates patrol cache
        * Uses section selector - not tied to the SEEE section
        * Main view is data quality view
    * Platform admin
        * Doesn't hydrate any data, but can 
        * Cache views, API tests, debug etc
        * No section selector
        * Needs read access to members to populate patrol cache


## General

* Need to make sure rate limit backoff is working
* Add Rate limiting display to the UI, so we can see what is happening
* SEEE section is going to create ~500 API calls on load - need to make sure this doesn't cause issues. Perhaps this needs to be broken down somehow
* Does it make sense for the Redis cache to be shared between users?

## User - Standard

### App - Multi-section viewer

* User only has events access, so the bulk of the application won't work
* Section picker is displayed first, but there is a long flash of the dashboard before it loads
* Section drop down doesn't reflect selection in drop down in the sidebar
* Sidebar only shows event views as in the expedition viewer
* This user / app combination is not needed

### App - Expedition viewer

* There should ony be standard users for the Expedition Viewer app
* Members don't hydrate - need to check error handling around that
    * With Real API calls, events hydrate and no error is 
* Homepage should be attendance by person
    * Look at refactoring to show a card view by patrol to start, with a drill in to show the attendance by person in that patrol
* No need for section selector, should be SEEE only
* Once the expedition planner is done, we will need to add views based on walking groups and tent groups
* Cached patrol names aren't used

## User - Administrator

### App - Event Planner

* Section selector not shown - defaulting to SEEE section OK
* Section drop down not required
* Member and event hydration appears to work OK - need to review Redis cache times and whether these are shared between users
* No sidebar navigation
* We see a load of cache hits, and hydration happens a load faster on 2nd login - this is good
* This app needs to be specified and built

### App - Platform Admin

* Doesn't show data loading toolbar
* Name of admin page is wrong, shouldn't be "patrol data"

### App - Multi-section viewer

* Section selector is properly shown
* Progress bar isn't working as expected, even though server logs show API calls
* People display properly updates as data is loaded, though
* Cache does not appear to be used though
* NextJS issue on member data issues page - could be because I navigated away before all of the people were loaded. Need to be resilient to this.
* Eventually, rate limits are hit - need to be resilient to this and display helpful error messages. 
* Logs show repeated 429 errors - need to back off in this case and not keep processing queue
* Need mock data to have data issues