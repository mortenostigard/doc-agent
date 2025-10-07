# Examples

Real-world examples of using the Documentation Maintenance Agent.

## Table of Contents

- [Basic Examples](#basic-examples)
- [API Documentation](#api-documentation)
- [Library Documentation](#library-documentation)
- [Configuration Examples](#configuration-examples)
- [Workflow Examples](#workflow-examples)

---

## Basic Examples

### Example 1: Simple Function Update

**Before (code):**
```typescript
// src/math.ts
export function add(a: number, b: number): number {
  return a + b;
}
```

**Before (docs):**
```markdown
<!-- docs/api.md -->
## add(a, b)

Adds two numbers together.

**Parameters:**
- `a` (number): First number
- `b` (number): Second number

**Returns:** Sum of a and b
```

**Code Change:**
```typescript
// src/math.ts
export function add(...numbers: number[]): number {
  return numbers.reduce((sum, n) => sum + n, 0);
}
```

**Running the Agent:**
```bash
$ node dist/cli.js run --files src/math.ts --verbose

🤖 Documentation Maintenance Agent

▶ Phase: Detecting changes
  Changes detected: 1

▶ Phase: Parsing and analyzing code
  Files parsed: 1
  Diffs found: 1

▶ Phase: Mapping to affected documentation
  Affected docs: 1

▶ Phase: Generating documentation updates
  Updates generated: 1

Review 1 of 1
================================================================================
Documentation Update: docs/api.md
================================================================================

Reasoning:
Updated function signature from add(a, b) to add(...numbers)

Changes:
- ## add(a, b)
+ ## add(...numbers)

- Adds two numbers together.
+ Adds multiple numbers together.

  **Parameters:**
- - `a` (number): First number
- - `b` (number): Second number
+ - `...numbers` (number[]): Numbers to add

- **Returns:** Sum of a and b
+ **Returns:** Sum of all numbers

[a]pprove, [r]eject, [s]kip, [q]uit? a

✓ Approved
✅ Agent execution completed successfully!
```

**After (docs):**
```markdown
<!-- docs/api.md -->
## add(...numbers)

Adds multiple numbers together.

**Parameters:**
- `...numbers` (number[]): Numbers to add

**Returns:** Sum of all numbers
```

---

### Example 2: Adding a New Parameter

**Before (code):**
```typescript
// src/api.ts
export function fetchUser(id: string): Promise<User> {
  return fetch(`/api/users/${id}`).then(r => r.json());
}
```

**Code Change:**
```typescript
// src/api.ts
export function fetchUser(
  id: string,
  options?: { includeProfile?: boolean }
): Promise<User> {
  const url = `/api/users/${id}`;
  const query = options?.includeProfile ? '?include=profile' : '';
  return fetch(url + query).then(r => r.json());
}
```

**Agent Output:**
```markdown
## fetchUser

Fetches a user by ID.

**Parameters:**
- `id` (string): User ID
+ `options` (object, optional): Fetch options
+   - `includeProfile` (boolean): Include user profile data

**Returns:** Promise resolving to User object
```

---

## API Documentation

### Example 3: REST API Endpoint

**Before (code):**
```typescript
// src/routes/users.ts
export async function getUser(req: Request, res: Response) {
  const { id } = req.params;
  const user = await db.users.findById(id);
  res.json(user);
}
```

**Before (docs):**
```markdown
## GET /api/users/:id

Retrieves a user by ID.

**Parameters:**
- `id` (string): User ID

**Response:**
```json
{
  "id": "123",
  "name": "John Doe"
}
```
```

**Code Change:**
```typescript
// src/routes/users.ts
export async function getUser(req: Request, res: Response) {
  const { id } = req.params;
  const { include } = req.query;
  
  const user = await db.users.findById(id);
  
  if (include === 'posts') {
    user.posts = await db.posts.findByUserId(id);
  }
  
  res.json(user);
}
```

**Updated Docs:**
```markdown
## GET /api/users/:id

Retrieves a user by ID with optional related data.

**Parameters:**
- `id` (string): User ID

**Query Parameters:**
- `include` (string, optional): Related data to include
  - `posts`: Include user's posts

**Response:**
```json
{
  "id": "123",
  "name": "John Doe",
  "posts": [...]  // When include=posts
}
```
```

---

### Example 4: Class Method Update

**Before (code):**
```typescript
// src/database.ts
export class Database {
  async connect(url: string): Promise<void> {
    this.connection = await createConnection(url);
  }
}
```

**Code Change:**
```typescript
// src/database.ts
export class Database {
  async connect(
    url: string,
    options?: {
      timeout?: number;
      retries?: number;
    }
  ): Promise<void> {
    this.connection = await createConnection(url, options);
  }
}
```

**Updated Docs:**
```markdown
### connect(url, options)

Establishes a database connection.

**Parameters:**
- `url` (string): Database connection URL
- `options` (object, optional): Connection options
  - `timeout` (number): Connection timeout in ms (default: 5000)
  - `retries` (number): Number of retry attempts (default: 3)

**Returns:** Promise that resolves when connected

**Example:**
```typescript
const db = new Database();
await db.connect('mongodb://localhost', {
  timeout: 10000,
  retries: 5
});
```
```

---

## Library Documentation

### Example 5: React Component

**Before (code):**
```typescript
// src/Button.tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

**Code Change:**
```typescript
// src/Button.tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ 
  label, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`btn-${variant}`}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
```

**Updated Docs:**
```markdown
## Button

A customizable button component.

**Props:**
- `label` (string): Button text
- `onClick` (function): Click handler
- `variant` ('primary' | 'secondary', optional): Button style (default: 'primary')
- `disabled` (boolean, optional): Whether button is disabled (default: false)

**Example:**
```tsx
<Button 
  label="Click me" 
  onClick={() => console.log('clicked')}
  variant="secondary"
  disabled={false}
/>
```
```

---

## Configuration Examples

### Example 6: TypeScript Library

```json
{
  "documentationPaths": [
    "docs/api/**/*.md",
    "docs/guides/**/*.md",
    "README.md"
  ],
  "codePaths": [
    "src/**/*.ts"
  ],
  "ignorePaths": [
    "node_modules/**",
    "dist/**",
    "**/*.test.ts",
    "**/*.spec.ts",
    "src/__tests__/**"
  ],
  "minSeverity": "minor",
  "llmModel": "claude-sonnet-4-5-20250929",
  "temperature": 0.2
}
```

### Example 7: Full-Stack Application

```json
{
  "documentationPaths": [
    "docs/api/**/*.md",
    "docs/frontend/**/*.md",
    "docs/backend/**/*.md",
    "README.md",
    "API.md"
  ],
  "codePaths": [
    "src/server/**/*.ts",
    "src/client/**/*.tsx",
    "src/shared/**/*.ts"
  ],
  "ignorePaths": [
    "node_modules/**",
    "build/**",
    "dist/**",
    "**/*.test.ts",
    "**/*.test.tsx",
    "coverage/**"
  ],
  "minSeverity": "minor",
  "llmModel": "claude-sonnet-4-5-20250929",
  "temperature": 0.3
}
```

### Example 8: Monorepo

```json
{
  "documentationPaths": [
    "packages/*/docs/**/*.md",
    "packages/*/README.md",
    "docs/**/*.md",
    "README.md"
  ],
  "codePaths": [
    "packages/*/src/**/*.ts",
    "packages/*/src/**/*.tsx"
  ],
  "ignorePaths": [
    "node_modules/**",
    "packages/*/dist/**",
    "packages/*/build/**",
    "**/*.test.ts",
    "**/*.test.tsx"
  ],
  "minSeverity": "minor",
  "llmModel": "claude-sonnet-4-5-20250929",
  "temperature": 0.2
}
```

---

## Workflow Examples

### Example 9: Feature Development Workflow

```bash
# 1. Create a new branch
git checkout -b feature/user-authentication

# 2. Implement the feature
vim src/auth.ts

# 3. Run tests
npm test

# 4. Update documentation automatically
node dist/cli.js run --verbose

# 5. Review and approve changes
# [Interactive review...]

# 6. Commit everything together
git add src/auth.ts docs/auth.md
git commit -m "feat: add user authentication"

# 7. Push and create PR
git push origin feature/user-authentication
```

### Example 10: Refactoring Workflow

```bash
# 1. Make breaking changes
vim src/api.ts

# 2. Check what documentation is affected
node dist/cli.js run --verbose --files src/api.ts

# 3. Review proposed updates
# [Interactive review...]

# 4. Approve and apply
# [Approve changes...]

# 5. Verify documentation
cat docs/api.md

# 6. Commit with clear message
git add .
git commit -m "refactor!: update API signatures

BREAKING CHANGE: fetchUser now requires options parameter"
```

### Example 11: Batch Update Workflow

```bash
# 1. Make multiple changes across files
vim src/api.ts src/utils.ts src/types.ts

# 2. Run agent on all changed files
node dist/cli.js run --verbose

# 3. Review all updates at once
# [Review multiple documentation updates...]

# 4. Approve relevant changes
# [Approve/reject each update...]

# 5. Commit
git add .
git commit -m "feat: enhance API with new utilities"
```

### Example 12: Pre-Release Documentation Check

```bash
# 1. Check out release branch
git checkout release/v2.0

# 2. Review all changes since last release
git diff v1.0..HEAD --name-only

# 3. Run agent on all changes
node dist/cli.js run --commit v1.0 --verbose

# 4. Ensure all docs are up to date
# [Review and approve...]

# 5. Create release
git tag v2.0.0
git push --tags
```

---

## Advanced Examples

### Example 13: Custom Review Script

```bash
#!/bin/bash
# review-docs.sh

# Run agent and capture output
OUTPUT=$(node dist/cli.js run --yes 2>&1)

# Check if any docs were updated
if echo "$OUTPUT" | grep -q "documentation file(s) updated"; then
  echo "✅ Documentation updated successfully"
  
  # Show what changed
  git diff docs/
  
  # Ask for confirmation
  read -p "Commit these changes? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add docs/
    git commit -m "docs: update documentation"
  fi
else
  echo "ℹ️  No documentation updates needed"
fi
```

### Example 14: CI Integration

```yaml
# .github/workflows/docs.yml
name: Documentation Check

on:
  pull_request:
    paths:
      - 'src/**/*.ts'
      - 'src/**/*.js'

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build doc-agent
        run: npm run build
      
      - name: Check documentation
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          node dist/cli.js run --yes --verbose
          
          # Check if docs were modified
          if [[ -n $(git status -s docs/) ]]; then
            echo "::warning::Documentation may need updating"
            git diff docs/
            exit 1
          else
            echo "::notice::Documentation is up to date"
          fi
```

---

## Tips and Tricks

### Tip 1: Test Before Committing

```bash
# Always review changes before committing
node dist/cli.js run --verbose

# Don't use --yes until you're confident
node dist/cli.js run --yes  # Use with caution!
```

### Tip 2: Focus on Specific Docs

```bash
# Only update API documentation
node dist/cli.js run --files src/api.ts

# Check specific documentation file
node dist/cli.js run --verbose | grep "docs/api.md"
```

### Tip 3: Debugging

```bash
# Enable debug mode to see what's happening
node dist/cli.js run --debug --files src/problem.ts

# Check configuration
cat .doc-agent.config.json

# Verify paths match your structure
ls -la docs/
ls -la src/
```

---

## Next Steps

- Read the [Usage Guide](USAGE.md) for detailed workflows
- Check [Configuration Reference](CONFIGURATION.md) for all options
- Review [Troubleshooting](TROUBLESHOOTING.md) for common issues
