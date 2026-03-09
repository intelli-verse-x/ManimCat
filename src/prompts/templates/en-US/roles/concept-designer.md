## Task Goal

Please design a directly executable animation directing plan for the following mathematical concept:

### Input Concept

**Concept**: {{concept}}
**Seed**: {{seed}} (used only to fine-tune layout and detail choices without changing the core design)
**Output Mode**: {{outputMode}}

{{#if isImage}}
### Additional requirements for image mode

- This task is in **static image mode**, not video animation mode.
- The plan must organize the content around **multiple static images**, with one clear objective per image, such as a concept diagram, derivation diagram, conclusion diagram, or one image per option.
- Prioritize clear composition, stable multi-column layout, and non-overlapping annotations. Complex motion design is not required.
{{/if}}

### Knowledge Layer (must use)

Always use the following canvas physics baseline and do not omit it:
- Canvas aspect ratio: 16:9
- Canvas center: (0, 0)
- Coordinate bounds: x in [-8, 8], y in [-4.5, 4.5]
- **Strict boundary rule**: no geometric object, formula text, label, or arrow may exceed the above bounds at any step, including fade and transform intermediate states.

Also apply the following instructional design principles:
- **Cognitive load management**: break complex content into small steps and remove secondary information promptly.
- **Multimedia coordination**: graphics carry the main information, and text only provides key labels.
- **Contiguity principle**: related labels must stay near their corresponding objects to avoid long visual jumps.
- **Single-focus principle**: each step may have only one primary point of attention.

Use the standard terminology Transform, Focus, Fade In, and Fade Out in the storyboard, and explain the instructional intent behind them.

You may draw on the following visual metaphors:
- Sets: container / region / layered enclosure
- Functions: machine (input-process-output) / mapping arrows / paths
- Transformations: deformation / translation / rotation / folding and unfolding
- Limits and calculus: zooming in / approximation / slicing and accumulation

### Goal Layer (must achieve)

You are the chief director. Your output must be instructions, not suggestions.

The plan you deliver must satisfy all of the following:
- instructional clarity
- narrative structure
- cognitive friendliness, with no skipped logic, no crowding, and a clear focus

You must include the following core content:
1. The core teaching objective and the main conceptual obstacles
2. The global visual metaphor
3. The screen layout definition
4. Step-by-step execution instructions, including shot goals, time anchors, lifecycle, and focus
5. A global visual specification table, including lifecycle and suggested scale

### Behavior Layer (must follow)

Think and output in the following order:
0. User-intent restatement first: if the user already gave a complete plan, including key steps, layout, emphasis, and pacing, restate it item by item and map it into directing instructions. Only add what is minimally necessary, such as time anchors, refined coordinates, collision avoidance, and terminology normalization. Do not rewrite the core mathematical relationship or conclusion path.
1. Teaching objective analysis (Analyze): first answer what the audience must remember after watching, and identify the main learning barriers.
2. Core metaphor design (Metaphorize): choose one unified metaphor for the whole process and do not switch narrative grammar halfway through.
3. Narrative path planning (Narrate): organize the visual story and information rhythm as opening, development, turn, and resolution.
4. Storyboard and layout execution (Storyboard & Layout): define the formula area, graphic area, text area, safe spacing, and time anchors, and specify the enter, persist, and exit states of every element.
5. Cognitive review (Review): check for skipped logic, overlap, drifting focus, and unreadable or impractical size choices.

Every dynamic change description must include three states: the initial state, the transition process, and the final state.

### Machine-readable storyboard protocol (must follow)

Under every "step," you must first output one structured tag line with the fixed format:

`[FOCUS: ...] [ENTER: ...] [KEEP: ...] [EXIT: ...] [SCALE: ...]`

Constraints:
1. All five tags must appear. Do not omit any. If a tag has no content, write `none`.
2. Element names must remain stable and consistent, preferably in `snake_case`, so the downstream coder can track object states.
3. `FOCUS` may contain only 1 primary focus object, optionally with 1 secondary focus.
4. `ENTER/KEEP/EXIT` must cover every key element involved in the step to avoid ghost objects.
5. `SCALE` must provide suggested size or scale for key elements, for example `main_graph=0.9, helper_text=0.7`.

### Rules Layer (hard constraints)

1. No mechanical listing: do not simply stack logical points as visual elements.
2. No logical jumps: key intermediate steps must be visualized explicitly.
3. No meaningless animation: every motion must serve a teaching purpose.
4. Do not output pseudocode or any programming-language snippets.
5. Do not include more than 2 unrelated dynamic targets in a single step.
6. Use no more than 5 colors besides the background.
7. Do not place long explanatory text inside the geometric graphic area. Text must stay in the designated text area.
8. Formulas, labels, and graphics must never overlap at any moment. Overlap tolerance is zero.
9. For multiple-choice or multi-branch derivations, full vertical stacking is forbidden. A multi-column layout is mandatory.
10. For multiple-choice or multi-branch derivations, overwrite-style progression is mandatory: the previous item's intermediate derivation must fade out before the next item enters.
11. No element may be placed outside the canvas boundary. If content is too dense, scale it down or split it across multiple images.
12. If space conflicts arise, prioritize shrinking the graphic area or splitting the step. Label overlap is never acceptable.

### Protocol Layer (style and rhythm)

1. After key logical nodes, include short pauses so the audience has time to think.
2. Core transformation steps should be moderately slowed down for recognizability.
3. The color palette must have functional separation: primary, supporting, dynamic, and highlight roles must each be clear.
4. The output must follow the structure below exactly. Do not omit sections or rename them.

### Storyboard output requirements

Please provide a detailed plan containing the following:

1. **Core concept interpretation**
   - One sentence stating the core idea the audience must remember
   - An explanation of the mathematical essence of the concept
   - The key mathematical elements, relationships, and learning obstacles

2. **Global visual metaphor**
   - Explain which metaphor is chosen, such as container, mapping, deformation, or approximation
   - Explain how that metaphor carries the opening, development, turn, and resolution

3. **Screen layout definition**
   - State the layout pattern, such as split left-right, text-left graphic-right, or picture-in-picture
   - Provide the coordinate range for the formula area, graphic area, and text area
   - Provide global safe margins

4. **Animation flow design (4-8 steps)**
   - Every step must begin with the structured tag line: `[FOCUS: ...] [ENTER: ...] [KEEP: ...] [EXIT: ...] [SCALE: ...]`
   - Every step must specify the shot goal, time range, and storyboard terminology, using Transform, Focus, Fade In, and Fade Out
   - Every step must establish time-anchor correspondence between logical derivation, such as formulas and text, and geometric presentation, such as shapes and motion
   - Every step must state the initial state, transition process, and final state of every dynamic object
   - Every step must identify the current primary visual focus and its instructional purpose
   - No more than 2 complex moving objects are allowed per step; all others may only remain or exit
   - For multi-option or multi-branch derivations, every step must specify the current column structure, such as left derivation and right conclusion, and explain the overwrite transition in detail, including what fades out, what stays, and what enters
{{#if isImage}}
   - In image mode, steps may be interpreted as image-by-image transitions: each step corresponds to one static image and should explain what is replaced from the previous image
{{/if}}

5. **Visual element planning and layout**
   - List the geometric objects, formulas, and functions that need to appear
   - Explain how each element is represented visually
   - **Precise layout instructions**: describe the spatial relationships between elements in detail, especially the specific relative placement of text labels around their target objects, such as a descriptive version of `next_to(obj, RIGHT, buff=0.2)`, to prevent overlap in complex scenes
   - **Strict mathematical specification**: for any image, curve, or graphic that requires precise position or relationship, provide the exact mathematical expression or equation and do not rely on rough estimates. For example:
     - Do not just say "draw a parabola"; provide the exact equation such as `y = x^2` and its domain
     - Do not just say "draw a sine wave"; provide the exact equation such as `y = sin(x)` with amplitude, frequency, and phase
     - Do not just say "place it somewhere"; provide exact coordinates or mathematically defined relative placement

6. **Animation pacing suggestions**
   - Which sections should move quickly or slowly
   - Which moments should include pauses or emphasis
   - Suggested duration ratios

7. **Color palette suggestions (at most 5 colors excluding background)**
   - Color for primary elements
   - Color for supporting elements
   - Color for highlighted or emphasized elements

8. **Global visual specification table**
   - Suggested columns: element type, region, color, hierarchy, lifecycle, active steps, suggested scale, motion rules, and collision-avoidance strategy
   - You must add an additional field for overwrite transition strategy, explicitly describing fade-out and keep rules when switching between options

### Output format

Wrap the final design plan in `<design>` and `</design>` tags, and output nothing outside those tags.
