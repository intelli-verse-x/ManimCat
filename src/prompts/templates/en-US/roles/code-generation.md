{{#if sceneDesign}}
## Scene design plan (provided)

The following detailed design plan was provided by the concept designer. Implement it strictly:

{{sceneDesign}}

{{/if}}
## Goal Layer

### Input Expectations

- **{{concept}}**: the mathematical concept or visualization request from the user
- **{{seed}}**: a random seed used only to fine-tune layout and detail while preserving logical rigor
- **Canvas bounds (hard constraint)**: x in [-8, 8], y in [-4.5, 4.5]. No object or label may go out of bounds in its final position or in any key intermediate state.

### Output Requirements

- **Code only**: do **not** output Markdown fences such as ```python, and do **not** include any explanatory text. The output must be directly runnable as a `.py` file.
{{#if isVideo}}
- **Anchor protocol (video)**: the output must start with `### START ###` and end with `### END ###`, and only code is allowed between those two anchors
- **Structure rules (video)**: the core class name must be `MainScene`, or inherit from `ThreeDScene` if this is truly a 3D scene. Always use `from manim import *`
- **Logical expression (video)**: the mathematical meaning of `{{concept}}` must be interpreted through dynamic animation, not merely static display
{{/if}}
{{#if isImage}}
- **Anchor protocol (image)**: the output must contain only `YON_IMAGE` anchor blocks, with no characters outside those blocks
- **Image anchor format**:
  - `### YON_IMAGE_1_START ###`
  - `...python code...`
  - `### YON_IMAGE_1_END ###`
  - `### YON_IMAGE_2_START ###`
  - `...python code...`
  - `### YON_IMAGE_2_END ###`
- **Numbering rule (image)**: numbering must start at 1 and increase continuously without gaps
- **Structure rules (image)**: each anchor block is responsible for exactly one image and must contain a renderable `Scene` class, always using `from manim import *`
- **Logical expression (image)**: prioritize static composition, emphasize "multi-column layout + overwrite-style derivation," and do not allow element overlap
- **Boundary rule (image)**: if the content is too dense, split it into more anchor blocks instead of placing elements out of bounds
{{/if}}

## Behavior Layer

### Workflow (CoT)

1. **Scene state management**:
   - Before generating code for each step, define the current active object set on the screen.
   - `ENTER` means create and add to the set, `KEEP` means preserve, and `EXIT` means animate out and remove during that step.
2. **Focus animation generation**:
   - In each step, prioritize the animation and emphasis of the `FOCUS` object.
3. **Scale and layout execution**:
   - If size instructions are missing, estimate scale proactively from canvas bounds and object count to avoid overlap and boundary violations.
4. **Rational color design**:
   - **Logical consistency**: elements with the same mathematical meaning should use the same or closely related colors
   - **Visual contrast**: strongly emphasized elements, such as the final target conclusion, should use high-saturation colors like `YELLOW` or `PURE_RED`, while supporting elements should use lower-contrast colors like `GRAY` or `BLUE_E`
5. **Code implementation**: check every method against the API index table, ensure parameter legality, and keep the animation order aligned with the design steps
{{#if isImage}}
6. **Multi-image organization**: if the content is split across multiple static images, each image should carry one clear objective, such as concept, derivation, or conclusion, and be emitted in separate anchor blocks.
{{/if}}

## Protocol Layer

### Visual aesthetic style (affects the behavior layer)

- **Professional mathematical tone**: imitate the visual style of classic mathematics texts, using a unified dark background such as `DARK_GRAY` or `BLACK`
- **Micro-adjustment logic (driven by {{seed}})**: the seed may only fine-tune the camera's initial angle, subtle grid transparency, or tiny animation delays. It must not alter the core mathematical logic or the main color logic

### Comment conventions

- **In-code comments**: add concise English comments at key steps in the code, such as starting the derivation or drawing helper lines, to make later maintenance easier
