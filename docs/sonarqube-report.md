# SkyNode SonarQube Code Quality Report

## Document Information

| Field | Value |
| --- | --- |
| Project | SkyNode travel planning application |
| Report type | Static code analysis and remediation report |
| Tool | SonarQube Community Build |
| Analysis mode | Local Docker-based SonarQube analysis |
| Project key | `skynode` |
| Main source directory | `src` |
| Test directory | `tests` |
| Report date | June 4, 2026 |

## 1. Introduction

This report documents the static code analysis process performed on the SkyNode application using SonarQube. SkyNode is a full-stack travel planning platform that includes a React/Vite frontend, a Node/Express backend, database repositories, third-party API integrations, itinerary generation, flight search, travel missions, and trip collaboration features.

The purpose of this analysis was to evaluate the project from the perspective of maintainability, reliability, security, duplication, and new-code quality. The report follows the analysis timeline shown in the SonarQube screenshots: initial analysis, issue triage, quality gate configuration, high-severity issue remediation, security hotspot remediation, and final overview.

SonarQube was used as a local quality assurance tool to measure and improve the quality of the SkyNode codebase. The analysis helped identify maintainability issues, reliability risks, duplication, and security hotspots, and it provided a structured way to verify that the codebase improved after remediation. Automated tests and production builds remain the main deployment gates, while SonarQube documents the static quality review performed on the project.

## 2. Analysis Environment

SonarQube was executed locally using Docker. The project configuration is stored in `sonar-project.properties`, and the SonarQube server is defined in `docker-compose.sonar.yml`.

### SonarQube configuration

| Configuration item | Value |
| --- | --- |
| SonarQube runtime | Docker container |
| Project name | SkyNode |
| Project key | `skynode` |
| Source analysis | `src` |
| Test analysis | `tests` |
| Excluded folders | `dist`, `node_modules`, `coverage`, `docs`, `assets`, `debug` |
| Quality gate | `SkyNode Quality Gate` |

### Quality gate strategy

A custom quality gate named `SkyNode Quality Gate` was created to match the current maturity of the project. The goal was to keep the project professional and strict on new code without blocking deployment because of unavailable coverage reporting.

The custom quality gate focused on:

- zero new issues;
- all new security hotspots reviewed;
- duplicated lines on new code not greater than 3.0%.

Coverage was intentionally not used as a blocking condition at this stage because SonarQube showed `0.0%` coverage due to missing LCOV coverage import, even though the project has automated unit, integration, and database tests. Coverage can be added later after the test runner exports a coverage report.

## 3. Initial Analysis

The first SonarQube analysis provided a baseline view of the overall project quality. The project had approximately 22k lines of code and the Quality Gate was passing on the overall view, but the issue list showed a significant amount of technical debt.

### Initial overview metrics

| Metric | Initial result |
| --- | ---: |
| Total issues | 420 |
| High severity issues | 32 |
| Security open issues | 1 |
| Reliability open issues | 40 |
| Maintainability open issues | 380 |
| Security hotspots | 19 |
| Security hotspot rating | E |
| Coverage | 0.0% |
| Duplications | 2.4% |
| Lines of code | Approximately 22k |

### Initial issue distribution

The issue page showed 420 total issues. Out of these, 32 issues were classified as high severity. Most high issues were related to maintainability and adaptability, especially excessive cognitive complexity and deeply nested functions.

The most important high-severity categories were:

- React components with high cognitive complexity;
- deeply nested functions inside UI mapping and rendering logic;
- backend helper functions with complex branching;
- maintainability issues in shared route, repository, and parsing logic.

## 4. Quality Gate Creation

After reviewing the initial results, a custom quality gate was created for the project. The gate was named `SkyNode Quality Gate` and assigned as the default quality gate.

### Quality gate conditions

| Condition | Operator | Value |
| --- | --- | ---: |
| New issues | greater than | 0 |
| New security hotspots reviewed | less than | 100% |
| New duplicated lines (%) | greater than | 3.0% |

This gate is strict enough to prevent new quality degradation while remaining practical for the current state of the project. It avoids using coverage as a deployment blocker until proper coverage reporting is configured.

## 5. High-Severity Issue Remediation

