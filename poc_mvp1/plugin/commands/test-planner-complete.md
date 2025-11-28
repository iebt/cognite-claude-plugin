Update @TestPlan.md to create a structured and actionable test-generation plan for this project
This plan will later be executed by an automated Test-Agent, step-by-step, to generate new tests.

## Analysis Required

1. **Run coverage analysis first** to identify files with no or low test coverage
2. **Identify the main source projects** (exclude test projects, migrations, generated code)
3. **Categorize untested code by priority:**
   - **Critical**: Business logic, domain services, validators, calculations
   - **High**: API controllers, command/query handlers, repositories
   - **Ignore (do not add to the plan)**: Mappers, DTOs with logic, extension methods, Simple models, constants, configuration

## Output Format

Create a structured plan with:

### For each file/class needing tests:
- **File path**: Full path to the source file
- **Current coverage**: X% (or "none")
- **Priority**: Critical/High/Medium/Low
- **Reason**: Why this needs tests (e.g., "contains pricing calculation logic")
- **Suggested test cases**: List 3-5 specific scenarios to test
- **Dependencies to mock**: List services/repos that need mocking
- **Estimated complexity**: Simple/Medium/Complex

### Order the plan by:
1. Priority (Critical first)
2. Core domain logic before infrastructure
3. Files with zero coverage before low coverage

## Could do:

- Mocking dependencies via interfaces (e.g. Moq)
- Using FluentAssertions or similar to keep assertions clear
- Using data-driven tests where appropriate ([Theory] with [InlineData] for xUnit)

## Constraints

- Do not generate any test code yet—this prompt is only for the plan.
- Skip trivial code (empty constructors, auto-properties, simple DTOs without logic)
- Focus on business logic, not UI or trivial getters/setters.
- Each test case description should be specific enough that another agent can implement it without ambiguity
