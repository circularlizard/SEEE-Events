import json
import os
import re
import ast
import random
from pathlib import Path
from typing import Dict, List, Any

# --- Configuration ---
INPUT_DIR = Path("reference_data")
OUTPUT_DIR = Path("src/mocks/data")

# Complete Mapping
FILE_MAPPING = {
    # Core
    "getmembers.txt": "members.json",
    
    # Files that need Relational Sanitization (ID lookup -> Name Update)
    "getPatrols.txt": "patrols.json",
    "getEvents.txt": "events.json",
    "getFlexiRecordData.txt": "flexi_data.json",
    "getBadgeByPerson.txt": "badge_assignments.json",
    "getEventAttendance.txt": "attendance.json",
    "getEventDetails.txt": "event_details.json",
    "getEventSummary.txt": "event_summary.json",
    "getEventSummary2.txt": "event_summary_2.json",
    
    # Structure / Definitions (Pass-through)
    "getFlexiRecordStructure.txt": "flexi_structure.json",
    "getFlexiRecords.txt": "flexi_definitions.json",
    "getBadgeRecord.txt": "badge_records.json",
    
    # Startup / Config (Blind Replace)
    "getStartupData.txt": "startup_data.json",
    "getStartupConfig.txt": "startup_config.json",
    
    # Ignored / Stubbed
    "memberImage.txt": "images.json",
    "README.md": None,
}

# Realistic Mock Names
FIRST_NAMES = [
    "James", "Olivia", "David", "Emma", "Michael", "Sarah", "Robert", "Charlotte",
    "William", "Amelia", "Thomas", "Mia", "Daniel", "Harper", "Matthew", "Evelyn"
]
LAST_NAMES = [
    "Smith", "Johnson", "Brown", "Taylor", "Wilson", "Evans", "Thomas", "Roberts",
    "Walker", "Wright", "Robinson", "Thompson", "White", "Hughes", "Edwards", "Green"
]

