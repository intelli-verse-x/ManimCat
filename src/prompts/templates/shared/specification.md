## Shared Specification

### Strictly Forbidden

- **No chatter**: do not add filler before or after code
- **No Markdown wrapping**: do not wrap code in Markdown fences
- **Text Rendering Rule**: do not execute Manim animations directly on raw strings. All text must first be wrapped as an Mobject. Chinese text must use `Text()` or `MarkupText()`, never `MathTex` or `Tex`.
- **No legacy syntax**: do not use `ShowCreation`, `TextMobject`, `TexMobject`, or `number_scale_val`
- **Animation syntax**: ALL animations require a mobject argument. Examples: `Create(circle)`, `FadeIn(text)`, `Write(label)`. NEVER use `Create()`, `FadeIn()`, or `Write()` without passing the object to animate
- **No invented classes**: do not invent classes like `SinFunction`, `CosFunction`, `ParabolaFunction`, `Array`, `LinkedList`, `Tree`, `Stack`, `Queue`, `Graph`, `Node`, etc. These classes DO NOT exist in Manim. Use `axes.plot(lambda x: ...)` to draw mathematical functions. Build data structures from basic shapes (`Rectangle`, `Circle`, `Arrow`, `Line`, `Text`, `VGroup`). Do not import or use any class not explicitly mentioned in the API index
- **Import statement rules**: ONLY import class names, constants, and function names. NEVER put function calls, expressions, or code execution in import statements. Valid: `from manim import Scene, Circle, BLUE`. Invalid: `from manim import Circle().set_color(BLUE)` or `from manim import Axes.plot(...)`. Imports must be simple identifiers only
- **Standard library imports**: NEVER import standard library modules like `os`, `sys`, `math`, `random`, `time` from manim. These must be imported separately: `import os` or `import math`. The manim package only contains manim classes and functions.
- **ImageMobject restriction**: ImageMobject requires valid file paths to existing image files. DO NOT use placeholder or non-existent file paths like "document.png", "essay.jpg", "photo.png", etc. If a concept mentions images/photos/documents but no actual image files are provided, represent the concept visually using geometric shapes (Rectangle with rounded corners for documents, Circle with decorations for photos), text labels, or icons instead. NEVER attempt to load images that don't exist.

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

### Code Examples (Reference Patterns)

**Axes and coordinate systems** - Use `Axes` or `NumberPlane` for grids:
```python
from manim import *
class MainScene(Scene):
    def construct(self):
        # Basic axes (NO grid_lines attribute - use NumberPlane for grids)
        axes = Axes(
            x_range=[-3, 3, 1],
            y_range=[-2, 2, 1],
            x_length=6,
            y_length=4,
            axis_config={"include_tip": True, "include_numbers": True}
        )
        self.play(Create(axes))
        
        # Plot a function
        graph = axes.plot(lambda x: x**2, color=BLUE)
        self.play(Create(graph))
        
        # Add a point on the graph
        dot = Dot(axes.c2p(1, 1), color=RED)
        self.play(FadeIn(dot))
        
        # Add label at a point
        label = MathTex("(1, 1)").next_to(dot, UP)
        self.play(Write(label))
```

**NumberPlane for grid backgrounds**:
```python
from manim import *
class MainScene(Scene):
    def construct(self):
        # Use NumberPlane when you need a grid background
        plane = NumberPlane(
            x_range=[-4, 4, 1],
            y_range=[-3, 3, 1],
            background_line_style={"stroke_opacity": 0.5}
        )
        self.play(Create(plane))
        
        # Draw on the plane
        circle = Circle(radius=1, color=YELLOW)
        self.play(Create(circle))
```

**Vertical and horizontal lines on axes**:
```python
from manim import *
class MainScene(Scene):
    def construct(self):
        axes = Axes(x_range=[-3, 3], y_range=[-2, 2])
        self.play(Create(axes))
        
        # Vertical line at x=1 (use Line, not get_vertical_line)
        v_line = Line(axes.c2p(1, -2), axes.c2p(1, 2), color=RED)
        self.play(Create(v_line))
        
        # Horizontal line at y=0.5
        h_line = Line(axes.c2p(-3, 0.5), axes.c2p(3, 0.5), color=GREEN)
        self.play(Create(h_line))
        
        # Dashed line
        dashed = DashedLine(axes.c2p(0, 0), axes.c2p(2, 1), color=YELLOW)
        self.play(Create(dashed))
```

