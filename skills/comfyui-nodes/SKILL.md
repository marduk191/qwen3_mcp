---
name: comfyui-nodes
description: "Use this skill when creating, modifying, or debugging ComfyUI custom nodes. Triggers on: 'ComfyUI custom node', 'ComfyUI node development', 'ComfyUI plugin', 'INPUT_TYPES', 'NODE_CLASS_MAPPINGS', 'RETURN_TYPES', 'define_schema', 'io.ComfyNode', or any request to build a new node for ComfyUI. Covers both V1 (current) and V3 (new) node APIs."
license: MIT
metadata:
  author: marduk191
  version: "2.1.0"
---

# ComfyUI Custom Node Development Skill

Comprehensive guide to creating custom nodes for ComfyUI. Covers both the current V1 API and the new V3 schema API.

## Quick Reference

**Official Resources:**
- Repository: https://github.com/comfyanonymous/ComfyUI
- Documentation: https://docs.comfy.org/custom-nodes
- V3 Migration: https://docs.comfy.org/custom-nodes/v3_migration
- Example Nodes: https://github.com/comfyanonymous/ComfyUI/tree/master/comfy_extras

---

## File Structure

Custom nodes go in `ComfyUI/custom_nodes/`:

```
ComfyUI/
└── custom_nodes/
    └── my_custom_nodes/
        ├── __init__.py          # REQUIRED: Node registration
        ├── nodes.py             # Node class definitions
        ├── requirements.txt     # Optional: pip dependencies
        └── web/                 # Optional: Frontend JS extensions
            └── js/
                └── my_extension.js
```

---

## Basic Node Template

**ALL FOUR class attributes (CATEGORY, RETURN_TYPES, FUNCTION, INPUT_TYPES) are REQUIRED. Missing any one will cause silent failure.**

```python
class MyCustomNode:
    """Description of what this node does."""

    # ── ALL FOUR REQUIRED ATTRIBUTES ──────────────────────────
    CATEGORY = "my_nodes/utilities"       # REQUIRED: Menu location
    RETURN_TYPES = ("IMAGE",)             # REQUIRED: Output types as TUPLE (NOT a method!)
    RETURN_NAMES = ("output_image",)      # Optional: Display names for outputs
    FUNCTION = "process"                  # REQUIRED: Name of the method ComfyUI will call
    OUTPUT_NODE = False                   # Optional: True for terminal nodes (save, preview)
    # ──────────────────────────────────────────────────────────

    @classmethod
    def INPUT_TYPES(cls):                 # REQUIRED: Must be a @classmethod
        return {
            "required": {
                "image": ("IMAGE",),
                "strength": ("FLOAT", {
                    "default": 1.0,
                    "min": 0.0,
                    "max": 2.0,
                    "step": 0.1,
                    "display": "slider",
                    "tooltip": "Effect strength"
                }),
            },
            "optional": {
                "mask": ("MASK",),
            },
            "hidden": {
                "node_id": "UNIQUE_ID",
            }
        }

    # Method name MUST match FUNCTION value. Parameters MUST match INPUT_TYPES keys.
    # Do NOT use execute(**kwargs). Use explicit named parameters.
    def process(self, image, strength, mask=None, node_id=None):
        # Your processing logic here
        result = image * strength
        return (result,)  # MUST return a tuple matching RETURN_TYPES (NOT a dict!)
```

---

## Node Registration (__init__.py)

**Keep `__init__.py` minimal. ComfyUI auto-discovers nodes via `NODE_CLASS_MAPPINGS`. No registration API calls needed.**

```python
# ✅ CORRECT: Use RELATIVE imports (from .nodes, NOT from nodes)
from .nodes import MyCustomNode, AnotherNode

# Maps internal name -> class (use unique prefixes to avoid conflicts!)
NODE_CLASS_MAPPINGS = {
    "MyProject_CustomNode": MyCustomNode,
    "MyProject_AnotherNode": AnotherNode,
}

# Maps internal name -> display name in UI (ALWAYS include this!)
NODE_DISPLAY_NAME_MAPPINGS = {
    "MyProject_CustomNode": "My Custom Node",
    "MyProject_AnotherNode": "Another Node",
}

# For JS extensions (only if you have web/ directory)
WEB_DIRECTORY = "./web/js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
```

