const STORAGE_KEY = "database-final-prep-progress";

const executionEligibleIds = new Set([
  "views-1",
  "views-2",
  "views-3",
  "views-4",
  "views-5",
  "views-6",
  "views-7",
  "views-8",
  "views-9",
  "views-10",
  "views-11",
  "views-12",
  "views-13",
  "views-14",
  "views-15",
  "views-16",
  "views-17",
  "views-18",
  "views-19",
  "views-20",
]);

const state = {
  page: document.body.dataset.page || "home",
  pageModule: document.body.dataset.module || "All",
  filter: "All",
  progress: loadProgress(),
  timer: {
    totalSeconds: 45 * 60,
    remainingSeconds: 45 * 60,
    running: false,
    intervalId: null,
  },
  mockPaper: [],
  sqlRuntime: {
    ready: false,
    loading: false,
    SQL: null,
  },
};

function getCurrentScopeExercises() {
  return state.pageModule === "All"
    ? exercises
    : exercises.filter((exercise) => exercise.module === state.pageModule);
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (error) {
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
}

function getVisibleExercises() {
  if (state.filter === "All") return exercises;
  return exercises.filter((exercise) => exercise.module === state.filter);
}

function getDifficultyClass(difficulty) {
  return difficulty === "Core"
    ? "easy"
    : difficulty === "Stretch"
      ? "medium"
      : "hard";
}

function normalizeAnswer(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatRichText(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<strong class="inline-term">$1</strong>')
    .replace(/\n/g, "<br>");
}

function runChecks(answer, exercise) {
  const normalized = normalizeAnswer(answer);
  const missing = exercise.checks.filter((snippet) => !normalized.includes(snippet.toLowerCase()));

  if (!normalized) {
    return {
      verdict: "No answer yet. Write a draft before using the structure checker.",
      tone: "warning",
    };
  }

  if (missing.length === 0) {
    return {
      verdict: `Structure looks good. You included the expected key elements for this ${exercise.module} task.`,
      tone: "success",
    };
  }

  return {
    verdict: `Partial match. Still missing: ${missing.join(", ")}.`,
    tone: "warning",
  };
}

function updateProgressSummary() {
  const title = document.getElementById("progress-title");
  const detail = document.getElementById("progress-detail");
  const fill = document.getElementById("progress-fill");
  if (!title || !detail || !fill) return;

  const scopedExercises = getCurrentScopeExercises();
  const scopedIds = new Set(scopedExercises.map((exercise) => exercise.id));
  const scopedEntries = Object.entries(state.progress).filter(([id]) => scopedIds.has(id)).map(([, value]) => value);
  const solvedCount = scopedEntries.filter((entry) => entry?.solved).length;
  const attemptedCount = scopedEntries.filter((entry) => entry?.answer?.trim()).length;

  title.textContent = `${solvedCount} of ${scopedExercises.length} solved`;
  detail.textContent =
    attemptedCount === 0
      ? "No attempts saved yet."
      : `${attemptedCount} exercises have saved drafts in local storage.`;
  fill.style.width = `${scopedExercises.length ? (solvedCount / scopedExercises.length) * 100 : 0}%`;
}

function renderFilters() {
  const row = document.getElementById("filter-row");
  if (!row) return;
  row.innerHTML = "";

  exerciseModules.forEach((module) => {
    const button = document.createElement("button");
    button.className = `filter-chip ${state.filter === module ? "active" : ""}`;
    button.type = "button";
    button.textContent = module;
    button.addEventListener("click", () => {
      state.filter = module;
      renderFilters();
      renderExercises();
    });
    row.appendChild(button);
  });
}

function preprocessSql(sql) {
  return sql
    .replace(/create\s+or\s+replace\s+view\s+([a-z_][a-z0-9_]*)\s+as/gi, "drop view if exists $1; create view $1 as")
    .replace(/::\s*[a-z_][a-z0-9_]*/gi, "")
    .replace(/substring\(\s*([^)]+?)\s+from\s+(\d+)\s+for\s+(\d+)\s*\)/gi, "substr($1, $2, $3)");
}

function createFreshDb() {
  const db = new state.sqlRuntime.SQL.Database();
  db.run(seedSql);
  return db;
}

function renderResultTable(container, results) {
  if (!results.length) {
    container.innerHTML = '<div class="empty-table">Statement ran successfully. No rows returned.</div>';
    return;
  }

  const first = results[0];
  const header = first.columns.map((column) => `<th>${column}</th>`).join("");
  const rows = first.values
    .map((row) => `<tr>${row.map((cell) => `<td>${cell ?? "NULL"}</td>`).join("")}</tr>`)
    .join("");

  container.innerHTML = `
    <table class="result-table">
      <thead>
        <tr>${header}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function serialiseResults(results) {
  if (!results.length) return JSON.stringify([]);
  return JSON.stringify(
    results.map((result) => ({
      columns: result.columns,
      values: [...result.values].map((row) => [...row]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    }))
  );
}

function inferViewName(sql) {
  const match = sql.match(/create\s+(?:or\s+replace\s+)?view\s+([a-z_][a-z0-9_]*)/i);
  return match ? match[1] : null;
}

async function ensureSqlRuntime() {
  if (state.sqlRuntime.ready || state.sqlRuntime.loading) return;

  state.sqlRuntime.loading = true;
  const status = document.getElementById("lab-status");
  if (status) status.textContent = "Loading SQL engine...";

  try {
    state.sqlRuntime.SQL = await initSqlJs({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`,
    });
    state.sqlRuntime.ready = true;
    if (status) status.textContent = "SQL engine ready. You can run queries and execution-backed view exercises.";
  } catch (error) {
    if (status) status.textContent = `Failed to load SQL engine: ${error.message}`;
  } finally {
    state.sqlRuntime.loading = false;
  }
}

