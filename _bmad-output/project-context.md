---
project_name: 'eneos-sales-automation'
user_name: 'Jiraw'
date: '2026-01-12'
sections_completed: ['technology_stack', 'language_specific', 'framework_specific', 'testing', 'code_quality', 'workflow', 'critical_rules']
status: 'complete'
rule_count: 85
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**Runtime & Language:**
- Node.js ≥20.0.0 (ES2022 target)
- TypeScript 5.6.3 with strict mode enabled
- ES Modules ONLY - `.js` extension REQUIRED in all imports

**Core Framework:**
- Express.js 4.21.0

**Database (CRITICAL):**
- Google Sheets API (googleapis 144.0.0) - THIS IS THE DATABASE
- Row number = Primary Key
- Version column for optimistic locking
- NOT SQL/NoSQL - agents must NOT use ORM patterns

**External Integrations:**
- LINE Bot SDK 9.4.0 - Signature verification MANDATORY
- Google Gemini AI 0.21.0 - Fallback to defaults on API failure
- Brevo Webhooks:
  - `/webhook/brevo` - Automation (no event field) → Create Lead
  - `/webhook/brevo/campaign` - Campaigns (has event field) → Track Stats

**Testing (Version-Specific Patterns):**
- Vitest 2.1.2 - Use `vi.hoisted()` for mock hoisting (NOT Jest patterns)
- Supertest 7.2.2 - Required for HTTP integration tests
- Coverage: 75%+ enforced, CI fails on drop

**TypeScript Constraints:**
- strict: true, noUnusedLocals: true, noImplicitReturns: true
- Unused variables = BUILD FAILURE

---

## Language-Specific Rules

### ES Modules (CRITICAL)
- ALL imports MUST include `.js` extension: `import { config } from './config/index.js'`
- Module resolution: NodeNext - NO CommonJS patterns
- NO `require()` statements - use `import` only
- Test files ALSO require `.js` extensions

### TypeScript Patterns
- Use `import type` for type-only imports: `import type { Lead } from '../types/index.js'`
- Export types from `src/types/index.ts` - single source of truth
- Underscore prefix for unused params: `(_req, res, _next)` - ESLint configured
- Prefer `interface` for object shapes, `type` for unions/aliases

### Logger Usage (Domain-Specific)
- Use domain-specific loggers: `sheetsLogger`, `webhookLogger`, `campaignLogger`
- NOT generic `logger` unless truly general

### Config Access (MANDATORY)
- ALWAYS use `config` object from `../config/index.js`
- NEVER access `process.env` directly in application code

### Service Pattern
- Services export functions, NOT classes
- Services are singletons initialized at module load
- Wrap external calls with `withRetry()` from `utils/retry.js`

### Error Handling
- Custom error classes: `AppError`, `ValidationError`, `RaceConditionError`, `DuplicateLeadError`
- Include context: `new AppError('message', { leadId, email })`

### Testing Language Patterns (Vitest-Specific)
- Use `vi.fn()` NOT `jest.fn()`
- Use `vi.hoisted()` for mock hoisting
- Use `vi.mock()` NOT `jest.mock()`

---

## Framework-Specific Rules

### Express.js Patterns

**Middleware Order (CRITICAL):**
1. `helmet()` - Security headers
2. `cors()` - CORS configuration
3. `express.json()` - Body parsing (BUT raw for LINE webhook)
4. `requestContext` - Request ID tracking
5. `rateLimiter` - Rate limiting
6. Route handlers
7. `errorHandler` - Centralized error handling (LAST)

**Route Organization:**
- Routes: `src/routes/` - Define endpoints
- Controllers: `src/controllers/` - Request/response ONLY
- Services: `src/services/` - ALL business logic
- Validators: Execute BEFORE controllers

**Controller Pattern (Thin Controllers):**
```typescript
export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await serviceFunction(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);  // ALWAYS pass to centralized handler
  }
}
```

### LINE Bot SDK (CRITICAL PATTERNS)

**1-Second Response Rule:**
```typescript
// Respond 200 IMMEDIATELY, process async
res.status(200).send('OK');
processLineEvent(req.body).catch(handleError);
```
- LINE retries if no 200 within 1 second
- Failure = duplicate lead processing

**Signature Verification:**
- Use raw body: `express.raw({ type: '*/*' })` for LINE route
- NEVER skip in production (`SKIP_LINE_SIGNATURE_VERIFICATION=false`)

**Flex Messages:**
- Templates in `src/templates/` as JSON files
- Use builder functions, not inline JSON

### Google Sheets Integration

**Circuit Breaker:**
- All Sheets ops wrapped with `CircuitBreaker`
- 5 failures → open for 60 seconds
- Use `withRetry()` for transient failures

**Column/Row Indexing:**
- Column A = array index 0
- Row 2 in Sheets = data[0] (row 1 is header)
- Row number IS the primary key