The next remediation phase focused only on high-severity issues. This was the highest-impact step because high issues are the most likely to affect maintainability, future development, and review quality.

### Main files refactored

| File | Main problem | Remediation approach |
| --- | --- | --- |
| `src/client/components/ItineraryMap.tsx` | Deeply nested map and marker logic | Extracted marker, route, geocoding, and fallback-route helpers |
| `src/client/features/planner/ItineraryEditor.tsx` | Large nested editor rendering logic | Extracted day, activity row, city selector, icon picker, and field components |
| `src/client/features/planner/ItineraryTimeline.tsx` | Complex timeline rendering | Extracted day, activity, metadata, and icon selection helpers |
| `src/client/features/planner/PlannerHero.tsx` | Complex conditional action rendering | Extracted action buttons, tabs, visibility controls, and save/delete actions |
| `src/client/features/planner/TripSetupForm.tsx` | Nested ternary and wizard step logic | Extracted step status, step completion, and step button logic |
| `src/client/pages/AuthPage.tsx` | Complex signup/signin flow | Extracted validation and submission helpers |
| `src/client/pages/PlannerPage.tsx` | Nested itinerary editing operations | Extracted pure day/activity manipulation helpers |
| `src/client/pages/SearchResultsPage.tsx` | High cognitive complexity and nested callbacks | Extracted initial state parsing, flight grouping, filtering, sorting, and card rendering |
| `src/client/pages/TripDetailPage.tsx` | High cognitive complexity | Extracted hero actions, tabs, overview, itinerary, members, chat, settings, and delete modal components |
| `src/server/modules/geocoding/geocodingRoute.ts` | Complex route geocoding logic | Extracted geocode point resolution and boundary validation helpers |
| `src/server/modules/trips/tripSocialRepository.ts` | Complex notification/member update logic | Extracted member status notification helpers |
| `src/scrapingbee.ts` | Debug output path warning | Restricted debug output to project-local debug path and disabled it for Vercel |
| `src/server/infrastructure/database/schema.ts` | Sorting issue | Replaced default sort with deterministic `localeCompare` ordering |

### Result after high issue fixes

After the high-severity remediation, SonarQube no longer showed high-severity issues in the filtered issue list.

| Metric | Result after high issue remediation |
| --- | ---: |
| Total issues | 321 |
| High severity issues | 0 |
| Medium issues | 100 |
| Low issues | 236 |
| Reliability issues | 37 |
| Maintainability issues | 310 |
| Quality gate | Passed |

The remaining issues were mostly lower-severity maintainability recommendations, such as browser global usage, small JSX readability warnings, and non-critical refactoring suggestions.

## 6. Security Hotspot Review

After high-severity issues were resolved, the next priority was security hotspots. SonarQube reported 19 security hotspots, producing a security hotspot grade of E.

### Security hotspot distribution

| Hotspot category | Count |
| --- | ---: |
| Denial of Service (DoS) risk from regular expressions | 17 |
| Weak cryptography / pseudorandom generator usage | 2 |
| Total hotspots | 19 |

### DoS hotspot root cause

Most DoS hotspots came from regular expressions that SonarQube considered vulnerable to super-linear runtime due to backtracking. The flagged code was mostly used for:

- parsing assistant message lines;
- formatting flight clock times;
- parsing Kayak HTML extraction results;
- extracting JSON blocks from LLM responses;
- parsing Authorization headers;
- parsing durations, stops, and airport labels.

Although many of these expressions were used on short strings, the review treated the hotspots seriously and replaced them with deterministic linear parsing where possible.

### Weak cryptography root cause

Two hotspots were related to `Math.random()` usage:

- generating temporary client notification IDs;
- shuffling assistant quick prompts.

These were not used for authentication or cryptographic secrets, but they were still changed to stronger browser crypto APIs to satisfy the security review.

## 7. Security Hotspot Remediation

The security remediation focused on eliminating the hotspot sources rather than only marking them as safe.

### DoS remediation examples