function updateExecutionMessage(box, message, success) {
  box.classList.remove("hidden");
  box.textContent = message;
  box.style.borderColor = success ? "rgba(57, 208, 200, 0.28)" : "rgba(255, 125, 125, 0.28)";
  box.style.background = success ? "rgba(57, 208, 200, 0.08)" : "rgba(255, 125, 125, 0.08)";
}

function executeExerciseSql(exercise, answer, outputBox) {
  if (!state.sqlRuntime.ready) {
    updateExecutionMessage(outputBox, "SQL engine is not ready yet.", false);
    return;
  }

  if (!answer.trim()) {
    updateExecutionMessage(outputBox, "Write a SQL answer before running execution checks.", false);
    return;
  }

  try {
    const candidateDb = createFreshDb();
    const solutionDb = createFreshDb();
    const candidateSql = preprocessSql(answer);
    const expectedSql = preprocessSql(exercise.solution);

    candidateDb.run(candidateSql);
    solutionDb.run(expectedSql);

    const viewName = inferViewName(answer) || inferViewName(exercise.solution);
    if (!viewName) {
      updateExecutionMessage(outputBox, "Could not determine which view to validate.", false);
      return;
    }

    const query = `select * from ${viewName};`;
    const candidateResults = candidateDb.exec(query);
    const expectedResults = solutionDb.exec(query);

    if (serialiseResults(candidateResults) === serialiseResults(expectedResults)) {
      updateExecutionMessage(outputBox, "Execution check passed. Your SQL produced the expected result set on the seeded database.", true);
    } else {
      updateExecutionMessage(outputBox, "Execution ran, but the result set did not match the expected output on the seeded database.", false);
    }
  } catch (error) {
    updateExecutionMessage(outputBox, `Execution failed: ${error.message}`, false);
  }
}

