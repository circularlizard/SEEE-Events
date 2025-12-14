# What's next for this app

* Finish the member viewer, and member issues page
    * Test with real API calls
    * Also look at display flattening various section
* Review the members plan for items not implemented
* Update the architecture and other doc based on that implementation
* Review the React Query suggestion
* Sort out the UI flash on login
* Come up with a much more attractive landing page / dashboard
* Deploy it to vercel and try there

* Write a spec for the quartermaster function

* Flesh out the spec for the expedition planner function
    * Section leader role, storing patrol selection
    * How could we handle kit requirements - could this be done by a patrol, maybe writing back to a custom column
    * Possibly pin this to the SEEE section, so we can make assumptions about data structures
    * Maybe think about risk assessments?

* Training application
    * How are we going to store training records - custom badge would make most sense, because then we can look in an event to see who is lacking the badge
    * Need to think about how to create and deliver quizzes, and track completion. Could this be an app where we push data back to OSM? So data does not need to be held in vercel for very long.

* PDF download attendees per event, as record cards