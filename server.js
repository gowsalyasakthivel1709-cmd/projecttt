// Mock backend server for the AI Technical Interview Agent.
// Uses only Node.js built-in modules so no `npm install` is required.
// Serves static frontend files + simulates the AI interview API.

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 3000;
const ROOT = __dirname;

// ---------------------------------------------------------------------
// In-memory data
// ---------------------------------------------------------------------

const users = new Map(); // email -> { id, name, email, password }

// Pre-seed demo user
(function seedDemoUser() {
  users.set("demo@interview.ai", {
    id: "u-demo",
    name: "Demo User",
    email: "demo@interview.ai",
    password: "demo1234",
  });
})();

const sessions = new Map(); // sessionId -> session object

// MOCK CANDIDATES — simulated learning profiles
const candidates = [
  {
    id: "c-1",
    name: "Aarav Mehta",
    jobRole: "Full-Stack Developer",
    yearsExperience: 3,
    missionsCompleted: 24,
    commitDays: 132,
    score: 78,
    skippedTopics: ["System Design", "Graphs"],
    strongTopics: ["Arrays", "SQL", "React"],
    weakTopics: ["Dynamic Programming", "System Design", "Graphs"],
    curriculum: [
      { day: 1, title: "Arrays & Hashing", topics: ["Arrays", "Hashing"] },
      { day: 2, title: "Two Pointers", topics: ["Two Pointers"] },
      { day: 3, title: "Sliding Window", topics: ["Sliding Window"] },
      { day: 4, title: "SQL & Databases", topics: ["SQL", "Databases"] },
      { day: 5, title: "React Fundamentals", topics: ["React"] },
      { day: 6, title: "Dynamic Programming", topics: ["Dynamic Programming"] },
      { day: 7, title: "Graphs & BFS/DFS", topics: ["Graphs", "BFS", "DFS"] },
      { day: 8, title: "System Design Basics", topics: ["System Design"] },
    ],
  },
  {
    id: "c-2",
    name: "Priya Sharma",
    jobRole: "Backend Engineer",
    yearsExperience: 5,
    missionsCompleted: 41,
    commitDays: 210,
    score: 71,
    skippedTopics: ["Frontend", "Networking"],
    strongTopics: ["SQL", "Concurrency", "APIs"],
    weakTopics: ["Frontend", "Testing", "Networking"],
    curriculum: [
      { day: 1, title: "SQL & Indexing", topics: ["SQL", "Indexing"] },
      { day: 2, title: "API Design", topics: ["APIs", "REST"] },
      { day: 3, title: "Concurrency & Threads", topics: ["Concurrency"] },
      { day: 4, title: "Networking Basics", topics: ["Networking"] },
      { day: 5, title: "Caching & Redis", topics: ["Caching", "Redis"] },
      { day: 6, title: "Testing Strategies", topics: ["Testing"] },
      { day: 7, title: "Message Queues", topics: ["Message Queues"] },
      { day: 8, title: "Frontend Fundamentals", topics: ["Frontend"] },
    ],
  },
  {
    id: "c-3",
    name: "Rohan Gupta",
    jobRole: "Data Engineer",
    yearsExperience: 2,
    missionsCompleted: 15,
    commitDays: 89,
    score: 64,
    skippedTopics: ["Algorithms", "Distributed Systems"],
    strongTopics: ["Python", "Pandas", "ETL"],
    weakTopics: ["Algorithms", "Cloud", "Distributed Systems"],
    curriculum: [
      { day: 1, title: "Python Fundamentals", topics: ["Python"] },
      { day: 2, title: "Pandas & DataFrames", topics: ["Pandas"] },
      { day: 3, title: "ETL Pipelines", topics: ["ETL"] },
      { day: 4, title: "SQL for Analytics", topics: ["SQL"] },
      { day: 5, title: "Algorithms for Data", topics: ["Algorithms"] },
      { day: 6, title: "Cloud Storage", topics: ["Cloud"] },
      { day: 7, title: "Distributed Systems", topics: ["Distributed Systems"] },
      { day: 8, title: "Data Warehousing", topics: ["Data Warehousing"] },
    ],
  },
];

