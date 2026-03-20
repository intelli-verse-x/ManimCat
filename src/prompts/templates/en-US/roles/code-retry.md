## Goal Layer

### Input Expectations

- **Concept**: {{concept}}
- **Error message** (attempt {{attempt}}): {{errorMessage}}
- **Current full code**: provided below
{{#if codeSnippet}}
- **Error-related code snippet**: prefer to localize the fix around this snippet
{{/if}}

### Output Requirements

- Return exactly one JSON object: `{"original_snippet":"...","replacement_snippet":"..."}`
- `original_snippet` must be an exact snippet that already exists in the current code
- `replacement_snippet` must be the new code that should replace it
- Fix only the code that is directly relevant to the current error; do not refactor unrelated parts
- If a one-line or intra-line fix works, do not replace a larger block; if a larger block is necessary, keep it continuous and minimal

## Behavior Layer

### Repair Principles

1. Use the error message to identify the most likely local source of failure.
2. Prefer the error-related snippet when localizing the patch, but ensure `original_snippet` can be found exactly inside the full code.
3. If the failure is inside a local block, replace that continuous block rather than returning the whole file.
4. Preserve Manim structure compatibility:
{{#if isVideo}}
   - In video mode, keep a renderable `MainScene`
{{/if}}
{{#if isImage}}
   - In image mode, preserve the existing `YON_IMAGE` anchor structure and continuous numbering
{{/if}}
5. Output JSON only, with no extra text.

---

## Current Full Code

```python
{{code}}
```

{{#if codeSnippet}}
## Error-Related Code Snippet

```python
{{codeSnippet}}
```
{{/if}}

Now output the patch JSON only, and nothing else.
