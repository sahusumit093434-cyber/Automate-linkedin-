const STORAGE_KEY = "jobflow-ai-v1";

const defaultProfile = {
  name: "Sumit Sahu",
  email: "sahusumit490@gmail.com",
  phone: "+91 7847903434",
  linkedin: "https://www.linkedin.com/in/sumit-sahu-07320b292/",
  minimumSalary: 6,
  expectedSalary: 10,
  remoteOnly: true,
  roles: ["Software Developer", "AI/ML Engineer", "Full-Stack Developer", "AI Product Engineer"],
  skills: ["Python", "JavaScript", "TypeScript", "React", "Node.js", "Express", "FastAPI", "MongoDB", "RAG", "LLM", "LanceDB", "BM25", "REST APIs", "PySpark", "Pandas", "NumPy", "SciPy", "Git", "pytest", "Vitest", "Playwright"]
};

let state = loadState();
let selectedJobId = state.jobs[0]?.id || null;
let currentDraftTab = "summary";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.profile && Array.isArray(saved.jobs)) return saved;
  } catch (_) {}
  return { profile: defaultProfile, jobs: [] };
}

function saveState(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (message) showToast(message);
  renderAll();
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function normalize(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9+#.]/g, " ").replace(/\s+/g, " ").trim();
}

function skillAliases(skill) {
  const aliases = {
    "node.js": ["node.js", "nodejs", "node js"],
    "rest apis": ["rest api", "restful api", "rest apis"],
    "rag": ["rag", "retrieval augmented generation", "retrieval-augmented generation"],
    "llm": ["llm", "large language model", "generative ai", "genai"],
    "react": ["react", "react.js", "reactjs"],
    "mongodb": ["mongodb", "mongo db"],
    "fastapi": ["fastapi", "fast api"]
  };
  return aliases[normalize(skill)] || [normalize(skill)];
}

function analyzeJob(raw) {
  const corpus = normalize(`${raw.role} ${raw.description}`);
  const matchedSkills = state.profile.skills.filter((skill) => skillAliases(skill).some((alias) => corpus.includes(alias)));
  const missingSignals = ["AWS", "Azure", "Docker", "Kubernetes", "SQL", "TensorFlow", "PyTorch", "LangChain"]
    .filter((skill) => normalize(raw.description).includes(normalize(skill)) && !state.profile.skills.some((item) => normalize(item) === normalize(skill)));

  const roleTerms = state.profile.roles.flatMap((role) => normalize(role).split(" ").filter((term) => term.length > 2));
  const roleHits = [...new Set(roleTerms.filter((term) => corpus.includes(term)))];
  const roleScore = Math.min(25, roleHits.length * 6.25);
  const skillScore = Math.min(40, (matchedSkills.length / Math.max(6, Math.min(10, state.profile.skills.length))) * 40);
  const salaryMin = Number(raw.salaryMin) || 0;
  const salaryMax = Number(raw.salaryMax) || 0;
  const salaryKnown = salaryMin > 0 || salaryMax > 0;
  const salaryBest = salaryMax || salaryMin;
  const salaryScore = !salaryKnown ? 5 : salaryBest >= Number(state.profile.minimumSalary) ? 15 : 0;
  const remoteScore = raw.workMode === "Remote" ? 15 : raw.workMode === "Hybrid" ? 7 : 0;
  const posted = raw.postedAt ? new Date(raw.postedAt) : null;
  const daysOld = posted && !Number.isNaN(posted.valueOf()) ? (Date.now() - posted.getTime()) / 86400000 : null;
  const freshnessScore = daysOld === null ? 2 : daysOld <= 30 ? 5 : daysOld <= 60 ? 3 : 0;
  let score = Math.round(roleScore + skillScore + salaryScore + remoteScore + freshnessScore);

  const blockers = [];
  if (salaryKnown && salaryBest < Number(state.profile.minimumSalary)) blockers.push(`Salary is below ${state.profile.minimumSalary} LPA.`);
  if (state.profile.remoteOnly && raw.workMode !== "Remote") blockers.push("This is not a remote role.");
  if (/\b(3|4|5|6)\+?\s*(years|yrs)\b/i.test(raw.description)) blockers.push("The description may require experienced candidates.");
  if (blockers.length) score = Math.min(score, 59);

  const recommendation = blockers.length || score < 60 ? "Skip" : score >= 75 ? "Apply" : "Review";
  return { score, matchedSkills, missingSignals, blockers, recommendation, salaryKnown };
}

function buildDrafts(job) {
  const skills = job.analysis.matchedSkills.slice(0, 6);
  const skillText = skills.length ? skills.join(", ") : "software development and problem solving";
  const aiRole = /ai|machine learning|rag|llm/i.test(`${job.role} ${job.description}`);
  const projectProof = aiRole
    ? "My projects include VitalTrack, an evidence-grounded RAG application using LanceDB, hosted embeddings, BM25 retrieval and citation validation; AI ScamShield, which integrates LLM analysis with a secure MERN application; and a Python FMCW radar-processing pipeline."
    : "My projects include secure React and Node.js applications, FastAPI and REST services, MongoDB-backed products, a tested PySpark data pipeline and a Python radar-processing system.";

  return {
    summary: `AI-focused software developer with hands-on experience building retrieval-augmented, full-stack and data-processing applications. Verified strengths relevant to this role include ${skillText}. Built secure APIs, tested data pipelines and user-facing products with an emphasis on clear evidence, validation and maintainable implementation.`,
    cover: `Dear Hiring Team,\n\nI am applying for the ${job.role} position at ${job.company}. I have hands-on project experience in ${skillText}.\n\n${projectProof}\n\nThe role's focus aligns well with my experience building working software across frontend, backend, data and AI integration. I would welcome the opportunity to discuss how my project experience and learning agility could contribute to ${job.company}.\n\nThank you for considering my application.\n\nSincerely,\n${state.profile.name}`,
    recruiter: `Hello,\n\nI'm interested in the ${job.role} opening at ${job.company}. My relevant project experience includes ${skillText}. ${aiRole ? "I have built an evidence-grounded RAG application, an LLM-integrated security product and a tested Python signal-processing pipeline." : "I have built full-stack products, secure APIs and tested data-processing systems."}\n\nWould you be open to reviewing my profile for this position?\n\nRegards,\n${state.profile.name}`,
    checklist: `Before submitting\n\n- Confirm the role is remote and open to candidates in India.\n- Verify compensation is at least ${state.profile.minimumSalary} LPA.\n- Upload the tailored resume.\n- Check that every application answer is truthful.\n- Review the company name, role title and contact details.\n- Submit manually on LinkedIn or the employer's official site.\n- Return here and mark the application Submitted.`
  };
}

function renderMetrics() {
  const counts = {
    total: state.jobs.length,
    approved: state.jobs.filter((job) => job.status === "Approved").length,
    submitted: state.jobs.filter((job) => job.status === "Submitted").length,
    strong: state.jobs.filter((job) => job.analysis.score >= 75).length
  };
  $("#metricGrid").innerHTML = [
    ["Jobs reviewed", counts.total, "All sources"],
    ["Strong matches", counts.strong, "Score 75 or higher"],
    ["Approved", counts.approved, "Ready for manual submit"],
    ["Submitted", counts.submitted, "Tracked applications"]
  ].map(([label, value, note]) => `<article class="metric"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join("");
}

function filteredJobs() {
  const query = normalize($("#jobSearch")?.value || "");
  const status = $("#statusFilter")?.value || "all";
  return state.jobs.filter((job) => (!query || normalize(`${job.company} ${job.role}`).includes(query)) && (status === "all" || job.status === status));
}

function statusClass(status) {
  return status.toLowerCase().replace("needs ", "");
}

function salaryLabel(job) {
  if (!job.analysis.salaryKnown) return "Salary unverified";
  if (job.salaryMin && job.salaryMax) return `${job.salaryMin}-${job.salaryMax} LPA`;
  return `${job.salaryMax || job.salaryMin} LPA`;
}

function renderJobList() {
  const jobs = filteredJobs();
  if (!jobs.length) {
    $("#jobList").innerHTML = `<div class="empty-state"><div><strong>${state.jobs.length ? "No jobs match this filter" : "Your opportunity inbox is empty"}</strong><p>Paste a LinkedIn or company-careers vacancy to score it against your verified profile.</p><button class="button primary" onclick="openJobDialog()">Add your first job</button></div></div>`;
    return;
  }
  $("#jobList").innerHTML = jobs.map((job) => `
    <button class="job-card ${job.id === selectedJobId ? "active" : ""}" data-job-id="${job.id}">
      <div class="job-card-top"><div><h3>${escapeHtml(job.role)}</h3><p>${escapeHtml(job.company)}</p></div><span class="score">${job.analysis.score}</span></div>
      <div class="job-card-bottom"><span>${escapeHtml(job.workMode)} · ${escapeHtml(job.source)}</span><span class="status-pill ${statusClass(job.status)}">${job.status}</span></div>
    </button>`).join("");
  $$(".job-card").forEach((button) => button.addEventListener("click", () => { selectedJobId = button.dataset.jobId; currentDraftTab = "summary"; renderAll(); }));
}

function renderDetail() {
  const job = state.jobs.find((item) => item.id === selectedJobId);
  if (!job) {
    $("#jobDetail").innerHTML = `<div class="empty-state"><div><strong>Select a job to inspect</strong><p>Matching evidence, risks and application drafts will appear here.</p></div></div>`;
    return;
  }
  const drafts = buildDrafts(job);
  const matched = job.analysis.matchedSkills.map((skill) => `<span class="chip">${escapeHtml(skill)}</span>`).join("") || `<span class="tag">No direct keyword matches</span>`;
  const missing = job.analysis.missingSignals.map((skill) => `<span class="chip missing">${escapeHtml(skill)}</span>`).join("");
  const risks = job.analysis.blockers.length ? job.analysis.blockers.join(" ") : "No hard blocker detected. Confirm degree, work authorization and salary requirements before applying.";
  const approved = job.status === "Approved" || job.status === "Submitted";
  $("#jobDetail").innerHTML = `
    <div class="detail-title-row"><div><p class="eyebrow">${escapeHtml(job.analysis.recommendation)} recommendation</p><h2>${escapeHtml(job.role)}</h2><p>${escapeHtml(job.company)} · ${escapeHtml(job.workMode)}</p></div><span class="score">${job.analysis.score}</span></div>
    <div class="detail-actions">
      ${job.status !== "Approved" && job.status !== "Submitted" ? `<button class="button primary" data-action="approve">Approve package</button>` : ""}
      ${approved && job.status !== "Submitted" ? `<button class="button primary" data-action="submitted">Mark submitted</button>` : ""}
      <a class="button ghost" href="${escapeHtml(job.url)}" target="_blank" rel="noopener">Open job posting</a>
      ${job.status !== "Skipped" ? `<button class="button danger" data-action="skip">Skip</button>` : `<button class="button ghost" data-action="restore">Restore</button>`}
    </div>
    <div class="signal-grid">
      <div class="signal"><span>Salary</span><strong>${escapeHtml(salaryLabel(job))}</strong></div>
      <div class="signal"><span>Source</span><strong>${escapeHtml(job.source)}</strong></div>
      <div class="signal"><span>Status</span><strong>${escapeHtml(job.status)}</strong></div>
    </div>
    <div class="insight"><h3>Match evidence</h3><div class="chip-row">${matched}</div>${missing ? `<h3 style="margin-top:16px">Unverified requirements</h3><div class="chip-row">${missing}</div>` : ""}</div>
    <div class="insight"><h3>Risks and checks</h3><p>${escapeHtml(risks)}</p></div>
    <div class="package-heading"><div><p class="eyebrow">Prepared package</p><h3>Application drafts</h3></div><button class="button ghost" data-action="copy">Copy draft</button></div>
    <div class="package-tabs">
      ${[["summary","Resume summary"],["cover","Cover letter"],["recruiter","Recruiter message"],["checklist","Checklist"]].map(([key,label]) => `<button class="package-tab ${currentDraftTab === key ? "active" : ""}" data-draft-tab="${key}">${label}</button>`).join("")}
    </div>
    <div class="draft-box" id="draftBox">${escapeHtml(drafts[currentDraftTab])}</div>`;

  $$('[data-action]').forEach((button) => button.addEventListener("click", () => handleJobAction(job.id, button.dataset.action, drafts[currentDraftTab])));
  $$('[data-draft-tab]').forEach((button) => button.addEventListener("click", () => { currentDraftTab = button.dataset.draftTab; renderDetail(); }));
}

function handleJobAction(id, action, draft) {
  const job = state.jobs.find((item) => item.id === id);
  if (!job) return;
  if (action === "approve") job.status = "Approved";
  if (action === "submitted") job.status = "Submitted";
  if (action === "skip") job.status = "Skipped";
  if (action === "restore") job.status = "Needs review";
  if (action === "copy") {
    navigator.clipboard.writeText(draft).then(() => showToast("Draft copied to clipboard")).catch(() => showToast("Select and copy the draft manually"));
    return;
  }
  job.updatedAt = new Date().toISOString();
  saveState(`Job marked ${job.status}`);
}

function renderTracker() {
  const body = $("#trackerBody");
  if (!state.jobs.length) {
    body.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div><strong>No applications tracked yet</strong><p>Add a job to begin your pipeline.</p></div></div></td></tr>`;
    return;
  }
  body.innerHTML = [...state.jobs].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).map((job) => `
    <tr><td><strong>${escapeHtml(job.company)}</strong><span>${escapeHtml(job.role)}</span></td><td>${escapeHtml(job.source)}</td><td><strong>${job.analysis.score}/100</strong></td><td>${escapeHtml(salaryLabel(job))}</td><td><span class="status-pill ${statusClass(job.status)}">${job.status}</span></td><td>${new Date(job.updatedAt).toLocaleDateString()}</td></tr>`).join("");
}

