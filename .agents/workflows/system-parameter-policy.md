---
description: System Setup and Parameter Enforcement Policy
---

# 🧠 The "Memory-Not-Code" Parameter Policy

**CRITICAL RULE FOR ALL FUTURE DEVELOPMENT:**

Before building, modifying, or adding ANY new module, UI element, business logic, or feature in SMRITI-OS, you must strictly adhere to the following workflow. Hardcoding business rules directly into typescript or retail logic is strictly forbidden. 

## Workflow Steps:

1. **Analyze Requirements For Variability**
   Before you write a component, ask: *"Could a business owner ever want to toggle this feature on/off, change its label, or dictate its behavior?"*
   - Example: Adding a new generic field? Its caption should be parameterized.
   - Example: Adding a validation rule? Whether the validation blocks the user or just warns them should be parameterized.

2. **Check Existing System Parameters**
   Always check `system_parameters_new` (or similar DB schema parameters) before adding new logic to see if a flag already exists to control the behavior.

3. **Define New Parameters (If Necessary)**
   If a rule or variable doesn't exist, you MUST first add it to the database initialization schema (`d:\IMP\GitHub\smriti-os\frontend\src\lib\db.ts` -> `syncSchema` / `seed` logic) as a new `system_parameters` entry.
   - Ensure you provide a `param_key`, `param_value`, `category`, `attribute_type` (e.g. Variable, Installation), and `description`.
   - Ensure boolean-like flags are stored as string `'1'` (enabled) or `'0'` (disabled).

4. **Integrate into the System Setup Manager**
   Once added to the Data Layer, ensure the global `SystemSetupManager.tsx` UI naturally picks it up so the business owner can edit it without a code deployment. 

5. **Consume via `parameterService`**
   In the new frontend UI or Service logic, use `parameterService.getParam('Category', 'param_key', 'fallback_value')` to drive the logic. NEVER hardcode the value. 

*By following this policy, Smriti-OS guarantees that 100% of business logic is driven by the Sovereign memory layer, achieving full Shoper-9 enterprise parity.*