**Matrix operations** - Use `Matrix`, `IntegerMatrix`, or `DecimalMatrix`:
```python
from manim import *
class MainScene(Scene):
    def construct(self):
        # Create a matrix
        matrix = Matrix([[1, 2], [3, 4]], left_bracket="(", right_bracket=")")
        self.play(Write(matrix))
        self.wait(0.5)
        
        # Highlight matrix entries - use get_entries() for individual elements
        entries = matrix.get_entries()
        self.play(entries[0].animate.set_color(YELLOW))  # Highlight first entry
        
        # Transform to another matrix
        matrix2 = Matrix([[5, 6], [7, 8]], left_bracket="(", right_bracket=")")
        self.play(Transform(matrix, matrix2))
        
        # Matrix with brackets and labels
        m = IntegerMatrix([[1, 0], [0, 1]], left_bracket="[", right_bracket="]")
        label = MathTex("I = ").next_to(m, LEFT)
        self.play(FadeIn(VGroup(label, m)))
```

**Matrix multiplication visualization**:
```python
from manim import *
class MainScene(Scene):
    def construct(self):
        m1 = Matrix([[1, 2], [3, 4]])
        m2 = Matrix([[5, 6], [7, 8]])
        equals = MathTex("\\times")
        result = Matrix([[19, 22], [43, 50]])
        
        group = VGroup(m1, equals, m2).arrange(RIGHT, buff=0.3)
        self.play(Write(group))
        self.wait(0.5)
        
        equals2 = MathTex("=").next_to(m2, RIGHT)
        result.next_to(equals2, RIGHT)
        self.play(Write(equals2), Write(result))
```

**Data structure visualizations** - NEVER use invented classes like `Array`, `LinkedList`, `Tree`, `Stack`, `Queue`. These do NOT exist in Manim. Build them from basic shapes:

```python
from manim import *
class MainScene(Scene):
    def construct(self):
        # Array visualization using Rectangle + Text (NOT Array class)
        def create_array(values, position=ORIGIN):
            boxes = VGroup()
            for i, val in enumerate(values):
                box = Rectangle(width=0.8, height=0.8, color=WHITE)
                text = Text(str(val), font_size=24)
                text.move_to(box.get_center())
                cell = VGroup(box, text)
                boxes.add(cell)
            boxes.arrange(RIGHT, buff=0)
            boxes.move_to(position)
            return boxes
        
        # Create and animate array
        arr = create_array([3, 7, 1, 9, 4])
        self.play(Create(arr))
        self.wait(0.5)
        
        # Highlight specific element
        self.play(arr[2][0].animate.set_color(YELLOW))
        self.wait(0.5)

# Linked list visualization using Rectangle + Arrow (NOT LinkedList class)
class MainScene(Scene):
    def construct(self):
        def create_node(value, position):
            box = Rectangle(width=1.2, height=0.8, color=WHITE)
            text = Text(str(value), font_size=24)
            text.move_to(box.get_center())
            node = VGroup(box, text)
            node.move_to(position)
            return node
        
        # Create linked list nodes
        node1 = create_node(5, LEFT * 3)
        node2 = create_node(8, ORIGIN)
        node3 = create_node(3, RIGHT * 3)
        
        # Create arrows between nodes
        arrow1 = Arrow(node1.get_right(), node2.get_left(), buff=0.1)
        arrow2 = Arrow(node2.get_right(), node3.get_left(), buff=0.1)
        
        # Animate
        self.play(Create(node1))
        self.play(Create(arrow1), Create(node2))
        self.play(Create(arrow2), Create(node3))
        self.wait(0.5)

# Binary tree visualization (NOT Tree class)
class MainScene(Scene):
    def construct(self):
        def create_tree_node(value, position):
            circle = Circle(radius=0.4, color=WHITE)
            text = Text(str(value), font_size=20)
            text.move_to(circle.get_center())
            node = VGroup(circle, text)
            node.move_to(position)
            return node
        
        # Root and children
        root = create_tree_node(10, UP * 2)
        left = create_tree_node(5, DOWN * 0.5 + LEFT * 2)
        right = create_tree_node(15, DOWN * 0.5 + RIGHT * 2)
        
        # Edges
        edge1 = Line(root.get_bottom(), left.get_top(), buff=0.1)
        edge2 = Line(root.get_bottom(), right.get_top(), buff=0.1)
        
        self.play(Create(root))
        self.play(Create(edge1), Create(left))
        self.play(Create(edge2), Create(right))
        self.wait(0.5)

# Stack visualization (NOT Stack class)
class MainScene(Scene):
    def construct(self):
        def create_stack_frame(value, position):
            box = Rectangle(width=2, height=0.6, color=WHITE)
            text = Text(str(value), font_size=24)
            text.move_to(box.get_center())
            frame = VGroup(box, text)
            frame.move_to(position)
            return frame
        
        stack_frames = VGroup()
        for i, val in enumerate([10, 20, 30]):
            frame = create_stack_frame(val, DOWN * 2 + UP * i * 0.7)
            stack_frames.add(frame)
            self.play(FadeIn(frame))
            self.wait(0.3)
        
        # Pop operation
        self.play(FadeOut(stack_frames[-1]))
        self.wait(0.5)
```