// Question bank keyed by topic (simulated AI-generated questions)
const questionBank = {
  "Arrays": [
    "Explain how you would iterate over an array and find the maximum sum of a contiguous subarray. What is the time complexity?",
    "How does JavaScript's `map` differ from `forEach` on an array? When would you prefer one over the other?",
  ],
  "Hashing": [
    "Describe how a hash map works under the hood. What happens on collisions?",
    "Given a large dataset, how would you find the first non-repeating character using a hash map?",
  ],
  "Two Pointers": [
    "Explain the two-pointer technique and give an example where it reduces a naive O(n²) solution to O(n).",
  ],
  "Sliding Window": [
    "Describe the sliding window pattern. Give an example of a problem where it applies and explain the complexity.",
  ],
  "SQL": [
    "What is the difference between INNER JOIN and LEFT JOIN? Provide a query example where the choice matters.",
    "How would you optimize a query that is scanning millions of rows? Mention indexes and EXPLAIN.",
  ],
  "Databases": [
    "Explain the difference between normalization and denormalization. When would you choose each?",
  ],
  "React": [
    "Explain the difference between state and props in React. When does a component re-render?",
    "What is the purpose of `useEffect` and how does its dependency array work?",
  ],
  "Dynamic Programming": [
    "Explain the concept of dynamic programming. Use the Fibonacci sequence to illustrate memoization vs tabulation.",
    "How would you solve the classic 'Coin Change' problem? Walk through the DP states and transitions.",
  ],
  "Graphs": [
    "Explain BFS vs DFS. When would you prefer each for graph traversal?",
  ],
  "BFS": [
    "Describe how BFS works and what data structure it relies on. What is its time complexity on a graph?",
  ],
  "DFS": [
    "Describe DFS and explain how you'd detect a cycle in a directed graph using it.",
  ],
  "System Design": [
    "How would you design a URL shortener? Cover storage, scaling, and uniqueness of short keys.",
  ],
  "Indexing": [
    "Explain how a B-tree index speeds up lookups. What are the trade-offs of adding many indexes?",
  ],
  "APIs": [
    "What is idempotency in REST APIs and why does it matter? Give an example.",
    "Explain the difference between PUT and PATCH with examples.",
  ],
  "REST": [
    "What are the key constraints of REST? How do you version an API?",
  ],
  "Concurrency": [
    "Explain the difference between a thread and a process. How do you avoid race conditions?",
  ],
  "Networking": [
    "Explain the OSI model layers. Where does HTTP sit and what does TCP provide?",
  ],
  "Caching": [
    "Explain cache eviction policies like LRU. How would you implement an LRU cache?",
  ],
  "Redis": [
    "What data structures does Redis provide and how would you use it as a cache layer?",
  ],
  "Testing": [
    "Explain unit vs integration tests. What makes a good test suite for a backend service?",
  ],
  "Message Queues": [
    "Explain the difference between a message queue and pub/sub. How do you guarantee at-least-once delivery?",
  ],
  "Frontend": [
    "Explain the concept of event delegation in the DOM and why it improves performance.",
  ],
  "Python": [
    "Explain Python's GIL and how it affects multithreading. When would you use multiprocessing instead?",
  ],
  "Pandas": [
    "How do you apply a function to a Pandas DataFrame column? Explain vectorized vs apply operations.",
  ],
  "ETL": [
    "Walk through building an ETL pipeline that ingests daily CSVs. Where do you put validation?",
  ],
  "Algorithms": [
    "Explain time vs space complexity trade-offs with a sorting example. When would you choose quicksort over mergesort?",
  ],
  "Cloud": [
    "Explain object storage vs block storage. When would you use each on a cloud platform?",
  ],
  "Distributed Systems": [
    "Explain the CAP theorem. How does a system like Cassandra choose consistency vs availability?",
  ],
  "Data Warehousing": [
    "Explain the difference between a star schema and a snowflake schema. Which is faster for analytics?",
  ],
};

