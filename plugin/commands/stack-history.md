---
description: Search in the git tree and report if it ever used another .net version.
---

# .NET Version History Command

Search in the git tree and report if it ever used another .net version.

The output should be in the following format:

```
  ## .NET Version History:

  ### 1. .NET 6.0 - Initial version
    - From: October 11, 2022 (initial commit: 75ba081)
    - To: January 29, 2024
  ### 2. .NET 8.0 - Current version
    - Upgraded on: January 29, 2024 (commit: c656d9b)
    - Message: "Updating dotnet to 8.0 and sync project"
  ### 3. .NET 10.0 - Brief experimental upgrade (reverted)
    - Attempted on: August 21, 2025 (commit: 8eadabc)
    - Message: "Update all configuration files for .NET 10 upgrade"
    - Reverted shortly after due to build and test failures (commit:
  fbc898b)
    - Message: "Fix build and test failures by downgrading EF Core Tools and
   updating deprecated Azure App Configuration methods"
```
