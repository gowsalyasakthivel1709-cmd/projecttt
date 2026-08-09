// Mock backend server for the AI Technical Interview Agent.
// Uses only Node.js built-in modules.
// No npm install required.

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = 3000;
const ROOT = __dirname;

// ---------------------------------------------------------------------
// In-memory data
// ---------------------------------------------------------------------

const users = new Map();

// Demo user
users.set("demo@interview.ai", {
  id: "u-demo",
  name: "Demo User",
  email: "demo@interview.ai",
  password: "demo1234",
});

const sessions = new Map();

// ---------------------------------------------------------------------
// MOCK CANDIDATES
// ---------------------------------------------------------------------

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

// ---------------------------------------------------------------------
// QUESTION BANK
// ---------------------------------------------------------------------

const questionBank = {
  Arrays: [
    "Explain how you would iterate over an array and find the maximum sum of a contiguous subarray. What is the time complexity?",
    "How does JavaScript's map differ from forEach on an array? When would you prefer one over the other?",
  ],

  Hashing: [
    "Describe how a hash map works under the hood. What happens on collisions?",
    "Given a large dataset, how would you find the first non-repeating character using a hash map?",
  ],

  "Two Pointers": [
    "Explain the two-pointer technique and give an example where it reduces a naive O(n²) solution to O(n).",
  ],

  "Sliding Window": [
    "Describe the sliding window pattern. Give an example of a problem where it applies and explain the complexity.",
  ],

  SQL: [
    "What is the difference between INNER JOIN and LEFT JOIN? Provide a query example where the choice matters.",
    "How would you optimize a query that is scanning millions of rows? Mention indexes and EXPLAIN.",
  ],

  Databases: [
    "Explain the difference between normalization and denormalization. When would you choose each?",
  ],

  React: [
    "Explain the difference between state and props in React. When does a component re-render?",
    "What is the purpose of useEffect and how does its dependency array work?",
  ],

  "Dynamic Programming": [
    "Explain the concept of dynamic programming. Use the Fibonacci sequence to illustrate memoization vs tabulation.",
    "How would you solve the classic Coin Change problem? Walk through the DP states and transitions.",
  ],

  Graphs: [
    "Explain BFS vs DFS. When would you prefer each for graph traversal?",
  ],

  BFS: [
    "Describe how BFS works and what data structure it relies on. What is its time complexity on a graph?",
  ],

  DFS: [
    "Describe DFS and explain how you'd detect a cycle in a directed graph using it.",
  ],

  "System Design": [
    "How would you design a URL shortener? Cover storage, scaling, and uniqueness of short keys.",
  ],

  Indexing: [
    "Explain how a B-tree index speeds up lookups. What are the trade-offs of adding many indexes?",
  ],

  APIs: [
    "What is idempotency in REST APIs and why does it matter? Give an example.",
    "Explain the difference between PUT and PATCH with examples.",
  ],

  REST: [
    "What are the key constraints of REST? How do you version an API?",
  ],

  Concurrency: [
    "Explain the difference between a thread and a process. How do you avoid race conditions?",
  ],

  Networking: [
    "Explain the OSI model layers. Where does HTTP sit and what does TCP provide?",
  ],

  Caching: [
    "Explain cache eviction policies like LRU. How would you implement an LRU cache?",
  ],

  Redis: [
    "What data structures does Redis provide and how would you use it as a cache layer?",
  ],

  Testing: [
    "Explain unit vs integration tests. What makes a good test suite for a backend service?",
  ],

  "Message Queues": [
    "Explain the difference between a message queue and pub/sub. How do you guarantee at-least-once delivery?",
  ],

  Frontend: [
    "Explain the concept of event delegation in the DOM and why it improves performance.",
  ],

  Python: [
    "Explain Python's GIL and how it affects multithreading. When would you use multiprocessing instead?",
  ],

  Pandas: [
    "How do you apply a function to a Pandas DataFrame column? Explain vectorized vs apply operations.",
  ],

  ETL: [
    "Walk through building an ETL pipeline that ingests daily CSVs. Where do you put validation?",
  ],

  Algorithms: [
    "Explain time vs space complexity trade-offs with a sorting example. When would you choose quicksort over mergesort?",
  ],

  Cloud: [
    "Explain object storage vs block storage. When would you use each on a cloud platform?",
  ],

  "Distributed Systems": [
    "Explain the CAP theorem. How does a system like Cassandra choose consistency vs availability?",
  ],

  "Data Warehousing": [
    "Explain the difference between a star schema and a snowflake schema. Which is faster for analytics?",
  ],
};

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

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function uuid() {
  return crypto.randomUUID();
}

