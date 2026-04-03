# Inference Illustrated

An interactive educational tool that teaches LLM architecture and KV cache concepts — built for infrastructure engineers, storage networking professionals, and data center architects.

No ML background required.

## What You'll Learn

### Act 1: Attention Is All You Need (Stops 1–10)
Build the transformer from scratch through interactive animations:
- Why sequential models fail (the telephone problem)
- How attention enables direct token-to-token lookup
- The Query, Key, Value mechanism
- Multi-head attention and layer stacking
- Why the KV cache exists

### Act 2: KV Cache & The Network (Stops 11–17, coming soon)
Explore the infrastructure implications:
- Memory hierarchy and the memory wall
- Disaggregated inference
- Network fabric requirements
- 1/2/5 year projections

## Tech Stack

- React 19 + Vite
- Tailwind CSS v4
- D3.js for visualizations
- Zustand for state management
- GitHub Pages deployment

## Development

```bash
cd app
npm install
npm run dev
```

## Live Demo

[provandal.github.io/inference-illustrated](https://provandal.github.io/inference-illustrated/)
