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

### Knowledge Layer (supplementary)

Canvas baseline, coordinate bounds, narrative patterns, emotional arc, and color semantics are defined in the system instructions. The following are supplementary principles:
- **Scaffolded instruction**: break complex leaps into small, comprehensible, consecutive transformations.

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
0.5. Upstream planning first: if the input contains `Problem Framing Context`, treat its headline, summary, and steps as the directing skeleton. You may expand them into shots, layout, pacing, lifecycle, and collision-avoidance instructions, but you may not rewrite the main line, replace the core analogy, or reorder the key sequence.
1. Teaching objective analysis (Analyze): answer what the audience must remember after watching, and identify the main learning barriers, while staying aligned with the upstream skeleton.
2. Storyboard and layout execution (Storyboard & Layout): define the formula area, graphic area, text area, safe spacing, and time anchors, and specify the enter, persist, and exit states of every element.
3. Cognitive review (Review): check for skipped logic, overlap, drifting focus, and unreadable or impractical size choices.

Every dynamic change description must include three states: the initial state, the transition process, and the final state.

### Machine-readable storyboard protocol (supplementary)

The full protocol is defined in the system instructions. Additional requirement for the user prompt:
- Every step must include **[logical motivation]** (why this step) and **[visual transformation detail]** (initial state, process, final state).

### Micro Direction: Detail & Pause (language-only)

- Detail wording should describe observable change coupling (color correspondence, local zoom, how gaps get filled), not pedagogical jargon.
- After key turns or reveals, insert a 2-4s still pause (no new entering elements) so viewers can integrate what they just saw.

### Rules Layer (hard constraints)

1. **Visualization first**: derivation steps must prioritize geometric transformations over formula text. Do not degrade into writing formula lines one by one (see "Visualization-first principle" in the system instructions).
2. No meaningless animation: every motion must serve a teaching purpose.
3. Do not output pseudocode or any programming-language snippets.
4. Do not include more than 2 unrelated dynamic targets in a single step.
5. Use no more than 5 colors besides the background.
6. Do not place long explanatory text inside the geometric graphic area. Text must stay in the designated text area.
7. For multiple-choice or multi-branch derivations, full vertical stacking is forbidden. A multi-column layout with overwrite-style progression is mandatory.

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
   - Prioritize one-to-one expansion from `Problem Framing Context` cards. Normally, one planning card should become one directing step. Only split a card when necessary for readability or timing, and keep the original order and intent.
   - Every step must begin with the structured tag line: `[FOCUS: ...] [ENTER: ...] [KEEP: ...] [EXIT: ...] [SCALE: ...]`
   - For on-screen/narration wording, use a two-line micro-script per step: `Hook` (spark curiosity) + `Explain` (interpret what the viewer is seeing with the visual action).
   - Wording constraint: avoid fully jargonized pedagogy language (`no fully jargonized wording`).
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