function makeToken(email) {
  return (
    "tok-" +
    crypto
      .createHash("sha256")
      .update(email + Date.now())
      .digest("hex")
      .slice(0, 24)
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

// ---------------------------------------------------------------------
// INTERVIEW ENGINE
// ---------------------------------------------------------------------

function candidateWeakTopics(candidate) {
  return new Set(candidate.weakTopics || []);
}

function pickQuestion(topic, topicUsage) {
  const pool =
    questionBank[topic] || [
      "Tell me about a technical problem you solved recently.",
    ];

  const used = topicUsage.get(topic) || 0;
  const question = pool[used % pool.length];

  topicUsage.set(topic, used + 1);

  return {
    text: question,
    topic,
  };
}

function createInterviewSession(sessionId, candidate) {
  const session = {
    id: sessionId,
    candidate,
    questionCount: 0,
    coveredDays: new Set(),

    plannedDays: candidate.curriculum.map((day) => ({
      day: day.day,
      title: day.title,
      covered: false,
    })),

    questions: [],
    answers: [],
    topicUsage: new Map(),
    pendingAgenda: candidate.curriculum.slice(),
  };

  sessions.set(sessionId, session);

  return session;
}

function pickNextDay(session) {
  const available = session.pendingAgenda.filter(
    (day) => !session.coveredDays.has(day.day)
  );

  if (!available.length) {
    return null;
  }

  const weak = candidateWeakTopics(session.candidate);

  available.sort((a, b) => {
    const aWeak = a.topics.some((topic) => weak.has(topic)) ? 0 : 1;
    const bWeak = b.topics.some((topic) => weak.has(topic)) ? 0 : 1;

    return aWeak - bWeak;
  });

  return available[0];
}

function generateQuestion(session, isFollowUp = false) {
  const day = pickNextDay(session);

  if (!day) {
    return null;
  }

  const topic =
    day.topics[Math.floor(Math.random() * day.topics.length)];

  const question = pickQuestion(topic, session.topicUsage);

  return {
    day: day.day,
    title: day.title,
    topic,
    text: question.text,
    isFollowUp,
  };
}

function markDayCovered(session, day) {
  if (session.coveredDays.has(day)) {
    return;
  }

  session.coveredDays.add(day);

  const planned = session.plannedDays.find(
    (item) => item.day === day
  );

  if (planned) {
    planned.covered = true;
  }
}

// ---------------------------------------------------------------------
// ANSWER SCORING
// ---------------------------------------------------------------------

function scoreAnswer(answer) {
  const text = answer.trim();
  const length = text.length;

  let score = 4;

  if (length > 20) score += 1;
  if (length > 60) score += 1;
  if (length > 120) score += 1;

  if (
    /(because|however|therefore|example|for instance|complexity|time|space)/i.test(
      text
    )
  ) {
    score += 1;
  }

  if (length > 200) score += 1;
  if (length > 300) score += 1;

  return Math.max(1, Math.min(10, score));
}

// ---------------------------------------------------------------------
// FEEDBACK
// ---------------------------------------------------------------------

function buildFeedback(session) {
  const scores = session.answers.map((answer) => answer.score);

  const average = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;

  const technical = Math.min(
    10,
    Math.round(4 + average * 0.5)
  );

  const problem = Math.min(
    10,
    Math.round(3.5 + average * 0.55)
  );

  const clarity = Math.min(
    10,
    Math.round(4.5 + average * 0.45)
  );

  const communication = Math.min(
    10,
    Math.round(5 + average * 0.4)
  );

  const overall = Math.round(
    (technical + problem + clarity + communication) * 2.5
  );

  const strengths = [];
  const gaps = [];

  session.questions.forEach((question, index) => {
    const score = session.answers[index]
      ? session.answers[index].score
      : 5;

    if (score >= 7 && !strengths.includes(question.topic)) {
      strengths.push(question.topic);
    }

    if (score <= 4 && !gaps.includes(question.topic)) {
      gaps.push(question.topic);
    }
  });

  const next = [];

  session.candidate.weakTopics.forEach((topic) => {
    if (!gaps.includes(topic)) {
      next.push(
        `Strengthen ${topic} with targeted practice problems`
      );
    }
  });

  gaps.forEach((topic) => {
    next.push(
      `Revisit ${topic} fundamentals and do 3-4 drills`
    );
  });

  if (next.length === 0) {
    next.push(
      "Explore advanced system design case studies"
    );
  }

  return {
    overallScore: overall,

    summary: `${session.candidate.name} answered ${
      session.answers.length
    } questions across ${
      session.coveredDays.size
    } curriculum days. Overall performance is ${
      overall >= 70
        ? "strong"
        : overall >= 50
        ? "developing"
        : "in need of reinforcement"
    }. `,

    categories: {
      technicalUnderstanding: technical,
      problemSolving: problem,
      conceptClarity: clarity,
      communication,
    },

    strengths: strengths.slice(0, 4),
    gaps: gaps.slice(0, 4),
    next: next.slice(0, 5),
  };
}

// ---------------------------------------------------------------------
// STATIC FILE SERVER
// ---------------------------------------------------------------------

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".ico": "image/x-icon",
};

function serveStatic(req, res, pathname) {
  let filePath;

  if (pathname === "/" || pathname === "/index.html") {
    filePath = path.join(ROOT, "index.html");
  } else {
    filePath = path.join(ROOT, pathname);
  }

  // Security: prevent paths outside project folder
  const normalizedPath = path.normalize(filePath);

  if (!normalizedPath.startsWith(ROOT)) {
    return sendJson(res, 403, {
      error: "Forbidden",
    });
  }

  const extension = path.extname(filePath).toLowerCase();
  const mime = MIME[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (!error) {
      res.writeHead(200, {
        "Content-Type": mime,
      });

      res.end(data);
      return;
    }

    // CSS should return actual 404
    if (pathname === "/style.css") {
      return sendJson(res, 404, {
        error: "style.css not found",
      });
    }

    // SPA fallback
    fs.readFile(
      path.join(ROOT, "index.html"),
      (indexError, html) => {
        if (indexError) {
          res.writeHead(500);
          res.end("Server error");
          return;
        }

        res.writeHead(200, {
          "Content-Type": "text/html",
        });

        res.end(html);
      }
    );
  });
}

