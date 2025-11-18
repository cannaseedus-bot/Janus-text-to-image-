"""
MX2PRO MICRONAUT AI - Enhanced Janus Demo with Three.js Integration
Combines Janus text-to-image generation with advanced 3D visualization
"""

import gradio as gr
import torch
from transformers import AutoConfig, AutoModelForCausalLM
from janus.models import MultiModalityCausalLM, VLChatProcessor
from PIL import Image
import numpy as np
import os
import sys
from pathlib import Path
import threading
import time

# Add threejs_graphics to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'threejs_graphics'))

# Load model and processor
model_path = "deepseek-ai/Janus-1.3B"
config = AutoConfig.from_pretrained(model_path)
language_config = config.language_config
language_config._attn_implementation = 'eager'
vl_gpt = AutoModelForCausalLM.from_pretrained(model_path,
                                             language_config=language_config,
                                             trust_remote_code=True)
vl_gpt = vl_gpt.to(torch.bfloat16).cuda()

vl_chat_processor = VLChatProcessor.from_pretrained(model_path)
tokenizer = vl_chat_processor.tokenizer
cuda_device = 'cuda' if torch.cuda.is_available() else 'cpu'

# Global variable to store generated images for Three.js viewer
generated_images = []


@torch.inference_mode()
def multimodal_understanding(image, question, seed, top_p, temperature):
    """Multimodal Understanding function"""
    torch.cuda.empty_cache()

    torch.manual_seed(seed)
    np.random.seed(seed)
    torch.cuda.manual_seed(seed)

    conversation = [
        {
            "role": "User",
            "content": f"<image_placeholder>\n{question}",
            "images": [image],
        },
        {"role": "Assistant", "content": ""},
    ]

    pil_images = [Image.fromarray(image)]
    prepare_inputs = vl_chat_processor(
        conversations=conversation, images=pil_images, force_batchify=True
    ).to(cuda_device, dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float16)

    inputs_embeds = vl_gpt.prepare_inputs_embeds(**prepare_inputs)

    outputs = vl_gpt.language_model.generate(
        inputs_embeds=inputs_embeds,
        attention_mask=prepare_inputs.attention_mask,
        pad_token_id=tokenizer.eos_token_id,
        bos_token_id=tokenizer.bos_token_id,
        eos_token_id=tokenizer.eos_token_id,
        max_new_tokens=512,
        do_sample=False if temperature == 0 else True,
        use_cache=True,
        temperature=temperature,
        top_p=top_p,
    )

    answer = tokenizer.decode(outputs[0].cpu().tolist(), skip_special_tokens=True)
    return answer


