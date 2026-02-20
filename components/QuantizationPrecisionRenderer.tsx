'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import TransferPhaseView from './TransferPhaseView';

const realWorldApps = [
   {
      icon: '📱',
      title: 'Smartphone AI Chips',
      short: 'Neural engines in your pocket',
      tagline: 'INT8 powers mobile AI',
      description: 'Apple\'s Neural Engine and Qualcomm\'s AI accelerators run INT8 quantized models for face recognition, voice processing, and camera enhancement - enabling real-time AI in power-constrained devices.',
      connection: 'Quantization from FP32 to INT8 reduces model size 4x and enables hardware acceleration, making complex AI feasible on battery-powered mobile devices.',
      howItWorks: 'Dedicated neural processing units (NPUs) have INT8 matrix multiply hardware. Models are quantized post-training or with quantization-aware training for minimal accuracy loss.',
      stats: [
         { value: '17 TOPS', label: 'A17 Neural Engine', icon: '⚡' },
         { value: '4x', label: 'Memory reduction', icon: '💾' },
         { value: '<1%', label: 'Accuracy loss', icon: '🎯' }
      ],
      examples: ['Face ID', 'Siri on-device', 'Computational photography', 'Real-time translation'],
      companies: ['Apple', 'Qualcomm', 'Google', 'MediaTek'],
      futureImpact: 'On-device large language models will enable private, offline AI assistants.',
      color: '#3B82F6'
   },
   {
      icon: '🤖',
      title: 'Large Language Model Inference',
      short: 'Running GPT on consumer hardware',
      tagline: 'From 1.7TB to 200GB',
      description: 'GPT-4 scale models would need 1.7TB in FP32. Techniques like GPTQ and GGML enable 4-bit quantization, fitting models on consumer GPUs with less than 1% quality degradation.',
      connection: 'Neural network weights follow Gaussian distributions that quantize efficiently. Smart algorithms minimize reconstruction error by quantizing weights in optimal order.',
      howItWorks: 'GPTQ uses second-order information (Hessian) to quantize weights layer-by-layer, compensating for quantization error. NF4 uses non-uniform levels matched to weight distributions.',
      stats: [
         { value: '8x', label: 'Compression ratio', icon: '📦' },
         { value: '70B', label: 'Params on 24GB GPU', icon: '💻' },
         { value: '<1%', label: 'Perplexity increase', icon: '📊' }
      ],
      examples: ['llama.cpp', 'GPTQ models', 'QLoRA fine-tuning', 'ExLlama inference'],
      companies: ['Meta', 'Hugging Face', 'Together AI', 'Fireworks AI'],
      futureImpact: 'Consumer devices will run trillion-parameter models locally.',
      color: '#8B5CF6'
   },
   {
      icon: '🚗',
      title: 'Autonomous Vehicle Inference',
      short: 'Real-time perception at the edge',
      tagline: 'Every millisecond matters',
      description: 'Tesla\'s FSD computer processes camera feeds in real-time using INT8 inference. Lower precision enables higher throughput, essential for processing multiple camera streams at highway speeds.',
      connection: 'Autonomous driving requires low latency - INT8 operations are 4x faster than FP32, enabling the 36 FPS processing needed for safe highway driving.',
      howItWorks: 'Custom silicon with INT8 tensor cores processes neural networks for object detection, lane keeping, and path planning. Calibrated models maintain detection accuracy.',
      stats: [
         { value: '144 TOPS', label: 'FSD chip power', icon: '⚡' },
         { value: '36 FPS', label: 'Camera processing', icon: '🎥' },
         { value: '8', label: 'Camera inputs', icon: '📷' }
      ],
      examples: ['Tesla Autopilot', 'Waymo Driver', 'Cruise Origin', 'Mobileye EyeQ'],
      companies: ['Tesla', 'Waymo', 'NVIDIA', 'Mobileye'],
      futureImpact: 'More aggressive quantization will enable full autonomy on cheaper hardware.',
      color: '#10B981'
   },
   {
      icon: '🎨',
      title: 'Image Generation on Device',
      short: 'Stable Diffusion everywhere',
      tagline: 'Art in your pocket',
      description: 'Stable Diffusion runs on iPhones using INT8 CoreML models. What required a datacenter GPU in 2022 now generates images on phones in seconds through aggressive quantization.',
      connection: 'Diffusion models are surprisingly robust to quantization because the iterative denoising process smooths out small numerical errors.',
      howItWorks: 'Models are converted to CoreML or TensorFlow Lite with INT8 weights. The neural engine handles quantized convolutions while critical layers may stay at higher precision.',
      stats: [
         { value: '5s', label: 'Generation time', icon: '⏱️' },
         { value: '2GB', label: 'Model size', icon: '💾' },
         { value: '512px', label: 'Output resolution', icon: '🖼️' }
      ],
      examples: ['Draw Things app', 'Lensa AI', 'Prisma', 'On-device Midjourney'],
      companies: ['Stability AI', 'Apple', 'Google', 'Adobe'],
      futureImpact: 'Real-time video generation will be possible on mobile devices.',
      color: '#EC4899'
   }
];

// Types
type Phase = 'hook' | 'predict' | 'play' | 'review' | 'twist_predict' | 'twist_play' | 'twist_review' | 'transfer' | 'test' | 'mastery';

interface QuantizationPrecisionRendererProps {
  gamePhase?: Phase; // Optional - for resume functionality
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
}

// Phase order and labels for navigation
const phaseOrder: Phase[] = ['hook', 'predict', 'play', 'review', 'twist_predict', 'twist_play', 'twist_review', 'transfer', 'test', 'mastery'];
const phaseLabels: Record<Phase, string> = {
  hook: 'Introduction',
  predict: 'Predict',
  play: 'Experiment',
  review: 'Understanding',
  twist_predict: 'New Variable',
  twist_play: 'Explore Sensitivity',
  twist_review: 'Deep Insight',
  transfer: 'Real World',
  test: 'Knowledge Test',
  mastery: 'Mastery'
};

const colors = {
  textPrimary: '#f8fafc',
  textSecondary: '#e2e8f0',
  textMuted: '#94a3b8',
  bgPrimary: '#0f172a',
  bgCard: 'rgba(30, 41, 59, 0.9)',
  bgDark: 'rgba(15, 23, 42, 0.95)',
  accent: '#a855f7',
  accentGlow: 'rgba(168, 85, 247, 0.4)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  fp32: '#3b82f6',
  fp16: '#8b5cf6',
  int8: '#22c55e',
  int4: '#f97316',
};

// Precision specs
const PRECISION_SPECS = {
  FP32: { bits: 32, range: '1.2e-38 to 3.4e38', memoryRatio: 1, speedRatio: 1, color: colors.fp32 },
  FP16: { bits: 16, range: '6.1e-5 to 65504', memoryRatio: 0.5, speedRatio: 2, color: colors.fp16 },
  INT8: { bits: 8, range: '-128 to 127', memoryRatio: 0.25, speedRatio: 4, color: colors.int8 },
  INT4: { bits: 4, range: '-8 to 7', memoryRatio: 0.125, speedRatio: 8, color: colors.int4 },
};

