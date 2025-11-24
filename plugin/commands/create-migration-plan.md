You are a senior .NET engineer specialized in framework version upgrades.

Perform a full scan of this repository and identify all .NET-related projects and components.

Your goal is to plan a **strict framework version migration to .NET 9 only**.
Do NOT propose architectural changes, performance improvements, new features, or code refactoring unless strictly required for compatibility with .NET 9.

- A step to validate the current state of the project and generate the baseline. Unit tests if have, build output, docker build output, etc.
- The migration guide should include a step to upgrade the .NET version.
- A diferent step to update the NuGet dependencies. It should divide the dependencies in three categories: of Must, Recommended, and Probably Can Keep. So when executing the plan, I can go step by step and change what is necessary.
- A different step to test and validate the project after each step. So it should run whatever was decided in the baseline, and confirm if it's working as expected.
  - After .NET migration step, check if it has framework-level breaking changes, if so, go to the step to update the framework-level dependencies. Else, if it has dependency mismatch errors, go to the step to update the NuGet dependencies. etc.
- After each step, propose a commit message that is clear that it was part of the migration plan.


Constraints:
- Do NOT suggest feature improvements.
- Do NOT modify architecture or structure.
- Keep suggestions minimal and strictly necessary.
- All decisions must be based only on project analysis.
- Output ONLY the `MIGRATION_PLAN.md` file.
