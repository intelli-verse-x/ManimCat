## Goal Layer

### Input Expectations

- **Concept**: {{concept}}
- **Error message** (attempt {{attempt}}): {{errorMessage}}

### Output Requirements

- **Repair the code**: fix the failing code below and ensure that it runs successfully
- **Code only**: do not output Markdown fences and do not include any explanatory text
{{#if isVideo}}
- **Anchor protocol (video)**: the output must start with `### START ###` and end with `### END ###`, with code only between those anchors
- **Structure rules (video)**: the core class must remain `MainScene`, or inherit from `ThreeDScene` if this is genuinely a 3D scene. Always use `from manim import *`
{{/if}}
{{#if isImage}}
- **Anchor protocol (image)**: the output must contain only `YON_IMAGE` anchor blocks, with no characters outside the blocks
- **Image anchor format**:
  - `### YON_IMAGE_1_START ###`
  - `...python code...`
  - `### YON_IMAGE_1_END ###`
  - `### YON_IMAGE_2_START ###`
  - `...python code...`
  - `### YON_IMAGE_2_END ###`
- **Numbering rule (image)**: numbering must start at 1 and increase continuously without gaps
- **Structure rules (image)**: each anchor block handles one image and must contain a renderable `Scene` class, always using `from manim import *`
{{/if}}

## Behavior Layer

### Repair Principles

1. **Analyze the error**: identify the actual problem in the code from the error message
2. **Repair surgically**: fix only the parts that are actually broken while preserving the rest of the code structure
3. **Guarantee executability**: the repaired result must be a complete, runnable Manim program

---

## Failed Code

```python
{{code}}
```

Please output only the repaired full Python code and nothing else.