const followUps = [
  "Can you elaborate on the trade-off of that approach?",
  "What would happen at a larger scale — how would your answer change?",
  "Could you think of an edge case where your approach fails?",
  "How would you test or verify that implementation in production?",
];

function uuid() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function makeToken(email) {
  return "tok-" + crypto.createHash("sha256").update(email + Date.now()).digest("hex").slice(0, 24);
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email };
}

// ---------------------------------------------------------------------
// Interview engine (simulated AI)
// ---------------------------------------------------------------------

function pickQuestion(topic, usedTopics) {
  const pool = questionBank[topic] || ["Tell me about a technical problem you solved recently."];
  const q = pool[(usedTopics.get(topic) || 0) % pool.length];
  usedTopics.set(topic, (usedTopics.get(topic) || 0) + 1);
  return { text: q, topic };
}

function createInterviewSession(sessionId, candidate) {
  const session = {
    id: sessionId,
    candidate,
    questionCount: 0,
    coveredDays: new Set(),
    plannedDays: candidate.curriculum.filter((d) => {
      // Plan at least 4 days, prefer weak topics first
      return d;
    }).map((d) => ({ day: d.day, title: d.title, covered: false })),
    questions: [],
    answers: [],
    topicUsage: new Map(),
    usedDays: 0,
    pendingAgenda: candidate.curriculum.slice(),
  };
  sessions.set(sessionId, session);
  return session;
}

// Pick a curriculum day not yet covered, preferring weak topics.
function pickNextDay(session) {
  const available = session.pendingAgenda.filter((d) => !session.coveredDays.has(d.day));
  if (!available.length) return null;
  // Prefer days containing weak topics
  const weak = candidateWeakTopics(session.candidate);
  available.sort((a, b) => {
    const aWeak = a.topics.some((t) => weak.has(t)) ? 0 : 1;
    const bWeak = b.topics.some((t) => weak.has(t)) ? 0 : 1;
    return aWeak - bWeak;
  });
  return available[0];
}

function candidateWeakTopics(candidate) {
  return new Set(candidate.weakTopics);
}

function generateQuestion(session, isFollowUp) {
  const day = pickNextDay(session);
  if (!day) return null;
  // Choose a topic from this day's topics
  const topic = day.topics[Math.floor(Math.random() * day.topics.length)];
  const q = pickQuestion(topic, session.topicUsage);
  return { day: day.day, title: day.title, topic, text: q.text, isFollowUp: !!isFollowUp };
}

function markDayCovered(session, day) {
  if (!session.coveredDays.has(day)) {
    session.coveredDays.add(day);
    const planned = session.plannedDays.find((p) => p.day === day);
    if (planned) planned.covered = true;
  }
}

function buildFeedback(session) {
  const scores = session.answers.map((a) => a.score);
  const avg = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0;

  const technical = Math.min(10, Math.round(4 + avg * 0.5));
  const problem = Math.min(10, Math.round(3.5 + avg * 0.55));
  const clarity = Math.min(10, Math.round(4.5 + avg * 0.45));
  const comm = Math.min(10, Math.round(5 + avg * 0.4));

  const overall = Math.round((technical + problem + clarity + comm) * 2.5);

  // Determine strengths/gaps from topics covered
  const strong = [];
  const gaps = [];
  session.questions.forEach((q, i) => {
    const score = session.answers[i] ? session.answers[i].score : 5;
    if (score >= 7 && !strong.includes(q.topic)) strong.push(q.topic);
    if (score <= 4 && !gaps.includes(q.topic)) gaps.push(q.topic);
  });

  const next = [];
  session.candidate.weakTopics.forEach((t) => {
    if (!gaps.includes(t)) {
      next.push(`Strengthen ${t} with targeted practice problems`);
    }
  });
  if (gaps.length) gaps.forEach((g) => next.push(`Revisit ${g} fundamentals and do 3-4 drills`));
  if (next.length === 0) next.push("Explore advanced system design case studies");

  return {
    overallScore: overall,
    summary: `${session.candidate.name} answered ${session.answers.length} questions across ${session.coveredDays.size} curriculum days. Overall performance is ${overall >= 70 ? "strong" : overall >= 50 ? "developing" : "in need of reinforcement"}.`,
    categories: {
      technicalUnderstanding: technical,
      problemSolving: problem,
      conceptClarity: clarity,
      communication: comm,
    },
    strengths: strong.slice(0, 4),
    gaps: gaps.slice(0, 4),
    next: next.slice(0, 5),
  };
}

