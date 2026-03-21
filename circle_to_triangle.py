from manim import Scene, Circle, Triangle, Create, ReplacementTransform, PINK

class CircleToTriangle(Scene):
    def construct(self):
        circle = Circle()
        triangle = Triangle(color=PINK)
        
        self.play(Create(circle), run_time=2.0)
        self.wait(0.5)
        self.play(ReplacementTransform(circle, triangle), run_time=0.5)
        self.wait(0.5)
        self.play(triangle.animate.scale(0), run_time=1.0)
        self.wait(1.0)
