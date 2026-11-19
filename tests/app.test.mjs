import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function createAppContext() {
  const elements = new Map();
  const makeElement = () => ({
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {} },
    click() {},
    close() {},
    elements: new Proxy({}, { get: () => null }),
    files: [],
    innerHTML: "",
    reset() {},
    showModal() {},
    style: {},
    textContent: "",
    value: ""
  });
  const document = {
    createElement: makeElement,
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, makeElement());
      return elements.get(selector);
    },
    querySelectorAll() { return []; }
  };
  const storage = new Map();
  const context = {
    Blob,
    Date,
    FormData: class {},
    URL,
    crypto,
    document,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => storage.delete(key),
      setItem: (key, value) => storage.set(key, value)
    },
    navigator: { clipboard: { writeText: async () => {} } },
    setTimeout: () => 1,
    clearTimeout() {}
  };
  context.window = { confirm: () => true };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL("../dist/app.js", import.meta.url), "utf8"), context);
  return context;
}

function analyze(context, overrides = {}) {
  const job = {
    company: "Example",
    role: "Software Development Engineer",
    description: "Python JavaScript React MongoDB REST APIs Git fresher role",
    salaryMin: 6,
    salaryMax: 10,
    workMode: "Remote",
    postedAt: "",
    ...overrides
  };
  context.__job = job;
  return vm.runInContext("analyzeJob(__job)", context);
}

test("unknown salary requires review", () => {
  const result = analyze(createAppContext(), { salaryMin: 0, salaryMax: 0 });
  assert.equal(result.recommendation, "Review");
  assert.match(result.reviewFlags[0], /unverified/i);
});

test("salary range uses its guaranteed lower bound", () => {
  const result = analyze(createAppContext(), { salaryMin: 4, salaryMax: 10 });
  assert.equal(result.recommendation, "Skip");
  assert.match(result.blockers.join(" "), /below 6 LPA/i);
});

test("non-remote role is blocked", () => {
  const result = analyze(createAppContext(), { workMode: "Hybrid" });
  assert.equal(result.recommendation, "Skip");
  assert.match(result.blockers.join(" "), /not a remote role/i);
});

test("experienced and senior roles are blocked for a fresher", () => {
  const context = createAppContext();
  assert.equal(analyze(context, { description: "Requires 2-4 years of Python experience" }).recommendation, "Skip");
  assert.equal(analyze(context, { role: "Senior Software Engineer" }).recommendation, "Skip");
});

test("only HTTP and HTTPS job links are allowed", () => {
  const context = createAppContext();
  context.__url = "javascript:alert(1)";
  assert.equal(vm.runInContext("safeHttpUrl(__url)", context), "");
  context.__url = "https://example.com/job/1";
  assert.equal(vm.runInContext("safeHttpUrl(__url)", context), "https://example.com/job/1");
});

test("skill matching uses complete terms rather than substrings", () => {
  const context = createAppContext();
  const result = analyze(context, { description: "Build digital products with Python" });
  assert.equal(result.matchedSkills.includes("Git"), false);
  assert.equal(result.matchedSkills.includes("Python"), true);
});

test("discovery accepts India-compatible remote locations only", () => {
  const context = createAppContext();
  context.__location = "Worldwide";
  assert.equal(vm.runInContext("isIndiaEligible(__location)", context), true);
  context.__location = "India / APAC";
  assert.equal(vm.runInContext("isIndiaEligible(__location)", context), true);
  context.__location = "USA only";
  assert.equal(vm.runInContext("isIndiaEligible(__location)", context), false);
});

test("salary parser only converts explicit INR and LPA values", () => {
  const context = createAppContext();
  context.__salary = "₹800000 - ₹1200000 per year";
  assert.deepEqual({ ...vm.runInContext("parseSalaryLpa(__salary)", context) }, { min: 8, max: 12 });
  context.__salary = "$80,000 - $120,000";
  assert.deepEqual({ ...vm.runInContext("parseSalaryLpa(__salary)", context) }, { min: 0, max: 0 });
});

test("imports reject executable URLs and normalize statuses", () => {
  const context = createAppContext();
  const base = {
    profile: {
      roles: ["Software Developer"],
      skills: ["Python"],
      minimumSalary: 6,
      expectedSalary: 10,
      remoteOnly: true
    },
    jobs: [{
      company: "Example",
      role: "Developer",
      description: "Python fresher",
      url: "https://example.com/job",
      source: "LinkedIn",
      workMode: "Remote",
      status: "<img src=x onerror=alert(1)>",
      salaryMin: 6,
      salaryMax: 10
    }]
  };
  context.__imported = base;
  const normalized = vm.runInContext("validateImportedState(__imported)", context);
  assert.equal(normalized.jobs[0].status, "Needs review");
  base.jobs[0].url = "javascript:alert(1)";
  assert.throws(() => vm.runInContext("validateImportedState(__imported)", context), /valid required fields/);
});
