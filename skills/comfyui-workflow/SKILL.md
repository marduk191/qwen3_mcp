---
name: comfyui-workflow
description: "Use this skill when creating, modifying, or debugging ComfyUI image generation workflows. Triggers on: 'ComfyUI workflow', 'ComfyUI pipeline', 'txt2img', 'img2img', 'inpainting', 'ControlNet', 'KSampler', 'Flux workflow', 'SDXL workflow', 'SD3.5 workflow', 'LoRA', 'IPAdapter', or any request to build an image generation pipeline in ComfyUI."
license: MIT
metadata:
  author: marduk191
  version: "2.0.0"
---

# ComfyUI Workflow Guide

Comprehensive guide to building image generation workflows in ComfyUI. Covers SD1.5, SDXL, SD3.5, and Flux model families with all common pipeline patterns.

## When to Use This Skill

- Creating text-to-image, image-to-image, or inpainting workflows
- Setting up Flux, SDXL, or SD3.5 pipelines
- Adding ControlNet, LoRA, IPAdapter, or other conditioning
- Optimizing sampler/scheduler settings
- Building complex multi-stage generation pipelines

---

## Model Families & Loading

Different models require different loader nodes. This is the most common source of errors.

### SD1.5 / SDXL

Uses a single checkpoint file containing UNet + CLIP + VAE.

```
Node: CheckpointLoaderSimple
  ckpt_name: "sd_xl_base_1.0.safetensors"
Outputs: MODEL, CLIP, VAE
```

**File location:** `ComfyUI/models/checkpoints/`

### SD3.5

Uses a checkpoint with triple CLIP (clip_g + clip_l + t5xxl).

```
Node: CheckpointLoaderSimple
  ckpt_name: "sd3.5_large.safetensors"
Outputs: MODEL, CLIP, VAE
```

Or load components separately:

```
Node: UNETLoader
  unet_name: "sd3.5_large.safetensors"
  weight_dtype: "default"
Outputs: MODEL

Node: TripleCLIPLoader
  clip_name1: "clip_g.safetensors"
  clip_name2: "clip_l.safetensors"
  clip_name3: "t5xxl_fp16.safetensors"
Outputs: CLIP

Node: VAELoader
  vae_name: "sd3.5_vae.safetensors"
Outputs: VAE
```

**SD3.5 Variants:**
| Model | Params | Speed | Quality |
|-------|--------|-------|---------|
| SD3.5 Large | 8B | Slow | Best |
| SD3.5 Large Turbo | 8B distilled | Fast | Good |
| SD3.5 Medium | 2.5B | Medium | Good |

### Flux

Flux does NOT use a single checkpoint. Load components separately:

```
Node: UNETLoader (or "Load Diffusion Model")
  unet_name: "flux1-dev.safetensors"
  weight_dtype: "default"
Outputs: MODEL

Node: DualCLIPLoader
  clip_name1: "t5xxl_fp16.safetensors"    (or fp8)
  clip_name2: "clip_l.safetensors"
  type: "flux"
Outputs: CLIP

Node: VAELoader
  vae_name: "ae.safetensors"
Outputs: VAE
```

**Exception:** FP8 checkpoint versions can use `CheckpointLoaderSimple` with CFG=1.0.

**Flux Model Variants:**
| Model | Steps | Quality | License |
|-------|-------|---------|---------|
| Flux.1 Dev | 20-50 | Best | Non-commercial |
| Flux.1 Schnell | 4 | Good | Apache 2.0 |
| Flux.1 Pro | N/A | Best | API only |

**Flux File Locations:**
- Diffusion models: `ComfyUI/models/diffusion_models/`
- Text encoders: `ComfyUI/models/text_encoders/` (or `models/clip/`)
- VAE: `ComfyUI/models/vae/`

**Important:** Flux does NOT use negative prompts. Leave negative conditioning empty or don't connect it.

### Flux Kontext (Image Editing)

Flux Kontext supports context-based image editing — understanding both image and text content.

```
Node: UNETLoader
  unet_name: "flux1-kontext-dev.safetensors"

Node: FluxKontextImageEncode
  image: (input image)
  clip: (from DualCLIPLoader)
Outputs: CONDITIONING
```

---

## Core Workflow Patterns

### Text-to-Image (txt2img)