**NEVER do any of these in `__init__.py`:**
- `from nodes import ...` (bare import — conflicts with ComfyUI's `nodes` module)
- `sys.path.insert(0, ...)` (path manipulation — causes import conflicts)
- `register_custom_node()` or `register_node()` (these APIs don't exist)
- `sys.modules['NODE_CLASS_MAPPINGS'] = ...` (nonsensical)
- Runtime `CATEGORY` patching with `hasattr` checks

---

## INPUT_TYPES Reference

### Input Categories

```python
@classmethod
def INPUT_TYPES(cls):
    return {
        "required": { ... },   # Must be connected/set
        "optional": { ... },   # Can be left empty
        "hidden": { ... }      # Not shown in UI
    }
```

### Primitive Types

**INT**
```python
"count": ("INT", {
    "default": 1,
    "min": 0,
    "max": 100,
    "step": 1,
    "display": "number",  # or "slider"
    "tooltip": "Number of iterations"
})
```

**FLOAT**
```python
"strength": ("FLOAT", {
    "default": 1.0,
    "min": 0.0,
    "max": 10.0,
    "step": 0.1,
    "round": 0.01,
    "display": "slider",
    "tooltip": "Effect strength"
})
```

**STRING**
```python
"prompt": ("STRING", {
    "default": "",
    "multiline": True,
    "placeholder": "Enter text...",
    "dynamicPrompts": True,
    "tooltip": "Text input"
})
```

**BOOLEAN**
```python
"enabled": ("BOOLEAN", {
    "default": True,
    "label_on": "Enabled",
    "label_off": "Disabled",
    "tooltip": "Toggle feature"
})
```

**COMBO (Dropdown)**
```python
"mode": (["option1", "option2", "option3"], {"default": "option1"})
```

**COLOR**
```python
"color": ("INT", {
    "default": 0xFF0000,
    "min": 0,
    "max": 0xFFFFFF,
    "display": "color"
})
```

### Common Input Options

| Option | Type | Description |
|--------|------|-------------|
| `default` | any | Initial value |
| `min` / `max` | number | Value bounds |
| `step` | number | Increment step |
| `round` | number | Decimal precision |
| `display` | str | "number", "slider", "color" |
| `tooltip` | str | Hover help text |
| `forceInput` | bool | Force socket (no widget) |
| `lazy` | bool | Enable lazy evaluation |
| `multiline` | bool | Multi-line text (STRING) |

### Hidden Inputs

```python
"hidden": {
    "node_id": "UNIQUE_ID",           # Node's unique ID
    "prompt": "PROMPT",                # Full workflow prompt
    "extra_pnginfo": "EXTRA_PNGINFO",  # PNG metadata
}
```

---

## Data Types

### Tensor Types

| Type | Shape | Description |
|------|-------|-------------|
| `IMAGE` | `[B,H,W,C]` | Image batch (C=3 RGB, values 0-1) |
| `MASK` | `[B,H,W]` | Grayscale mask (values 0-1) |
| `LATENT` | dict `{"samples": [B,C,H,W]}` | Latent space (channel-first) |
| `AUDIO` | dict `{"waveform": [B,C,T]}` | Audio data |

### Model Types

| Type | Description |
|------|-------------|
| `MODEL` | Diffusion model (UNet) |
| `CLIP` | Text encoder |
| `VAE` | Variational autoencoder |
| `CONDITIONING` | Text/image conditioning |
| `CONTROL_NET` | ControlNet model |
| `CLIP_VISION` | Vision encoder |

### Sampling Types

| Type | Description |
|------|-------------|
| `SAMPLER` | Sampling algorithm |
| `SIGMAS` | Noise schedule |
| `NOISE` | Noise generator |
| `GUIDER` | Guidance strategy |

### Custom Types

```python
# Define your own type
RETURN_TYPES = ("MY_CUSTOM_DATA",)

# Accept in another node
"my_input": ("MY_CUSTOM_DATA", {"forceInput": True})

# Wildcard (accept any type)
"any_input": ("*",)
```

---

## Working with Tensors

### Image Format

```python
import torch

def process(self, image):
    # IMAGE: [Batch, Height, Width, Channels] - channel-LAST
    batch, height, width, channels = image.shape

    # Process single image
    single = image[0]  # [H, W, C]

    # Add batch dimension back
    result = single.unsqueeze(0)  # [1, H, W, C]

    return (result,)
```

### Mask Format

```python
def process(self, mask):
    # MASK: [B, H, W] or [H, W]
    if mask.dim() == 2:
        mask = mask.unsqueeze(0)  # Add batch dim

    inverted = 1.0 - mask
    return (inverted,)
```

### Latent Format

```python
def process(self, latent):
    # LATENT: dict with "samples" key
    # samples: [B, C, H, W] - channel-FIRST, 1/8 image size
    samples = latent["samples"]

    processed = samples * 0.5

    return ({"samples": processed},)
```

### Format Conversion

```python
# Channel-last to channel-first (IMAGE -> model input)
chw = image.permute(0, 3, 1, 2)  # [B,H,W,C] -> [B,C,H,W]

# Channel-first to channel-last (model output -> IMAGE)
hwc = tensor.permute(0, 2, 3, 1)  # [B,C,H,W] -> [B,H,W,C]
```

---

## Advanced Features

### IS_CHANGED (Cache Control)

```python
@classmethod
def IS_CHANGED(cls, image, seed):
    # Return different value when node should re-execute
    # NaN = always re-execute
    return float("NaN")

    # Or hash inputs
    return hash(seed)
```

**WARNING:** Do NOT return `bool`. Returning `True` means "unchanged"!

### VALIDATE_INPUTS

```python
@classmethod
def VALIDATE_INPUTS(cls, image, strength):
    if strength < 0:
        return "Strength must be non-negative"
    return True
```

### Lazy Evaluation

```python
@classmethod
def INPUT_TYPES(cls):
    return {
        "required": {
            "image1": ("IMAGE", {"lazy": True}),
            "image2": ("IMAGE", {"lazy": True}),
            "blend": ("FLOAT", {"default": 0.5}),
        }
    }

def check_lazy_status(self, image1, image2, blend):
    needed = []
    if blend > 0 and image1 is None:
        needed.append("image1")
    if blend < 1 and image2 is None:
        needed.append("image2")
    return needed

def process(self, image1, image2, blend):
    return (image1 * blend + image2 * (1 - blend),)
```

### List Processing

```python
class BatchProcessor:
    INPUT_IS_LIST = True
    OUTPUT_IS_LIST = (True,)
    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "process"

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"images": ("IMAGE",)}}

    def process(self, images):
        # images is a list of tensors
        results = [process_single(img) for img in images]
        return (results,)
```

### Progress Updates

```python
from server import PromptServer

def process(self, count, node_id):
    for i in range(count):
        PromptServer.instance.send_sync(
            "progress",
            {"node": node_id, "value": i, "max": count}
        )
        do_work(i)
    return (count,)
```

### Return UI Data

```python
def process(self, image):
    result = process_image(image)

    return {
        "ui": {"message": ["Processing complete!"]},
        "result": (result,)
    }
```

---

## JavaScript Extensions

```javascript
// web/js/my_extension.js
import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "my.custom.extension",

    async setup() {
        console.log("Extension loaded");

        app.api.addEventListener("my.custom.message", (event) => {
            console.log("Received:", event.detail);
        });
    },

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "MyProject_CustomNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                // Custom initialization
            };
        }
    }
});
```

---

## Complete Example: Image Filter Node

```python
# nodes.py
import torch

class ImageBrightnessContrast:
    """Adjust image brightness and contrast."""

    CATEGORY = "image/adjustments"
    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "adjust"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "brightness": ("FLOAT", {
                    "default": 0.0,
                    "min": -1.0,
                    "max": 1.0,
                    "step": 0.05,
                    "display": "slider",
                    "tooltip": "Brightness adjustment (-1 to 1)"
                }),
                "contrast": ("FLOAT", {
                    "default": 1.0,
                    "min": 0.0,
                    "max": 3.0,
                    "step": 0.1,
                    "display": "slider",
                    "tooltip": "Contrast multiplier"
                }),
            }
        }

    def adjust(self, image, brightness, contrast):
        # Apply contrast (around midpoint 0.5)
        result = (image - 0.5) * contrast + 0.5

        # Apply brightness
        result = result + brightness

        # Clamp to valid range
        result = torch.clamp(result, 0.0, 1.0)

        return (result,)


class ImageBlend:
    """Blend two images together."""

    CATEGORY = "image/composite"
    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("blended",)
    FUNCTION = "blend"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image1": ("IMAGE",),
                "image2": ("IMAGE",),
                "blend_mode": (["normal", "multiply", "screen", "overlay"],),
                "opacity": ("FLOAT", {
                    "default": 0.5,
                    "min": 0.0,
                    "max": 1.0,
                    "step": 0.05,
                    "display": "slider"
                }),
            },
            "optional": {
                "mask": ("MASK",),
            }
        }

    def blend(self, image1, image2, blend_mode, opacity, mask=None):
        if blend_mode == "normal":
            blended = image2
        elif blend_mode == "multiply":
            blended = image1 * image2
        elif blend_mode == "screen":
            blended = 1 - (1 - image1) * (1 - image2)
        elif blend_mode == "overlay":
            blended = torch.where(
                image1 < 0.5,
                2 * image1 * image2,
                1 - 2 * (1 - image1) * (1 - image2)
            )

        # Apply opacity
        result = image1 * (1 - opacity) + blended * opacity

        # Apply mask if provided
        if mask is not None:
            if mask.dim() == 2:
                mask = mask.unsqueeze(0)
            mask = mask.unsqueeze(-1)  # [B,H,W] -> [B,H,W,1]
            result = image1 * (1 - mask) + result * mask

        return (result,)
```

```python
# __init__.py
from .nodes import ImageBrightnessContrast, ImageBlend

NODE_CLASS_MAPPINGS = {
    "MyNodes_BrightnessContrast": ImageBrightnessContrast,
    "MyNodes_Blend": ImageBlend,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "MyNodes_BrightnessContrast": "Brightness/Contrast",
    "MyNodes_Blend": "Image Blend",
}

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
```

---

## Best Practices

1. **Use unique prefixes** in NODE_CLASS_MAPPINGS to avoid conflicts
2. **Add tooltips** to all inputs for better UX
3. **Validate inputs** with VALIDATE_INPUTS for clear error messages
4. **Handle batch dimensions** - always expect `[B,H,W,C]` for images
5. **Clamp outputs** to valid ranges (0-1 for images)
6. **Use lazy evaluation** for expensive optional inputs
7. **Document dependencies** in requirements.txt
8. **Test with various batch sizes** and edge cases

---

## ⚠️ CRITICAL: Common Mistakes That Break Nodes

These mistakes will cause nodes to silently fail to register, not appear in workflows, or crash at runtime. **Every single one has been encountered in real node development.**

### Mistake 1: Using `OUTPUT_TYPES` Instead of `RETURN_TYPES`

**WRONG — Node will not register:**
```python
class MyNode:
    @classmethod
    def OUTPUT_TYPES(cls):  # ❌ WRONG NAME, WRONG FORMAT
        return {"result": ("IMAGE",)}  # ❌ Dict, not tuple
```

**CORRECT:**
```python
class MyNode:
    RETURN_TYPES = ("IMAGE",)  # ✅ Class attribute, tuple
    RETURN_NAMES = ("result",)  # ✅ Optional display names
```

**Key points:**
- It's `RETURN_TYPES`, never `OUTPUT_TYPES`
- It's a **class attribute** (tuple), NOT a classmethod
- For multiple outputs: `RETURN_TYPES = ("IMAGE", "IMAGE")` with `RETURN_NAMES = ("left", "right")`

### Mistake 2: Missing `FUNCTION` Attribute

**WRONG — ComfyUI doesn't know which method to call:**
```python
class MyNode:
    RETURN_TYPES = ("IMAGE",)
    # ❌ No FUNCTION attribute!

    def execute(self, image):  # ComfyUI will never call this
        return (image,)
```

**CORRECT:**
```python
class MyNode:
    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "process"  # ✅ Tells ComfyUI which method to call

    def process(self, image):  # ✅ Method name matches FUNCTION
        return (image,)
```

### Mistake 3: Missing `CATEGORY` Attribute

**WRONG — Node won't appear in the menu:**
```python
class MyNode:
    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "process"
    # ❌ No CATEGORY! Node is invisible in menus
```

**CORRECT:**
```python
class MyNode:
    CATEGORY = "image/restoration"  # ✅ Shows in Add Node menu
    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "process"
```

### Mistake 4: Using `execute(**kwargs)` Instead of Named Parameters

**WRONG — Parameters won't be received correctly:**
```python
class MyNode:
    FUNCTION = "execute"

    def execute(self, **kwargs):  # ❌ Generic kwargs
        image = kwargs.get("image")  # ❌ Won't work reliably
        strength = kwargs.get("strength", 1.0)
        return (image * strength,)
```

**CORRECT:**
```python
class MyNode:
    FUNCTION = "process"

    def process(self, image, strength=1.0):  # ✅ Explicit named params
        return (image * strength,)           # matching INPUT_TYPES keys
```

**Key points:**
- Method name must match the `FUNCTION` attribute value
- Parameter names must match the keys in `INPUT_TYPES`
- Optional inputs should have default values (e.g., `mask=None`)
- Don't use `**kwargs` — ComfyUI passes arguments by name

### Mistake 5: Returning Dicts Instead of Tuples

**WRONG — ComfyUI expects tuples:**
```python
def process(self, image):
    result = do_something(image)
    return {"result": result}  # ❌ Dict return
```

**CORRECT:**
```python
def process(self, image):
    result = do_something(image)
    return (result,)  # ✅ Tuple matching RETURN_TYPES
```

**For multiple outputs:**
```python
RETURN_TYPES = ("IMAGE", "IMAGE")
RETURN_NAMES = ("left", "right")

def process(self, image):
    return (left_result, right_result)  # ✅ Tuple with one element per RETURN_TYPES entry
```

### Mistake 6: Bad `__init__.py` — Bare Import from `nodes`

**WRONG — Conflicts with ComfyUI's own `nodes` module:**
```python
# ❌ __init__.py
import sys, os
NODES_DIR = os.path.dirname(os.path.abspath(__file__))
if NODES_DIR not in sys.path:
    sys.path.insert(0, NODES_DIR)  # ❌ sys.path manipulation
from nodes import NODE_CLASS_MAPPINGS  # ❌ Bare import collides with ComfyUI's nodes module
```

**CORRECT:**
```python
# ✅ __init__.py (3 lines is all you need!)
from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
```

**Key points:**
- ALWAYS use **relative imports** (`.nodes`, not `nodes`)
- NEVER manipulate `sys.path` — it will cause import conflicts
- NEVER use bare `from nodes import` — `nodes` is a ComfyUI core module

### Mistake 7: Calling Non-Existent Registration APIs

**WRONG — These functions do not exist in ComfyUI:**
```python
# ❌ None of these exist!
from comfy.utils import register_custom_node  # ❌ Does not exist
register_custom_node(name, cls)               # ❌ Does not exist

from nodes import register_node               # ❌ Does not exist
register_node(cls)                            # ❌ Does not exist

# ❌ Also wrong:
sys.modules['NODE_CLASS_MAPPINGS'] = mappings  # ❌ Nonsensical
```

**CORRECT — ComfyUI auto-discovers nodes via `NODE_CLASS_MAPPINGS`:**
```python
# ✅ Just export these dicts from __init__.py — that's it!
NODE_CLASS_MAPPINGS = {
    "MyProject_NodeName": MyNodeClass,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "MyProject_NodeName": "My Node Name",
}
```

ComfyUI reads `NODE_CLASS_MAPPINGS` from your package's `__init__.py` automatically. **No registration function calls are needed.**

### Mistake 8: Missing `NODE_DISPLAY_NAME_MAPPINGS`

**WRONG — Nodes show ugly internal names in UI:**
```python
NODE_CLASS_MAPPINGS = {
    "NAFNetDenoiseNode": NAFNetDenoiseNode,
}
# ❌ No NODE_DISPLAY_NAME_MAPPINGS — UI shows "NAFNetDenoiseNode"
```

**CORRECT:**
```python
NODE_CLASS_MAPPINGS = {
    "NAFNet_Denoise": NAFNetDenoiseNode,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "NAFNet_Denoise": "NAFNet Denoise",  # ✅ Clean UI name
}
```

---

### V1 Node Required Attributes Checklist

Every V1 node class **MUST** have ALL of these:

```python
class MyNode:
    CATEGORY = "my_category"          # ✅ REQUIRED - menu location
    RETURN_TYPES = ("IMAGE",)         # ✅ REQUIRED - output types tuple
    FUNCTION = "my_method"            # ✅ REQUIRED - method name string

    @classmethod
    def INPUT_TYPES(cls):             # ✅ REQUIRED - classmethod
        return {"required": { ... }}

    def my_method(self, param1, param2):  # ✅ REQUIRED - matches FUNCTION
        return (result,)                   # ✅ REQUIRED - returns tuple
```

Missing ANY of these will cause silent failures.

---

### Minimal Valid `__init__.py`

```python
from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS
__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS']
```

**Never add:**
- `sys.path` manipulation
- `register_custom_node()` or `register_node()` calls
- `sys.modules` manipulation
- Manual `CATEGORY` patching via `hasattr` checks
- `WEB_DIRS` manual registration
- Bare `from nodes import` (always use `from .nodes import`)

---

## Debugging

1. Check ComfyUI console for Python errors
2. Use `print()` statements (output goes to terminal)
3. Browser DevTools (F12) for JS extension errors
4. Verify tensor shapes match expected formats
5. Test with minimal workflows first

---

## V3 Node API (New)

The V3 API is the future of ComfyUI node development. It uses a centralized schema approach instead of scattered class attributes. V3 nodes are stateless classmethods, making them compatible with isolated/distributed environments.

### V3 Basic Template

```python
from comfy.nodes.common import io

class MyV3Node(io.ComfyNode):
    """Description of what this node does."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="MyProject_V3Node",
            display_name="My V3 Node",
            category="my_nodes/utilities",
            description="A node that processes images",
            inputs=[
                io.Image.Input("image"),
                io.Float.Input("strength",
                    default=1.0, min=0.0, max=2.0, step=0.1,
                    tooltip="Effect strength"
                ),
                io.Mask.Input("mask", optional=True),
            ],
            outputs=[
                io.Image.Output("image"),
            ],
            is_output_node=False,
        )

    @classmethod
    def execute(cls, image, strength, mask=None) -> io.NodeOutput:
        result = image * strength
        if mask is not None:
            if mask.dim() == 2:
                mask = mask.unsqueeze(0)
            mask = mask.unsqueeze(-1)
            result = image * (1 - mask) + result * mask
        return io.NodeOutput(result)
```

### V3 Extension Registration

```python
from comfy.nodes.common import io

class MyExtension(io.ComfyExtension):
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return [MyV3Node, AnotherV3Node]

async def comfy_entrypoint() -> MyExtension:
    return MyExtension()
```

### V3 Input/Output Types

| V1 Format | V3 Equivalent |
|-----------|---------------|
| `("INT", {...})` | `io.Int.Input("name", default=0, min=0, max=100)` |
| `("FLOAT", {...})` | `io.Float.Input("name", default=1.0, min=0.0, max=10.0)` |
| `("STRING", {...})` | `io.String.Input("name", multiline=True)` |
| `("BOOLEAN", {...})` | `io.Boolean.Input("name", default=True)` |
| `("IMAGE",)` | `io.Image.Input("name")` |
| `("MASK",)` | `io.Mask.Input("name")` |
| `("LATENT",)` | `io.Latent.Input("name")` |
| `("MODEL",)` | `io.Model.Input("name")` |
| `("CLIP",)` | `io.Clip.Input("name")` |
| `("VAE",)` | `io.Vae.Input("name")` |
| `("CONDITIONING",)` | `io.Conditioning.Input("name")` |
| `(["opt1", "opt2"],)` | `io.Combo.Input("name", options=["opt1", "opt2"])` |
| Custom type | `io.Custom("MY_TYPE").Input("name")` |

### V3 Special Methods

| V1 Method | V3 Method | Purpose |
|-----------|-----------|---------|
| `INPUT_TYPES()` | `define_schema()` | Node configuration |
| `VALIDATE_INPUTS()` | `validate_inputs()` | Input validation |
| `IS_CHANGED()` | `fingerprint_inputs()` | Cache control |
| `check_lazy_status()` | `check_lazy_status()` | Lazy evaluation (now classmethod) |
| `FUNCTION = "process"` | `execute()` | Always named `execute` |

### V3 UI Output

```python
@classmethod
def execute(cls, image) -> io.NodeOutput:
    result = process_image(image)
    return io.NodeOutput(result, ui=io.ui.PreviewImage(result, cls=cls))
```

### V3 Custom API Routes

```python
from aiohttp import web
from server import PromptServer

class MyExtension(io.ComfyExtension):
    async def get_node_list(self):
        return [MyNode]

    async def init_custom_routes(self):
        @PromptServer.instance.routes.get("/my-extension/status")
        async def get_status(request):
            return web.json_response({"status": "ok"})
```

---

## Error Handling Patterns

### Graceful Input Validation

```python
@classmethod
def VALIDATE_INPUTS(cls, image, strength):
    if strength < 0:
        return "Strength must be non-negative"
    if strength > 10:
        return "Strength too high (max 10)"
    return True
```

### Try/Catch in Processing

```python
def process(self, image, **kwargs):
    try:
        result = complex_operation(image)
        return (result,)
    except RuntimeError as e:
        if "out of memory" in str(e):
            # Try with lower resolution
            small = torch.nn.functional.interpolate(
                image.permute(0, 3, 1, 2),
                scale_factor=0.5,
                mode='bilinear'
            ).permute(0, 2, 3, 1)
            result = complex_operation(small)
            return (result,)
        raise
```

---

## Device & Memory Management

```python
import torch
import comfy.model_management as mm

def process(self, image):
    device = mm.get_torch_device()
    offload_device = mm.unet_offload_device()

    # Move to GPU for processing
    image = image.to(device)

    result = heavy_computation(image)

    # Move back to CPU to free VRAM
    result = result.to(offload_device)

    return (result,)
```

---

## Publishing Custom Nodes

### ComfyUI Manager Registration

Create a `pyproject.toml` in your node pack root:

```toml
[project]
name = "comfyui-my-nodes"
description = "Description of your node pack"
version = "1.0.0"
license = "MIT"
requires-python = ">=3.9"
dependencies = ["torch", "numpy"]

[project.urls]
Repository = "https://github.com/user/comfyui-my-nodes"

[tool.comfy]
PublisherId = "your-publisher-id"
DisplayName = "My Custom Nodes"
Icon = "https://example.com/icon.png"
```

### Submit to ComfyUI Registry

```bash
# Install comfy-cli
pip install comfy-cli

# Login
comfy node login

# Publish
comfy node publish
```

---

## Resources

- **Official Docs**: https://docs.comfy.org/custom-nodes
- **V3 Migration Guide**: https://docs.comfy.org/custom-nodes/v3_migration
- **ComfyUI Source**: https://github.com/comfyanonymous/ComfyUI
- **Built-in Nodes**: https://github.com/comfyanonymous/ComfyUI/tree/master/comfy_extras
- **Example Custom Nodes**: https://github.com/comfyanonymous/ComfyUI_examples
- **ComfyUI Registry**: https://registry.comfy.org
