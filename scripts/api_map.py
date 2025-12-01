import os
import json
import re
from pathlib import Path
from urllib.parse import urlparse, parse_qs

# --- Configuration ---
INPUT_DIR = Path("reference_data")
OUTPUT_FILE = Path("src/mocks/api_map.json")

# Link inputs to their sanitized JSON outputs
SANITIZED_MAPPING = {
    "getmembers.txt": "members.json",
    "getPatrols.txt": "patrols.json",
    "getEvents.txt": "events.json",
    "getStartupData.txt": "startup_data.json",
    "getStartupConfig.txt": "startup_config.json",
    "getFlexiRecordStructure.txt": "flexi_structure.json",
    "getFlexiRecords.txt": "flexi_definitions.json",
    "getFlexiRecordData.txt": "flexi_data.json",
    "getBadgeByPerson.txt": "badge_assignments.json",
    "getEventAttendance.txt": "attendance.json",
    "getEventDetails.txt": "event_details.json",
    "getEventSummary.txt": "event_summary.json",
    "getEventSummary2.txt": "event_summary_2.json",
    "getBadgeRecord.txt": "badge_records.json",
    "getBadges.txt": "badges.json",
    # Added: Maps the image URL structure to the mock image lookup table
    "memberImage.txt": "images.json", 
}

def generate_api_map():
    if not INPUT_DIR.exists():
        print(f"❌ Error: {INPUT_DIR} does not exist.")
        return

    api_map = []
    
    print(f"🔍 Scanning {INPUT_DIR} for API URLs...")

    for filename in os.listdir(INPUT_DIR):
        if not filename.endswith(".txt"):
            continue

        file_path = INPUT_DIR / filename
        
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                first_line = f.readline().strip()
                
                # Check if line looks like a URL
                if first_line.startswith("http") or first_line.startswith("GET"):
                    
                    # Clean up "GET " prefix if present
                    raw_url = first_line.replace("GET ", "").strip()
                    parsed = urlparse(raw_url)
                    query_params = parse_qs(parsed.query)
                    
                    # OSM Specific: Extract 'action' if it exists
                    action_name = query_params.get('action', [None])[0]
                    
                    # Determine target mock file
                    mock_file = SANITIZED_MAPPING.get(filename)
                    
                    if mock_file:
                        entry = {
                            "original_file": filename,
                            "mock_data_file": mock_file,
                            "full_url": raw_url,
                            "path": parsed.path,
                            "method": "GET", 
                            "action": action_name, # Will be null for memberImage.txt
                            "query_params": query_params,
                            # Helper flag for MSW generator
                            "is_static_resource": filename == "memberImage.txt"
                        }
                        api_map.append(entry)
                        
                        log_tag = f"action='{action_name}'" if action_name else f"path='{parsed.path}'"
                        print(f"  ✅ Mapped {filename} -> {log_tag}")
                    else:
                        print(f"  ⚠️  Skipping {filename} (No sanitized target defined)")

        except Exception as e:
            print(f"  ❌ Error reading {filename}: {e}")

    # Ensure output dir exists
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(api_map, f, indent=2)
        
    print(f"\n✨ API Map generated at: {OUTPUT_FILE}")
    print("   (Use this file to configure src/mocks/handlers.ts)")

if __name__ == "__main__":
    generate_api_map()