The most basic workflow:

```
CheckpointLoaderSimple ──→ MODEL ──→ KSampler ──→ LATENT ──→ VAEDecode ──→ IMAGE ──→ SaveImage
                      ├──→ CLIP ──→ CLIPTextEncode (positive) ──→ CONDITIONING ──→ KSampler
                      ├──→ CLIP ──→ CLIPTextEncode (negative) ──→ CONDITIONING ──→ KSampler
                      └──→ VAE ──→ VAEDecode
EmptyLatentImage ──→ LATENT ──→ KSampler
```

**Node connections:**
1. `CheckpointLoaderSimple` → loads MODEL, CLIP, VAE
2. `CLIPTextEncode` (positive) → connect CLIP, enter prompt
3. `CLIPTextEncode` (negative) → connect CLIP, enter negative prompt
4. `EmptyLatentImage` → set width, height, batch_size
5. `KSampler` → connect MODEL, positive, negative, latent_image
6. `VAEDecode` → connect samples (from KSampler), vae
7. `SaveImage` → connect images

### Image-to-Image (img2img)

Same as txt2img but encode an input image instead of using EmptyLatentImage:

```
LoadImage ──→ IMAGE ──→ VAEEncode ──→ LATENT ──→ KSampler (denoise < 1.0)
```

Key difference: Set KSampler `denoise` to 0.3-0.8 (lower = closer to original).

### Inpainting

```
LoadImage (image) ──→ VAEEncodeForInpaint ──→ LATENT ──→ KSampler
LoadImage (mask)  ──→ VAEEncodeForInpaint
```

Or use Flux Fill for native inpainting:
```
Node: UNETLoader
  unet_name: "flux1-fill-dev.safetensors"

Node: InpaintModelConditioning
  positive, negative, vae, image, mask
Outputs: positive, negative, latent
```

### Upscaling (Hires Fix)

Two-pass generation for high resolution:

```
Pass 1: txt2img at 512x512 (SD1.5) or 1024x1024 (SDXL/Flux)
Pass 2: Upscale latent → KSampler at low denoise (0.3-0.5)
```

```
KSampler (pass1) → LatentUpscale → KSampler (pass2, denoise=0.4) → VAEDecode
```

Or use a model upscaler:
```
VAEDecode → ImageUpscaleWithModel → VAEEncode → KSampler (denoise=0.3) → VAEDecode
```

---

## Sampler & Scheduler Reference

### KSampler Parameters

| Parameter | Description | Typical Values |
|-----------|-------------|----------------|
| `seed` | Random seed | Any integer, -1 for random |
| `steps` | Denoising steps | 20-50 (model dependent) |
| `cfg` | Classifier-free guidance | 1.0-15.0 (model dependent) |
| `sampler_name` | Sampling algorithm | See table below |
| `scheduler` | Noise schedule | See table below |
| `denoise` | Denoising strength | 1.0 (txt2img), 0.3-0.8 (img2img) |

### Samplers

| Sampler | Speed | Quality | Best For |
|---------|-------|---------|----------|
| `euler` | Fast | Good | Quick previews |
| `euler_ancestral` | Fast | Good | More variation |
| `dpmpp_2m` | Medium | Great | General use |
| `dpmpp_2m_sde` | Slow | Excellent | High quality |
| `dpmpp_3m_sde` | Slow | Excellent | Complex scenes |
| `dpmpp_sde` | Medium | Great | Good balance |
| `ddim` | Fast | Good | Consistent results |
| `uni_pc` | Fast | Good | Speed priority |
| `heun` | Slow | Excellent | Maximum quality |
| `dpm_2` | Medium | Good | SD1.5 |
| `lms` | Fast | Decent | Legacy |

### Schedulers

| Scheduler | Description | Best For |
|-----------|-------------|----------|
| `normal` | Linear schedule | Default, safe choice |
| `karras` | Karras noise schedule | Better detail, most popular |
| `exponential` | Exponential decay | Smooth transitions |
| `sgm_uniform` | Uniform sigma spacing | SD3.5, some Flux |
| `simple` | Simple linear | Flux Schnell |
| `ddim_uniform` | DDIM spacing | DDIM sampler |
| `beta` | Beta schedule | Experimental |

### Recommended Settings by Model

