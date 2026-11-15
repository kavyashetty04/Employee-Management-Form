# Employee Management Form — JsonPowerDB

A responsive Employee Management Form built with HTML, CSS, Bootstrap, JavaScript, jQuery and JsonPowerDB.

## Database configuration

- Database: `EMP-DB`
- Relation: `EmpData`
- Fields: `id`, `name`, `salary`, `hra`, `da`, `deduction`
- Primary key: `id`

## Setup

1. Create the `EMP-DB` database in your JsonPowerDB account.
2. Generate your connection token from the JPDB dashboard.
3. Open `script.js` and replace `PASTE_YOUR_CONNECTION_TOKEN_HERE` with your own connection token.
4. Keep the API base URL as `https://api.login2explore.com:5577`.
5. Open `index.html` using a local development server such as VS Code Live Server.

## Form workflow

- On page load, only Employee ID is enabled.
- When an ID is not found, the form enables the remaining fields and the Save and Reset buttons.
- When an ID exists, its details are loaded, Employee ID remains locked, and the Change and Reset buttons are enabled.
- Save inserts a new record using JPDB PUT.
- Change updates the existing record using JPDB UPDATE.
- Reset clears the form and returns focus to Employee ID.
- All six fields are mandatory. Salary components and deductions must be non-negative numbers.

## Project files

- `index.html` — page structure and Bootstrap layout
- `style.css` — responsive visual design
- `script.js` — validation, form state, and JsonPowerDB API operations
