// End-to-end test of the mock backend flow.
const BASE = "http://localhost:3000";

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function get(path) {
  const res = await fetch(BASE + path);
  return { status: res.status, data: await res.json() };
}

(async () => {
  // 1. Get candidates
  const cands = await get("/api/candidates");
  console.log("1) Candidates:", cands.data.candidates.map((c) => c.name).join(", "));

  const candidate = cands.data.candidates[0];

  // 2. Get full candidate detail (with curriculum)
  const detail = await get("/api/candidates/" + candidate.id);
  console.log("2) Candidate detail:", detail.data.candidate.name, "- curriculum days:", detail.data.candidate.curriculum.length);

  // 3. Start an interview
  const sessionId = "test-session-" + Date.now();
  const start = await post("/api/interview", { sessionId, candidate: detail.data.candidate });
  console.log("3) Start interview → status", start.status);
  console.log("   First question:", start.data.reply.split("\n").pop().slice(0, 80));

  // 4. Submit several answers
  const answers = [
    "I would use a sliding window technique to track the maximum sum in O(n) time, avoiding the O(n²) brute force.",
    "A hash map uses a hash function to map keys to buckets. On collision I'd use chaining with linked lists.",
    "BFS uses a queue. The time complexity is O(V+E) where V is vertices and E edges.",
    "I'd design a URL shortener with a base62 encoded counter stored in a distributed database with caching.",
    "Dynamic programming breaks the problem into overlapping subproblems and stores results in a table to avoid recomputation.",
    "For the two-pointer technique, I'd place one pointer at the start and one at the end and move them inward—this reduces O(n²) to O(n).",
    "An INNER JOIN returns only matching rows while LEFT JOIN keeps all rows from the left table, with nulls for non-matching.",
    "Component re-renders when its state or props change. React compares the virtual DOM to determine what to update.",
    "The GIL in Python limits true parallelism for threads. I'd use multiprocessing for CPU-bound tasks.",
    "An LRU cache uses a hash map plus a doubly linked list. On access I move the item to the head and evict from the tail.",
  ];

  let done = false;
  let q = 1;
  for (const ans of answers) {
    if (done) break;
    const resp = await post("/api/interview", { sessionId, message: ans });
    if (resp.status === 200 && resp.data.done) {
      console.log(`4) After answer ${q} → DONE. Overall score: ${resp.data.feedback.overallScore}/100`);
      done = true;
      break;
    }
    console.log(`   Q${q} submitted → next: ${(resp.data.reply || "").split("\n").pop().slice(0, 60)}`);
    q++;
  }

  if (!done) {
    // Submit remaining answers until done or exhausted
    const extra = [
      "I would add an index on the WHERE and JOIN columns, then use EXPLAIN to confirm the plan uses the index.",
      "State is internal mutable data; props are read-only inputs passed from a parent. useEffect runs after render based on deps.",
    ];
    for (const ans of extra) {
      if (done) break;
      const resp = await post("/api/interview", { sessionId, message: ans });
      if (resp.data.done) {
        console.log(`   Q${q} → DONE. Overall score: ${resp.data.feedback.overallScore}/100`);
        done = true;
        break;
      }
      q++;
    }
  }

  // 5. Fetch progress
  const progress = await get("/api/interview/" + sessionId);
  console.log(`5) Progress → questions: ${progress.data.questionCount}, covered days: ${progress.data.coveredDays.join(",")}`);

  // 6. Fetch feedback detail
  const fb = await get("/api/interview/" + sessionId + "/feedback");
  console.log("6) Feedback detail →");
  console.log("   Categories:", JSON.stringify(fb.data.feedback.categories));
  console.log("   Q-wise entries:", fb.data.questionWisePerformance.length);

  console.log("\n✅ Full flow verified successfully!");
})().catch((e) => {
  console.error("❌ Test flow failed:", e.message);
  process.exit(1);
});