function renderProfile() {
  const form = $("#profileForm");
  Object.entries(state.profile).forEach(([key, value]) => {
    if (!form.elements[key]) return;
    if (key === "roles" || key === "skills") form.elements[key].value = value.join(", ");
    else if (key === "remoteOnly") form.elements[key].checked = value;
    else form.elements[key].value = value;
  });
}

function renderAll() {
  renderMetrics();
  renderJobList();
  renderDetail();
  renderTracker();
  renderProfile();
}

function openJobDialog() {
  $("#jobForm").reset();
  $("#jobDialog").showModal();
}
window.openJobDialog = openJobDialog;

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function switchView(view) {
  $$(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  $$(".view").forEach((item) => item.classList.remove("active"));
  $(`#${view}View`).classList.add("active");
  const headings = {
    jobs: ["Remote job pipeline", "Job workspace"],
    tracker: ["Application history", "Application tracker"],
    profile: ["Verified candidate data", "Candidate profile"]
  };
  $("#viewEyebrow").textContent = headings[view][0];
  $("#viewTitle").textContent = headings[view][1];
  $("#addJobButton").style.display = view === "jobs" ? "inline-flex" : "none";
}

$("#addJobButton").addEventListener("click", openJobDialog);
$$(".nav-item").forEach((item) => item.addEventListener("click", () => switchView(item.dataset.view)));
$("#jobSearch").addEventListener("input", renderJobList);
$("#statusFilter").addEventListener("change", renderJobList);

$("#jobForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const analysis = analyzeJob(values);
  const job = {
    ...values,
    id: crypto.randomUUID(),
    salaryMin: Number(values.salaryMin) || 0,
    salaryMax: Number(values.salaryMax) || 0,
    analysis,
    status: "Needs review",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.jobs.unshift(job);
  selectedJobId = job.id;
  currentDraftTab = "summary";
  $("#jobDialog").close();
  saveState(`Analyzed ${job.role} at ${job.company}`);
});

$("#profileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  state.profile = {
    ...state.profile,
    ...values,
    minimumSalary: Number(values.minimumSalary) || 0,
    expectedSalary: Number(values.expectedSalary) || 0,
    remoteOnly: event.currentTarget.elements.remoteOnly.checked,
    roles: values.roles.split(",").map((item) => item.trim()).filter(Boolean),
    skills: values.skills.split(",").map((item) => item.trim()).filter(Boolean)
  };
  state.jobs = state.jobs.map((job) => ({ ...job, analysis: analyzeJob(job), updatedAt: new Date().toISOString() }));
  saveState("Profile and job scores updated");
});

$("#exportButton").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `jobflow-export-${new Date().toISOString().slice(0,10)}.json`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
});

$("#importInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!imported.profile || !Array.isArray(imported.jobs)) throw new Error("Invalid JobFlow file");
    state = imported;
    selectedJobId = state.jobs[0]?.id || null;
    saveState("Application data imported");
  } catch (error) {
    showToast(error.message || "Could not import this file");
  } finally {
    event.target.value = "";
  }
});

renderAll();
