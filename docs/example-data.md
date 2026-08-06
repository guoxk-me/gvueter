# Example data contract

The demo data is deterministic business data, not a count of showcase cards. Stable IDs, explicit time-zone offsets, and fixed collection sizes make unit, E2E, and visual results reproducible.

## Coverage inventory

| Requirement                                  | Source-backed examples                                                                                                                                                                      | Verification                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Chinese, English, and long names             | `mockUsers` includes Chinese operators and the long English compliance reviewer                                                                                                             | `src/__tests__/users.spec.ts` queries the real MSW endpoint and asserts the long identity remains intact           |
| Long email and empty avatar                  | The compliance reviewer has a long regional email and intentionally omits `avatar`                                                                                                          | `src/__tests__/users.spec.ts` asserts both the API value and the absent optional field                             |
| Long file name                               | Content files include a long bilingual access-governance release note                                                                                                                       | `src/__tests__/content-admin.spec.ts` reads it through `/api/content-files`                                        |
| Active, disabled, locked, and pending states | The `account_status` dictionary includes active, suspended, locked, and pending-review business values; dictionary records and departments also exercise active/disabled management state   | `src/__tests__/dictionaries.spec.ts`, `src/__tests__/departments.spec.ts`                                          |
| Organization and permission relationships    | The company/product/engineering/platform-security branch reaches four levels; roles combine action/subject grants with all, department-tree, and self data scopes                           | `src/__tests__/departments.spec.ts`, `src/__tests__/roles.spec.ts`, `src/__tests__/users.spec.ts`                  |
| Boundary dates and time zones                | The long identity is stored at `2026-06-30T09:30:00-07:00`, which crosses into July in `Asia/Shanghai`                                                                                      | `src/__tests__/users.spec.ts`, `src/__tests__/display-format.spec.ts`                                              |
| Money, percentages, and empty values         | Table work orders contain amounts up to 420,000; monitoring contains uptime and cache-hit percentages; root departments have `parentId: null` and the long identity has no avatar           | `src/__tests__/table-examples.spec.ts`, `src/__tests__/monitoring.spec.ts`, `src/__tests__/display-format.spec.ts` |
| Empty and anomalous collections              | Server filters can return zero users; monitoring includes degraded service, failed job, warning cache, and error logs; CSV imports include duplicate, invalid, and spreadsheet-formula rows | `src/__tests__/users.spec.ts`, `src/__tests__/monitoring.spec.ts`                                                  |
| Large collections                            | The virtual table owns 1,000 deterministic rows and renders only a bounded window                                                                                                           | `src/__tests__/table-examples.spec.ts`                                                                             |
| Meaningful Chinese and English content       | Chinese identities and the bilingual filename coexist with English operations, announcements, departments, and role-policy descriptions                                                     | The API tests above validate the values instead of snapshotting placeholder text                                   |

`locked` and `pending` deliberately remain dictionary examples. They do not widen the current public user API, whose supported account states are `active` and `suspended`; a backend account-lifecycle decision is required before those values become writable user states.

## Maintenance rules

- Keep identifiers, collection sizes, timestamps, and ordering deterministic.
- Use explicit ISO 8601 offsets for date-boundary cases.
- Add an edge value to an existing business source before creating a standalone demo-only fixture.
- Exercise empty and failure states through API filters or explicit scenarios rather than deleting normal records from the baseline.
- Preserve valid production constraints: long names, emails, and filenames must remain within their API limits.