function scoreAnswer(answer, topic) {
  const len = answer.trim().length;
  // Heuristic: longer, substantive answers score higher
  let base = 4;
  if (len > 20) base += 1;
  if (len > 60) base += 1;
  if (len > 120) base += 1;
  if (/(because|however|therefore|example|for instance|complexity|O\(|time|space)/i.test(answer)) base += 1;
  if (len > 200) base += 1;
  if (len > 300) base += 1;
  return Math.max(1, Math.min(10, base));
}

// ---------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

function serveStatic(req, res, pathname) {
  let filePath = path.join(ROOT, pathname);
  if (pathname === "/" || pathname === "/index.html") {
    filePath = path.join(ROOT, "index.html");
  }
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // If the specific file is missing, fall back to index.html for SPA routing
      if (pathname === "/style.css") {
        sendJson(res, 404, { error: "style.css not found" });
        return;
      }
      fs.readFile(path.join(ROOT, "index.html"), (e2, html) => {
        if (e2) {
          res.writeHead(500);
          res.end("Server error");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}

// ---------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:" + PORT);
  const { pathname } = url;
  const method = req.method;

  // ---- AUTH ----
  if (pathname === "/api/auth/signup" && method === "POST") {
    try {
      const body = await readJsonBody(req);
      const { name, email, password, confirmPassword } = body;
      if (!name || !email || !password) return sendJson(res, 400, { error: "All fields are required." });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: "Invalid email address." });
      if (password.length < 4) return sendJson(res, 400, { error: "Password must be at least 4 characters." });
      if (password !== confirmPassword) return sendJson(res, 400, { error: "Passwords do not match." });
      if (users.has(email)) return sendJson(res, 409, { error: "An account with this email already exists." });

      const user = { id: "u-" + uuid().slice(0, 8), name, email, password };
      users.set(email, user);
      const token = makeToken(email);
      return sendJson(res, 201, { token, user: publicUser(user) });
    } catch (e) {
      return sendJson(res, 400, { error: "Invalid request body." });
    }
  }

  if (pathname === "/api/auth/login" && method === "POST") {
    try {
      const { email, password } = await readJsonBody(req);
      const user = users.get(email);
      if (!user || user.password !== password) {
        return sendJson(res, 401, { error: "Invalid email or password." });
      }
      const token = makeToken(email);
      return sendJson(res, 200, { token, user: publicUser(user) });
    } catch {
      return sendJson(res, 400, { error: "Invalid request body." });
    }
  }

  if (pathname === "/api/auth/logout" && method === "POST") {
    return sendJson(res, 200, { ok: true });
  }

  // ---- CANDIDATES ----
  if (pathname === "/api/candidates" && method === "GET") {
    const list = candidates.map((c) => ({
      id: c.id,
      name: c.name,
      jobRole: c.jobRole,
      yearsExperience: c.yearsExperience,
      missionsCompleted: c.missionsCompleted,
      commitDays: c.commitDays,
      score: c.score,
      skippedTopics: c.skippedTopics,
      strongTopics: c.strongTopics,
      weakTopics: c.weakTopics,
    }));
    return sendJson(res, 200, { candidates: list });
  }

  const candidateMatch = pathname.match(/^\/api\/candidates\/([^/]+)$/);
  if (candidateMatch && method === "GET") {
    const cand = candidates.find((c) => c.id === candidateMatch[1]);
    if (!cand) return sendJson(res, 404, { error: "Candidate not found." });
    return sendJson(res, 200, { candidate: cand });
  }

  // ---- INTERVIEW ----
  if (pathname === "/api/interview" && method === "POST") {
    try {
      const body = await readJsonBody(req);

      // Case 1: Start a new interview (has candidate + sessionId, no message)
      if (body.candidate && body.sessionId) {
        const session = createInterviewSession(body.sessionId, body.candidate);
        const q = generateQuestion(session, false);
        if (q) {
          session.questions.push(q);
          session.questionCount++;
          markDayCovered(session, q.day);
        }
        const reply = `Let's begin, ${session.candidate.name}. Here's your first question.\n\n${q ? "Q" + session.questionCount + ": " + q.text : "We're ready when you are."}`;
        return sendJson(res, 201, { sessionId: body.sessionId, reply });
      }

      // Case 2: Submit an answer (has sessionId + message)
      if (body.sessionId && body.message) {
        const session = sessions.get(body.sessionId);
        if (!session) return sendJson(res, 404, { error: "Interview session not found." });

        const lastQ = session.questions[session.questions.length - 1];
        const score = scoreAnswer(body.message, lastQ ? lastQ.topic : "General");
        session.answers.push({ questionIndex: session.questions.length - 1, score });

        // Determine if we should do a follow-up or move to the next question
        const totalQuestionTarget = 8;
        const dayTarget = 4;
        const canFollowUp = session.questions.length < 6 && Math.random() < 0.4;
        const daysCoveredOk = session.coveredDays.size >= dayTarget;
        const enoughQuestions = session.questions.length >= totalQuestionTarget;

        if (canFollowUp) {
          const q = generateQuestion(session, true);
          if (q) {
            session.questions.push(q);
            session.questionCount++;
            const reply = `Good answer. Let's dig a little deeper.\n\nQ${session.questionCount}: ${q.text}`;
            return sendJson(res, 200, { reply, done: false });
          }
        }

        // Next main question
        const nextDay = pickNextDay(session);
        const finished = nextDay === null || (enoughQuestions && daysCoveredOk);

        if (finished) {
          const feedback = buildFeedback(session);
          return sendJson(res, 200, { done: true, feedback });
        }

        const q = generateQuestion(session, false);
        if (!q) {
          const feedback = buildFeedback(session);
          return sendJson(res, 200, { done: true, feedback });
        }
        session.questions.push(q);
        session.questionCount++;
        markDayCovered(session, q.day);
        const reply = `Nice work. Next question.\n\nQ${session.questionCount}: ${q.text}`;
        return sendJson(res, 200, { reply, done: false });
      }

      return sendJson(res, 400, { error: "Invalid interview request." });
    } catch (e) {
      console.error("Interview POST error:", e);
      return sendJson(res, 400, { error: "Invalid request body." });
    }
  }

  const interviewGet = pathname.match(/^\/api\/interview\/([^/]+)$/);
  if (interviewGet && method === "GET") {
    const session = sessions.get(interviewGet[1]);
    if (!session) return sendJson(res, 404, { error: "Interview session not found." });

    return sendJson(res, 200, {
      sessionId: session.id,
      questionCount: session.questionCount,
      coveredDays: Array.from(session.coveredDays),
      plannedDays: session.plannedDays,
      questions: session.questions.map((q) => ({ text: q.text, day: q.day, topic: q.topic })),
    });
  }

  const feedbackGet = pathname.match(/^\/api\/interview\/([^/]+)\/feedback$/);
  if (feedbackGet && method === "GET") {
    const session = sessions.get(feedbackGet[1]);
    if (!session) return sendJson(res, 404, { error: "Interview session not found." });

    const qa = session.questions.map((q, i) => {
      const ans = session.answers.find((a) => a.questionIndex === i);
      return {
        day: q.day,
        topic: q.topic,
        question: q.text,
        score: ans ? ans.score : 0,
      };
    });

    return sendJson(res, 200, {
      feedback: buildFeedback(session),
      questionWisePerformance: qa,
    });
  }

  // ---- Static / SPA fallback ----
  if (method === "GET") {
    return serveStatic(req, res, pathname);
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`\n✅ AI Technical Interview Agent is running!`);
  console.log(`   → Open http://localhost:${PORT} in your browser\n`);
  console.log(`   Demo login: demo@interview.ai / demo1234\n`);
});
