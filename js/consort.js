// ConSort: Adaptive grouped radix sort optimized for mostly-sorted arrays
async function conSort(elements) {
    const arraySize = elements.length;
    if (arraySize <= 1) return;

    // Configuration
    const minGroupSize = 3;           // Minimum size of each group
    const sortScale = 0.8;            // Scale factor for number of sorts
    const sortThreshold = 0.3;        // 30% threshold for full sort

    // Calculate number of sorts based on array size
    const calculateSortsPerGroup = () => {
        return Math.floor(Math.sqrt(arraySize) * sortScale);
    };

    // Get number of sorts for this run
    const sortsPerGroup = calculateSortsPerGroup();

    // Random sort within a group - only adjacent pairs
    const randomSortGroup = async (groupStart, groupSize) => {
        if (groupSize <= 1) return;
        
        // Use calculated number of sorts
        for (let i = 0; i < sortsPerGroup; i++) {
            // Pick random adjacent pair within group
            const idx = groupStart + Math.floor(Math.random() * (groupSize - 1));
            
            // Compare and swap if needed
            if (getValue(idx) > getValue(idx + 1)) {
                await swap(idx, idx + 1);
            }
        }
    };

    // Insertion sort for first elements of groups
    const insertionSortFirstElements = async (groupIndex, groupSize) => {
        const firstElement = getValue(groupIndex * groupSize);
        let j = groupIndex;
        
        while (j > 0 && getValue((j-1) * groupSize) > firstElement) {
            // Swap entire groups
            for (let k = 0; k < groupSize; k++) {
                await swap((j-1) * groupSize + k, j * groupSize + k);
            }
            j--;
        }
    };

    // Check if section needs full sort
    const needsFullSort = async (start, size) => {
        let outOfOrder = 0;
        const threshold = Math.floor(size * sortThreshold);
        
        for (let i = start + 1; i < start + size; i++) {
            if (getValue(i) < getValue(i-1)) {
                outOfOrder++;
                if (outOfOrder > threshold) return true;
            }
        }
        return false;
    };

    // Full radix sort implementation
    const radixSort = async (start, size) => {
        // Use insertion sort for small arrays
        if (size <= 16) {
            for (let i = start + 1; i < start + size; i++) {
                let j = i;
                while (j > start && getValue(j - 1) > getValue(j)) {
                    await swap(j - 1, j);
                    j--;
                }
            }
            return;
        }

        // Find max value to determine number of digits
        let maxVal = 0;
        for (let i = start; i < start + size; i++) {
            maxVal = Math.max(maxVal, getValue(i));
        }
        
        // Count sort implementation (more stable than previous radix)
        for (let exp = 1; maxVal / exp > 0; exp *= 10) {
            const output = new Array(size);
            const count = new Array(10).fill(0);
            
            // Store count of occurrences
            for (let i = 0; i < size; i++) {
                const idx = start + i;
                const digit = Math.floor(getValue(idx) / exp) % 10;
                count[digit]++;
            }
            
            // Calculate cumulative count
            for (let i = 1; i < 10; i++) {
                count[i] += count[i - 1];
            }
            
            // Build output array
            for (let i = size - 1; i >= 0; i--) {
                const idx = start + i;
                const val = getValue(idx);
                const digit = Math.floor(val / exp) % 10;
                output[count[digit] - 1] = val;
                count[digit]--;
            }
            
            // Copy back to original array with visualization
            for (let i = 0; i < size; i++) {
                const currentVal = getValue(start + i);
                if (currentVal !== output[i]) {
                    // Find where our target value currently is
                    for (let j = i + 1; j < size; j++) {
                        if (getValue(start + j) === output[i]) {
                            await swap(start + i, start + j);
                            break;
                        }
                    }
                }
            }
        }
    };

    // Process each group
    let currentStart = 0;
    let groupIndex = 0;

    while (currentStart < arraySize) {
        // Calculate group size - linear growth from minGroupSize
        const groupSize = Math.min(
            minGroupSize + groupIndex,
            arraySize - currentStart
        );

        // Check if section needs full sort
        if (await needsFullSort(currentStart, groupSize)) {
            await radixSort(currentStart, groupSize);
        } else {
            // Sort first elements of groups
            await insertionSortFirstElements(groupIndex, groupSize);
            
            // Random sort within group
            await randomSortGroup(currentStart, groupSize);
        }

        currentStart += groupSize;
        groupIndex++;
    }
}