**Race Condition Protection (MANDATORY):**
1. Read current row with version
2. Check if `salesOwnerId` already set
3. If claimed → throw `RaceConditionError`
4. If available → update with incremented version

### Gemini AI Integration

**Graceful Fallback Pattern:**
```typescript
try {
  return await geminiService.analyzeCompany(domain);
} catch (error) {
  logger.warn('Gemini failed, using defaults', { error });
  return { industry: 'ไม่ระบุ', talkingPoint: 'ENEOS มีน้ำมันหล่อลื่นคุณภาพสูง' };
}
```
- NEVER fail the entire request due to AI error
- Always have sensible Thai defaults

---

## Testing Rules

### Test File Organization
- Location: `src/__tests__/` directory
- Naming: `*.test.ts` suffix
- Structure mirrors `src/`:
  - `__tests__/services/` → tests for `services/`
  - `__tests__/controllers/` → tests for `controllers/`
  - `__tests__/utils/` → tests for `utils/`
- Shared mocks: `__tests__/mocks/` - REUSE these

### Setup File
- `src/__tests__/setup.ts` loaded before ALL tests
- Configure global mocks here, not in individual tests
- Timeouts: 10 seconds per test, 10 seconds for hooks

### Mock Hoisting Pattern (CRITICAL ORDER)
```typescript
// 1. vi.hoisted() FIRST - creates mock objects
const { mockClient } = vi.hoisted(() => ({
  mockClient: { pushMessage: vi.fn().mockResolvedValue({}) }
}));

// 2. vi.mock() SECOND - uses hoisted mocks
vi.mock('@line/bot-sdk', () => ({
  Client: vi.fn(() => mockClient)
}));

// 3. imports THIRD - after mocks are set up
import { sendNotification } from '../../services/line.service.js';
```

### Test Structure Pattern
```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    vi.clearAllMocks();  // Reset BEFORE each test
  });

  describe('functionName', () => {
    it('should do expected behavior', async () => {
      // Arrange - setup test data
      // Act - call function
      // Assert - verify result
    });
  });
});
```

### External Service Mocking Strategy
| Service | Mock Target |
|---------|-------------|
| Google Sheets | `googleapis` module |
| LINE Bot | `@line/bot-sdk` Client |
| Gemini AI | `@google/generative-ai` |
| Redis | `ioredis` |

### Test Isolation Rules
- Each test MUST be independent
- No shared state between tests
- Tests can run in any order
- NEVER make real API calls

### Coverage Requirements
- Minimum: 75% overall (CI enforced)
- Current: 1200+ tests passing
- Exclude: `types/`, `*.d.ts`, test files
- No `.skip` in main branch

### Integration Test Pattern
```typescript
import request from 'supertest';
import app from '../app.js';

it('should handle webhook', async () => {
  const response = await request(app)
    .post('/webhook/brevo')
    .set('X-Brevo-Signature', 'valid-sig')
    .send(payload);

  expect(response.status).toBe(200);
});
```

---

## Code Quality & Style Rules

### ESLint Configuration
- Config: `eslint.config.mjs` (flat config format)
- Parser: `@typescript-eslint/parser`
- Extends: ESLint recommended + TypeScript ESLint recommended

### Enforced Rules
| Rule | Setting | Reason |
|------|---------|--------|
| `no-console` | warn | Use logger instead |
| `eqeqeq` | always | Use === not == |
| `curly` | all | Always use braces |
| `no-var` | error | Use const/let |
| `prefer-const` | error | Immutability default |
| `@typescript-eslint/no-explicit-any` | warn | Type safety |
| `@typescript-eslint/no-unused-vars` | error | Clean code |

### Security Rules (MANDATORY)
- `no-eval: error` - Never use eval()
- `no-implied-eval: error` - No setTimeout with strings
- `no-new-func: error` - No Function constructor

### Unused Variables Pattern
```typescript
// Prefix with underscore to indicate intentionally unused
app.use((_req, res, _next) => { });  // ✅ OK
app.use((req, res, next) => { });    // ❌ Error if unused
```

### Test Files - Relaxed Rules
In `*.test.ts` and `__tests__/**/*.ts`:
- `no-console: off`
- `@typescript-eslint/no-explicit-any: off`
- `@typescript-eslint/no-non-null-assertion: off`

### File Naming Conventions
| Type | Pattern | Example |
|------|---------|---------|
| Source files | `kebab-case.ts` | `sheets.service.ts` |
| Test files | `kebab-case.test.ts` | `sheets.service.test.ts` |
| Types | `kebab-case.ts` | `lead.types.ts` |
| Constants | `kebab-case.ts` | `admin.constants.ts` |

### Code Organization
- Single Responsibility: One service = One domain
- Dependency direction: Controllers → Services → Utils
- Constants in `src/constants/`
- Validators in `src/validators/`

### Documentation Standards
- JSDoc for public service functions
- Section comments with `// ===` dividers
- Thai comments acceptable (bilingual project)
- No redundant comments for obvious code

