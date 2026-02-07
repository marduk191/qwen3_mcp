# ComfyUI Custom Node Development Skill

A comprehensive guide to creating custom nodes for ComfyUI, the node-based Stable Diffusion interface.

## Quick Reference

**Official Resources:**
- Repository: https://github.com/comfyanonymous/ComfyUI
- Documentation: https://docs.comfy.org/custom-nodes
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

```python
class MyCustomNode:
    """Description of what this node does."""

    # Menu location in ComfyUI
    CATEGORY = "my_nodes/utilities"

    # Output types (tuple)
    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("output_image",)

    # Method to call for execution
    FUNCTION = "process"

    # Set True for terminal/output nodes (save, preview, etc.)
    OUTPUT_NODE = False

    @classmethod
    def INPUT_TYPES(cls):
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

    def process(self, image, strength, mask=None, node_id=None):
        # Your processing logic here
        result = image * strength
        return (result,)  # Must return tuple matching RETURN_TYPES
```

---

## Node Registration (__init__.py)

```python
from .nodes import MyCustomNode, AnotherNode

# Maps internal name -> class (use unique prefixes!)
NODE_CLASS_MAPPINGS = {
    "MyProject_CustomNode": MyCustomNode,
    "MyProject_AnotherNode": AnotherNode,
}

# Maps internal name -> display name in UI
NODE_DISPLAY_NAME_MAPPINGS = {
    "MyProject_CustomNode": "My Custom Node",
    "MyProject_AnotherNode": "Another Node",
}

# For JS extensions
WEB_DIRECTORY = "./web/js"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
```

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

## Debugging

1. Check ComfyUI console for Python errors
2. Use `print()` statements (output goes to terminal)
3. Browser DevTools (F12) for JS extension errors
4. Verify tensor shapes match expected formats
5. Test with minimal workflows first

---

## Resources

- **Official Docs**: https://docs.comfy.org/custom-nodes
- **ComfyUI Source**: https://github.com/comfyanonymous/ComfyUI
- **Built-in Nodes**: https://github.com/comfyanonymous/ComfyUI/tree/master/comfy_extras
- **Example Custom Nodes**: https://github.com/comfyanonymous/ComfyUI_examples