| Model | Steps | CFG | Sampler | Scheduler |
|-------|-------|-----|---------|-----------|
| SD 1.5 | 20-30 | 7-9 | `dpmpp_2m` | `karras` |
| SDXL | 25-40 | 5-8 | `dpmpp_2m` | `karras` |
| SDXL Turbo | 4-8 | 1-2 | `euler_ancestral` | `normal` |
| SD3.5 Large | 28-50 | 4-7 | `dpmpp_2m` | `sgm_uniform` |
| SD3.5 Medium | 28-40 | 4-5 | `euler` | `simple` |
| Flux Dev | 20-50 | 1.0 | `euler` | `simple` |
| Flux Schnell | 4 | 1.0 | `euler` | `simple` |

**Note:** Flux uses guidance built into the model — set CFG to 1.0 and don't use negative prompts.

---

## Resolution Guide

| Model | Optimal Base | Aspect Ratios |
|-------|-------------|---------------|
| SD 1.5 | 512x512 | 512x768, 768x512 |
| SDXL | 1024x1024 | 1024x1024, 896x1152, 1152x896, 768x1344, 1344x768 |
| SD3.5 | 1024x1024 | Same as SDXL |
| Flux | 1024x1024 | 1024x1024, 768x1360, 1360x768, 832x1216, 1216x832 |

Always use multiples of 64 for dimensions. SDXL and Flux perform best at ~1 megapixel total.

---

## LoRA (Low-Rank Adaptation)

### Basic LoRA Loading

```
Node: LoraLoader
  model: (from checkpoint)
  clip: (from checkpoint)
  lora_name: "my_lora.safetensors"
  strength_model: 0.8
  strength_clip: 0.8
Outputs: MODEL, CLIP
```

Chain between CheckpointLoader and KSampler:
```
CheckpointLoaderSimple → LoraLoader → MODEL/CLIP → KSampler
```

### Stacking Multiple LoRAs

Chain LoraLoader nodes:
```
CheckpointLoader → LoraLoader (style) → LoraLoader (character) → LoraLoader (detail) → KSampler
```

### LoRA Tips
- `strength_model` controls image effect (0.5-1.0 typical)
- `strength_clip` controls text understanding
- Start at 0.7-0.8 and adjust
- Too high causes artifacts; too low has no effect
- File location: `ComfyUI/models/loras/`

---

## ControlNet

### Basic ControlNet

```
Node: ControlNetLoader
  control_net_name: "control_v11p_sd15_canny.safetensors"
Outputs: CONTROL_NET

Node: ControlNetApplyAdvanced
  positive: (from CLIPTextEncode)
  negative: (from CLIPTextEncode)
  control_net: (from ControlNetLoader)
  image: (preprocessed control image)
  strength: 0.8
  start_percent: 0.0
  end_percent: 1.0
Outputs: positive, negative
```

### Common ControlNet Types

| Type | Input | Use Case |
|------|-------|----------|
| Canny | Edge detection image | Precise edges, line art |
| Depth | Depth map | 3D structure, perspective |
| OpenPose | Pose skeleton | Character poses |
| Scribble | Hand-drawn lines | Rough composition |
| Tile | Original image | Upscaling, detail |
| IP2P | Original image | Image editing |
| Softedge | Soft edge detection | Smooth contours |
| Lineart | Line art extraction | Anime/illustration |
| Normal | Normal map | Surface detail |
| Segmentation | Semantic map | Regional control |
| Inpaint | Image + mask | Fill regions |

### ControlNet Preprocessors

Most control images need preprocessing:
```
LoadImage → CannyEdgePreprocessor → ControlNetApplyAdvanced
LoadImage → DepthAnythingV2Preprocessor → ControlNetApplyAdvanced
LoadImage → DWPreprocessor (OpenPose) → ControlNetApplyAdvanced
```

### Flux ControlNet

Flux has its own ControlNet models (Canny, Depth). They load as LoRAs or full models:
```
Node: ControlNetLoader
  control_net_name: "flux-canny-controlnet-v3.safetensors"
```

Or as ControlNet LoRAs:
```
Node: ControlNetLoader
  control_net_name: "flux-dev-canny-lora.safetensors"
```

---

## IPAdapter (Image Prompt Adapter)

Use images as style/composition references:

