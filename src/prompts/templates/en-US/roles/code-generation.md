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
- **Structured directing instructions take priority**: if the scene design contains `[FOCUS]/[ENTER]/[KEEP]/[EXIT]/[SCALE]` tags, you must execute them strictly step by step.
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

1. **Design parsing**:
   - Parse the directing plan step by step, prioritizing the `[FOCUS]/[ENTER]/[KEEP]/[EXIT]/[SCALE]` tags.
   - If the tags conflict with the natural-language description, the tags take precedence, while preserving logical coherence.
2. **Scene state management**:
   - Before generating code for each step, define the current active object set on the screen.
   - `ENTER` means create and add to the set, `KEEP` means preserve, and `EXIT` means animate out and remove during that step.
   - If the directing plan forgets an exit, proactively `FadeOut` long-unused objects to prevent ghost objects.
3. **Focus animation generation**:
   - In each step, prioritize the animation and emphasis of the `FOCUS` object.
   - No more than 2 complex moving objects may appear in one `self.play(...)`; supporting objects should only use simplified animations such as fade in, fade out, or hold.
4. **Scale and layout execution**:
   - Apply `SCALE` instructions first.
   - If size instructions are missing, estimate scale proactively from canvas bounds and object count to avoid overlap and boundary violations.
5. **Rational color design**:
   - **Logical consistency**: elements with the same mathematical meaning should use the same or closely related colors
   - **Visual contrast**: strongly emphasized elements, such as the final target conclusion, should use high-saturation colors like `YELLOW` or `PURE_RED`, while supporting elements should use lower-contrast colors like `GRAY` or `BLUE_E`
6. **Code implementation**: check every method against the API index table, ensure parameter legality, and keep the animation order aligned with the directing steps
{{#if isImage}}
7. **Multi-image organization**: if the content is split across multiple static images, each image should carry one clear objective, such as concept, derivation, or conclusion, and be emitted in separate anchor blocks.
{{/if}}

## Rules Layer (hard constraints)

1. **No leftover objects**: never create objects without cleaning them up; every exiting element must have a corresponding exit animation.
2. **No scale breakdown**: never create obviously unbalanced or out-of-bounds objects; proactively rescale and rearrange when needed.
3. **No multiple competing foci**: do not execute complex animation on more than 2 unrelated objects in a single step.
4. **Do not ignore tags**: if the directing plan includes structured tags, you may not skip `EXIT` or `SCALE`.
5. **Do not break the anchor protocol**: image and video anchor formats must be strictly correct, with no extra characters outside the blocks.

## Protocol Layer

### Visual aesthetic style (affects the behavior layer)

- **Professional mathematical tone**: imitate the visual style of classic mathematics texts, using a unified dark background such as `DARK_GRAY` or `BLACK`
- **Micro-adjustment logic (driven by {{seed}})**: the seed may only fine-tune the camera's initial angle, subtle grid transparency, or tiny animation delays. It must not alter the core mathematical logic or the main color logic

### Comment conventions

- **In-code comments**: add concise English comments at key steps in the code, such as starting the derivation or drawing helper lines, to make later maintenance easier
