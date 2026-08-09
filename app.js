// AI Technical Interview Agent — frontend SPA
// Hash-based routing. No build step required.

const App = (() => {
  const root = document.getElementById("app");

  const state = {
    selectedCandidateId:
      sessionStorage.getItem("selectedCandidateId") || null,

    sessionId:
      sessionStorage.getItem("interviewSessionId") || null,

    lastFeedback: null,
    pendingReply: null,
    draftAnswer: "",
  };

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------

  function saveState() {
    if (state.selectedCandidateId) {
      sessionStorage.setItem(
        "selectedCandidateId",
        state.selectedCandidateId
      );
    }

    if (state.sessionId) {
      sessionStorage.setItem(
        "interviewSessionId",
        state.sessionId
      );
    }
  }

  function clearInterviewState() {
    state.sessionId = null;
    state.pendingReply = null;
    state.draftAnswer = "";

    sessionStorage.removeItem("interviewSessionId");
  }

  // ------------------------------------------------------------
  // NAVIGATION
  // ------------------------------------------------------------

  function navigate(hash) {
    window.location.hash = hash;
  }

  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return (
      "sid-" +
      Date.now() +
      "-" +
      Math.random().toString(16).slice(2)
    );
  }

  // ------------------------------------------------------------
  // HTML HELPERS
  // ------------------------------------------------------------

  function h(strings, ...values) {
    return strings.reduce(
      (result, string, index) =>
        result + string + (values[index] ?? ""),
      ""
    );
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  // ------------------------------------------------------------
  // LAYOUT
  // ------------------------------------------------------------

  function topbar() {
    return `
      <div class="topbar">
        <div class="brand">
          <div class="brand-badge">AI</div>
          Technical Interview Agent
        </div>

        <div class="topbar-right">
          <a class="btn btn-ghost btn-sm" href="#/candidates">
            Candidates
          </a>
        </div>
      </div>
    `;
  }

  function mount(bodyHtml) {
    if (!root) {
      console.error("Element #app was not found.");
      return;
    }

    root.innerHTML = topbar() + bodyHtml;
  }

  // ------------------------------------------------------------
  // ROUTER
  // ------------------------------------------------------------

  const routes = {
    "#/candidates": renderCandidates,
    "#/prep": renderPrep,
    "#/interview": renderInterview,
    "#/feedback": renderFeedback,
  };

  function currentRoute() {
    const hash = window.location.hash || "#/candidates";
    const path = hash.split("?")[0];

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
    } catch (error) {
      console.error("Router error:", error);

      mount(`
        <div class="container">
          <div class="banner error">
            Something went wrong loading this page.
          </div>

          <button
            class="btn btn-secondary"
            onclick="window.location.hash='#/candidates'"
          >
            Back to Candidates
          </button>
        </div>
      `);
    }
  }

  // ------------------------------------------------------------
  // CANDIDATES
  // ------------------------------------------------------------

  async function renderCandidates() {
    mount(`
      <div class="container">
        <div class="center-loading">
          <div
            class="spinner"
            style="border-top-color:var(--accent-2);"
          ></div>
          Loading candidates...
        </div>
      </div>
    `);

    let data;

    try {
      data = await Api.get("/api/candidates");
    } catch (error) {
      mount(`
        <div class="container">
          <div class="banner error">
            ${escapeHtml(error.message)}
          </div>
        </div>
      `);
      return;
    }

    const candidates = Array.isArray(data?.candidates)
      ? data.candidates
      : [];

    const cardsHtml = candidates.length
      ? candidates
          .map((candidate) => {
            const name = candidate.name || "Unknown";
            const firstLetter = name.charAt(0).toUpperCase();

            const strongTopics = Array.isArray(candidate.strongTopics)
              ? candidate.strongTopics
              : [];

            const weakTopics = Array.isArray(candidate.weakTopics)
              ? candidate.weakTopics
              : [];

            const skippedTopics = Array.isArray(candidate.skippedTopics)
              ? candidate.skippedTopics
              : [];

            return `
              <div class="candidate-card">

                <div class="profile-head">
                  <div class="avatar">
                    ${escapeHtml(firstLetter)}
                  </div>

                  <div>
                    <h3>${escapeHtml(name)}</h3>

                    <div class="role">
                      ${escapeHtml(candidate.jobRole || "Candidate")}
                      ·
                      ${candidate.yearsExperience ?? "?"} yrs exp
                    </div>
                  </div>
                </div>

                <div class="profile-meta">

                  <div class="meta-item">
                    <span class="meta-label">ID</span>
                    <span class="meta-value">
                      ${escapeHtml(candidate.id || "-")}
                    </span>
                  </div>

                  <div class="meta-item">
                    <span class="meta-label">Missions</span>
                    <span class="meta-value">
                      ${candidate.missionsCompleted ?? "?"}
                    </span>
                  </div>

                  <div class="meta-item">
                    <span class="meta-label">Score</span>
                    <span class="meta-value score-val">
                      ${candidate.score ?? "?"}/100
                    </span>
                  </div>

                </div>

                <div class="tag-row">
                  ${strongTopics
                    .map(
                      (topic) =>
                        `<span class="tag strong">✓ ${escapeHtml(topic)}</span>`
                    )
                    .join("")}

                  ${weakTopics
                    .map(
                      (topic) =>
                        `<span class="tag weak">△ ${escapeHtml(topic)}</span>`
                    )
                    .join("")}
                </div>

                ${
                  skippedTopics.length
                    ? `
                      <div class="skipped-row">
                        <span class="skipped-label">Skipped:</span>

                        ${skippedTopics
                          .map(
                            (topic) =>
                              `<span class="tag skipped">
                                ✕ ${escapeHtml(topic)}
                              </span>`
                          )
                          .join("")}
                      </div>
                    `
                    : ""
                }

                <button
                  class="btn btn-primary btn-sm select-candidate-btn"
                  data-id="${escapeHtml(candidate.id || "")}"
                >
                  Select Candidate
                </button>

              </div>
            `;
          })
          .join("")
      : `
        <div class="empty-state">
          No candidate data is available right now.
        </div>
      `;

    mount(`
      <div class="container">

        <div class="section-title">
          Candidate Profiles
        </div>

        <div class="card-grid">
          ${cardsHtml}
        </div>

      </div>
    `);

    document
      .querySelectorAll(".select-candidate-btn")
      .forEach((button) => {
        button.addEventListener("click", () => {
          state.selectedCandidateId = button.dataset.id;
          saveState();

          navigate("#/prep");
        });
      });
  }

  // ------------------------------------------------------------
  // PREPARATION
  // ------------------------------------------------------------

  async function renderPrep() {
    if (!state.selectedCandidateId) {
      navigate("#/candidates");
      return;
    }

    mount(`
      <div class="container">
        <div class="center-loading">
          <div
            class="spinner"
            style="border-top-color:var(--accent-2);"
          ></div>
          Loading candidate...
        </div>
      </div>
    `);

    let data;

    try {
      data = await Api.get(
        `/api/candidates/${encodeURIComponent(
          state.selectedCandidateId
        )}`
      );
    } catch (error) {
      mount(`
        <div class="container">
          <div class="banner error">
            ${escapeHtml(error.message)}
          </div>

          <button
            class="btn btn-secondary"
            onclick="window.location.hash='#/candidates'"
          >
            Back
          </button>
        </div>
      `);

      return;
    }

    const candidate = data?.candidate;

    if (!candidate) {
      mount(`
        <div class="container">
          <div class="banner error">
            Candidate information was not found.
          </div>

          <button
            class="btn btn-secondary"
            onclick="window.location.hash='#/candidates'"
          >
            Back to Candidates
          </button>
        </div>
      `);

      return;
    }

    const skippedTopics = Array.isArray(candidate.skippedTopics)
      ? candidate.skippedTopics
      : [];

    mount(`
      <div class="container">

        <div class="prep-card">

          <h2>${escapeHtml(candidate.name || "Candidate")}</h2>

          <p style="color:var(--text-dim);">
            Personalized Technical Interview
          </p>

          <div class="profile-meta" style="margin:14px 0;">

            <div class="meta-item">
              <span class="meta-label">ID</span>
              <span class="meta-value">
                ${escapeHtml(candidate.id || "-")}
              </span>
            </div>

            <div class="meta-item">
              <span class="meta-label">Missions</span>
              <span class="meta-value">
                ${candidate.missionsCompleted ?? "?"}
              </span>
            </div>

            <div class="meta-item">
              <span class="meta-label">Score</span>
              <span class="meta-value score-val">
                ${candidate.score ?? "?"}/100
              </span>
            </div>

          </div>

          ${
            skippedTopics.length
              ? `
                <div
                  class="skipped-row"
                  style="margin-bottom:14px;"
                >
                  <span class="skipped-label">Skipped:</span>

                  ${skippedTopics
                    .map(
                      (topic) =>
                        `<span class="tag skipped">
                          ✕ ${escapeHtml(topic)}
                        </span>`
                    )
                    .join("")}
                </div>
              `
              : ""
          }

          <ul class="req-list">
            <li>
              <span class="dot">●</span>
              Minimum 8 questions, dynamically generated
            </li>

            <li>
              <span class="dot">●</span>
              Covers at least 4 different curriculum days
            </li>

            <li>
              <span class="dot">●</span>
              Adaptive follow-up questions based on your answers
            </li>

            <li>
              <span class="dot">●</span>
              Real-time AI evaluation of every response
            </li>
          </ul>

          <button
            class="btn btn-primary btn-block"
            id="startInterviewBtn"
          >
            Start Interview
          </button>

          <button
            class="btn btn-ghost btn-block"
            id="changeCandidateBtn"
            style="margin-top:10px;"
          >
            Choose a different candidate
          </button>

          <div class="error-msg" id="prepError"></div>

        </div>

      </div>
    `);

    document
      .getElementById("changeCandidateBtn")
      .addEventListener("click", () => {
        navigate("#/candidates");
      });

    document
      .getElementById("startInterviewBtn")
      .addEventListener("click", async () => {
        const button =
          document.getElementById("startInterviewBtn");

        const errorElement =
          document.getElementById("prepError");

        button.disabled = true;
        button.textContent = "Starting...";
        errorElement.textContent = "";

        try {
          const sessionId = uuid();

          const response = await Api.post(
            "/api/interview",
            {
              sessionId,
              candidate,
            },
            {
              auth: false,
            }
          );

          state.sessionId = sessionId;
          state.pendingReply = response?.reply || null;

          saveState();

          navigate("#/interview");
        } catch (error) {
          console.error("Start interview error:", error);

          errorElement.textContent =
            error.message ||
            "Could not start the interview.";

          button.disabled = false;
          button.textContent = "Start Interview";
        }
      });
  }

  // ------------------------------------------------------------
  // INTERVIEW
  // ------------------------------------------------------------

  async function renderInterview() {
    if (!state.sessionId) {
      navigate("#/candidates");
      return;
    }

    let progress = null;

    try {
      progress = await Api.get(
        `/api/interview/${encodeURIComponent(state.sessionId)}`
      );
    } catch (error) {
      console.warn("Progress unavailable:", error);
    }

    const questionText =
      state.pendingReply ||
      lastQuestionOf(progress) ||
      "Loading question...";

    drawInterview(questionText, progress, null);
  }

  function lastQuestionOf(progress) {
    if (
      !progress ||
      !Array.isArray(progress.questions) ||
      progress.questions.length === 0
    ) {
      return null;
    }

    const last =
      progress.questions[progress.questions.length - 1];

    const count =
      progress.questionCount ||
      progress.questions.length;

    return `Question ${count}: ${last.text || ""}`;
  }

  function drawInterview(questionText, progress, errorMsg) {
    const questionCount =
      progress?.questionCount || 1;

    const coveredDays = Array.isArray(progress?.coveredDays)
      ? progress.coveredDays.length
      : 0;

    const plannedDays = Array.isArray(progress?.plannedDays)
      ? progress.plannedDays
      : [];

    mount(`
      <div class="container">

        <div class="interview-layout">

          <div class="interview-main">

            <span class="progress-pill">
              Question ${questionCount} / 8+
            </span>

            <div class="ai-label">
              AI Interviewer
            </div>

            <p class="question-text">
              ${escapeHtml(questionText)}
            </p>

            ${
              errorMsg
                ? `
                  <div class="banner error">
                    ${escapeHtml(errorMsg)}
                  </div>
                `
                : ""
            }

            <label for="answerBox">
              Your Answer
            </label>

            <textarea
              id="answerBox"
              class="answer-box"
              placeholder="Type your answer here..."
            >${escapeHtml(state.draftAnswer)}</textarea>

            <div class="submit-row">
              <button
                class="btn btn-primary"
                id="submitBtn"
              >
                Submit Answer
              </button>
            </div>

          </div>

          <div class="side-panel">

            <h4>
              Interview Progress
            </h4>

            <p
              style="
                font-size:0.85rem;
                color:var(--text-dim);
              "
            >
              ${coveredDays} / 4+ curriculum days covered
            </p>

            <div id="coverageList">

              ${
                plannedDays.length
                  ? plannedDays
                      .map(
                        (day) => `
                          <div class="coverage-item">
                            <span
                              class="${
                                day.covered
                                  ? "check"
                                  : "pending"
                              }"
                            >
                              ${day.covered ? "✔" : "●"}
                            </span>

                            Day ${escapeHtml(day.day)}

                            —

                            ${escapeHtml(day.title || "")}
                          </div>
                        `
                      )
                      .join("")
                  : `
                    <div class="coverage-item">
                      <span class="pending">●</span>
                      Preparing curriculum plan...
                    </div>
                  `
              }

            </div>

          </div>

        </div>

      </div>
    `);

    const submitButton =
      document.getElementById("submitBtn");

    if (submitButton) {
      submitButton.addEventListener(
        "click",
        submitAnswer
      );
    }
  }

  // ------------------------------------------------------------
  // SUBMIT ANSWER
  // ------------------------------------------------------------

  async function submitAnswer() {
    const textarea =
      document.getElementById("answerBox");

    const button =
      document.getElementById("submitBtn");

    if (!textarea || !button || !state.sessionId) {
      return;
    }

    const answer = textarea.value.trim();

    if (!answer) {
      textarea.focus();
      return;
    }

    state.draftAnswer = answer;

    button.disabled = true;
    button.innerHTML =
      `<span class="spinner"></span> Analyzing...`;

    try {
      const response = await Api.post(
        "/api/interview",
        {
          sessionId: state.sessionId,
          message: answer,
        },
        {
          auth: false,
        }
      );

      state.draftAnswer = "";

      if (response?.done) {
        state.lastFeedback =
          response.feedback || null;

        sessionStorage.setItem(
          "lastCompletedSessionId",
          state.sessionId
        );

        clearInterviewState();

        navigate("#/feedback");
        return;
      }

      let progress = null;

      try {
        progress = await Api.get(
          `/api/interview/${encodeURIComponent(
            state.sessionId
          )}`
        );
      } catch (error) {
        console.warn(
          "Could not refresh progress:",
          error
        );
      }

      state.pendingReply =
        response?.reply || "Please continue.";

      drawInterview(
        state.pendingReply,
        pro
