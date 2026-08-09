// AI Technical Interview Agent — frontend SPA (no build step required).
// Hash-based routing. Each render_* function owns one screen.
// No login required — candidates are shown directly.

const App = (() => {
  const root = document.getElementById("app");

  const state = {
    selectedCandidateId: sessionStorage.getItem("selectedCandidateId") || null,
    sessionId: sessionStorage.getItem("interviewSessionId") || null,
    lastFeedback: null,
  };

  function saveState() {
    if (state.selectedCandidateId) sessionStorage.setItem("selectedCandidateId", state.selectedCandidateId);
    if (state.sessionId) sessionStorage.setItem("interviewSessionId", state.sessionId);
  }

  function clearInterviewState() {
    state.sessionId = null;
    sessionStorage.removeItem("interviewSessionId");
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "sid-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function h(strings, ...vals) {
    return strings.reduce((acc, s, i) => acc + s + (vals[i] ?? ""), "");
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  // ---------------------------------------------------------------------
  // Shell / layout
  // ---------------------------------------------------------------------

  function topbar() {
    return h`
      <div class="topbar">
        <div class="brand"><div class="brand-badge">AI</div> Technical Interview Agent</div>
        <div class="topbar-right">
          <a class="btn btn-ghost btn-sm" href="#/candidates">Candidates</a>
        </div>
      </div>`;
  }

  function mount(bodyHtml) {
    root.innerHTML = topbar() + bodyHtml;
  }

  // ---------------------------------------------------------------------
  // Router
  // ---------------------------------------------------------------------

  const routes = {
    "#/candidates": renderCandidates,
    "#/prep": renderPrep,
    "#/interview": renderInterview,
    "#/feedback": renderFeedback,
  };

  function currentRoute() {
    const hash = window.location.hash || "#/candidates";
    const [path] = hash.split("?");
    return routes[path] ? path : null;
  }

  async function router() {
    const path = currentRoute();
    if (!path) {
      navigate("#/candidates");
      return;
    }
    try {
      await routes[path]();
    } catch (err) {
      console.error(err);
      root.innerHTML = h`<div class="container"><div class="banner error">Something went wrong loading this page. Please try again.</div>
        <button class="btn btn-secondary" onclick="window.location.hash='#/candidates'">Back to Candidates</button></div>`;
    }
  }

  window.addEventListener("hashchange", router);
  window.addEventListener("DOMContentLoaded", router);

  // ---------------------------------------------------------------------
  // CANDIDATE SELECTION (with profiles)
  // ---------------------------------------------------------------------

  async function renderCandidates() {
    mount(h`<div class="container"><div class="center-loading"><div class="spinner" style="border-top-color:var(--accent-2);"></div>Loading candidates...</div></div>`);

    let data;
    try {
      data = await Api.get("/api/candidates");
    } catch (err) {
      mount(h`<div class="container"><div class="banner error">${escapeHtml(err.message)}</div></div>`);
      return;
    }

    const candidates = data.candidates || [];

    const cardsHtml = candidates.length
      ? candidates
          .map(
            (c) => h`
        <div class="candidate-card">
          <div class="profile-head">
            <div class="avatar">${escapeHtml((c.name || "?").charAt(0).toUpperCase())}</div>
            <div>
              <h3>${escapeHtml(c.name)}</h3>
              <div class="role">${escapeHtml(c.jobRole)} · ${c.yearsExperience ?? "?"} yrs exp</div>
            </div>
          </div>
          <div class="profile-meta">
            <div class="meta-item"><span class="meta-label">ID</span><span class="meta-value">${escapeHtml(c.id)}</span></div>
            <div class="meta-item"><span class="meta-label">Missions</span><span class="meta-value">${c.missionsCompleted ?? "?"}</span></div>
            <div class="meta-item"><span class="meta-label">Score</span><span class="meta-value score-val">${c.score ?? "?"}/100</span></div>
          </div>
          <div class="tag-row">
            ${(c.strongTopics || []).map((t) => `<span class="tag strong">✓ ${escapeHtml(t)}</span>`).join("")}
            ${(c.weakTopics || []).map((t) => `<span class="tag weak">△ ${escapeHtml(t)}</span>`).join("")}
          </div>
          ${(c.skippedTopics && c.skippedTopics.length) ? h`<div class="skipped-row"><span class="skipped-label">Skipped:</span> ${c.skippedTopics.map((t) => `<span class="tag skipped">✕ ${escapeHtml(t)}</span>`).join("")}</div>` : ""}
          <button class="btn btn-primary btn-sm select-candidate-btn" data-id="${escapeHtml(c.id)}">Select Candidate</button>
        </div>`
          )
          .join("")
      : h`<div class="empty-state">No candidate data is available right now.</div>`;

    mount(
      h`
      <div class="container">
        <div class="section-title">Candidate Profiles</div>
        <div class="card-grid">${cardsHtml}</div>
      </div>`
    );

    document.querySelectorAll(".select-candidate-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedCandidateId = btn.dataset.id;
        saveState();
        navigate("#/prep");
      });
    });
  }

  // ---------------------------------------------------------------------
  // INTERVIEW PREPARATION
  // ---------------------------------------------------------------------

  async function renderPrep() {
    if (!state.selectedCandidateId) {
      navigate("#/candidates");
      return;
    }

    mount(h`<div class="container"><div class="center-loading"><div class="spinner" style="border-top-color:var(--accent-2);"></div>Loading candidate...</div></div>`);

    let data;
    try {
      data = await Api.get(`/api/candidates/${encodeURIComponent(state.selectedCandidateId)}`);
    } catch (err) {
      mount(
        h`<div class="container"><div class="banner error">${escapeHtml(err.message)}</div>
          <button class="btn btn-secondary" onclick="window.location.hash='#/candidates'">Back</button></div>`
      );
      return;
    }

    const c = data.candidate;
    const name = c?.name || "Candidate";

    mount(
      h`
      <div class="container">
        <div class="prep-card">
          <h2>${escapeHtml(name)}</h2>
          <p style="color:var(--text-dim);">Personalized Technical Interview</p>
          <div class="profile-meta" style="margin:14px 0;">
            <div class="meta-item"><span class="meta-label">ID</span><span class="meta-value">${escapeHtml(c.id)}</span></div>
            <div class="meta-item"><span class="meta-label">Missions</span><span class="meta-value">${c.missionsCompleted ?? "?"}</span></div>
            <div class="meta-item"><span class="meta-label">Score</span><span class="meta-value score-val">${c.score ?? "?"}/100</span></div>
          </div>
          ${(c.skippedTopics && c.skippedTopics.length) ? h`<div class="skipped-row" style="margin-bottom:14px;"><span class="skipped-label">Skipped:</span> ${c.skippedTopics.map((t) => `<span class="tag skipped">✕ ${escapeHtml(t)}</span>`).join("")}</div>` : ""}
          <ul class="req-list">
            <li><span class="dot">●</span> Minimum 8 questions, dynamically generated</li>
            <li><span class="dot">●</span> Covers at least 4 different curriculum days</li>
            <li><span class="dot">●</span> Adaptive follow-up questions based on your answers</li>
            <li><span class="dot">●</span> Real-time AI evaluation of every response</li>
          </ul>
          <button class="btn btn-primary btn-block" id="startInterviewBtn">Start Interview</button>
          <button class="btn btn-ghost btn-block" style="margin-top:10px;" onclick="window.location.hash='#/candidates'">Choose a different candidate</button>
          <div class="error-msg" id="prepError"></div>
        </div>
      </div>`
    );

    document.getElementById("startInterviewBtn").addEventListener("click", async () => {
      const btn = document.getElementById("startInterviewBtn");
      btn.disabled = true;
      btn.textContent = "Starting...";
      try {
        const sessionId = uuid();
        const resp = await Api.post("/api/interview", { sessionId, candidate: c }, { auth: false });
        state.sessionId = sessionId;
        saveState();
        state.pendingReply = resp.reply;
        navigate("#/interview");
      } catch (err) {
        document.getElementById("prepError").textContent = err.message || "Could not start the interview.";
        btn.disabled = false;
        btn.textContent = "Start Interview";
      }
    });
  }

  // ---------------------------------------------------------------------
  // MAIN INTERVIEW PAGE
  // ---------------------------------------------------------------------

  async function renderInterview() {
    if (!state.sessionId) {
      navigate("#/candidates");
      return;
    }

    let progress = null;
    try {
      progress = await Api.get(`/api/interview/${state.sessionId}`);
    } catch (err) {
      // If we don't have progress yet (very first render right after start), that's fine.
    }

    const questionText = state.pendingReply || (progress && lastQuestionOf(progress)) || "Loading question...";
    drawInterview(questionText, progress, null);
  }

  function lastQuestionOf(progress) {
    if (!progress || !progress.questions || !progress.questions.length) return null;
    const last = progress.questions[progress.questions.length - 1];
    return `Question ${progress.questionCount}: ${last.text}`;
  }

  function drawInterview(questionText, progress, errorMsg) {
    const qCount = progress ? progress.questionCount : 1;
    const covered = progress ? progress.coveredDays.length : 0;
    const plannedDays = progress ? progress.plannedDays : [];

    mount(
      h`
      <div class="container">
        <div class="interview-layout">
          <div class="interview-main">
            <span class="progress-pill">Question ${qCount} / 8+</span>
            <div class="ai-label">AI Interviewer</div>
            <p class="question-text">${escapeHtml(questionText)}</p>
            ${errorMsg ? `<div class="banner error">${escapeHtml(errorMsg)}</div>` : ""}
            <label for="answerBox">Your Answer</label>
            <textarea id="answerBox" class="answer-box" placeholder="Type your answer here...">${escapeHtml(state.draftAnswer || "")}</textarea>
            <div class="submit-row">
              <button class="btn btn-primary" id="submitBtn">Submit Answer</button>
            </div>
          </div>
          <div class="side-panel">
            <h4>Interview Progress</h4>
            <p style="font-size:0.85rem;color:var(--text-dim);">${covered} / 4+ curriculum days covered</p>
            <div id="coverageList">
              ${
                plannedDays.length
                  ? plannedDays
                      .map(
                        (d) =>
                          `<div class="coverage-item"><span class="${d.covered ? "check" : "pending"}">${d.covered ? "✔" : "●"}</span> Day ${d.day} — ${escapeHtml(d.title)}</div>`
                      )
                      .join("")
                  : `<div class="coverage-item"><span class="pending">●</span> Preparing curriculum plan...</div>`
              }
            </div>
          </div>
        </div>
      </div>`
    );

    document.getElementById("submitBtn").addEventListener("click", () => submitAnswer());
  }

  async function submitAnswer() {
    const textarea = document.getElementById("answerBox");
    const btn = document.getElementById("submitBtn");
    const answer = textarea.value.trim();

    if (!answer) {
      textarea.focus();
      return;
    }

    state.draftAnswer = answer;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Analyzing...`;

    try {
      const resp = await Api.post("/api/interview", { sessionId: state.sessionId, message: answer }, { auth: false });
      state.draftAnswer = "";

      if (resp.done) {
        state.lastFeedback = resp.feedback;
        sessionStorage.setItem("lastCompletedSessionId", state.sessionId);
        clearInterviewState();
        navigate("#/feedback");
        return;
      }

      let progress = null;
      try {
        progress = await Api.get(`/api/interview/${state.sessionId}`);
      } catch {
        /* non-fatal */
      }
      drawInterview(resp.reply, progress, null);
    } catch (err) {
      let progress = null;
      try {
        progress = await Api.get(`/api/interview/${state.sessionId}`);
      } catch {
        /* ignore */
      }
      const currentQuestion = document.querySelector(".question-text")?.textContent || "";
      drawInterview(currentQuestion, progress, "Something went wrong. Your answer is saved. Please try again.");
    }
  }

  // ---------------------------------------------------------------------
  // FEEDBACK PAGE
  // ---------------------------------------------------------------------

  async function renderFeedback() {
    let feedback = state.lastFeedback;

    // Try to enrich with full question-wise performance if we can.
    const lastSid = sessionStorage.getItem("lastCompletedSessionId");

    mount(h`<div class="container"><div class="center-loading"><div class="spinner" style="border-top-color:var(--accent-2);"></div>Generating feedback...</div></div>`);

    if (!feedback) {
      mount(
        h`<div class="container"><div class="empty-state">No completed interview found. Start a new interview to see feedback here.</div>
          <div class="cta-row"><button class="btn btn-primary" onclick="window.location.hash='#/candidates'">Start an Interview</button></div></div>`
      );
      return;
    }

    const categories = feedback.categories || {};
    const overall = feedback.overallScore ?? 0;

    mount(
      h`
      <div class="container">
        <div class="score-hero">
          <div style="font-size:0.9rem;color:var(--text-dim);">Overall Score</div>
          <div class="score-big">${Math.round(overall)} / 100</div>
          <p style="max-width:640px;margin:14px auto 0;color:var(--text-dim);">${escapeHtml(feedback.summary || "")}</p>
        </div>

        <div class="category-grid">
          ${categoryCard("Technical Understanding", categories.technicalUnderstanding)}
          ${categoryCard("Problem Solving", categories.problemSolving)}
          ${categoryCard("Concept Clarity", categories.conceptClarity)}
          ${categoryCard("Communication", categories.communication)}
        </div>

        <div class="two-col">
          <div class="list-card">
            <h4>Strong Areas</h4>
            <ul>${(feedback.strengths || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("") || "<li>—</li>"}</ul>
          </div>
          <div class="list-card">
            <h4>Areas to Improve</h4>
            <ul>${(feedback.gaps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("") || "<li>—</li>"}</ul>
          </div>
        </div>

        <div class="list-card" style="margin-bottom:20px;">
          <h4>Recommended Learning Topics</h4>
          <ul>${(feedback.next || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("") || "<li>—</li>"}</ul>
        </div>

        <div class="list-card" id="qaCard">
          <h4>Question-wise Performance</h4>
          <div id="qaList"><p style="color:var(--text-dim);font-size:0.85rem;">Loading detail...</p></div>
        </div>

        <div class="cta-row">
          <button class="btn btn-secondary" onclick="window.location.hash='#/candidates'">Restart Interview (New Candidate)</button>
          <button class="btn btn-ghost" onclick="window.location.hash='#/candidates'">Back to Candidates</button>
        </div>
      </div>
      <footer class="foot">AI Technical Interview Agent · Hackathon Build</footer>
      `
    );

    if (lastSid) {
      try {
        const detail = await Api.get(`/api/interview/${lastSid}/feedback`);
        const qaEl = document.getElementById("qaList");
        if (qaEl && detail.questionWisePerformance) {
          qaEl.innerHTML = detail.questionWisePerformance
            .map(
              (q, i) => h`
            <div class="qa-item">
              <div class="qa-meta"><span>Q${i + 1}</span><span>Day ${q.day}</span><span>${escapeHtml(q.topic || "")}</span><span class="qa-score">${q.score}/10</span></div>
              <div style="font-size:0.88rem;">${escapeHtml(q.question)}</div>
            </div>`
            )
            .join("");
        }
      } catch {
        const qaEl = document.getElementById("qaList");
        if (qaEl) qaEl.innerHTML = `<p style="color:var(--text-dim);font-size:0.85rem;">Detail unavailable.</p>`;
      }
    }
  }

  function categoryCard(label, val) {
    return h`<div class="category-card"><div style="font-size:0.8rem;color:var(--text-dim);">${label}</div><div class="val">${val ?? "-"} / 10</div></div>`;
  }

  return { navigate };
})();
