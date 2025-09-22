# Belot Score Calculator

A small, offline web app for calculating and tracking scores in Belot (Belote) rounds.

## Features
- Team naming and per-round input
- Trick points, announcements, belote, capot, multiplier
- Fail rule configuration and rounding options
- History table and running totals
- Saves data in your browser (localStorage)

## Usage
1. Open `index.html` in a browser.
2. Set team names and options.
3. Enter per-round values and click "Add Round".
4. Use Undo or Reset as needed.

## Rules Assumptions
Belot has regional variants. This app assumes:
- Total trick points per deal are 162.
- Belote is 20 points (configurable).
- Capot adds an extra configurable bonus.
- If the taker fails to win more tricks than defense, the defender gets everything (configurable via Fail rule).
- Rounding can be off or applied at the end per team.

You can adjust options in the Settings panel. If you need different rules (e.g., announcement comparison, last trick, or different multipliers), open an issue or tweak `src/app.js`.

## Development
This is a static app. No build required.

## License
MIT# Belot_Calc

Belot easy to use calculator
