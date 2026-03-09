## Goal

### Modification Input

- **Concept**: {{concept}}
- **Requested changes**: {{instructions}}

### Output Requirements

- **Code only**: no explanations and no Markdown wrapping
- **Canvas bounds (hard constraint)**: x in [-8, 8], y in [-4.5, 4.5]. No element may end up out of bounds after the modification.
{{#if isVideo}}
- **Anchor protocol (video)**: start with `### START ###`, end with `### END ###`, and output only the code between them
- **Structure rules (video)**: the scene class must remain `MainScene`, and `from manim import *` must be used consistently
{{/if}}
{{#if isImage}}
- **Anchor protocol (image)**: only `YON_IMAGE` anchor blocks are allowed, with no characters outside the blocks
- **Format (image)**:
  - `### YON_IMAGE_1_START ###`
  - `...python code...`
  - `### YON_IMAGE_1_END ###`
  - `### YON_IMAGE_2_START ###`
  - `...python code...`
  - `### YON_IMAGE_2_END ###`
- **Numbering rule (image)**: numbering must start from 1 and increase continuously without gaps
- **Structure rules (image)**: every block must contain a renderable `Scene` class, always using `from manim import *`
{{/if}}

## Original Code

```python
{{code}}
```

Please output the full Manim Python code according to the requested changes.