```
Node: IPAdapterModelLoader
  ipadapter_file: "ip-adapter-plus_sdxl_vit-h.safetensors"

Node: CLIPVisionLoader
  clip_name: "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"

Node: IPAdapterAdvanced
  model: (from checkpoint)
  ipadapter: (from IPAdapterModelLoader)
  clip_vision: (from CLIPVisionLoader)
  image: (reference image)
  weight: 0.8
  weight_type: "linear"
  start_at: 0.0
  end_at: 1.0
Outputs: MODEL
```

---

## Advanced Conditioning

### Regional Prompting

```
Node: ConditioningSetArea
  conditioning: (from CLIPTextEncode)
  x: 0
  y: 0
  width: 512    (in pixels/8 for latent)
  height: 1024
  strength: 1.0

Node: ConditioningCombine
  conditioning_1: (region 1)
  conditioning_2: (region 2)
Outputs: CONDITIONING → KSampler positive
```

### CLIP Text Encode with Weights

Use parentheses for emphasis in prompts:
- `(word)` — 1.1x weight
- `((word))` — 1.21x weight
- `(word:1.5)` — 1.5x weight
- `[word]` — 0.9x weight (de-emphasis)

### Conditioning Scheduling

Apply different prompts at different steps:

```
Node: ConditioningSetTimestepRange
  conditioning: (prompt A)
  start: 0.0
  end: 0.5

Node: ConditioningSetTimestepRange
  conditioning: (prompt B)
  start: 0.5
  end: 1.0

Node: ConditioningCombine → KSampler
```

---

## Advanced Sampling (Custom Sampling)

For more control, replace KSampler with the custom sampling nodes:

```
Node: KSamplerSelect
  sampler_name: "dpmpp_2m"
Outputs: SAMPLER

Node: BasicScheduler (or KarrasScheduler, etc.)
  model: MODEL
  scheduler: "karras"
  steps: 30
Outputs: SIGMAS

Node: SamplerCustom
  model: MODEL
  positive: CONDITIONING
  negative: CONDITIONING
  sampler: SAMPLER
  sigmas: SIGMAS
  latent_image: LATENT
Outputs: output (LATENT), denoised_output (LATENT)
```

### Guider Nodes

For advanced guidance strategies:

```
Node: BasicGuider
  model: MODEL
  conditioning: CONDITIONING
Outputs: GUIDER

Node: CFGGuider
  model: MODEL
  positive: CONDITIONING
  negative: CONDITIONING
  cfg: 7.0
Outputs: GUIDER

Node: DualCFGGuider (for SD3.5/Flux)
  model: MODEL
  cond1: CONDITIONING
  cond2: CONDITIONING
  negative: CONDITIONING
  cfg_conds: 7.0
  cfg_negative: 1.5
Outputs: GUIDER

Node: SamplerCustomAdvanced
  noise: (from RandomNoise)
  guider: GUIDER
  sampler: SAMPLER
  sigmas: SIGMAS
  latent_image: LATENT
Outputs: output, denoised_output
```

---

## Latent Operations

| Node | Purpose |
|------|---------|
| `EmptyLatentImage` | Create blank latent (txt2img) |
| `EmptySD3LatentImage` | Blank latent for SD3/SD3.5 |
| `VAEEncode` | Image → latent |
| `VAEDecode` | Latent → image |
| `VAEEncodeTiled` | Encode large images without OOM |
| `VAEDecodeTiled` | Decode large latents without OOM |
| `LatentUpscale` | Resize latent (nearest/bilinear) |
| `LatentUpscaleBy` | Scale latent by factor |
| `LatentComposite` | Paste one latent onto another |
| `LatentCrop` | Crop a region from latent |
| `LatentBlend` | Blend two latents |
| `LatentFlip` | Flip latent horizontally/vertically |
| `LatentRotate` | Rotate latent 90/180/270 degrees |
| `SetLatentNoiseMask` | Set inpainting mask on latent |
| `LatentBatch` | Combine latents into batch |

---

## Image Operations