const TEST_QUESTIONS = [
  // Q1: Core Concept - Quantization Basics (Easy)
  {
    scenario: "A machine learning engineer wants to deploy a 7-billion parameter model trained in FP32 to a mobile device with limited memory.",
    question: "What is the primary benefit of quantizing the model from FP32 to INT8?",
    options: [
      { id: 'speed', label: "The model will train faster on the mobile device" },
      { id: 'memory', label: "The model will use 4x less memory (from 28GB to 7GB)", correct: true },
      { id: 'accuracy', label: "The model will become more accurate" },
      { id: 'features', label: "The model will gain new capabilities" },
    ],
    explanation: "Quantization from FP32 (32 bits) to INT8 (8 bits) reduces memory by 4x. A 7B parameter model needs 28GB in FP32 but only 7GB in INT8. This is the primary reason quantization enables deployment on memory-constrained devices."
  },
  // Q2: FP32 vs FP16 vs INT8 Comparison (Medium)
  {
    scenario: "You're comparing different numerical precision formats: FP32 uses 32 bits with 1 sign, 8 exponent, and 23 mantissa bits. FP16 uses 16 bits, and INT8 uses 8 bits for integers.",
    question: "Why is FP32 typically required during model training but not inference?",
    options: [
      { id: 'hardware', label: "Training hardware only supports FP32" },
      { id: 'gradients', label: "Gradient accumulation over millions of steps needs high precision to avoid drift", correct: true },
      { id: 'speed', label: "FP32 training is faster than lower precision" },
      { id: 'memory', label: "Training requires more memory than inference" },
    ],
    explanation: "During training, gradients are accumulated over millions of steps. Small errors in low precision compound over time, causing training instability or divergence. Inference only does a single forward pass, so small quantization errors don't accumulate."
  },
  // Q3: Quantization Effects on Accuracy (Medium)
  {
    scenario: "A research team quantizes their language model from FP32 to INT8 using post-training quantization. They're worried about accuracy degradation.",
    question: "Which statement about INT8 quantization accuracy is most accurate?",
    options: [
      { id: 'always_bad', label: "INT8 always causes significant accuracy loss (>5%)" },
      { id: 'no_loss', label: "INT8 produces identical outputs to FP32" },
      { id: 'typically_small', label: "INT8 typically causes minimal accuracy loss (<1%) when properly calibrated", correct: true },
      { id: 'random', label: "Accuracy loss is random and unpredictable" },
    ],
    explanation: "With proper calibration, INT8 quantization typically maintains accuracy within 1% of the original model. Neural networks are surprisingly robust to reduced precision because the weights cluster around common values and small errors average out across millions of parameters."
  },
  // Q4: Layer Sensitivity (Medium-Hard)
  {
    scenario: "A ML engineer is implementing mixed-precision quantization, where different layers use different bit widths. They need to decide which layers to keep at higher precision.",
    question: "Which layers are typically MOST sensitive to quantization errors?",
    options: [
      { id: 'middle', label: "Middle layers, because they contain the most parameters" },
      { id: 'first_last', label: "First and last layers, because errors there directly impact input/output quality", correct: true },
      { id: 'all_same', label: "All layers are equally sensitive" },
      { id: 'random_layers', label: "Sensitivity is random and varies per model" },
    ],
    explanation: "First layers process raw input data, so quantization errors are amplified through the network. Last layers produce final outputs, so errors directly affect predictions. Middle layers have redundancy where errors can average out. This is why mixed-precision keeps first/last layers at FP16 while quantizing middle layers to INT8/INT4."
  },
  // Q5: Dynamic Range Considerations (Hard)
  {
    scenario: "INT8 can only represent values from -128 to 127, while neural network weights might range from -0.5 to +2.3. Calibration is needed to map weight distributions to the INT8 range.",
    question: "What is the purpose of calibration data in post-training quantization?",
    options: [
      { id: 'training', label: "To retrain the model with quantized weights" },
      { id: 'scale', label: "To find optimal scale factors that map weight distributions to INT8 range with minimal error", correct: true },
      { id: 'prune', label: "To identify which weights can be removed" },
      { id: 'speed', label: "To measure how fast the quantized model runs" },
    ],
    explanation: "Calibration runs representative data through the model to observe the actual range of activations. It then computes scale factors that map these ranges to INT8 (-128 to 127) with minimal clipping. Bad calibration leads to either wasted dynamic range or clipped outliers."
  },
  // Q6: Mixed Precision Training (Medium)
  {
    scenario: "NVIDIA's Tensor Cores can perform matrix operations in FP16 much faster than FP32. Many modern training pipelines use 'mixed precision training' to speed up training.",
    question: "How does mixed precision training maintain accuracy while using FP16?",
    options: [
      { id: 'only_fp16', label: "It uses FP16 everywhere and accepts small accuracy loss" },
      { id: 'master_weights', label: "It keeps FP32 master weights while computing forward/backward passes in FP16", correct: true },
      { id: 'int8', label: "It uses INT8 for most operations" },
      { id: 'no_training', label: "Mixed precision is only for inference, not training" },
    ],
    explanation: "Mixed precision training computes forward and backward passes in FP16 for speed, but maintains FP32 'master weights' that accumulate gradients. This gives the speed benefits of FP16 while preserving the precision needed for stable gradient accumulation."
  },
  // Q7: Inference Optimization (Medium)
  {
    scenario: "Tesla's Full Self-Driving computer needs to process camera feeds in real-time. Every millisecond of latency matters at highway speeds. The FSD chip is optimized for INT8 operations.",
    question: "Why do inference accelerators like Tesla's FSD chip use INT8 instead of FP32?",
    options: [
      { id: 'accuracy', label: "INT8 produces more accurate results than FP32" },
      { id: 'throughput', label: "INT8 operations are 4x smaller and faster, enabling real-time performance", correct: true },
      { id: 'training', label: "The models were originally trained in INT8" },
      { id: 'cost', label: "INT8 chips are cheaper to manufacture" },
    ],
    explanation: "INT8 operations use 4x less memory bandwidth and can be executed 2-8x faster on specialized hardware. Tesla's FSD chip achieves 144 TOPS (trillion operations per second) in INT8. This throughput is essential for processing multiple camera feeds at 36 FPS with low latency."
  },
  // Q8: Quantization-Aware Training (Hard)
  {
    scenario: "There are two main approaches to quantization: Post-Training Quantization (PTQ) applies quantization after training, while Quantization-Aware Training (QAT) simulates quantization during training.",
    question: "Why does QAT typically produce better quantized models than PTQ?",
    options: [
      { id: 'faster', label: "QAT is faster to apply than PTQ" },
      { id: 'learns', label: "QAT allows the model to learn weight values that are robust to quantization errors", correct: true },
      { id: 'no_calibration', label: "QAT doesn't require any calibration" },
      { id: 'same', label: "QAT and PTQ produce identical results" },
    ],
    explanation: "During QAT, the model experiences simulated quantization noise during training and learns to compensate. Weights naturally move toward values that quantize well, and the model becomes inherently robust to precision loss. PTQ must work with weights optimized for FP32, which may not quantize optimally."
  },
  // Q9: Dynamic vs Static Quantization (Medium)
  {
    scenario: "There are two types of quantization: Static quantization uses fixed scale factors determined during calibration, while dynamic quantization computes scale factors at runtime based on actual input values.",
    question: "When is dynamic quantization typically used instead of static quantization?",
    options: [
      { id: 'training', label: "During model training" },
      { id: 'variable', label: "When activation ranges vary significantly across different inputs", correct: true },
      { id: 'always', label: "Dynamic is always better than static" },
      { id: 'hardware', label: "When specialized quantization hardware is unavailable" },
    ],
    explanation: "Dynamic quantization calculates scale factors at runtime, adapting to each input's actual range. This is useful when activation ranges vary widely between inputs (like variable-length text). Static quantization is faster but assumes fixed ranges determined during calibration."
  },
  // Q10: Extreme Quantization (INT4/NF4) (Hard)
  {
    scenario: "Running GPT-4 would require ~1.7TB of memory in FP32. Techniques like GPTQ and QLoRA use 4-bit quantization (INT4/NF4) to fit large models on consumer GPUs.",
    question: "How do 4-bit quantization techniques like GPTQ achieve less than 1% quality loss despite extreme compression?",
    options: [
      { id: 'simple', label: "They simply round weights to the nearest 4-bit value" },
      { id: 'smart', label: "They use sophisticated algorithms to minimize reconstruction error and preserve important weights", correct: true },
      { id: 'impossible', label: "4-bit quantization always causes significant quality loss" },
      { id: 'subset', label: "They only quantize a small subset of the model" },
    ],
    explanation: "Techniques like GPTQ use second-order information (Hessian) to quantize weights in an order that minimizes cumulative error. NF4 (Normal Float 4) uses non-uniform quantization levels matched to the typical Gaussian distribution of neural network weights. These smart approaches preserve model quality despite 8x compression."
  },
];

const TRANSFER_APPS = [
  {
    title: 'Mobile AI (Smartphones)',
    description: 'Your smartphone runs AI models in INT8 or INT4 precision. Apple\'s A17 Neural Engine and Qualcomm\'s Snapdragon AI chips have dedicated hardware units optimized for low-precision integer math. This allows real-time face recognition, voice processing, and computational photography without draining the battery. Without quantization, running a 7B parameter model on your phone would require 28GB of storage just for the weights.',
    insight: 'iPhone Neural Engine: INT8 — 17 TOPS throughput',
  },
  {
    title: 'ChatGPT/LLM Inference',
    description: 'Running GPT-4 scale models would need 1.7TB of memory in FP32 format. INT4 quantization using techniques like GPTQ makes it possible to fit a 70B parameter model on a single consumer GPU with 24GB of VRAM. This reduces model memory by 8x while maintaining less than 1% quality degradation. Engineers use calibration data to find optimal scale factors that preserve model accuracy.',
    insight: 'GPTQ: 4-bit quantization with less than 1% quality loss',
  },
  {
    title: 'Self-Driving Cars',
    description: 'Tesla\'s Full Self-Driving computer runs INT8 inference at 144 TOPS (trillion operations per second). Every millisecond of latency matters when driving at highway speeds — at 60 mph, 10ms equals 9 inches of travel. INT8 operations are 4x faster than FP32, enabling 36 FPS processing across 8 camera inputs simultaneously. Mixed precision keeps critical detection layers at FP16 for safety.',
    insight: 'Tesla FSD chip: 144 TOPS at INT8, processes 8 cameras at 36 FPS',
  },
  {
    title: 'Real-time Image Generation',
    description: 'Stable Diffusion runs on iPhones using INT8 CoreML models. What required a datacenter GPU with 40GB of VRAM in 2022 now generates 512×512 images on phones in about 5 seconds. The diffusion models are quantized because the iterative denoising process naturally smooths out quantization noise. INT8 CoreML inference reduces model size from 8GB to under 2GB while maintaining visual quality.',
    insight: 'Stable Diffusion on iPhone: INT8 CoreML, 5 second generation, 2GB model',
  },
];

