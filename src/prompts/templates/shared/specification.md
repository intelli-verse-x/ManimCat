## Shared Specification

### Strictly Forbidden

- **No chatter**: do not add filler before or after code
- **No Markdown wrapping**: do not wrap code in Markdown fences
- **Text Rendering Rule**: do not execute Manim animations directly on raw strings. All text must first be wrapped as an Mobject. Chinese text must use `Text()` or `MarkupText()`, never `MathTex` or `Tex`.
- **No legacy syntax**: do not use `ShowCreation`, `TextMobject`, `TexMobject`, or `number_scale_val`
- **Animation syntax**: ALL animations require a mobject argument. Examples: `Create(circle)`, `FadeIn(text)`, `Write(label)`. NEVER use `Create()`, `FadeIn()`, or `Write()` without passing the object to animate
- **No invented classes**: do not invent classes like `SinFunction`, `CosFunction`, `ParabolaFunction`, etc. Use `axes.plot(lambda x: ...)` to draw mathematical functions. Do not import or use any class not explicitly mentioned in the API index
- **Import statement rules**: ONLY import class names, constants, and function names. NEVER put function calls, expressions, or code execution in import statements. Valid: `from manim import Scene, Circle, BLUE`. Invalid: `from manim import Circle().set_color(BLUE)` or `from manim import Axes.plot(...)`. Imports must be simple identifiers only

### Error Correction

- **Indexing trap**: never use `[i]` indexing directly on `MathTex`
- **Configuration dictionaries**: never pass visual parameters directly into `Axes`; they must be wrapped inside `axis_config`
- **Dashed-line trap**: never pass `dash_length` or `dashed_ratio` directly into common drawing helpers such as `plot()`, `Line()`, or `Circle()`

### API Strictness

- **Whitelist mechanism**: only use methods, parameters, and classes explicitly listed in the API index
- **Blacklist mechanism**: anything not mentioned in the index is forbidden by default
- **No imagination**: do not infer, guess, or invent API usages outside the index. If you think a class or method should exist but it's not in the API index, it does NOT exist - find another way using only documented APIs
- **Strict ownership**: `Scene` may use only methods listed under `Scene_methods`, and `ThreeDScene` may use only methods listed under `ThreeDScene_methods`. Do not mix them

### Technical Principles

- **Dynamic updates**: for processes involving changing values, prefer `ValueTracker` together with `always_redraw`
- **Formula manipulation rules**: do not use hard-coded indices. Use `substrings_to_isolate` together with `get_part_by_tex` to operate on specific formula components
- **Coordinate-system consistency**: all graphics must be mapped through `axes.c2p` onto the coordinate axes. Free positioning detached from the axis system is forbidden
- **Collision avoidance and alignment**: text, labels, and formulas must have explicit positional offsets, preferably using `next_to`, `shift`, or `buff`. Multiple text elements may not overlap in the same position
- **Function plotting**: to draw mathematical functions, use `axes.plot(lambda x: expression, color=COLOR)`. Examples: `axes.plot(lambda x: np.sin(x))`, `axes.plot(lambda x: x**2)`, `axes.plot(lambda x: np.exp(x))`. Never invent function classes
