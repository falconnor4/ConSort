struct Config {
    arraySize: u32,
    sortThreshold: f32,
    minGroupSize: u32,
    sortScale: f32,
};

@group(0) @binding(0) var<storage, read_write> data: array<u32>;
@group(0) @binding(1) var<uniform> config: Config;

fn wang_hash(seed: u32) -> u32 {
    var s = seed;
    s = (s ^ 61u) ^ (s >> 16u);
    s *= 9u;
    s = s ^ (s >> 4u);
    s *= 0x27d4eb2du;
    s = s ^ (s >> 15u);
    return s;
}

fn swap(a: u32, b: u32) {
    let temp = data[a];
    data[a] = data[b];
    data[b] = temp;
}

fn insertionSortFirstElements(groupIndex: u32, groupSize: u32) {
    let firstElement = data[groupIndex * groupSize];
    var j = groupIndex;
    
    while (j > 0u && data[(j-1u) * groupSize] > firstElement) {
        for (var k = 0u; k < groupSize; k++) {
            swap((j-1u) * groupSize + k, j * groupSize + k);
        }
        j--;
    }
}

fn calculateSortsPerGroup() -> u32 {
    return u32(sqrt(f32(config.arraySize)) * config.sortScale);
}

fn randomSortGroup(groupStart: u32, groupSize: u32, sortsPerGroup: u32) {
    if (groupSize <= 1u) {
        return;
    }
    
    var seed = groupStart;
    let maxStartIdx = groupStart + groupSize - 2u;
    
    for (var i = 0u; i < sortsPerGroup; i++) {
        seed = wang_hash(seed);
        let idx = groupStart + (seed % (groupSize - 1u));
        
        if (data[idx] > data[idx + 1u]) {
            swap(idx, idx + 1u);
        }
    }
}

fn needsFullSort(start: u32, size: u32) -> bool {
    var outOfOrder = 0u;
    let threshold = u32(f32(size) * config.sortThreshold);
    
    for (var i = start + 1u; i < start + size; i++) {
        if (data[i] < data[i-1u]) {
            outOfOrder++;
            if (outOfOrder > threshold) {
                return true;
            }
        }
    }
    return false;
}

fn radixSort(start: u32, size: u32) {
    var maxVal = 0u;
    for (var i = start; i < start + size; i++) {
        maxVal = max(maxVal, data[i]);
    }
    
    for (var bit = 0u; bit < 32u; bit++) {
        let mask = 1u << bit;
        if ((maxVal & mask) == 0u) {
            continue;
        }
        
        var zeros = 0u;
        for (var i = start; i < start + size; i++) {
            if ((data[i] & mask) == 0u) {
                zeros++;
            }
        }
        
        var zeroPos = start;
        var onePos = start + zeros;
        var temp = array<u32, 1024>(data);
        
        for (var i = start; i < start + size; i++) {
            if ((temp[i] & mask) == 0u) {
                data[zeroPos++] = temp[i];
            } else {
                data[onePos++] = temp[i];
            }
        }
    }
}

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    if (gid.x >= config.arraySize) {
        return;
    }
    
    let sortsPerGroup = calculateSortsPerGroup();
    
    let groupIndex = gid.x;
    var groupSize = config.minGroupSize + groupIndex;
    let groupStart = groupIndex * groupSize;
    
    if (groupStart >= config.arraySize) {
        return;
    }
    
    groupSize = min(groupSize, config.arraySize - groupStart);
    
    if (needsFullSort(groupStart, groupSize)) {
        radixSort(groupStart, groupSize);
        return;
    }
    
    insertionSortFirstElements(groupIndex, groupSize);
    randomSortGroup(groupStart, groupSize, sortsPerGroup);
}