// Comprehensive test questions covering quantization precision topics
const testQuestions = [
  // Q1: Core concept - what is quantization (Easy)
  {
    scenario: "A software engineer is learning about how modern AI systems are deployed efficiently on resource-constrained devices like smartphones and embedded systems.",
    question: "What is quantization in the context of machine learning and signal processing?",
    options: [
      { id: 'a', label: "A technique to increase the number of parameters in a neural network" },
      { id: 'b', label: "The process of mapping continuous or high-precision values to a discrete set of lower-precision values", correct: true },
      { id: 'c', label: "A method for encrypting neural network weights for security" },
      { id: 'd', label: "The process of adding more layers to a deep learning model" },
    ],
    explanation: "Quantization is the process of constraining values from a large (often continuous) set to a smaller discrete set. In ML, this typically means converting 32-bit floating-point weights to 8-bit or 4-bit integers, reducing memory footprint and enabling faster computation while accepting small precision losses."
  },
  // Q2: Bit depth in audio (Easy-Medium)
  {
    scenario: "An audio engineer is mastering a recording for a streaming platform. The original recording was captured at 24-bit depth, but the platform uses 16-bit audio for delivery.",
    question: "How does reducing bit depth from 24-bit to 16-bit affect the audio signal?",
    options: [
      { id: 'a', label: "It reduces the frequency range that can be captured" },
      { id: 'b', label: "It decreases the dynamic range from approximately 144 dB to 96 dB", correct: true },
      { id: 'c', label: "It doubles the file size due to compression overhead" },
      { id: 'd', label: "It has no perceptible effect on audio quality" },
    ],
    explanation: "Each bit of depth provides approximately 6 dB of dynamic range. 24-bit audio offers about 144 dB of dynamic range, while 16-bit provides about 96 dB. The reduction affects how quietly and loudly sounds can be represented relative to each other, though 96 dB is still sufficient for most listening scenarios."
  },
  // Q3: Quantization noise (Medium)
  {
    scenario: "A data scientist notices that after converting a neural network from FP32 to INT8, some outputs have small but consistent errors compared to the original model.",
    question: "What is the primary source of this error introduced during quantization?",
    options: [
      { id: 'a', label: "Hardware defects in the processor" },
      { id: 'b', label: "Quantization noise caused by rounding continuous values to discrete levels", correct: true },
      { id: 'c', label: "Memory corruption during the conversion process" },
      { id: 'd', label: "Software bugs in the quantization library" },
    ],
    explanation: "Quantization noise (or quantization error) is the difference between the original continuous value and its quantized representation. When values are rounded to the nearest discrete level, this introduces a form of noise that is inherent to the quantization process itself, not a bug or hardware issue."
  },
  // Q4: Dynamic range calculation (Medium)
  {
    scenario: "An engineer is designing an analog-to-digital converter (ADC) for a high-fidelity audio system and needs to determine the appropriate bit depth.",
    question: "What is the theoretical dynamic range of a 16-bit ADC using the formula DR = 6.02n + 1.76 dB?",
    options: [
      { id: 'a', label: "Approximately 48 dB" },
      { id: 'b', label: "Approximately 72 dB" },
      { id: 'c', label: "Approximately 98 dB", correct: true },
      { id: 'd', label: "Approximately 120 dB" },
    ],
    explanation: "Using the formula DR = 6.02n + 1.76 dB where n is the number of bits: DR = 6.02(16) + 1.76 = 96.32 + 1.76 = 98.08 dB. This theoretical maximum represents the ratio between the largest and smallest signals that can be accurately represented by the ADC."
  },
  // Q5: Dithering technique (Medium-Hard)
  {
    scenario: "A mastering engineer is preparing to reduce a 24-bit audio file to 16-bit for CD distribution. They are concerned about audible artifacts in quiet passages.",
    question: "What is the purpose of applying dither when reducing bit depth?",
    options: [
      { id: 'a', label: "To increase the volume of quiet passages" },
      { id: 'b', label: "To add random noise that masks quantization distortion and preserves low-level detail", correct: true },
      { id: 'c', label: "To compress the dynamic range of the audio" },
      { id: 'd', label: "To remove high-frequency content above 20 kHz" },
    ],
    explanation: "Dithering adds a small amount of random noise before quantization, which decorrelates the quantization error from the signal. This converts harsh, audible quantization distortion into a smooth, benign noise floor, preserving the perception of low-level signals that would otherwise be lost or distorted."
  },
  // Q6: ADC resolution and accuracy (Hard)
  {
    scenario: "A sensor engineer is selecting an ADC for a precision measurement system. The system needs to detect voltage changes as small as 1 millivolt across a 0-5V range.",
    question: "What is the minimum ADC resolution required to reliably detect 1mV changes in a 0-5V range?",
    options: [
      { id: 'a', label: "8-bit (256 levels, ~19.5mV per step)" },
      { id: 'b', label: "10-bit (1024 levels, ~4.9mV per step)" },
      { id: 'c', label: "12-bit (4096 levels, ~1.2mV per step)" },
      { id: 'd', label: "14-bit (16384 levels, ~0.3mV per step)", correct: true },
    ],
    explanation: "To detect 1mV changes in a 5V range, we need step sizes smaller than 1mV. A 12-bit ADC provides 5V/4096 = 1.22mV per step, which is too coarse. A 14-bit ADC provides 5V/16384 = 0.305mV per step, ensuring that 1mV changes span multiple quantization levels and can be reliably detected."
  },
  // Q7: Neural network quantization (Hard)
  {
    scenario: "A ML engineer is deploying a transformer model to edge devices. They are comparing post-training quantization (PTQ) with quantization-aware training (QAT) for INT8 deployment.",
    question: "Why does quantization-aware training (QAT) typically achieve better accuracy than post-training quantization (PTQ)?",
    options: [
      { id: 'a', label: "QAT uses more bits during inference than PTQ" },
      { id: 'b', label: "QAT simulates quantization during training, allowing the model to learn weights that are robust to quantization errors", correct: true },
      { id: 'c', label: "QAT compresses the model more aggressively than PTQ" },
      { id: 'd', label: "QAT only quantizes biases while keeping weights in full precision" },
    ],
    explanation: "QAT inserts fake quantization operations during training, allowing gradients to flow through simulated quantization. This enables the network to adapt its weights to be more robust to the precision loss. The model learns representations that maintain accuracy even after the rounding operations inherent in quantization."
  },
  // Q8: Fixed-point vs floating-point (Hard)
  {
    scenario: "An embedded systems developer is implementing a neural network inference engine on a microcontroller without a floating-point unit (FPU).",
    question: "What is the key advantage of fixed-point arithmetic over floating-point for this application?",
    options: [
      { id: 'a', label: "Fixed-point provides higher precision than floating-point" },
      { id: 'b', label: "Fixed-point operations can be executed using integer ALU instructions, avoiding slow software floating-point emulation", correct: true },
      { id: 'c', label: "Fixed-point eliminates all quantization errors" },
      { id: 'd', label: "Fixed-point automatically scales values to prevent overflow" },
    ],
    explanation: "On processors without FPU hardware, floating-point operations must be emulated in software, which is orders of magnitude slower than native integer operations. Fixed-point arithmetic uses integer operations with implicit scaling, enabling efficient computation on simple microcontrollers while maintaining reasonable precision."
  },
  // Q9: Sigma-delta modulation (Hard)
  {
    scenario: "An audio hardware designer is evaluating ADC architectures. They are comparing a 24-bit sigma-delta ADC running at 64x oversampling with a traditional successive approximation (SAR) ADC.",
    question: "How does sigma-delta modulation achieve high effective resolution?",
    options: [
      { id: 'a', label: "By using extremely precise analog components" },
      { id: 'b', label: "By oversampling and noise shaping to push quantization noise to higher frequencies where it can be filtered out", correct: true },
      { id: 'c', label: "By averaging multiple SAR conversions" },
      { id: 'd', label: "By using 32-bit internal registers" },
    ],
    explanation: "Sigma-delta ADCs use a 1-bit quantizer at very high sample rates (oversampling) combined with noise shaping, which pushes quantization noise energy to frequencies above the band of interest. A digital decimation filter then removes this high-frequency noise while reducing the sample rate, achieving high effective resolution from a simple 1-bit converter."
  },
  // Q10: Quantization in image compression (Hard)
  {
    scenario: "A video streaming engineer is optimizing JPEG compression settings. They notice that increasing the quality factor from 50 to 90 significantly increases file size but has diminishing returns on visual quality.",
    question: "How does JPEG's quantization matrix affect the compression quality tradeoff?",
    options: [
      { id: 'a', label: "Higher quality factors use larger quantization divisors, discarding more high-frequency DCT coefficients" },
      { id: 'b', label: "Lower quality factors use larger quantization divisors, more aggressively rounding DCT coefficients and introducing blocking artifacts", correct: true },
      { id: 'c', label: "The quantization matrix only affects the color channels, not luminance" },
      { id: 'd', label: "Quantization has no effect on file size, only on decoding speed" },
    ],
    explanation: "JPEG divides DCT coefficients by values in a quantization matrix, then rounds to integers. Lower quality settings use larger divisors, causing more coefficients to round to zero and introducing visible artifacts like blocking. Higher quality uses smaller divisors, preserving more detail but reducing compression ratio. The human visual system is less sensitive to high-frequency detail, so these are quantized more aggressively."
  },
];