function runLabSql() {
  const status = document.getElementById("lab-status");
  const resultNode = document.getElementById("lab-results");
  const input = document.getElementById("lab-sql").value;
  if (!status || !resultNode) return;

  if (!state.sqlRuntime.ready) {
    status.textContent = "SQL engine is not ready yet.";
    return;
  }

  try {
    const db = createFreshDb();
    const results = db.exec(preprocessSql(input));
    renderResultTable(resultNode, results);
    status.textContent = "SQL executed successfully against a fresh seeded database.";
  } catch (error) {
    status.textContent = `SQL error: ${error.message}`;
    resultNode.innerHTML = '<div class="empty-table">No result table available because the statement failed.</div>';
  }
}

function createExerciseCard(exercise) {
  const template = document.getElementById("exercise-template");
  const node = template.content.firstElementChild.cloneNode(true);
  const saved = state.progress[exercise.id] || { answer: "", solved: false };

  node.classList.toggle("solved", saved.solved);
  node.querySelector(".exercise-module").textContent = exercise.module;
  node.querySelector(".exercise-title").textContent = exercise.title;
  node.querySelector(".exercise-prompt").innerHTML = formatRichText(exercise.prompt);
  node.querySelector(".exercise-details").innerHTML =
    `${formatRichText(exercise.details)} <strong>Exam note:</strong> ${formatRichText(exercise.examTip)}`;

  const difficultyTag = node.querySelector(".difficulty-tag");
  difficultyTag.textContent = exercise.difficulty;
  difficultyTag.classList.add(getDifficultyClass(exercise.difficulty));

  const attemptState = node.querySelector(".attempt-state");
  attemptState.textContent = saved.solved ? "Solved" : saved.answer ? "Draft saved" : "Unstarted";

  const textarea = node.querySelector("textarea");
  textarea.value = saved.answer || "";
  textarea.placeholder =
    exercise.module === "Python + Psycopg"
      ? "Write your Python/Psycopg snippet here..."
      : "Write your SQL or PLpgSQL answer here...";

  textarea.addEventListener("input", (event) => {
    const nextAnswer = event.target.value;
    const entry = state.progress[exercise.id] || { solved: false };
    state.progress[exercise.id] = {
      ...entry,
      answer: nextAnswer,
    };
    saveProgress();
    attemptState.textContent = nextAnswer.trim()
      ? entry.solved
        ? "Solved"
        : "Draft saved"
      : entry.solved
        ? "Solved"
        : "Unstarted";
    updateProgressSummary();
  });

  const feedback = node.querySelector(".feedback-box");
  feedback.classList.add("hidden");

  const executionBox = node.querySelector(".execution-box");
  const hintBox = node.querySelector(".hint-box");
  hintBox.innerHTML = formatRichText(exercise.hint);

  const solutionBox = node.querySelector(".solution-box");
  solutionBox.querySelector("code").textContent = exercise.solution;

  node.querySelector(".check-button").addEventListener("click", () => {
    const result = runChecks(textarea.value, exercise);
    feedback.classList.remove("hidden");
    feedback.textContent = result.verdict;
    feedback.style.borderColor =
      result.tone === "success" ? "rgba(57, 208, 200, 0.28)" : "rgba(255, 179, 71, 0.24)";
    feedback.style.background =
      result.tone === "success" ? "rgba(57, 208, 200, 0.08)" : "rgba(255, 179, 71, 0.08)";
  });

  const executeButton = node.querySelector(".execute-button");
  if (executionEligibleIds.has(exercise.id)) {
    executeButton.classList.remove("hidden");
    executeButton.addEventListener("click", () => executeExerciseSql(exercise, textarea.value, executionBox));
  }

  node.querySelector(".hint-button").addEventListener("click", () => {
    hintBox.classList.toggle("hidden");
  });

  node.querySelector(".solution-button").addEventListener("click", () => {
    solutionBox.classList.toggle("hidden");
  });

  node.querySelector(".solve-button").addEventListener("click", () => {
    const current = state.progress[exercise.id] || { answer: textarea.value, solved: false };
    const nextSolved = !current.solved;
    state.progress[exercise.id] = {
      ...current,
      answer: textarea.value,
      solved: nextSolved,
    };
    saveProgress();
    node.classList.toggle("solved", nextSolved);
    attemptState.textContent = nextSolved ? "Solved" : textarea.value.trim() ? "Draft saved" : "Unstarted";
    updateProgressSummary();
  });

  return node;
}