def generate(input_ids,
             width,
             height,
             temperature: float = 1,
             parallel_size: int = 5,
             cfg_weight: float = 5,
             image_token_num_per_image: int = 576,
             patch_size: int = 16):
    """Generate images using the model"""
    torch.cuda.empty_cache()

    tokens = torch.zeros((parallel_size * 2, len(input_ids)), dtype=torch.int).to(cuda_device)
    for i in range(parallel_size * 2):
        tokens[i, :] = input_ids
        if i % 2 != 0:
            tokens[i, 1:-1] = vl_chat_processor.pad_id
    inputs_embeds = vl_gpt.language_model.get_input_embeddings()(tokens)
    generated_tokens = torch.zeros((parallel_size, image_token_num_per_image), dtype=torch.int).to(cuda_device)

    pkv = None
    for i in range(image_token_num_per_image):
        outputs = vl_gpt.language_model.model(inputs_embeds=inputs_embeds,
                                             use_cache=True,
                                             past_key_values=pkv)
        pkv = outputs.past_key_values
        hidden_states = outputs.last_hidden_state
        logits = vl_gpt.gen_head(hidden_states[:, -1, :])
        logit_cond = logits[0::2, :]
        logit_uncond = logits[1::2, :]
        logits = logit_uncond + cfg_weight * (logit_cond - logit_uncond)
        probs = torch.softmax(logits / temperature, dim=-1)
        next_token = torch.multinomial(probs, num_samples=1)
        generated_tokens[:, i] = next_token.squeeze(dim=-1)
        next_token = torch.cat([next_token.unsqueeze(dim=1), next_token.unsqueeze(dim=1)], dim=1).view(-1)
        img_embeds = vl_gpt.prepare_gen_img_embeds(next_token)
        inputs_embeds = img_embeds.unsqueeze(dim=1)
    patches = vl_gpt.gen_vision_model.decode_code(generated_tokens.to(dtype=torch.int),
                                                 shape=[parallel_size, 8, width // patch_size, height // patch_size])

    return generated_tokens.to(dtype=torch.int), patches


def unpack(dec, width, height, parallel_size=5):
    """Unpack decoded images"""
    dec = dec.to(torch.float32).cpu().numpy().transpose(0, 2, 3, 1)
    dec = np.clip((dec + 1) / 2 * 255, 0, 255)

    visual_img = np.zeros((parallel_size, width, height, 3), dtype=np.uint8)
    visual_img[:, :, :] = dec

    return visual_img


@torch.inference_mode()
def generate_image(prompt, seed=None, guidance=5, num_images=5):
    """Generate images from text prompt"""
    global generated_images

    torch.cuda.empty_cache()

    if seed is not None:
        torch.manual_seed(seed)
        torch.cuda.manual_seed(seed)
        np.random.seed(seed)

    width = 384
    height = 384
    parallel_size = num_images

    with torch.no_grad():
        messages = [{'role': 'User', 'content': prompt},
                    {'role': 'Assistant', 'content': ''}]
        text = vl_chat_processor.apply_sft_template_for_multi_turn_prompts(
            conversations=messages,
            sft_format=vl_chat_processor.sft_format,
            system_prompt=''
        )
        text = text + vl_chat_processor.image_start_tag
        input_ids = torch.LongTensor(tokenizer.encode(text))
        output, patches = generate(input_ids,
                                   width // 16 * 16,
                                   height // 16 * 16,
                                   cfg_weight=guidance,
                                   parallel_size=parallel_size)
        images = unpack(patches,
                        width // 16 * 16,
                        height // 16 * 16,
                        parallel_size=parallel_size)

        # Save generated images
        os.makedirs('generated_samples', exist_ok=True)
        generated_images = []

        pil_images = []
        for i in range(parallel_size):
            img = Image.fromarray(images[i]).resize((1024, 1024), Image.LANCZOS)
            save_path = f'generated_samples/mx2pro_img_{i}.jpg'
            img.save(save_path)
            generated_images.append(save_path)
            pil_images.append(img)

        return pil_images


def get_threejs_viewer_link():
    """Get link to Three.js viewer"""
    return "http://localhost:5001"


def create_threejs_html():
    """Create embedded Three.js viewer HTML"""
    return """
    <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); border-radius: 10px;">
        <h2 style="color: #00d4ff; text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);">MX2PRO 3D Viewer</h2>
        <p style="color: #ffffff; margin: 10px 0;">View your generated images in stunning 3D!</p>
        <a href="http://localhost:5001" target="_blank"
           style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #00d4ff 0%, #0066ff 100%);
                  color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;
                  box-shadow: 0 5px 20px rgba(0, 212, 255, 0.4);">
            🚀 Open 3D Gallery Viewer
        </a>
        <p style="color: #aaaaaa; margin-top: 15px; font-size: 0.9em;">
            Note: Make sure the Three.js server is running on port 5001
        </p>
    </div>
    """


# Custom CSS for enhanced UI
custom_css = """
#component-0 {
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
}

.gradio-container {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.gr-button-primary {
    background: linear-gradient(135deg, #00d4ff 0%, #0066ff 100%) !important;
    border: none !important;
    box-shadow: 0 5px 20px rgba(0, 212, 255, 0.4) !important;
}

.gr-button-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 212, 255, 0.6) !important;
}

h1, h2, h3 {
    color: #00d4ff !important;
    text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}
"""


# Gradio interface
with gr.Blocks(css=custom_css, title="MX2PRO MICRONAUT AI") as demo:
    gr.HTML("""
        <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%); border-radius: 15px; margin-bottom: 20px;">
            <h1 style="font-size: 3em; margin: 0; background: linear-gradient(135deg, #00d4ff 0%, #0066ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                MX2PRO MICRONAUT AI
            </h1>
            <p style="color: #ffffff; font-size: 1.2em; margin-top: 10px;">
                Enhanced Janus Text-to-Image with Three.js Graphics Boost
            </p>
        </div>
    """)

    with gr.Tabs():
        # Tab 1: Text-to-Image Generation
        with gr.Tab("🎨 Text-to-Image Generation"):
            gr.Markdown("## Generate Images from Text")

            with gr.Row():
                with gr.Column(scale=2):
                    prompt_input = gr.Textbox(
                        label="Prompt",
                        placeholder="Describe the image you want to generate...",
                        lines=3
                    )

                    with gr.Row():
                        seed_input = gr.Number(label="Seed", precision=0, value=12345)
                        cfg_weight_input = gr.Slider(
                            minimum=1, maximum=10, value=5, step=0.5, label="CFG Weight"
                        )
                        num_images_input = gr.Slider(
                            minimum=1, maximum=10, value=5, step=1, label="Number of Images"
                        )

                    generation_button = gr.Button("🚀 Generate Images", variant="primary")

            image_output = gr.Gallery(
                label="Generated Images",
                columns=3,
                rows=2,
                height=400,
                object_fit="contain"
            )

            gr.Examples(
                label="Example Prompts",
                examples=[
                    "A futuristic city with neon lights and flying cars, cyberpunk style, highly detailed",
                    "A majestic dragon perched on a mountain peak, fantasy art, digital painting",
                    "A serene Japanese garden with cherry blossoms and koi pond, photorealistic",
                    "Abstract geometric shapes in vibrant colors, modern art, 3D render",
                    "A steampunk airship floating above clouds, Victorian era, detailed machinery",
                ],
                inputs=prompt_input,
            )

        # Tab 2: Multimodal Understanding
        with gr.Tab("🔍 Multimodal Understanding"):
            gr.Markdown("## Image Analysis and Question Answering")

            with gr.Row():
                image_input = gr.Image(label="Upload Image")

                with gr.Column():
                    question_input = gr.Textbox(label="Question", lines=2)
                    und_seed_input = gr.Number(label="Seed", precision=0, value=42)

                    with gr.Row():
                        top_p = gr.Slider(minimum=0, maximum=1, value=0.95, step=0.05, label="Top P")
                        temperature = gr.Slider(minimum=0, maximum=1, value=0.1, step=0.05, label="Temperature")

            understanding_button = gr.Button("💬 Analyze", variant="primary")
            understanding_output = gr.Textbox(label="Response", lines=5)

            gr.Examples(
                label="Examples",
                examples=[
                    ["Explain this image in detail", "images/doge.png"],
                    ["What are the main colors in this image?", "images/equation.png"],
                ],
                inputs=[question_input, image_input],
            )

        # Tab 3: Three.js 3D Viewer
        with gr.Tab("🎮 3D Gallery Viewer"):
            gr.Markdown("## Interactive 3D Visualization")

            viewer_html = gr.HTML(create_threejs_html())

            gr.Markdown("""
            ### Features:
            - **Grid Layout**: Organize images in a grid
            - **Carousel**: Circular gallery view
            - **Spiral**: Dynamic spiral arrangement
            - **Wall Gallery**: Traditional wall display
            - **Particle Effects**: Convert images to particle systems
            - **Auto-Rotate**: Automatic camera rotation
            - **Export Scene**: Save your 3D gallery configuration

            ### Usage:
            1. Generate images using the Text-to-Image tab
            2. Click "Open 3D Gallery Viewer" to view them in 3D
            3. Use the controls to adjust layout and effects
            4. Drag to rotate, scroll to zoom
            """)

    # Event handlers
    generation_button.click(
        fn=generate_image,
        inputs=[prompt_input, seed_input, cfg_weight_input, num_images_input],
        outputs=image_output
    )

    understanding_button.click(
        multimodal_understanding,
        inputs=[image_input, question_input, und_seed_input, top_p, temperature],
        outputs=understanding_output
    )

    gr.Markdown("""
    ---
    ### About MX2PRO MICRONAUT AI

    This enhanced demo integrates:
    - **Janus**: State-of-the-art text-to-image generation and multimodal understanding
    - **Three.js**: Advanced 3D visualization and WebGL rendering
    - **MX2PRO**: Graphics boost for stunning visual presentations

    Built with ❤️ using Janus, Three.js, and Gradio
    """)


def start_threejs_server():
    """Start the Three.js Flask server in a separate thread"""
    try:
        from server import run_server
        print("Starting Three.js server...")
        run_server(debug=False)
    except Exception as e:
        print(f"Error starting Three.js server: {e}")
        print("Please start it manually: cd threejs_graphics && python server.py")


if __name__ == "__main__":
    # Start Three.js server in background
    server_thread = threading.Thread(target=start_threejs_server, daemon=True)
    server_thread.start()

    # Wait a bit for server to start
    time.sleep(2)

    # Launch Gradio
    print("\nLaunching MX2PRO MICRONAUT AI Demo...")
    demo.launch(
        share=True,
        server_port=7860,
        server_name="0.0.0.0"
    )