const QuantizationPrecisionRenderer: React.FC<QuantizationPrecisionRendererProps> = ({
  gamePhase,
}) => {
  // Internal phase state management
  const getInitialPhase = (): Phase => {
    if (gamePhase && phaseOrder.includes(gamePhase)) {
      return gamePhase;
    }
    return 'hook';
  };

  const [phase, setPhase] = useState<Phase>(getInitialPhase);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [twistPrediction, setTwistPrediction] = useState<string | null>(null);
  const [testAnswers, setTestAnswers] = useState<(string | null)[]>(new Array(10).fill(null));
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState<Set<number>>(new Set());
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  // Simulation state
  const [precision, setPrecision] = useState<keyof typeof PRECISION_SPECS>('FP32');
  const [modelSize, setModelSize] = useState(7); // billion parameters
  const [showQuantizationError, setShowQuantizationError] = useState(true);
  const [layerSensitivity, setLayerSensitivity] = useState<'input' | 'middle' | 'output'>('middle');
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Sync phase with gamePhase prop changes (for resume functionality)
  useEffect(() => {
    if (gamePhase && phaseOrder.includes(gamePhase) && gamePhase !== phase) {
      setPhase(gamePhase);
    }
  }, [gamePhase, phase]);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive typography
  const typo = {
    title: isMobile ? '28px' : '36px',
    heading: isMobile ? '20px' : '24px',
    bodyLarge: isMobile ? '16px' : '18px',
    body: isMobile ? '14px' : '16px',
    small: isMobile ? '12px' : '14px',
    label: isMobile ? '10px' : '12px',
    pagePadding: isMobile ? '16px' : '24px',
    cardPadding: isMobile ? '12px' : '16px',
    sectionGap: isMobile ? '16px' : '20px',
    elementGap: isMobile ? '8px' : '12px',
  };

  // Navigation debouncing
  const isNavigating = useRef(false);
  const lastClickRef = useRef(0);

  // Navigation functions
  const goToPhase = useCallback((p: Phase) => {
    const now = Date.now();
    if (now - lastClickRef.current < 200) return;
    if (isNavigating.current) return;

    lastClickRef.current = now;
    isNavigating.current = true;

    setPhase(p);
    // Scroll to top on phase change
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.querySelectorAll('div').forEach(el => { if (el.scrollTop > 0) el.scrollTop = 0; }); });
    setTimeout(() => { isNavigating.current = false; }, 400);
  }, []);

  const goNext = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx < phaseOrder.length - 1) {
      goToPhase(phaseOrder[idx + 1]);
    }
  }, [phase, goToPhase]);

  const goBack = useCallback(() => {
    const idx = phaseOrder.indexOf(phase);
    if (idx > 0) {
      goToPhase(phaseOrder[idx - 1]);
    }
  }, [phase, goToPhase]);

  // Example values for visualization
  const [originalValue] = useState(0.3927);
  const quantizedValues = {
    FP32: 0.3927,
    FP16: 0.3926,
    INT8: 0.39,
    INT4: 0.375,
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(f => (f + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculations
  const spec = PRECISION_SPECS[precision];
  const memoryGB = (modelSize * 4 * spec.memoryRatio).toFixed(1); // 4 bytes per FP32 param
  const quantizationError = Math.abs(originalValue - quantizedValues[precision]) / originalValue * 100;
  const throughputMultiplier = spec.speedRatio;

  // Layer sensitivity affects quality loss
  const sensitivityMultiplier = layerSensitivity === 'input' ? 3 : layerSensitivity === 'output' ? 2.5 : 1;
  const effectiveQualityLoss = Math.min(10, quantizationError * sensitivityMultiplier);

  const calculateTestScore = () => {
    return testAnswers.reduce((score, answer, index) => {
      const correctOption = TEST_QUESTIONS[index].options.find(o => o.correct);
      if (answer === correctOption?.id) return score + 1;
      return score;
    }, 0);
  };

  const renderVisualization = () => {
    const width = 700;
    const height = 400;

    // Binary representation visualization with stable pattern based on precision
    const getBinaryPattern = (precisionType: string) => {
      // Use a stable pattern based on precision type for consistency
      const patterns: Record<string, boolean[]> = {
        'FP32': [true,false,true,true,false,false,true,false,true,true,true,false,false,true,false,true,
                 false,true,true,false,true,false,false,true,true,false,true,true,false,false,true,false],
        'FP16': [true,false,true,true,false,false,true,false,true,true,true,false,false,true,false,true],
        'INT8': [true,false,true,true,false,false,true,false],
        'INT4': [true,false,true,true],
      };
      return patterns[precisionType] || [];
    };

    const bits = getBinaryPattern(precision);
    const bitWidth = Math.min(16, 500 / Math.max(bits.length, 1));
    const bitSpacing = 3;

    // Calculate bit section colors for FP32 breakdown
    const getBitColor = (index: number, totalBits: number, precType: string) => {
      if (precType === 'FP32') {
        if (index === 0) return 'url(#qprecSignBit)'; // Sign bit
        if (index < 9) return 'url(#qprecExponentBit)'; // Exponent (8 bits)
        return 'url(#qprecMantissaBit)'; // Mantissa (23 bits)
      }
      if (precType === 'FP16') {
        if (index === 0) return 'url(#qprecSignBit)';
        if (index < 6) return 'url(#qprecExponentBit)';
        return 'url(#qprecMantissaBit)';
      }
      // INT8/INT4 - all same
      return `url(#qprec${precType}Gradient)`;
    };

    const precisions: Array<keyof typeof PRECISION_SPECS> = ['FP32', 'FP16', 'INT8', 'INT4'];

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        style={{ maxHeight: '100%' }}
      >
        <defs>
          {/* Premium lab background gradient */}
          <linearGradient id="qprecLabBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#030712" />
            <stop offset="25%" stopColor="#0a0f1a" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="75%" stopColor="#0a0f1a" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>

          {/* FP32 precision gradient - deep blue */}
          <linearGradient id="qprecFP32Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="25%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="75%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>

          {/* FP16 precision gradient - purple */}
          <linearGradient id="qprecFP16Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="25%" stopColor="#a855f7" />
            <stop offset="50%" stopColor="#9333ea" />
            <stop offset="75%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>

          {/* INT8 precision gradient - emerald */}
          <linearGradient id="qprecINT8Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="25%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="75%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* INT4 precision gradient - orange */}
          <linearGradient id="qprecINT4Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="25%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="75%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>

          {/* Sign bit gradient - red accent */}
          <linearGradient id="qprecSignBit" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          {/* Exponent bit gradient - amber */}
          <linearGradient id="qprecExponentBit" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>

          {/* Mantissa bit gradient - cyan */}
          <linearGradient id="qprecMantissaBit" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>

          {/* Memory bar gradient */}
          <linearGradient id="qprecMemoryBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Speed bar gradient */}
          <linearGradient id="qprecSpeedBar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>

          {/* Accuracy indicator - radial glow */}
          <radialGradient id="qprecAccuracyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="1" />
            <stop offset="40%" stopColor="#16a34a" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#15803d" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#166534" stopOpacity="0" />
          </radialGradient>

          {/* Performance indicator - radial glow */}
          <radialGradient id="qprecPerformanceGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
            <stop offset="40%" stopColor="#d97706" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#b45309" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0" />
          </radialGradient>

          {/* Panel glass effect */}
          <linearGradient id="qprecPanelGlass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#0f172a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </linearGradient>

          {/* Metal frame gradient */}
          <linearGradient id="qprecMetalFrame" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="25%" stopColor="#334155" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="75%" stopColor="#334155" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Bit glow filter */}
          <filter id="qprecBitGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Value display glow */}
          <filter id="qprecValueGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Panel shadow filter */}
          <filter id="qprecPanelShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feOffset dx="2" dy="2" result="offsetBlur" />
            <feMerge>
              <feMergeNode in="offsetBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Indicator pulse filter */}
          <filter id="qprecPulse" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle grid pattern */}
          <pattern id="qprecGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.3" />
          </pattern>
        </defs>

        {/* Background */}
        <rect width={width} height={height} fill="url(#qprecLabBg)" />
        <rect width={width} height={height} fill="url(#qprecGrid)" />

        {/* Grid reference lines */}
        <line x1="20" y1="100" x2="680" y2="100" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
        <line x1="20" y1="200" x2="680" y2="200" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
        <line x1="20" y1="300" x2="680" y2="300" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />

        {/* ── TITLE ROW (y: 10–42) ── absolute flat coords */}
        <rect x="20" y="10" width="660" height="32" rx="8" fill="url(#qprecPanelGlass)" stroke="#334155" strokeWidth="1" />
        <text x="350" y="32" textAnchor="middle" fill="#f8fafc" fontSize="14" fontWeight="bold">
          {precision} — {spec.bits}-bit Precision: {spec.range} dynamic range
        </text>

        {/* ── PRECISION COMPARISON BARS (y: 55–170) ── */}
        <rect x="20" y="55" width="660" height="115" rx="10" fill="url(#qprecPanelGlass)" stroke="#334155" strokeWidth="1" />
        {/* Header at y=75 (range 64–77) */}
        <text x="35" y="75" fill="#94a3b8" fontSize="11" fontWeight="bold">MEMORY FOOTPRINT — {modelSize}B Parameter Model</text>
        {/* Four precision bars, each 20px tall, starting y=90 */}
        {precisions.map((p, i) => {
          const pSpec = PRECISION_SPECS[p];
          const memGB = (modelSize * 4 * pSpec.memoryRatio).toFixed(1);
          const barWidth = 380 * pSpec.memoryRatio;
          const isActive = p === precision;
          const rowY = 90 + i * 20;
          return (
            <g key={p}>
              <text x="35" y={rowY + 13} fill={isActive ? pSpec.color : '#64748b'} fontSize="11" fontWeight={isActive ? 'bold' : 'normal'}>{p}</text>
              <rect x="80" y={rowY} width="380" height="14" rx="3" fill="rgba(255,255,255,0.05)" />
              <rect x="80" y={rowY} width={barWidth} height="14" rx="3" fill={`url(#qprec${p}Gradient)`} opacity={isActive ? 1 : 0.5} filter={isActive ? 'url(#qprecBitGlow)' : undefined} />
              <text x="470" y={rowY + 13} fill={isActive ? '#f8fafc' : '#64748b'} fontSize="11">{memGB} GB</text>
            </g>
          );
        })}

        {/* ── VALUE & ACCURACY PANEL (y: 185–285) ── */}
        <rect x="20" y="185" width="320" height="100" rx="10" fill="url(#qprecPanelGlass)" stroke="#334155" strokeWidth="1" />
        {/* Header at y=205 (range 194–207) */}
        <text x="35" y="205" fill="#94a3b8" fontSize="11" fontWeight="bold">VALUE COMPARISON</text>
        <text x="35" y="230" fill="#64748b" fontSize="11">Original (FP32):</text>
        <text x="200" y="230" fill="#3b82f6" fontSize="13" fontWeight="bold">{originalValue.toFixed(6)}</text>
        <text x="35" y="252" fill="#64748b" fontSize="11">Quantized ({precision}):</text>
        <text x="200" y="252" fill={spec.color} fontSize="13" fontWeight="bold">
          {quantizedValues[precision].toFixed(precision === 'INT4' ? 3 : precision === 'INT8' ? 4 : 6)}
        </text>
        {showQuantizationError && (
          <>
            <text x="35" y="274" fill="#64748b" fontSize="11">Quantization Error:</text>
            <text x="200" y="274" fill={quantizationError > 1 ? colors.warning : colors.success} fontSize="13" fontWeight="bold">
              {quantizationError.toFixed(3)}%
            </text>
          </>
        )}

        {/* ── ACCURACY / SPEED PANEL (y: 185–285) ── */}
        <rect x="360" y="185" width="320" height="100" rx="10" fill="url(#qprecPanelGlass)" stroke="#334155" strokeWidth="1" />
        {/* Header at y=205 (range 194–207) — same y as left panel is OK since x ranges don't overlap */}
        <text x="375" y="205" fill="#94a3b8" fontSize="11" fontWeight="bold">ACCURACY vs SPEED</text>
        {/* Accuracy circle */}
        <circle cx="420" cy="248" r="22" fill="url(#qprecAccuracyGlow)" opacity={0.8} />
        <circle cx="420" cy="248" r="15" fill="#15803d" stroke="#22c55e" strokeWidth="2" />
        <text x="420" y="253" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">{(100 - quantizationError).toFixed(0)}%</text>
        <text x="420" y="278" textAnchor="middle" fill="#22c55e" fontSize="11">Accuracy</text>
        {/* Speed circle */}
        <circle cx="510" cy="248" r="22" fill="url(#qprecPerformanceGlow)" opacity={0.8} />
        <circle cx="510" cy="248" r="15" fill="#92400e" stroke="#f59e0b" strokeWidth="2" />
        <text x="510" y="253" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">{spec.speedRatio}x</text>
        <text x="510" y="278" textAnchor="middle" fill="#f59e0b" fontSize="11">Speed</text>
        {/* Arrow */}
        <text x="600" y="248" textAnchor="middle" fill="#64748b" fontSize="11">Lower prec.</text>
        <text x="600" y="265" textAnchor="middle" fill="#64748b" fontSize="11">= faster</text>

        {/* ── PRECISION CURVE (y: 300–390) ── Interactive visualization */}
        <rect x="20" y="300" width="660" height="90" rx="10" fill="url(#qprecPanelGlass)" stroke="#334155" strokeWidth="1" />
        <text x="35" y="320" fill="#94a3b8" fontSize="11" fontWeight="bold">PRECISION CURVE — Quantization intensity</text>
        {/* Curve spanning full vertical range of this panel */}
        <path
          d={`M 40 388 L 80 370 L 120 355 L 160 ${330 + (1 - spec.memoryRatio) * 40} L 200 ${330 + (1 - spec.memoryRatio) * 35} L 240 ${320 + (1 - spec.memoryRatio) * 35} L 280 ${315 + (1 - spec.memoryRatio) * 30} L 320 ${310 + (1 - spec.memoryRatio) * 25} L 360 ${308 + (1 - spec.memoryRatio) * 20} L 400 305 L 440 302 L 480 300 L 520 298 L 560 296 L 600 288 L 640 ${310 + spec.memoryRatio * 30}`}
          fill="none"
          stroke={spec.color}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Interactive point */}
        <circle
          cx={350 + (modelSize / 70) * 250}
          cy={350 - (modelSize / 70) * 40}
          r={9}
          fill={spec.color}
          stroke="#ffffff"
          strokeWidth="2"
          filter="url(#qprecBitGlow)"
        />
        <text x="35" y="392" fill="#64748b" fontSize="11">Low precision</text>
        <text x="645" y="392" textAnchor="end" fill="#64748b" fontSize="11">High precision</text>
      </svg>
    );
  };

  const renderControls = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Precision Format
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(Object.keys(PRECISION_SPECS) as Array<keyof typeof PRECISION_SPECS>).map(p => (
            <button
              key={p}
              onClick={() => setPrecision(p)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: precision === p ? `2px solid ${PRECISION_SPECS[p].color}` : '1px solid rgba(255,255,255,0.2)',
                background: precision === p ? `linear-gradient(135deg, ${PRECISION_SPECS[p].color}33, ${PRECISION_SPECS[p].color}11)` : 'transparent',
                color: PRECISION_SPECS[p].color,
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s ease-out',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px' }}>
          Model Size: {modelSize}B parameters
        </label>
        <input
          type="range"
          min={1}
          max={70}
          value={modelSize}
          onChange={(e) => setModelSize(parseInt(e.target.value))}
          onInput={(e) => setModelSize(parseInt((e.target as HTMLInputElement).value))}
          style={{
            width: '100%',
            accentColor: '#3b82f6',
            height: '20px',
            touchAction: 'pan-y',
            WebkitAppearance: 'none',
            cursor: 'pointer',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.textMuted, fontSize: '12px' }}>
          <span>1B (Phi-2)</span>
          <span>7B (LLaMA)</span>
          <span>70B (LLaMA-70B)</span>
        </div>
      </div>

      <div style={{
        background: colors.bgCard,
        borderRadius: '12px',
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Memory Required</div>
          <div style={{ color: spec.color, fontSize: '24px', fontWeight: 'bold' }}>{memoryGB} GB</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '4px' }}>Speed Boost</div>
          <div style={{ color: colors.success, fontSize: '24px', fontWeight: 'bold' }}>{throughputMultiplier}x</div>
        </div>
      </div>
    </div>
  );

  // Progress bar showing all 10 phases
  const renderProgressBar = () => {
    const currentIdx = phaseOrder.indexOf(phase);
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backgroundColor: colors.bgDark,
        zIndex: 1000,
        gap: '12px'
      }}>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          Quantization
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
          {phaseOrder.map((p, i) => (
            <button
              key={p}
              onClick={() => i <= currentIdx && goToPhase(p)}
              aria-label={phaseLabels[p]}
              title={phaseLabels[p]}
              style={{
                width: i === currentIdx ? '20px' : '10px',
                height: '10px',
                borderRadius: '5px',
                backgroundColor: i < currentIdx ? colors.success : i === currentIdx ? colors.accent : 'rgba(255,255,255,0.2)',
                cursor: i <= currentIdx ? 'pointer' : 'default',
                transition: 'all 0.2s ease-out',
                border: 'none',
                padding: 0,
              }}
            />
          ))}
        </div>
        <span style={{ color: colors.accent, fontSize: '12px', fontWeight: 600 }}>
          {currentIdx + 1}/{phaseOrder.length}
        </span>
      </div>
    );
  };

  // Bottom navigation bar with Back/Next
  const renderBottomBar = (canProceed: boolean, buttonText: string, action?: () => void) => {
    const currentIdx = phaseOrder.indexOf(phase);
    const canGoBack = currentIdx > 0;

    return (
      <div style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        background: colors.bgDark,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        gap: '12px'
      }}>
        <button
          onClick={goBack}
          disabled={!canGoBack}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: canGoBack ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: canGoBack ? colors.textSecondary : colors.textMuted,
            fontWeight: 'bold',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            opacity: canGoBack ? 1 : 0.3,
            transition: 'all 0.2s ease-out',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ← Back
        </button>
        <span style={{ color: colors.textMuted, fontSize: '12px', fontWeight: 600 }}>
          {phaseLabels[phase]}
        </span>
        <button
          onClick={action || goNext}
          disabled={!canProceed}
          style={{
            padding: '12px 32px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? `linear-gradient(135deg, ${colors.accent}, #7c3aed)` : 'rgba(255,255,255,0.1)',
            color: canProceed ? 'white' : colors.textMuted,
            fontWeight: 'bold',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease-out',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {buttonText} →
        </button>
      </div>
    );
  };

  // Phase renders
  const renderHook = () => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '16px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px', maxWidth: '672px', margin: '0 auto 24px' }}>
          <div style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(124, 58, 237, 0.1))',
            borderRadius: '20px',
            marginBottom: '16px',
            border: '1px solid rgba(168,85,247,0.3)',
          }}>
            <span style={{ color: colors.accent, fontSize: '14px', fontWeight: 700 }}>AI COMPUTE PHYSICS</span>
          </div>
          <h1 style={{ color: colors.textPrimary, fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
            Quantization and Precision
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '18px', fontWeight: 400 }}>
            How can AI run on 8-bit numbers when training uses 32-bit?
          </p>
        </div>

        {renderVisualization()}

        <div style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
          borderRadius: '16px',
          padding: '20px',
          marginTop: '24px',
          maxWidth: '672px',
          margin: '24px auto 0',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <p style={{ color: colors.textPrimary, fontSize: '16px', fontWeight: 400, lineHeight: 1.6, marginBottom: '16px' }}>
            A 7-billion parameter model needs 28GB of memory in FP32. But your phone's AI chip
            only has 8GB. How does AI run everywhere from phones to watches?
          </p>
          <div style={{
            background: 'rgba(168, 85, 247, 0.1)',
            borderLeft: `3px solid ${colors.accent}`,
            padding: '12px',
            borderRadius: '0 8px 8px 0'
          }}>
            <p style={{ color: colors.accent, fontSize: '14px', margin: 0 }}>
              The secret: Quantization - trading precision for speed and memory
            </p>
            <p style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
              FP32 (28GB) to INT8 (7GB) to INT4 (3.5GB)
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Start Predicting')}
    </div>
  );

  const renderPredict = () => {
    const predictions = [
      { id: 'crash', text: 'Using fewer bits makes the AI completely wrong' },
      { id: 'identical', text: 'INT8 and FP32 produce identical outputs' },
      { id: 'tradeoff', text: 'Fewer bits = small accuracy loss, big memory/speed gains' },
      { id: 'random', text: 'Results become random noise with fewer bits' },
    ];

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '16px' }}>
          <h2 style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 800, textAlign: 'center', marginBottom: '16px' }}>
            Make Your Prediction
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
            What happens when you reduce numerical precision from 32 bits to 8 bits?
          </p>

          {/* Static SVG for predict phase */}
          <svg viewBox="0 0 500 200" style={{ width: '100%', maxHeight: '200px', marginBottom: '20px' }}>
            <defs>
              <linearGradient id="predBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e1b4b" />
              </linearGradient>
            </defs>
            <rect width="500" height="200" fill="url(#predBg)" rx="10" />
            {/* Grid lines */}
            <line x1="0" y1="50" x2="500" y2="50" stroke="#334155" strokeDasharray="4 4" opacity="0.5" />
            <line x1="0" y1="100" x2="500" y2="100" stroke="#334155" strokeDasharray="4 4" opacity="0.5" />
            <line x1="0" y1="150" x2="500" y2="150" stroke="#334155" strokeDasharray="4 4" opacity="0.5" />
            <line x1="125" y1="0" x2="125" y2="200" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
            <line x1="250" y1="0" x2="250" y2="200" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
            <line x1="375" y1="0" x2="375" y2="200" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
            {/* Precision bars showing memory usage */}
            <rect x="30" y="30" width="80" height="140" rx="4" fill="#3b82f6" opacity="0.8" />
            <rect x="160" y="100" width="80" height="70" rx="4" fill="#8b5cf6" opacity="0.8" />
            <rect x="290" y="130" width="80" height="40" rx="4" fill="#22c55e" opacity="0.8" />
            <rect x="390" y="145" width="80" height="25" rx="4" fill="#f97316" opacity="0.8" />
            {/* Labels */}
            <text x="70" y="20" textAnchor="middle" fill="#3b82f6" fontSize="12" fontWeight="bold">FP32</text>
            <text x="200" y="90" textAnchor="middle" fill="#8b5cf6" fontSize="12" fontWeight="bold">FP16</text>
            <text x="330" y="120" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">INT8</text>
            <text x="430" y="135" textAnchor="middle" fill="#f97316" fontSize="12" fontWeight="bold">INT4</text>
            <text x="70" y="185" textAnchor="middle" fill="#94a3b8" fontSize="11">28 GB</text>
            <text x="200" y="185" textAnchor="middle" fill="#94a3b8" fontSize="11">14 GB</text>
            <text x="330" y="185" textAnchor="middle" fill="#94a3b8" fontSize="11">7 GB</text>
            <text x="430" y="185" textAnchor="middle" fill="#94a3b8" fontSize="11">3.5 GB</text>
            <text x="250" y="13" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="bold">Memory Usage by Precision</text>
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '672px', margin: '0 auto' }}>
            {predictions.map(p => (
              <button
                key={p.id}
                onClick={() => setPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: prediction === p.id ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                  background: prediction === p.id ? 'rgba(168, 85, 247, 0.2)' : colors.bgCard,
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.text}
              </button>
            ))}
          </div>

          {prediction && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: prediction === 'tradeoff' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
              borderLeft: `4px solid ${prediction === 'tradeoff' ? colors.success : colors.warning}`
            }}>
              <p style={{ color: prediction === 'tradeoff' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {prediction === 'tradeoff' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                Quantization trades small accuracy losses (typically less than 1%) for 4x memory reduction
                and 2-8x speed improvements. Neural networks are surprisingly robust to reduced precision!
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!prediction, 'Explore the Lab')}
      </div>
    );
  };

  const renderPlay = () => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '16px' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 800, textAlign: 'center', marginBottom: '16px' }}>
          Quantization Lab
        </h2>

        {/* Side-by-side layout: SVG left, controls right */}


        <div style={{


          display: 'flex',


          flexDirection: isMobile ? 'column' : 'row',


          gap: isMobile ? '12px' : '20px',


          width: '100%',


          alignItems: isMobile ? 'center' : 'flex-start',


        }}>


          <div style={{ flex: isMobile ? 'none' : 1, width: '100%', minWidth: 0 }}>


            {renderVisualization()}


          </div>


          <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0 }}>


            {renderControls()}


          </div>


        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px',
          maxWidth: '672px',
          margin: '16px auto 0',
          border: '1px solid rgba(168,85,247,0.2)',
        }}>
          <h3 style={{ color: colors.accent, marginBottom: '12px', fontWeight: 700 }}>The visualization shows how precision affects memory and speed:</h3>
          <ul style={{ color: colors.textSecondary, paddingLeft: '20px', margin: 0, lineHeight: 1.8, fontWeight: 400 }}>
            <li>When you increase precision bits, memory usage increases proportionally — higher bits cause larger model size</li>
            <li>When precision decreases from FP32 to INT8, speed increases 4x because fewer bits means faster math</li>
            <li>Notice how lower precision results in small accuracy loss — this affects edge cases more than typical inputs</li>
            <li>Observe that larger models are MORE robust to quantization because errors average out across more parameters</li>
          </ul>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '12px',
          maxWidth: '672px',
          margin: '12px auto 0',
          border: '1px solid rgba(59,130,246,0.2)',
        }}>
          <h3 style={{ color: colors.fp32, marginBottom: '8px', fontWeight: 700 }}>Why This Matters in Industry</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0, fontWeight: 400 }}>
            Quantization is important for real-world AI deployment. It enables engineers to run GPT-scale models
            on consumer hardware. Technology companies like Apple, Google, and Qualcomm use INT8 in their
            neural processing units. This is why your phone can run practical AI features despite limited memory.
            The application of quantization allows models that required datacenter GPUs to run on edge devices.
          </p>
        </div>
      </div>
      {renderBottomBar(true, 'Review Concepts')}
    </div>
  );

  const renderReview = () => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '16px' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
          Understanding Quantization
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.fp32, marginBottom: '8px' }}>FP32 (Training)</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              32 bits = 1 sign + 8 exponent + 23 mantissa. Used for training because
              gradients need high precision to accumulate correctly over millions of steps.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.fp16, marginBottom: '8px' }}>FP16/BF16 (Mixed Precision)</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              16 bits with different exponent/mantissa trade-offs. BF16 keeps FP32's range
              but reduces precision - great for training with 2x speedup.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.int8, marginBottom: '8px' }}>INT8 (Inference)</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              8-bit integers need calibration to map the weight distribution.
              Achieves 4x compression with minimal accuracy loss when done right.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.int4, marginBottom: '8px' }}>INT4/NF4 (Extreme)</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              4-bit quantization using techniques like GPTQ or AWQ. Enables 70B models
              to run on consumer GPUs with surprisingly good quality.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'The Twist: Layer Sensitivity')}
    </div>
  );

  const renderTwistPredict = () => {
    const predictions = [
      { id: 'all_same', text: 'All layers can be quantized equally' },
      { id: 'first_last', text: 'First and last layers need higher precision' },
      { id: 'middle', text: 'Only middle layers can be quantized' },
      { id: 'random', text: 'Sensitivity is random across layers' },
    ];

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '16px' }}>
          <h2 style={{ color: colors.warning, fontSize: '24px', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>
            The Twist: Layer Sensitivity
          </h2>
          <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '16px', fontWeight: 400 }}>
            Some layers are more sensitive to quantization than others. Which ones?
          </p>

          {/* Static SVG showing neural network layer sensitivity */}
          <svg viewBox="0 0 500 220" style={{ width: '100%', maxHeight: '220px', marginBottom: '20px' }}>
            <defs>
              <linearGradient id="twistBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e1b4b" />
              </linearGradient>
              <linearGradient id="highSens" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
              <linearGradient id="lowSens" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
            </defs>
            <rect width="500" height="220" fill="url(#twistBg)" rx="10" />
            {/* Grid lines */}
            <line x1="0" y1="60" x2="500" y2="60" stroke="#334155" strokeDasharray="4 4" opacity="0.4" />
            <line x1="0" y1="120" x2="500" y2="120" stroke="#334155" strokeDasharray="4 4" opacity="0.4" />
            <line x1="0" y1="180" x2="500" y2="180" stroke="#334155" strokeDasharray="4 4" opacity="0.3" />
            {/* Layer blocks */}
            <rect x="30" y="40" width="80" height="140" rx="6" fill="url(#highSens)" opacity="0.85" />
            <rect x="140" y="100" width="80" height="80" rx="6" fill="url(#lowSens)" opacity="0.75" />
            <rect x="250" y="100" width="80" height="80" rx="6" fill="url(#lowSens)" opacity="0.75" />
            <rect x="360" y="40" width="80" height="140" rx="6" fill="url(#highSens)" opacity="0.85" />
            {/* Connection lines */}
            <line x1="110" y1="110" x2="140" y2="140" stroke="#475569" strokeWidth="2" opacity="0.6" />
            <line x1="220" y1="140" x2="250" y2="140" stroke="#475569" strokeWidth="2" opacity="0.6" />
            <line x1="330" y1="140" x2="360" y2="110" stroke="#475569" strokeWidth="2" opacity="0.6" />
            {/* Labels */}
            <text x="70" y="30" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">Input</text>
            <text x="180" y="90" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">Hidden</text>
            <text x="290" y="90" textAnchor="middle" fill="#22c55e" fontSize="12" fontWeight="bold">Hidden</text>
            <text x="400" y="30" textAnchor="middle" fill="#ef4444" fontSize="12" fontWeight="bold">Output</text>
            <text x="70" y="200" textAnchor="middle" fill="#94a3b8" fontSize="11">⚠️ Sensitive</text>
            <text x="235" y="200" textAnchor="middle" fill="#94a3b8" fontSize="11">✅ Quantize-safe</text>
            <text x="400" y="200" textAnchor="middle" fill="#94a3b8" fontSize="11">⚠️ Sensitive</text>
            <text x="250" y="13" textAnchor="middle" fill="#f59e0b" fontSize="13" fontWeight="bold">Layer Sensitivity in Neural Networks</text>
          </svg>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '672px', margin: '0 auto' }}>
            {predictions.map(p => (
              <button
                key={p.id}
                onClick={() => setTwistPrediction(p.id)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: twistPrediction === p.id ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: twistPrediction === p.id ? 'rgba(245, 158, 11, 0.2)' : colors.bgCard,
                  color: colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-out',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {p.text}
              </button>
            ))}
          </div>

          {twistPrediction && (
            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: twistPrediction === 'first_last' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
            }}>
              <p style={{ color: twistPrediction === 'first_last' ? colors.success : colors.warning, fontWeight: 'bold' }}>
                {twistPrediction === 'first_last' ? 'Correct!' : 'Not quite!'}
              </p>
              <p style={{ color: colors.textSecondary, marginTop: '8px' }}>
                The first layer processes raw input (small errors amplify) and the last layer
                produces final outputs (errors directly visible). Middle layers are more forgiving
                because errors can average out through many subsequent operations.
              </p>
            </div>
          )}
        </div>
        {renderBottomBar(!!twistPrediction, 'Explore Layer Sensitivity')}
      </div>
    );
  };

  const renderTwistPlay = () => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '16px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>
          Layer Sensitivity Lab
        </h2>

        <div style={{
          background: colors.bgCard,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '12px' }}>
            Select Layer Type:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['input', 'middle', 'output'] as const).map(layer => (
              <button
                key={layer}
                onClick={() => setLayerSensitivity(layer)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: layerSensitivity === layer ? `2px solid ${colors.warning}` : '1px solid rgba(255,255,255,0.2)',
                  background: layerSensitivity === layer ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {layer}
              </button>
            ))}
          </div>
        </div>

        {renderVisualization()}

        <div style={{
          background: layerSensitivity === 'middle' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '16px',
          border: `1px solid ${layerSensitivity === 'middle' ? colors.success : colors.error}`
        }}>
          <h3 style={{ color: layerSensitivity === 'middle' ? colors.success : colors.error, marginBottom: '8px' }}>
            {layerSensitivity === 'input' && 'High Sensitivity - Keep FP16 or higher'}
            {layerSensitivity === 'middle' && 'Low Sensitivity - Safe for INT8/INT4'}
            {layerSensitivity === 'output' && 'High Sensitivity - Keep FP16 or higher'}
          </h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            {layerSensitivity === 'input' && 'Input layers process raw data. Small errors here propagate through the entire network.'}
            {layerSensitivity === 'middle' && 'Middle layers have redundancy. Errors average out across many parameters and operations.'}
            {layerSensitivity === 'output' && 'Output layers directly affect predictions. Errors here immediately impact model quality.'}
          </p>
          <p style={{ color: colors.warning, fontSize: '14px', marginTop: '8px' }}>
            Quality Impact: {effectiveQualityLoss.toFixed(1)}% (with {precision} quantization)
          </p>
        </div>

        {renderControls()}
      </div>
      {renderBottomBar(true, 'Review the Twist')}
    </div>
  );

  const renderTwistReview = () => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '16px' }}>
        <h2 style={{ color: colors.warning, fontSize: '24px', textAlign: 'center', marginBottom: '24px' }}>
          Mixed-Precision Strategy
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.error}` }}>
            <h3 style={{ color: colors.error, marginBottom: '8px' }}>Input/Output Layers</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Keep at FP16 or higher. These layers are bottlenecks for quality.
              Often only 1-2% of total parameters.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px', border: `1px solid ${colors.success}` }}>
            <h3 style={{ color: colors.success, marginBottom: '8px' }}>Middle Layers</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Safe for INT8 or even INT4. These contain 95%+ of parameters.
              Maximum memory savings with minimal quality impact.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.accent, marginBottom: '8px' }}>Calibration is Key</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              Quantization needs calibration data to find the right scale factors.
              Running a few hundred samples through the model finds optimal mappings.
            </p>
          </div>

          <div style={{ background: colors.bgCard, borderRadius: '12px', padding: '16px' }}>
            <h3 style={{ color: colors.fp16, marginBottom: '8px' }}>QAT vs PTQ</h3>
            <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
              <strong>Post-Training Quantization (PTQ):</strong> Fast, simple, good results.<br/>
              <strong>Quantization-Aware Training (QAT):</strong> Better quality but requires retraining.
            </p>
          </div>
        </div>
      </div>
      {renderBottomBar(true, 'Real-World Applications')}
    </div>
  );

  const renderTransfer = () => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '60px', paddingLeft: '24px', paddingRight: '24px', paddingBottom: '16px' }}>
        <h2 style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>
          Real-World Applications
        </h2>
        <p style={{ color: colors.textMuted, textAlign: 'center', marginBottom: '24px', fontSize: '14px', fontWeight: 400 }}>
          Explore all 4 applications to continue
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '672px', margin: '0 auto' }}>
          {TRANSFER_APPS.map((app, i) => (
            <div
              key={i}
              style={{
                background: colors.bgCard,
                borderRadius: '12px',
                padding: '16px',
                border: transferCompleted.has(i) ? `2px solid ${colors.success}` : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ color: colors.textPrimary, margin: 0, fontWeight: 700 }}>{app.title}</h3>
                {transferCompleted.has(i) && <span style={{ color: colors.success }}>✅ Done</span>}
              </div>
              <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '12px' }}>{app.description}</p>
              <div style={{
                background: 'rgba(168, 85, 247, 0.1)',
                padding: '8px 12px',
                borderRadius: '6px',
                marginBottom: '12px'
              }}>
                <p style={{ color: colors.accent, fontSize: '12px', margin: 0 }}>{app.insight}</p>
              </div>
              {!transferCompleted.has(i) && (
                <button
                  onClick={() => setTransferCompleted(new Set([...transferCompleted, i]))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${colors.accent}`,
                    background: 'transparent',
                    color: colors.accent,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-out',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  ✅ Got It — Continue
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {renderBottomBar(transferCompleted.size >= 4, 'Take the Test')}
    </div>
  );

  const renderTest = () => {
    const totalQuestions = TEST_QUESTIONS.length;
    const currentQ = TEST_QUESTIONS[currentTestIndex];

    if (testSubmitted) {
      const score = calculateTestScore();
      const passed = score >= 7;

      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
          <div style={{ flex: 1, padding: '24px', paddingBottom: '16px', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                background: passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                border: `3px solid ${passed ? colors.success : colors.warning}`
              }}>
                {score === totalQuestions ? '🏆' : score >= 9 ? '⭐' : score >= 7 ? '✅' : '📚'}
              </div>
              <h2 style={{ color: passed ? colors.success : colors.warning, fontSize: '28px', marginBottom: '8px' }}>
                {score}/{totalQuestions} Correct
              </h2>
              <p style={{ color: colors.textSecondary, marginBottom: '16px' }}>
                {score === totalQuestions ? "Perfect! You've mastered quantization and precision!" :
                 score >= 9 ? 'Excellent! You deeply understand quantization concepts.' :
                 score >= 7 ? 'Great job! You understand the key concepts.' :
                 'Keep exploring - quantization takes time to master!'}
              </p>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
                <button
                  onClick={() => {
                    setTestSubmitted(false);
                    setTestAnswers(new Array(10).fill(null));
                    setCurrentTestIndex(0);
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: colors.bgCard,
                    color: colors.textSecondary,
                    border: `1px solid rgba(255,255,255,0.2)`,
                    cursor: 'pointer',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  Retake Test
                </button>
                <button
                  onClick={() => passed ? goNext() : goToPhase('hook')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: passed ? colors.success : colors.warning,
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {passed ? 'Claim Mastery' : 'Review Lesson'}
                </button>
              </div>
            </div>

            {/* Question-by-Question Review */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', color: colors.textMuted }}>
                Question-by-Question Review
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {TEST_QUESTIONS.map((q, i) => {
                const correctOption = q.options.find(o => o.correct);
                const correctId = correctOption?.id;
                const userAnswer = testAnswers[i];
                const userOption = q.options.find(o => o.id === userAnswer);
                const isCorrect = userAnswer === correctId;

                return (
                  <div key={i} style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: colors.bgCard,
                    border: `2px solid ${isCorrect ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                  }}>
                    <div style={{
                      padding: '16px',
                      background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          background: isCorrect ? colors.success : colors.error,
                          color: 'white'
                        }}>
                          {isCorrect ? 'Y' : 'X'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: 'bold', color: colors.textPrimary, margin: 0 }}>
                            Question {i + 1}
                          </p>
                          <p style={{ fontSize: '12px', color: colors.textMuted, margin: 0 }}>{q.question}</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                      }}>
                        <p style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '4px',
                          color: isCorrect ? colors.success : colors.error
                        }}>
                          {isCorrect ? 'Your Answer (Correct!)' : 'Your Answer'}
                        </p>
                        <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>
                          {userOption?.label || 'No answer selected'}
                        </p>
                      </div>

                      {!isCorrect && (
                        <div style={{
                          padding: '12px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          <p style={{
                            fontSize: '10px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            marginBottom: '4px',
                            color: colors.success
                          }}>
                            Correct Answer
                          </p>
                          <p style={{ fontSize: '14px', color: colors.textPrimary, margin: 0 }}>
                            {correctOption?.label}
                          </p>
                        </div>
                      )}

                      <div style={{
                        padding: '12px',
                        borderRadius: '12px',
                        background: 'rgba(168, 85, 247, 0.1)'
                      }}>
                        <p style={{
                          fontSize: '10px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '4px',
                          color: colors.accent
                        }}>
                          Why?
                        </p>
                        <p style={{ fontSize: '12px', lineHeight: 1.5, color: colors.textSecondary, margin: 0 }}>
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
        <div style={{ flex: 1, padding: '24px', paddingBottom: '16px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <p style={{
              fontSize: '10px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
              color: colors.warning
            }}>
              Step 9 - Knowledge Test
            </p>
            <h2 style={{ color: colors.textPrimary, fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
              Question {currentTestIndex + 1} of {totalQuestions}
            </h2>

            {/* Progress bar */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: totalQuestions }, (_, i) => {
                const answered = testAnswers[i] !== null;
                const correctOption = TEST_QUESTIONS[i].options.find(o => o.correct);
                const isCorrect = answered && testAnswers[i] === correctOption?.id;
                return (
                  <div
                    key={i}
                    style={{
                      height: '8px',
                      flex: 1,
                      borderRadius: '9999px',
                      background: i === currentTestIndex ? colors.warning :
                                  answered ? (isCorrect ? colors.success : colors.error) :
                                  'rgba(255,255,255,0.1)'
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Scenario */}
          <div style={{
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '24px',
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.3)'
          }}>
            <p style={{
              fontSize: '10px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '8px',
              color: colors.accent
            }}>
              Scenario
            </p>
            <p style={{ fontSize: '14px', color: colors.textSecondary, margin: 0, lineHeight: 1.6 }}>
              {currentQ.scenario}
            </p>
          </div>

          {/* Question */}
          <p style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '24px',
            color: colors.textPrimary,
            lineHeight: 1.4
          }}>
            {currentQ.question}
          </p>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {currentQ.options.map((opt, i) => {
              const isSelected = testAnswers[currentTestIndex] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    const newAnswers = [...testAnswers];
                    newAnswers[currentTestIndex] = opt.id;
                    setTestAnswers(newAnswers);
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: isSelected ? `2px solid ${colors.accent}` : '1px solid rgba(255,255,255,0.2)',
                    background: isSelected ? 'rgba(168, 85, 247, 0.2)' : colors.bgCard,
                    color: colors.textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    zIndex: 10,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                    background: isSelected ? colors.accent : 'rgba(255,255,255,0.1)',
                    color: isSelected ? 'white' : colors.textSecondary
                  }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span style={{ fontSize: '14px', lineHeight: 1.5 }}>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              onClick={() => setCurrentTestIndex(Math.max(0, currentTestIndex - 1))}
              disabled={currentTestIndex === 0}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent',
                color: currentTestIndex === 0 ? colors.textMuted : colors.textPrimary,
                cursor: currentTestIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: currentTestIndex === 0 ? 0.5 : 1,
                zIndex: 10,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Previous
            </button>
            {currentTestIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentTestIndex(currentTestIndex + 1)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: colors.accent,
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  zIndex: 10,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => setTestSubmitted(true)}
                disabled={testAnswers.includes(null)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: testAnswers.includes(null) ? colors.textMuted : colors.success,
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: testAnswers.includes(null) ? 'not-allowed' : 'pointer',
                  opacity: testAnswers.includes(null) ? 0.5 : 1,
                  zIndex: 10,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                Submit Test
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMastery = () => (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: colors.bgPrimary }}>
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${colors.accent}, ${colors.int8})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: `0 0 40px ${colors.accentGlow}`,
        }}>
          <span style={{ fontSize: '48px' }}>🏆</span>
        </div>

        <h1 style={{ color: colors.textPrimary, fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>
          Quantization Master!
        </h1>
        <p style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: '32px' }}>
          You understand how AI models shrink without breaking
        </p>

        <div style={{ background: colors.bgCard, borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%' }}>
          <h3 style={{ color: colors.accent, marginBottom: '16px' }}>Key Concepts Mastered:</h3>
          <ul style={{ color: colors.textSecondary, lineHeight: 2, paddingLeft: '20px', margin: 0 }}>
            <li>FP32/FP16/INT8/INT4 precision trade-offs</li>
            <li>Memory and speed benefits of quantization</li>
            <li>Layer sensitivity (first/last vs middle)</li>
            <li>Calibration and scale factors</li>
            <li>Mixed-precision strategies</li>
          </ul>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(168, 85, 247, 0.1)',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%'
        }}>
          <p style={{ color: colors.accent, textAlign: 'center', margin: 0 }}>
            "Precision is expensive. Use only what you need."
          </p>
        </div>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (phase) {
      case 'hook': return renderHook();
      case 'predict': return renderPredict();
      case 'play': return renderPlay();
      case 'review': return renderReview();
      case 'twist_predict': return renderTwistPredict();
      case 'twist_play': return renderTwistPlay();
      case 'twist_review': return renderTwistReview();
      case 'transfer': return (
          <TransferPhaseView
          conceptName="Quantization Precision"
          applications={realWorldApps}
          onComplete={() => goToPhase('test')}
          isMobile={isMobile}
          colors={colors}
          typo={typo}
          />
        );
      case 'test': return renderTest();
      case 'mastery': return renderMastery();
      default: return renderHook();
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: colors.bgPrimary }}>
      {renderProgressBar()}
      {/* Main content with padding for fixed header */}
      <div style={{ paddingTop: '60px' }}>
        {renderPhase()}
      </div>
    </div>
  );
};

export default QuantizationPrecisionRenderer;