// ---------------------------------------------------------------------
// SERVER + API ROUTER
// ---------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(
      req.url,
      `http://localhost:${PORT}`
    );

    const pathname = url.pathname;
    const method = req.method;

    // ================================================================
    // AUTH - SIGNUP
    // ================================================================

    if (
      pathname === "/api/auth/signup" &&
      method === "POST"
    ) {
      try {
        const body = await readJsonBody(req);

        const {
          name,
          email,
          password,
          confirmPassword,
        } = body;

        if (!name || !email || !password) {
          return sendJson(res, 400, {
            error: "All fields are required.",
          });
        }

        if (
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
          return sendJson(res, 400, {
            error: "Invalid email address.",
          });
        }

        if (password.length < 4) {
          return sendJson(res, 400, {
            error:
              "Password must be at least 4 characters.",
          });
        }

        if (password !== confirmPassword) {
          return sendJson(res, 400, {
            error: "Passwords do not match.",
          });
        }

        if (users.has(email)) {
          return sendJson(res, 409, {
            error:
              "An account with this email already exists.",
          });
        }

        const user = {
          id: "u-" + uuid().slice(0, 8),
          name,
          email,
          password,
        };

        users.set(email, user);

        const token = makeToken(email);

        return sendJson(res, 201, {
          token,
          user: publicUser(user),
        });
      } catch (error) {
        return sendJson(res, 400, {
          error: "Invalid request body.",
        });
      }
    }

    // ================================================================
    // AUTH - LOGIN
    // ================================================================

    if (
      pathname === "/api/auth/login" &&
      method === "POST"
    ) {
      try {
        const body = await readJsonBody(req);

        const email = body.email;
        const password = body.password;

        const user = users.get(email);

        if (!user || user.password !== password) {
          return sendJson(res, 401, {
            error: "Invalid email or password.",
          });
        }

        const token = makeToken(email);

        return sendJson(res, 200, {
          token,
          user: publicUser(user),
        });
      } catch (error) {
        return sendJson(res, 400, {
          error: "Invalid request body.",
        });
      }
    }

    // ================================================================
    // AUTH - LOGOUT
    // ================================================================

    if (
      pathname === "/api/auth/logout" &&
      method === "POST"
    ) {
      return sendJson(res, 200, {
        ok: true,
      });
    }

    // ================================================================
    // GET ALL CANDIDATES
    // ================================================================

    if (
      pathname === "/api/candidates" &&
      method === "GET"
    ) {
      const list = candidates.map((candidate) => ({
        id: candidate.id,
        name: candidate.name,
        jobRole: candidate.jobRole,
        yearsExperience: candidate.yearsExperience,
        missionsCompleted: candidate.missionsCompleted,
        commitDays: candidate.commitDays,
        score: candidate.score,
        skippedTopics: candidate.skippedTopics,
        strongTopics: candidate.strongTopics,
        weakTopics: candidate.weakTopics,
      }));

      return sendJson(res, 200, {
        candidates: list,
      });
    }

    // ================================================================
    // GET SINGLE CANDIDATE
    // ================================================================

    const candidateMatch = pathname.match(
      /^\/api\/candidates\/([^/]+)$/
    );

    if (candidateMatch && method === "GET") {
      const candidate = candidates.find(
        (item) => i
