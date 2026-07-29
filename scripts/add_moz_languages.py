#!/usr/bin/env python3
"""
Generate Mozambican Bantu language translation files from pt.json.
Each file is a copy of pt.json with common.* keys replaced by native translations.
All other keys fall back to Portuguese.
"""

import json
import copy
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
I18N_DIR = os.path.join(BASE_DIR, "src", "i18n")
PT_PATH = os.path.join(I18N_DIR, "pt.json")

# Translations for each language: only the common.* keys that differ from Portuguese
TRANSLATIONS = {
    "emk": {
        "common": {
            "welcome": "Oluwisa",
            "good_morning": "Mwaetsirya",
            "good_afternoon": "Mwaswiri",
            "good_night": "Mwalelo",
            "loading": "Olopera...",
            "error": "Wali khwalala",
            "save": "Sungulula",
            "cancel": "Rula",
            "back": "Rudzirayi",
            "confirm": "Tadikilisa",
            "pay": "Kholera",
            "doctor": "Mundrhaka",
            "pharmacy": "Lapita ya mankhwala",
            "search": "Sangula",
            "more": "Ochirichira",
            "edit": "Sungululayi",
            "close": "Tsekera",
            "retry": "Yenya kakale",
            "refresh": "Sasaula",
            "view_details": "Wonika mawu awusi",
        }
    },
    "tsn": {
        "common": {
            "welcome": "Wamukelekile",
            "good_morning": "Dzoboka mhaka",
            "good_afternoon": "Masiswari",
            "good_night": "Nihlekisela",
            "loading": "Ku langa...",
            "error": "Ku tiyiselekeni",
            "save": "Hlayisa",
            "cancel": "Khansela",
            "back": "Talela",
            "confirm": "Tiyisisa",
            "pay": "Kholera",
            "doctor": "Mudokhota",
            "pharmacy": "Lapa ya mihwari",
            "search": "Tsangula",
            "more": "Tin'hwanyi",
            "edit": "Lulamisa",
            "close": "Tlata",
            "retry": "Yenya nakale",
            "refresh": "Pfidzula",
            "view_details": "Komba mahantlhelo",
        }
    },
    "seh": {
        "common": {
            "welcome": "Mwabvelwa",
            "good_morning": "Mangwana",
            "good_afternoon": "Masikhi",
            "good_night": "Manhji",
            "loading": "Kupanga...",
            "error": "Chilangabwe chilichile",
            "save": "Sangulira",
            "cancel": "Kangana",
            "back": "Nudzirayi",
            "confirm": "Tadikilesa",
            "pay": "Khulera",
            "doctor": "Mudokhota",
            "pharmacy": "Lapa ya mankhwala",
            "search": "Sangula",
            "more": "Ongana",
            "edit": "Lulamisa",
            "close": "Tsekera",
            "retry": "Yenya kakale",
            "refresh": "Sasaula",
            "view_details": "Wonetsa makhalo",
        }
    },
    "elo": {
        "common": {
            "welcome": "Mwabwelwa",
            "good_morning": "Mwatsanga",
            "good_afternoon": "Mwasikilamu",
            "good_night": "Mwalijio",
            "loading": "Kupanga...",
            "error": "Chilangabwe chilichile",
            "save": "Sungulula",
            "cancel": "Lula",
            "back": "Nutsilayi",
            "confirm": "Tadikilesa",
            "pay": "Kulera",
            "doctor": "Mudokota",
            "pharmacy": "Lapa ya mankhwala",
            "search": "Sangula",
            "more": "Okhulupirira",
            "edit": "Sungululayi",
            "close": "Tsekera",
            "retry": "Yenya kakale",
            "refresh": "Sasaula",
            "view_details": "Wonetsa mawu",
        }
    },
    "chw": {
        "common": {
            "welcome": "Mwabvelwa",
            "good_morning": "Mwatsangana",
            "good_afternoon": "Mwasikhalamu",
            "good_night": "Mwalijio",
            "loading": "Kupanga...",
            "error": "Chilangabwe chilichile",
            "save": "Sungulula",
            "cancel": "Lula",
            "back": "Nutsilayi",
            "confirm": "Tadikilesa",
            "pay": "Kulera",
            "doctor": "Mudokhota",
            "pharmacy": "Lapa ya mankhwala",
            "search": "Sangula",
            "more": "Okhulupirira",
            "edit": "Sungululayi",
            "close": "Tsekera",
            "retry": "Yenya kakale",
            "refresh": "Sasaula",
            "view_details": "Wonetsa mawu",
        }
    },
}


def deep_merge(base: dict, overlay: dict) -> dict:
    """Recursively merge overlay into base, replacing only keys present in overlay."""
    result = copy.deepcopy(base)
    for key, value in overlay.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def main():
    # Read pt.json
    with open(PT_PATH, "r", encoding="utf-8") as f:
        pt_data = json.load(f)

    print(f"Read pt.json: {len(pt_data)} top-level keys")

    for lang_code, lang_translations in TRANSLATIONS.items():
        # Deep merge: start with Portuguese, overlay native translations
        merged = deep_merge(pt_data, lang_translations)

        output_path = os.path.join(I18N_DIR, f"{lang_code}.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)

        # Count how many common keys were actually replaced
        native_count = len(lang_translations.get("common", {}))
        total_common = len(pt_data.get("common", {}))
        print(f"Created {output_path}: {native_count}/{total_common} common keys translated, "
              f"rest falls back to Portuguese")

    print("\nDone! Created 5 Mozambican Bantu language files.")


if __name__ == "__main__":
    main()