### Feature Flags
```typescript
// ✅ CORRECT - use config
if (config.features.aiEnrichment) { }

// ❌ WRONG - never comment out code
// if (true) { doAiStuff(); }
```

### Testability Patterns
- Pure functions where possible
- Dependency injection via function params
- Avoid global state
- Each request is independent

---

## Development Workflow Rules

### Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (tsx watch) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm run typecheck` | Type check without emit |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm test` | Run all tests |
| `npm run test:coverage` | Generate coverage report |

### Pre-Commit Checklist
1. `npm run typecheck` - No type errors
2. `npm run lint` - No lint errors
3. `npm test` - All 1200+ tests pass
4. Coverage ≥75%

### Environment Variables
- `.env` for local development
- `.env.example` as template
- NEVER commit `.env` to git
- Use `config/index.ts` to access env vars

### Deployment Targets
- Railway, Render, Docker, Google Cloud Run
- Health check: `/health`
- Readiness: `/ready`
- Liveness: `/live`

---

## Critical Don't-Miss Rules

### Database Anti-Patterns (Google Sheets)
- NEVER use ORM patterns - this is NOT SQL
- NEVER use auto-increment IDs - row number IS the ID
- NEVER batch multiple writes without version checks
- NEVER expect transactions - use optimistic locking
- NEVER query by field value - read all rows or use known row number

### Security Anti-Patterns
- NEVER skip LINE signature verification in production
- NEVER log sensitive data (tokens, passwords, API keys)
- NEVER commit `.env` files
- NEVER disable rate limiting in production
- NEVER trust user input without Zod validation

### Performance Anti-Patterns
- NEVER block event loop with sync operations
- NEVER make API calls without timeout/retry
- NEVER skip circuit breaker for external services
- NEVER respond to LINE webhook after 1 second

### Edge Cases to Handle

**LINE Webhook:**
- Empty events array → Return 200 OK anyway
- Duplicate events (LINE retries) → Use deduplication service
- Invalid signature → Reject immediately with 401
- Postback for already-claimed lead → Reply with "already taken" message

**Google Sheets:**
- Row deleted between read and write → Handle gracefully
- Concurrent updates → Throw RaceConditionError
- API quota exceeded → Circuit breaker opens for 60s
- Empty row data → Return sensible defaults

**Gemini AI:**
- API timeout → Use Thai fallback defaults
- Invalid response format → Parse safely, use defaults
- Rate limiting → Retry with exponential backoff
- Complete failure → NEVER block the entire request

### Required Utilities (DON'T REINVENT)
```typescript
// Phone formatting - handles Thai formats
import { formatPhone } from '../utils/phone-formatter.js';

// Email domain extraction
import { extractDomain } from '../utils/email-parser.js';

// Date formatting for Sheets
import { formatDateForSheets } from '../utils/date-formatter.js';

// Retry with backoff
import { withRetry } from '../utils/retry.js';
```

### Dead Letter Queue
- Failed events stored in memory (dev) or Redis (prod)
- Access via `/dlq` endpoint
- Retry manually when needed
- Track failure patterns

### Quality Gates (PR Requirements)
- All 1200+ tests pass
- Coverage ≥75% (no drops)
- `npm run typecheck` passes
- `npm run lint` passes
- No `.skip` on tests
- No console.log (use logger)

### Thai Language Defaults
When external services fail, use these defaults:
```typescript
{
  industry: 'ไม่ระบุ',
  businessType: 'B2B',
  talkingPoint: 'ENEOS มีน้ำมันหล่อลื่นคุณภาพสูงสำหรับอุตสาหกรรม'
}
```

---

## Export Patterns

### UTF-8 BOM for Thai CSV Files (CRITICAL)

When exporting CSV files with Thai characters, Excel requires a **Byte Order Mark (BOM)** to display correctly.

**Problem:**
```
Without BOM: à¸šà¸£à¸´à¸©à¸±à¸—  (garbled Thai text in Excel)
With BOM:    บริษัท ทดสอบ จำกัด  (correct display)
```

**Solution Pattern:**
```typescript
// src/controllers/admin/export.controller.ts
const { parse } = await import('json2csv');
const csv = parse(dataToExport);
const csvWithBOM = '\uFEFF' + csv;  // ← Add BOM prefix
res.setHeader('Content-Type', 'text/csv; charset=utf-8');
res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
res.send(csvWithBOM);
```

**Key Points:**
- `\uFEFF` is the UTF-8 BOM character (U+FEFF)
- Must be the FIRST character in the file
- Required for Excel Thai compatibility on Windows
- Google Sheets and Numbers handle UTF-8 without BOM, but BOM doesn't hurt
- `json2csv` library handles escaping (commas, quotes, newlines) automatically

**When to Use:**
- CSV exports containing Thai text
- Any CSV that users may open in Excel
- NOT needed for JSON, XLSX (ExcelJS handles it), or PDF exports

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

---

*Last Updated: 2026-02-02*

