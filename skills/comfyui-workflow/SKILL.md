# ComfyUI Workflow Skill

A skill for creating and managing ComfyUI image generation workflows.

## Instructions

When asked to help with ComfyUI workflows, use this knowledge:

### ComfyUI Basics
- ComfyUI uses a node-based workflow system
- Workflows are saved as JSON files
- Nodes connect via inputs/outputs to form a pipeline

### Common Node Types

**Loading Nodes:**
- `CheckpointLoaderSimple` - Load a model checkpoint
- `VAELoader` - Load a VAE model
- `LoraLoader` - Load LoRA weights
- `ControlNetLoader` - Load ControlNet models

**Sampling Nodes:**
- `KSampler` - Main sampling node
- `KSamplerAdvanced` - Advanced sampling with more control
- Parameters: steps, cfg, sampler_name, scheduler, denoise

**Conditioning:**
- `CLIPTextEncode` - Encode text prompts
- `ConditioningCombine` - Combine conditions
- `ConditioningSetArea` - Regional prompting

**Latent:**
- `EmptyLatentImage` - Create blank latent
- `VAEDecode` - Decode latent to image
- `VAEEncode` - Encode image to latent

**Output:**
- `SaveImage` - Save output image
- `PreviewImage` - Preview without saving

### Workflow Templates

**Basic txt2img:**
```
CheckpointLoaderSimple → KSampler → VAEDecode → SaveImage
                    ↑
CLIPTextEncode (positive) + CLIPTextEncode (negative)
```

**img2img:**
```
LoadImage → VAEEncode → KSampler → VAEDecode → SaveImage
```

**ControlNet:**
```
ControlNetLoader + LoadImage → ControlNetApply → KSampler
```

### Best Practices
- Start with low steps (20) for testing
- Use CFG between 7-12 for most cases
- DPM++ 2M Karras is a good default sampler
- Always connect negative prompt for better quality

## Example Usage

User: "Create a ComfyUI workflow for anime art"
Assistant: *Provides workflow JSON with anime-optimized settings*