class DataSanitizer:
    def __init__(self):
        # Map: Real_ID -> { first_name, last_name, full_name }
        self.member_map: Dict[str, Dict[str, str]] = {}
        
    def ensure_output_dir(self):
        if not OUTPUT_DIR.exists():
            os.makedirs(OUTPUT_DIR)
            print(f"📂 Created output directory: {OUTPUT_DIR.resolve()}")

    # --- Parsing Utilities ---

    def extract_payload(self, text: str) -> str:
        """Finds the first '{' or '[' and the last '}' or ']'."""
        start_match = re.search(r'[\{\[]', text)
        if not start_match: return ""
        
        start_idx = start_match.start()
        end_idx = -1
        for i in range(len(text) - 1, start_idx, -1):
            if text[i] in ['}', ']']:
                end_idx = i + 1
                break
        
        return text[start_idx:] if end_idx == -1 else text[start_idx:end_idx]

    def parse_content(self, filename: str, text: str) -> Any:
        clean_text = self.extract_payload(text)
        if not clean_text: return None

        # Attempt 1: JSON
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError:
            pass

        # Attempt 2: JS Object
        clean_text = re.sub(r'\btrue\b', 'True', clean_text)
        clean_text = re.sub(r'\bfalse\b', 'False', clean_text)
        clean_text = re.sub(r'\bnull\b', 'None', clean_text)
        
        try:
            return ast.literal_eval(clean_text)
        except Exception:
            return None

    def load_file_content(self, filename: str) -> Any:
        file_path = INPUT_DIR / filename
        if not file_path.exists(): return None
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                return self.parse_content(filename, f.read())
        except Exception as e:
            print(f"    ❌ Error reading {filename}: {e}")
            return None

    def save_json_file(self, filename: str, data: Any):
        if data is None: return
        with open(OUTPUT_DIR / filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str)
        print(f"    ✅ Generated: {filename}")

    # --- Sanitization Logic ---

    def generate_identity(self, real_id: str, idx: int) -> Dict[str, str]:
        """Deterministically generates a name based on the ID/Index."""
        # Calculate seed based on ID if possible, else index
        seed = int(real_id) if real_id.isdigit() else idx
        
        first = FIRST_NAMES[seed % len(FIRST_NAMES)]
        last = LAST_NAMES[seed % len(LAST_NAMES)]
        
        return {
            "first_name": first,
            "last_name": last,
            "full_name": f"{first} {last}"
        }

    def process_members(self, raw_data: Any) -> List[Dict]:
        """
        STEP 1: Parse getMembers.txt, build the ID Map, and return sanitized list.
        Only updates Name fields. Preserves Patrols/Refs.
        """
        sanitized_list = []
        items = raw_data.get('items', []) if isinstance(raw_data, dict) else raw_data
        
        if not items: return []
        if not isinstance(items, list): items = [items]

        print(f"    ℹ️  Found {len(items)} members. Building Identity Map...")

        for idx, member in enumerate(items):
            # 1. Identify ID
            real_id = str(member.get('scout_id', member.get('id', idx)))
            
            # 2. Generate Safe Identity
            identity = self.generate_identity(real_id, idx)
            
            # 3. Store in Map
            self.member_map[real_id] = identity

            # 4. Create Sanitized Record
            new_member = member.copy()
            
            # STRICTLY update only specified name fields if they exist
            # We also proactively set them to ensure consistency across the app
            new_member['firstname'] = identity['first_name']
            new_member['first_name'] = identity['first_name']
            new_member['lastname'] = identity['last_name']
            new_member['last_name'] = identity['last_name']
            
            # Handle 'name' or 'full_name'
            if 'name' in new_member: new_member['name'] = identity['full_name']
            new_member['full_name'] = identity['full_name']

            sanitized_list.append(new_member)
            
        return sanitized_list

    def sanitize_startup(self, raw_data: Any) -> Any:
        """
        Blindly replaces name fields in startup data without looking up IDs.
        """
        if isinstance(raw_data, dict):
            new_data = raw_data.copy()
            if 'firstname' in new_data or 'first_name' in new_data:
                new_data['firstname'] = "Admin"
                new_data['first_name'] = "Admin"
            if 'lastname' in new_data or 'last_name' in new_data:
                new_data['lastname'] = "User"
                new_data['last_name'] = "User"
            if 'fullname' in new_data or 'full_name' in new_data:
                new_data['fullname'] = "Admin User"
                new_data['full_name'] = "Admin User"
            
            # Recurse
            for k, v in new_data.items():
                if isinstance(v, (dict, list)):
                    new_data[k] = self.sanitize_startup(v)
            return new_data
            
        elif isinstance(raw_data, list):
            return [self.sanitize_startup(i) for i in raw_data]
            
        return raw_data

    def sanitize_relational_data(self, data: Any) -> Any:
        """
        Recursive Walker.
        Finds objects with 'scout_id'/'member_id' and injects the mocked names from self.member_map.
        """
        if isinstance(data, dict):
            new_data = data.copy()
            
            # 1. Check if this object represents a person we know
            found_id = None
            for id_key in ['scout_id', 'scoutid', 'member_id', 'memberid']:
                if id_key in new_data and str(new_data[id_key]) in self.member_map:
                    found_id = str(new_data[id_key])
                    break
            
            # 2. If ID match found, overwrite ONLY name fields
            if found_id:
                identity = self.member_map[found_id]
                
                if 'firstname' in new_data or 'first_name' in new_data:
                    new_data['firstname'] = identity['first_name']
                    new_data['first_name'] = identity['first_name']
                
                if 'lastname' in new_data or 'last_name' in new_data:
                    new_data['lastname'] = identity['last_name']
                    new_data['last_name'] = identity['last_name']
                    
                if 'name' in new_data or 'full_name' in new_data:
                    new_data['name'] = identity['full_name']
                    new_data['full_name'] = identity['full_name']

            # 3. Flexi-Data Specific Logic (Scrub custom columns)
            # This logic is kept because Flexi Data often contains medical info (PII)
            if 'col_' in str(new_data.keys()):
                mock_groups = ["Group A", "Group B", "Group C"]
                for k, v in new_data.items():
                    if k.startswith('col_') and v:
                        if len(str(v)) < 15: # Likely a group name -> Keep it (Reference)
                            pass 
                        else: # Likely notes -> Scrub PII
                            new_data[k] = None

            # 4. Recurse into children
            for k, v in new_data.items():
                if isinstance(v, (dict, list)):
                    new_data[k] = self.sanitize_relational_data(v)
                    
            return new_data

        elif isinstance(data, list):
            return [self.sanitize_relational_data(item) for item in data]

        return data

    def run(self):
        print(f"🚀 Starting Sanitizer...")
        self.ensure_output_dir()
        
        # STEP 1: Process Members to build the Map
        print("\n--- Step 1: Processing Members (Master List) ---")
        members_raw = self.load_file_content("getmembers.txt")
        if members_raw:
            clean_members = self.process_members(members_raw)
            self.save_json_file("members.json", clean_members)
        else:
            print("❌ Critical: Could not load getmembers.txt")
            return

        # STEP 2: Process Everything Else
        print("\n--- Step 2: Processing Linked Files ---")
        
        for input_file, output_file in FILE_MAPPING.items():
            if input_file == "getmembers.txt" or output_file is None: continue
            
            raw = self.load_file_content(input_file)
            if raw is None: continue

            if input_file in ["getStartupData.txt", "getStartupConfig.txt"]:
                # Blind replace
                clean = self.sanitize_startup(raw)
            elif input_file == "memberImage.txt":
                clean = []
            else:
                # Relational Lookup
                clean = self.sanitize_relational_data(raw)

            self.save_json_file(output_file, clean)

        print("\n✨ Done.")

if __name__ == "__main__":
    sanitizer = DataSanitizer()
    sanitizer.run()