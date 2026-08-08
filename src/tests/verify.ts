import { calculateSimilarity } from '../lib/engine/mcqGenerator';

function testSimilarity() {
  const q1 = "Photosynthesis occurs in which organelle?";
  const q2 = "In which organelle does photosynthesis take place?";
  const q3 = "What is Newton's second law of motion?";
  
  const score1 = calculateSimilarity(q1, q2);
  const score2 = calculateSimilarity(q1, q3);
  
  console.log(`Similarity between duplicate questions: ${score1.toFixed(2)} (Expected > 0.35)`);
  console.log(`Similarity between different questions: ${score2.toFixed(2)} (Expected < 0.20)`);
  
  if (score1 > 0.35 && score2 < 0.20) {
    console.log("Deduplication Jaccard logic is working perfectly!");
  } else {
    console.error("Deduplication logic verification failed.");
    process.exit(1);
  }
}

testSimilarity();