| Node | Purpose |
|------|---------|
| `LoadImage` | Load image from disk |
| `SaveImage` | Save to `output/` directory |
| `PreviewImage` | Preview without saving |
| `ImageScale` | Resize image |
| `ImageScaleBy` | Scale image by factor |
| `ImageInvert` | Invert colors |
| `ImageBlend` | Blend two images |
| `ImageCompositeMasked` | Composite with mask |
| `ImageCrop` | Crop region |
| `ImagePadForOutpaint` | Pad image for outpainting |
| `ImageBatch` | Combine images into batch |
| `ImageUpscaleWithModel` | AI upscale (ESRGAN, etc.) |
| `UpscaleModelLoader` | Load upscale model |

---

## Mask Operations

| Node | Purpose |
|------|---------|
| `LoadImageMask` | Load mask from image |
| `MaskToImage` | Convert mask to image |
| `ImageToMask` | Convert image channel to mask |
| `InvertMask` | Invert mask |
| `MaskComposite` | Combine masks (add, subtract, multiply) |
| `CropMask` | Crop mask region |
| `FeatherMask` | Soften mask edges |
| `GrowMask` | Expand mask region |
| `SolidMask` | Create solid mask |

---

## Workflow Optimization Tips

### Memory Saving
- Use FP8 models and text encoders when VRAM is limited
- Use `VAEDecodeTiled` and `VAEEncodeTiled` for large images
- Enable `--lowvram` or `--novram` CLI flags for < 8GB VRAM
- Unload models between stages with `FreeU` or model management

### Speed
- Flux Schnell at 4 steps for quick iteration
- Use SDXL Turbo / LCM for fast previews (4-8 steps)
- Lower resolution for composition, upscale for final
- `dpmpp_2m` + `karras` is the best speed/quality balance

### Quality
- Higher steps don't always help — diminishing returns after 30-50
- CFG too high causes oversaturation/artifacts
- Hires fix (two-pass) dramatically improves detail
- ControlNet for structural consistency
- Negative prompts matter (except Flux)

### Common Negative Prompts (SD1.5/SDXL)

```
worst quality, low quality, blurry, deformed, disfigured, extra limbs,
bad anatomy, bad hands, extra fingers, missing fingers, watermark,
text, signature, jpeg artifacts, low resolution
```

---

## Complete Workflow Examples

### SDXL txt2img

```
CheckpointLoaderSimple (sdxl_base) → MODEL, CLIP, VAE
CLIP → CLIPTextEncode (positive: "a majestic castle on a hill, sunset, detailed")
CLIP → CLIPTextEncode (negative: "worst quality, blurry, deformed")
EmptyLatentImage (1024x1024, batch 1)
KSampler (seed, steps=30, cfg=7, dpmpp_2m, karras, denoise=1.0)
  → connect: model, positive, negative, latent_image
VAEDecode (samples from KSampler, vae)
SaveImage
```

### Flux Dev txt2img

```
UNETLoader (flux1-dev) → MODEL
DualCLIPLoader (t5xxl_fp16, clip_l, type=flux) → CLIP
VAELoader (ae) → VAE
CLIP → CLIPTextEncode (positive: "a majestic castle on a hill at sunset")
EmptyLatentImage (1024x1024, batch 1)
KSampler (seed, steps=30, cfg=1.0, euler, simple, denoise=1.0)
  → connect: model, positive, (empty negative), latent_image
VAEDecode (samples, vae)
SaveImage
```

### SDXL + LoRA + ControlNet

```
CheckpointLoaderSimple (sdxl_base) → MODEL, CLIP, VAE
LoraLoader (style_lora, strength=0.8) → MODEL, CLIP
CLIP → CLIPTextEncode (positive)
CLIP → CLIPTextEncode (negative)
LoadImage (reference) → CannyEdgePreprocessor → control_image
ControlNetLoader (canny_sdxl) → CONTROL_NET
ControlNetApplyAdvanced (positive, negative, control_net, control_image, strength=0.7)
EmptyLatentImage (1024x1024)
KSampler (steps=30, cfg=7, dpmpp_2m, karras)
VAEDecode → SaveImage
```

---

## Resources

- **ComfyUI Examples**: https://comfyanonymous.github.io/ComfyUI_examples/
- **Flux Examples**: https://comfyanonymous.github.io/ComfyUI_examples/flux/
- **ComfyUI Wiki**: https://comfyui-wiki.com
- **Community Workflows**: https://openart.ai/workflows
- **Model Downloads**: https://civitai.com, https://huggingface.co