| File | Previous risk | Remediation |
| --- | --- | --- |
| `src/client/pages/AssistantPage.tsx` | Regex parsing numbered and bullet lines | Replaced with `indexOf`, `slice`, `startsWith`, and character checks |
| `src/client/pages/SearchResultsPage.tsx` | Regex removing AM/PM suffix | Replaced with suffix-based string parsing |
| `src/extract.ts` | Regex parsing Kayak layovers, stations, and time ranges | Replaced with explicit string helpers such as `parseLayoverCity`, `parseTrailingAirportCode`, and `splitTimeRange` |
| `src/server/infrastructure/llm/ollamaClient.ts` | Regex extracting JSON block | Replaced with `indexOf` and `lastIndexOf` block extraction |
| `src/server/middleware/authMiddleware.ts` | Regex parsing bearer token | Replaced with `indexOf`, `slice`, and scheme comparison |
| `src/server/modules/chat/chatService.ts` | Regex extracting JSON object | Replaced with linear object block extraction |
| `src/server/modules/travel-missions/huggingFaceMissionValidator.ts` | Regex extracting JSON object | Replaced with linear object block extraction |
| `src/shared/flightParsing.ts` | Regex parsing clock, duration, and stops | Replaced with manual token scanning and character validation |

### Weak cryptography remediation

| File | Previous implementation | Remediation |
| --- | --- | --- |
| `src/client/components/GlobalTripNotifications.tsx` | `Math.random()` for notification IDs | Replaced with `crypto.randomUUID()` |
| `src/client/pages/AssistantPage.tsx` | `Math.random()` prompt shuffle | Replaced with `crypto.getRandomValues()` Fisher-Yates shuffle |

## 8. Final Analysis Result

After resolving high-severity issues and all security hotspots, the final SonarQube overview showed the project in a significantly improved state.

### Final overview metrics

| Metric | Final result |
| --- | ---: |
| Security open issues | 0 |
| Security rating | A |
| Reliability open issues | 37 |
| Reliability rating | C |
| Maintainability open issues | 296 |
| Maintainability rating | A |
| Security hotspots | 0 |
| Security hotspot rating | A |
| Accepted issues | 0 |
| Coverage | 0.0% |
| Duplications | 2.2% |
| Lines of code | Approximately 23k |
| Quality gate | Passed |

### New code status

| New-code metric | Final result |
| --- | ---: |
| New issues | 0 |
| Security hotspots | 0 |
| Duplicated lines | 2.23% |
| Coverage | 0.0% |
| Quality gate | Passed |

The final analysis still shows `0.0%` coverage because SonarQube has not yet been connected to an LCOV coverage report. This does not mean that tests are missing. The project includes automated unit tests, route integration tests, and database integration tests, but coverage export/import is planned as a later improvement.

## 9. Testing and Build Verification

After the remediation work, the project was verified using the existing automated test suite and production build.

### Verification commands

```powershell
npm test
npm run build
```

### Verification result

| Verification step | Result |
| --- | --- |
| Unit tests | Passed |
| Route integration tests | Passed |
| Database integration tests | Passed |
| Full test suite | Passed, 31/31 tests |
| Production build | Passed |

The production build still reports a Vite chunk-size warning. This warning is not a build failure and does not affect the SonarQube quality gate. It can be addressed later through code splitting or manual chunk configuration.

## 10. CI/CD Recommendation

For the current SkyNode project stage, the recommended CI/CD approach is:

```text
install dependencies -> run tests -> run production build -> deploy to Vercel
```

SonarQube can remain a manual/local quality assurance step and a documented part of the project quality process. This keeps the project professionally reviewed while allowing the deployment pipeline to focus on deterministic checks such as tests and production builds.

If SonarQube is later added to GitHub Actions as a blocking step, the recommended gate should focus on new-code quality:

- no new high or critical issues;
- no new security hotspots;
- duplicated lines on new code below 3%;
- coverage threshold only after LCOV reporting is configured.

## 11. Conclusion

The SonarQube analysis improved the SkyNode codebase by identifying high-priority maintainability issues and security hotspots before deployment automation. The remediation process reduced high-severity issues to zero, removed all 19 security hotspots, improved the security hotspot rating from E to A, and kept new-code quality at zero issues.

The final project state is suitable for a professional project report: the quality gate passes, security hotspots are resolved, duplication remains below the configured threshold, and all automated tests pass. Future improvements should focus on connecting test coverage reports to SonarQube and gradually reducing remaining low and medium maintainability issues.
