// End-to-end test of the mock backend flow.
// File name: test-flow.js

const BASE = "http://localhost:3000";

async function post(path, body) {
  try {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return {
      status: res.status,
      data,
    };
  } catch (error) {
    throw new Error(`POST ${path} failed: ${error.message}`);
  }
}

async function get(path) {
  try {
    const res = await fetch(BASE + path);

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return {
      status: res.status,
      data,
    };
  } catch (error) {
    throw new Error(`GET ${path} failed: ${error.message}`);
  }
}

async function main() {
  console.log("======================================");
  console.log(" AI Technical Interview - E2E Test");
  console.log("======================================\n");

  // ---------------------------------------------------------
  // 1. Get candidates
  // ---------------------------------------------------------
  const cands = await get("/api/candidates");

  if (cands.status !== 200) {
    throw new Error(
      `Failed to get candidates. Status: ${cands.status}`
    );
  }

  if (
    !cands.data ||
    !Array.isArray(cands.data.candidates) ||
    cands.data.candidates.length === 0
  ) {
    throw new Error("No candidates found.");
  }

  console.log(
    "1) Candidates:",
    cands.data.candidates
      .map((c) => c.name)
      .join(", ")
  );

  const candidate = cands.data.candidates[0];

  // ---------------------------------------------------------
  // 2. Get full candidate detail
  // ---------------------------------------------------------
  const detail = await get(
    "/api/candidates/" + encodeURIComponent(candidate.id)
  );

  if (detail.status !== 200) {
    throw new Error(
      `Failed to get candidate detail. Status: ${detail.status}`
    );
  }

  if (!detail.data.candidate) {
    throw new Error("Candidate detail missing from response.");
  }

  const fullCandidate = detail.data.candidate;

  console.log(
    "2) Candidate detail:",
    fullCandidate.name,
    "- curriculum days:",
    Array.isArray(fullCandidate.curriculum)
      ? fullCandidate.curriculum.length
      : 0
  );

  // ---------------------------------------------------------
  // 3. Start interview
  // ---------------------------------------------------------
  const sessionId = "test-session-" + Date.now();

  const start = await post("/api/interview", {
    sessionId,
    candidate: fullCandidate,
  });

  if (start.status !== 200) {
    throw new Error(
      `Failed to start interview. Status: ${start.status}`
    );
  }

  console.log("3) Start interview → status", start.status);

  if (start.data.reply) {
    const firstQuestion = start.data.reply
      .split("\n")
      .filter(Boolean)
      .pop();

    console.log(
      "   First question:",
      (firstQuestion || start.data.reply).slice(0, 120)
    );
  }

  // ---------------------------------------------------------
  // 4. Submit answers
  // ---------------------------------------------------------
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

    "I would add an index on the WHERE and JOIN columns, then use EXPLAIN to confirm the plan uses the index.",

    "State is internal mutable data; props are read-only inputs passed from a parent. useEffect runs after render based on deps.",
  ];

  let done = false;
  let q = 1;

  for (const answer of answers) {
    if (done) break;

    const resp = await post("/api/interview", {
      sessionId,
      message: answer,
    });

    if (resp.status !== 200) {
      console.log(
        `   Answer ${q} → API returned status ${resp.status}`
      );

      if (resp.data) {
        console.log("   Response:", resp.data);
      }

      throw new Error(
        `Interview request failed at answer ${q}`
      );
    }

    if (resp.data && resp.data.done) {
      const score =
        resp.data.feedback &&
        typeof resp.data.feedback.overallScore !== "undefined"
          ? resp.data.feedback.overallScore
          : "N/A";

      console.log(
        `4) After answer ${q} → DONE. Overall score: ${score}/100`
      );

      done = true;
      break;
    }

    const reply = resp.data && resp.data.reply
      ? resp.data.reply
      : "";

    const nextQuestion = reply
      .split("\n")
      .filter(Boolean)
      .pop();

    console.log(
      `   Q${q} submitted → next: ${(
        nextQuestion || reply || "No reply"
      ).slice(0, 100)}`
    );

    q++;
  }

  // ---------------------------------------------------------
  // 5. Fetch progress
  // ---------------------------------------------------------
  const progress = await get(
    "/api/interview/" + encodeURIComponent(sessionId)
  );

  if (progress.status !== 200) {
    throw new Error(
      `Failed to fetch progress. Status: ${progress.status}`
    );
  }

  const questionCount =
    progress.data.questionCount ?? 0;

  const coveredDays =
    Array.isArray(progress.data.coveredDays)
      ? progress.data.coveredDays
      : [];

  console.log(
    `5) Progress → questions: ${questionCount}, covered days: ${
      coveredDays.length
        ? coveredDays.join(", ")
        : "none"
    }`
  );

  // ---------------------------------------------------------
  // 6. Fetch feedback
  // ---------------------------------------------------------
  const fb = await get(
    "/api/interview/" +
      encodeURIComponent(sessionId) +
      "/feedback"
  );

  if (fb.status !== 200) {
    throw new Error(
      `Failed to fetch feedback. Status: ${fb.status}`
    );
  }

  const feedback = fb.data.feedback || {};

  console.log("6) Feedback detail →");

  console.log(
    "   Categories:",
    JSON.stringify(feedback.categories || {})
  );

  console.log(
    "   Q-wise entries:",
    Array.isArray(fb.data.questionWisePerformance)
      ? fb.data.questionWisePerformance.length
      : 0
  );

  console.log("\n======================================");
  console.log("✅ Full flow verified successfully!");
  console.log("======================================");
}

// ---------------------------------------------------------
// Run test
// ---------------------------------------------------------

main().catch((error) => {
  console.error("\n❌ Test flow failed:", error.message);
  process.exitCode = 1;
});
