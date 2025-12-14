# QM App Requirements

## Purpose
We need to create and track and inventory of 100th Pentland and Bore Stane kit. That's so we know what we have, for insurance purposes, repair / replacement tracking, and to track what has been issued to whom.

### Issues to solve
* We don't have a central inventory of kit owned by the group / unit, and insurance is based on an educated guess.
* When issuing kit, it is up to the leader to track who has been issued what, so there is no way for another leader to find out where something is, or for the group/unit to know that centrally.
* Our future event calendar is in an WhatsApp group description, which is obscure.
* OSM provides a basic quartermaster feature, but it does not operate well across sections, has no checkout/checkin facility, is fiddly to update, and has no reservation capability.

## Assumptions
* All of the people who need to manage kit will have access to OSM, but not necessarily to the section holding the quartermaster lists.
* Leaders checking items in and out, and updating inventory, are likely to do so on their phone while at a meeting or working in the store.
* It has to be easier to use than creating a custom spreadsheet to track who has which tent.

## Functionality
### Inventory management
* Add / remove item to / from the inventory
* Manage inventory item data 
    * eg description, date purchased, value, ownership
    * Storage location
* Manage multiple storage locations
    * Transfer items between storage locations
* Manage inventory categories (eg Tents, Stoves)
* Item lifecycle - in and out of circulation, in need of / under repair
* Item status notes and maybe some photos
* Reporting
    * Inventory overview by category
    * Upcoming kit requirements by category
    * What is issued and to whom

### Kit issuance
* Check out an item to a person
    * One item to one person
    * Multiple items to one person
    * Transfer an item from one person to another
    * Note responsible section
* Check an item back into store
    * Prompt for condition
    * Check in multiple items at once
* Find items to check in / out in multiple ways
    * From the overall list, by type etc
    * From a location list
    * From the kit reserved or checked out for an event
    * From the list checked out to a person (transfer or check in only)
* View what is checked out where - by section, event, person, leader
* Download of lists of who has what

### Kit reservation
* Maintain a calendar of upcoming events
* Record what is required for the event
    * Specific items (eg Mess Tent)
    * Number of items of a specific category (eg X tents, Y stoves)
* Consolidated view of upcoming requirements
* Highlight capacity issues

### Reporting
* Inventory status report
    * Drill in by location, category, status, issuance
    * What is in need of repair
    * What is checked out where - by section, event, person, leader
* View inventory history
    * Audit log
* Report export - PDF or Spreadsheet, as appropriate

### User management
* All users use OSM login to access
* Management user
    * Manage inventory categories
    * Manage inventory locations
    * Manage inventory entries
* All users
    * Update any inventory item - status, add condition notes, storage location
    * All kit issuance features
    * All kit reservation features
    * All reporting features

### Auditing
* All updates tracked with who did them

## Dosign questions
* Can we build on top of the OSM QM feature?
    * Would this require all users to have access to that OSM section - can a user be given quartermaster access only?
    * Would be best, as it reduces dependency on a custom app
    * Would require trustees and other interested parties to have an OSM login
    * Need to investigate OM feature capabilities
    * Can OSM access be used to determine who has admin access?
* Should check in/out be done against section members (inc leaders) - if so, do we still need the ability to enter a free form person responsible (eg if kit is loaned outside the section)
    * What if a leader has access to multiple sections, do we need to get all of the people they _could_ issue to?
    * Typeahead when selecting?
    * How would we handle reporting if the user can't access a section?
* What data will we store outside of OSM?
    * Try to minimise and make it so this data can be lost without serious issue - might create inconvenience to recostruct reports
    * Spec will need to specifically record what data is stored where

## Non-functionals
* Most common feature will be checking kit in and out - this needs to be super easy on a phone
    * Easy to find items and issue them or check them back in
    * Easy to move from working with one item to the next one
* Second most common feature will be event planning / kit reservation
* Can assume data connection. No offline functionality