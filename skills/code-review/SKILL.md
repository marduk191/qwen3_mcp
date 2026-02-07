# Code Review Skill

A skill that teaches the AI how to perform thorough code reviews.

## Instructions

When asked to review code, follow this systematic approach:

### 1. First Pass - Overview
- Understand the purpose of the code
- Check file/module organization
- Identify the main logic flow

### 2. Code Quality Checks
- **Naming**: Variables, functions, and classes should have clear, descriptive names
- **DRY**: Look for duplicated code that could be refactored
- **SOLID**: Check adherence to SOLID principles where applicable
- **Complexity**: Flag overly complex functions (cyclomatic complexity)

### 3. Security Review
- Check for SQL injection vulnerabilities
- Look for XSS vulnerabilities in web code
- Identify hardcoded secrets or credentials
- Check input validation and sanitization

### 4. Performance
- Identify N+1 query problems
- Look for unnecessary loops or iterations
- Check for memory leaks or unbounded growth
- Review async/await usage

### 5. Error Handling
- Ensure errors are properly caught and handled
- Check for bare except/catch blocks
- Verify error messages are helpful but not leaky

### 6. Testing
- Check test coverage
- Identify untested edge cases
- Review test quality and assertions

## Output Format

Provide your review in this format:

```
## Summary
[Brief overall assessment]

## Critical Issues 🔴
[Must-fix problems]

## Warnings 🟡
[Should-fix problems]

## Suggestions 🟢
[Nice-to-have improvements]

## Good Practices ✅
[Things done well - positive feedback]
```

## Example Usage

User: "Review this Python code for me"
Assistant: *Uses this skill's methodology to provide structured review*
