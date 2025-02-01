# GPU-optimized Depth Sorting Algorithm

A massively parallel sorting algorithm designed for real-time depth sorting of large datasets (up to trillion elements) on GPUs. Prioritizes elements closer to the "viewport" (array start) using non-linear probability distributions while minimizing processing of distant elements.

## Key Features

- **Viewport-First Sorting**  
  Uses modified Kumaraswamy distribution (a=1, b=2) with exponential decay to focus 99.9% of sorts on the first 0.1%-1% of elements

- **Depth-Adaptive Processing**  
  Exponential rejection probability `exp(-8 * position_ratio)` reduces distant element sorting by >98% beyond 10% array depth

- **Hierarchical Workgroups**  
  Divides array into segments proportional to viewport focus (default: 1% of total length)

- **In-Place Radix Sorting**  
  Uses XOR swap for bufferless element exchange (supports 32-bit unsigned integers)

- **Single-Cycle Operation**  
  Processes 64 groups/thread in parallel per GPU cycle (1 cycle = 1 shader dispatch)


