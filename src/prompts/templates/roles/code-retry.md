## 目标层

### 输入预期

- **概念**：{{concept}}
- **错误信息**（第 {{attempt}} 次尝试）：{{errorMessage}}
- **当前完整代码**：见下方
{{#if codeSnippet}}
- **报错相关代码片段**：优先围绕这段定位并替换
{{/if}}

### 产出要求

- 只返回一个 JSON 对象：`{"original_snippet":"...","replacement_snippet":"..."}`
- `original_snippet` 必须是当前代码里已经存在的原文片段
- `replacement_snippet` 必须是替换后的新片段
- 只改和当前错误直接相关的局部，不要顺手重构，不要改无关风格
- 若能改一行内局部，就不要改整段；若必须改整段，保持连续且最小

## 行为层

### 修复原则

1. 根据错误信息找出最可能出错的局部代码。
2. 优先参考“报错相关代码片段”，但必须确保 `original_snippet` 能在完整代码中精确找到。
3. 如果错误位于某个局部块内部，可以替换该连续代码块；不要返回完整文件。
4. 保持 Manim 结构兼容：
{{#if isVideo}}
   - 视频模式下保持可渲染的 `MainScene`
{{/if}}
{{#if isImage}}
   - 图片模式下保持现有 `YON_IMAGE` 锚点结构与编号连续
{{/if}}
5. 只输出 JSON，不要附加任何文字。

---

## 当前完整代码

```python
{{code}}
```

{{#if codeSnippet}}
## 报错相关代码片段

```python
{{codeSnippet}}
```
{{/if}}

现在只输出 patch JSON，不要任何解释。
