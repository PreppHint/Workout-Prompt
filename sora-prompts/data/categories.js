/* ============================================================================
 * workout 2 Prompts — CATEGORY DEFINITIONS + data container
 * ----------------------------------------------------------------------------
 * Load this file BEFORE the per-category prompt files (see index.html).
 *
 * To ADD A NEW CATEGORY:
 *   1. Add an entry to the list below (unique "id", a "name", optional icon/tagline).
 *   2. Create  data/prompts/<id>.js  (copy an existing one as a starting point).
 *   3. Add a <script defer src="data/prompts/<id>.js"></script> tag in index.html.
 * ============================================================================ */
(function () {
  var data = (window.workout_PROMPTS_DATA = window.workout_PROMPTS_DATA || { updated: "", categories: [], prompts: [] });

  data.updated = "2026-07-14";

  data.categories = [
    {
      "id": "abs",
      "name": "Abs & Core",
      "icon": "🧘",
      "tagline": "Character sheets for abdominal and core exercises"
    },
    {
      "id": "arms",
      "name": "Arms & Upper Body",
      "icon": "💪",
      "tagline": "Character turnarounds for biceps and triceps training"
    },
    {
      "id": "back",
      "name": "Back & Lats",
      "icon": "🔙",
      "tagline": "Model turnarounds for back and posture training"
    },
    {
      "id": "chest",
      "name": "Chest & Pecs",
      "icon": "🫁",
      "tagline": "Character sheets for chest press and fly movements"
    },
    {
      "id": "legs",
      "name": "Legs & Lower Body",
      "icon": "🦵",
      "tagline": "Model sheets for leg, glute, and calf training"
    },
    {
      "id": "shoulders",
      "name": "Shoulder Exercises",
      "icon": "💆",
      "tagline": "Turnaround sheets for shoulder and deltoid training"
    }
  ];
})();
