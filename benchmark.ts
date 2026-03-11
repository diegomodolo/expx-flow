import { performance } from 'perf_hooks';

// Simulate a network request taking ~50ms
const mockSupabaseCall = async (data: any) => {
  return new Promise(resolve => setTimeout(() => resolve({ data, error: null }), 50));
};

async function runBenchmark() {
  const numLeads = 50;
  const mockLeads = Array.from({ length: numLeads }).map((_, i) => ({ id: i, name: `Lead ${i}` }));

  console.log(`Starting benchmark for ${numLeads} leads...`);

  // --- Baseline (Sequential) ---
  const baselineStart = performance.now();
  for (const lead of mockLeads) {
    await mockSupabaseCall(lead); // Upsert CNAE
  }
  for (const lead of mockLeads) {
     await mockSupabaseCall(lead); // Insert Lead Master Pool
  }
  for (const lead of mockLeads) {
     await mockSupabaseCall(lead); // Assign Segment
  }
  const baselineEnd = performance.now();
  const baselineTime = baselineEnd - baselineStart;
  console.log(`Baseline (Sequential): ${baselineTime.toFixed(2)} ms`);

  // --- Optimized (Batch) ---
  const optimizedStart = performance.now();
  await mockSupabaseCall(mockLeads); // Batch Upsert CNAE
  await mockSupabaseCall(mockLeads); // Batch Insert Lead Master Pool
  await mockSupabaseCall(mockLeads); // Batch Assign Segment
  const optimizedEnd = performance.now();
  const optimizedTime = optimizedEnd - optimizedStart;
  console.log(`Optimized (Batch): ${optimizedTime.toFixed(2)} ms`);

  const improvement = baselineTime / optimizedTime;
  console.log(`Improvement: ${improvement.toFixed(2)}x faster`);
}

runBenchmark().catch(console.error);