function renderExercises() {
  const container = document.getElementById("exercise-groups");
  const groupTemplate = document.getElementById("group-template");
  if (!container || !groupTemplate) {
    updateProgressSummary();
    return;
  }
  container.innerHTML = "";

  const visible = state.pageModule === "All"
    ? getVisibleExercises()
    : exercises.filter((exercise) => exercise.module === state.pageModule);
  const modulesToShow =
    state.pageModule === "All"
      ? state.filter === "All"
        ? Object.keys(moduleMeta)
        : [state.filter]
      : [state.pageModule];

  modulesToShow.forEach((moduleName) => {
    const moduleExercises = visible.filter((exercise) => exercise.module === moduleName);
    if (moduleExercises.length === 0) return;

    const groupNode = groupTemplate.content.firstElementChild.cloneNode(true);
    const list = groupNode.querySelector(".exercise-list");
    groupNode.querySelector(".group-label").textContent = moduleName;
    groupNode.querySelector(".group-title").textContent = moduleMeta[moduleName].title;
    groupNode.querySelector(".group-summary").innerHTML = formatRichText(moduleMeta[moduleName].summary);

    moduleExercises.forEach((exercise) => {
      list.appendChild(createExerciseCard(exercise));
    });

    container.appendChild(groupNode);
  });

  updateProgressSummary();
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateTimerUI() {
  const display = document.getElementById("timer-display");
  const status = document.getElementById("timer-status");
  const toggle = document.getElementById("toggle-timer");
  if (!display || !status || !toggle) return;

  display.textContent = formatTime(state.timer.remainingSeconds);
  toggle.textContent = state.timer.running ? "Pause timer" : "Start timer";
  status.textContent = state.timer.running
    ? "Timer running. Work the paper without opening solutions."
    : state.mockPaper.length
      ? "Timer paused. Resume when you are ready."
      : "Timer idle. Generate a paper, then start the clock.";
}

function stopTimer() {
  if (state.timer.intervalId) {
    clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }
  state.timer.running = false;
  updateTimerUI();
}

function startTimer() {
  if (state.timer.running) return;
  state.timer.running = true;
  state.timer.intervalId = window.setInterval(() => {
    if (state.timer.remainingSeconds <= 1) {
      state.timer.remainingSeconds = 0;
      stopTimer();
      const timerStatus = document.getElementById("timer-status");
      if (timerStatus) {
        timerStatus.textContent = "Time is up. Review your gaps before checking solutions.";
      }
      return;
    }
    state.timer.remainingSeconds -= 1;
    updateTimerUI();
  }, 1000);
  updateTimerUI();
}

function resetTimerFromSelection() {
  const minutesSelect = document.getElementById("mock-minutes");
  if (!minutesSelect) return;
  const minutes = Number(minutesSelect.value);
  state.timer.totalSeconds = minutes * 60;
  state.timer.remainingSeconds = state.timer.totalSeconds;
  stopTimer();
  updateTimerUI();
}

function sampleWithoutReplacement(items, count) {
  const pool = [...items];
  const selected = [];
  while (pool.length && selected.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }
  return selected;
}

function generateMockPaper() {
  const sizeNode = document.getElementById("mock-size");
  const focusNode = document.getElementById("mock-focus");
  if (!sizeNode || !focusNode) return;
  const size = Number(sizeNode.value);
  const focus = focusNode.value;
  const sourcePool = focus === "All" ? exercises : exercises.filter((exercise) => exercise.module === focus);

  if (focus === "All") {
    const byModule = Object.keys(moduleMeta).map((moduleName) => exercises.filter((exercise) => exercise.module === moduleName));
    const baseCount = Math.floor(size / byModule.length);
    const remainder = size % byModule.length;
    let selected = [];

    byModule.forEach((group, index) => {
      const take = baseCount + (index < remainder ? 1 : 0);
      selected = selected.concat(sampleWithoutReplacement(group, take));
    });

    if (selected.length < size) {
      const leftovers = exercises.filter((exercise) => !selected.some((picked) => picked.id === exercise.id));
      selected = selected.concat(sampleWithoutReplacement(leftovers, size - selected.length));
    }

    state.mockPaper = selected;
  } else {
    state.mockPaper = sampleWithoutReplacement(sourcePool, size);
  }

  resetTimerFromSelection();
  renderMockPaper();
}

function renderMockPaper() {
  const container = document.getElementById("mock-paper");
  if (!container) return;
  container.innerHTML = "";

  if (!state.mockPaper.length) {
    const empty = document.createElement("div");
    empty.className = "mock-question";
    empty.textContent = "No mock paper generated yet.";
    container.appendChild(empty);
    updateTimerUI();
    return;
  }

  state.mockPaper.forEach((exercise, index) => {
    const card = document.createElement("article");
    card.className = "mock-question";
    card.innerHTML = `
      <p class="section-label">${exercise.module}</p>
      <h3>Question ${index + 1}. ${exercise.title}</h3>
      <p>${formatRichText(exercise.prompt)}</p>
      <p class="muted-text">${formatRichText(exercise.details)}</p>
    `;
    container.appendChild(card);
  });

  updateTimerUI();
}

function populateMockFocus() {
  const select = document.getElementById("mock-focus");
  if (!select) return;
  select.innerHTML = "";

  const options = state.pageModule === "All"
    ? ["All", ...Object.keys(moduleMeta)]
    : [state.pageModule];

  options.forEach((moduleName) => {
    const option = document.createElement("option");
    option.value = moduleName;
    option.textContent = moduleName === "All" ? "Balanced paper" : moduleName;
    select.appendChild(option);
  });
}

function bindMockControls() {
  const generateButton = document.getElementById("generate-mock");
  const toggleButton = document.getElementById("toggle-timer");
  const resetButton = document.getElementById("reset-timer");
  const minutesSelect = document.getElementById("mock-minutes");
  if (!generateButton || !toggleButton || !resetButton || !minutesSelect) return;

  generateButton.addEventListener("click", generateMockPaper);

  toggleButton.addEventListener("click", () => {
    if (state.timer.running) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  resetButton.addEventListener("click", resetTimerFromSelection);
  minutesSelect.addEventListener("change", resetTimerFromSelection);
}

function bindReset() {
  const resetButton = document.getElementById("reset-progress");
  if (!resetButton) return;

  resetButton.addEventListener("click", () => {
    if (state.pageModule === "All") {
      state.progress = {};
    } else {
      exercises
        .filter((exercise) => exercise.module === state.pageModule)
        .forEach((exercise) => {
          delete state.progress[exercise.id];
        });
    }
    saveProgress();
    renderExercises();
    renderMockPaper();
    updateProgressSummary();
  });
}

function bindSqlLab() {
  const runButton = document.getElementById("run-lab-sql");
  const resetButton = document.getElementById("reset-lab-db");
  const results = document.getElementById("lab-results");
  const status = document.getElementById("lab-status");
  if (!runButton || !resetButton || !results || !status) return;

  runButton.addEventListener("click", runLabSql);
  resetButton.addEventListener("click", () => {
    results.innerHTML = '<div class="empty-table">Database reset. Ready for another query.</div>';
    status.textContent = "The next run will start from a fresh seeded database.";
  });
}

function highlightNav() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === path) {
      link.classList.add("active");
    }
  });
}

async function init() {
  highlightNav();
  populateMockFocus();
  renderFilters();
  renderExercises();
  renderMockPaper();
  bindMockControls();
  bindReset();
  bindSqlLab();
  updateTimerUI();
  if (document.getElementById("lab-status") || executionEligibleIds.size > 0) {
    await ensureSqlRuntime();
  }
}

init();
