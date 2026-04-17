let token = localStorage.getItem("token");
let currentRepo = null;

let currentView = "code";

let openTabs = [];
let activeTab = null;

/* ---------------- ORGS ---------------- */
async function loadOrgs() {
  const res = await fetch("/api/orgs", {
    headers: { Authorization: token }
  });

  const data = await res.json();

  const box = document.getElementById("orgList");
  box.innerHTML = "";

  data.forEach(o => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerText = o.login;
    box.appendChild(div);
  });
}

/* ---------------- REPOS ---------------- */
async function loadRepos() {
  const res = await fetch("/api/repos", {
    headers: { Authorization: token }
  });

  const data = await res.json();

  const box = document.getElementById("repoList");
  box.innerHTML = "";

  data.forEach(r => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerText = r.name;

    div.onclick = () => loadTree(r.owner.login, r.name);

    box.appendChild(div);
  });
}

/* ---------------- TREE ---------------- */
async function loadTree(owner, repo) {
  currentRepo = { owner, repo };

  document.getElementById("repoTitle").innerText = repo;

  const res = await fetch(
    `/api/tree?owner=${owner}&repo=${repo}&token=${token}`
  );

  const data = await res.json();

  const tree = document.getElementById("tree");
  tree.innerHTML = "";

  data.tree.forEach(f => {
    if (f.type === "blob") {
      const div = document.createElement("div");
      div.className = "item";
      div.innerText = f.path;
      div.onclick = () => openFile(f.path);
      tree.appendChild(div);
    }
  });

  renderView();
}

/* ---------------- FILE OPEN (TABS) ---------------- */
async function openFile(path) {
  let existing = openTabs.find(t => t.path === path);
  if (existing) return setActiveTab(path);

  const res = await fetch(
    `/api/file?owner=${currentRepo.owner}&repo=${currentRepo.repo}&path=${path}&token=${token}`
  );

  const data = await res.json();

  openTabs.push({
    path,
    content: data.content,
    sha: data.sha,
    dirty: false
  });

  setActiveTab(path);
  renderTabs();
}

/* ---------------- TABS ---------------- */
function renderTabs() {
  const bar = document.getElementById("tabsBar");
  bar.innerHTML = "";

  openTabs.forEach(tab => {
    const div = document.createElement("div");
    div.className = "tab";

    if (tab.path === activeTab) div.classList.add("active");

    div.innerHTML = `${tab.path}${tab.dirty ? " *" : ""} <span class="closeTab">x</span>`;

    div.onclick = () => setActiveTab(tab.path);

    div.querySelector(".closeTab").onclick = (e) => {
      e.stopPropagation();
      closeTab(tab.path);
    };

    bar.appendChild(div);
  });
}

function setActiveTab(path) {
  const tab = openTabs.find(t => t.path === path);
  if (!tab) return;

  activeTab = path;

  document.getElementById("editor").value = tab.content;
  document.getElementById("fileName").innerText = tab.path;

  renderTabs();
}

function closeTab(path) {
  openTabs = openTabs.filter(t => t.path !== path);

  if (activeTab === path) {
    activeTab = openTabs[0]?.path || null;

    if (activeTab) setActiveTab(activeTab);
    else {
      document.getElementById("editor").value = "";
      document.getElementById("fileName").innerText = "No file";
    }
  }

  renderTabs();
}

/* ---------------- EDIT TRACKING ---------------- */
document.getElementById("editor").addEventListener("input", () => {
  const tab = openTabs.find(t => t.path === activeTab);
  if (!tab) return;

  tab.content = document.getElementById("editor").value;
  tab.dirty = true;

  renderTabs();
});

/* ---------------- SAVE ---------------- */
async function saveFile() {
  const msg = document.getElementById("commitMsg").value;
  const tab = openTabs.find(t => t.path === activeTab);

  if (!tab || !msg) return;

  await fetch("/api/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      owner: currentRepo.owner,
      repo: currentRepo.repo,
      path: tab.path,
      message: msg,
      content: tab.content,
      sha: tab.sha
    })
  });

  tab.dirty = false;
  renderTabs();
}

/* ---------------- DELETE ---------------- */
async function deleteFile() {
  const tab = openTabs.find(t => t.path === activeTab);
  if (!tab) return;

  await fetch("/api/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      owner: currentRepo.owner,
      repo: currentRepo.repo,
      path: tab.path,
      sha: tab.sha
    })
  });

  closeTab(tab.path);
}

/* ---------------- RENAME ---------------- */
async function renameFileInline() {
  const tab = openTabs.find(t => t.path === activeTab);
  if (!tab) return;

  const newPath = prompt("New name:");
  if (!newPath || newPath === tab.path) return;

  await fetch("/api/rename", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      owner: currentRepo.owner,
      repo: currentRepo.repo,
      oldPath: tab.path,
      newPath,
      content: tab.content,
      sha: tab.sha
    })
  });

  closeTab(tab.path);
}

/* ---------------- CREATE FILE ---------------- */
async function createFile() {
  const path = prompt("File name:");
  if (!path) return;

  const msg = prompt("Commit message:");
  if (!msg) return;

  await fetch("/api/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      owner: currentRepo.owner,
      repo: currentRepo.repo,
      path,
      message: msg,
      content: "",
      sha: null
    })
  });

  loadTree(currentRepo.owner, currentRepo.repo);
}

/* ---------------- NAV SYSTEM ---------------- */
function setView(view, event) {
  currentView = view;

  document.querySelectorAll(".navItem").forEach(n => {
    n.classList.remove("active");
  });

  if (event) event.target.classList.add("active");

  renderView();
}

/* ---------------- PHASE 5 REAL CONTENT VIEWS ---------------- */
async function renderView() {
  const tree = document.getElementById("tree");
  const editor = document.getElementById("editorPanel");

  // CODE VIEW (IDE)
  if (currentView === "code") {
    tree.style.display = "block";
    editor.style.display = "flex";
    return;
  }

  tree.style.display = "none";
  editor.style.display = "flex";

  /* ---------------- ISSUES ---------------- */
  if (currentView === "issues") {
    const res = await fetch(
      `https://api.github.com/repos/${currentRepo.owner}/${currentRepo.repo}/issues`,
      { headers: { Authorization: token } }
    );

    const issues = await res.json();

    document.getElementById("editor").value =
      issues.length
        ? issues.map(i => `#${i.number} ${i.title}`).join("\n")
        : "No issues found";
    return;
  }

  /* ---------------- PULL REQUESTS ---------------- */
  if (currentView === "pulls") {
    const res = await fetch(
      `https://api.github.com/repos/${currentRepo.owner}/${currentRepo.repo}/pulls`,
      { headers: { Authorization: token } }
    );

    const pulls = await res.json();

    document.getElementById("editor").value =
      pulls.length
        ? pulls.map(p => `PR #${p.number} ${p.title}`).join("\n")
        : "No pull requests";
    return;
  }

  /* ---------------- ACTIONS (SIMULATED) ---------------- */
  if (currentView === "actions") {
    document.getElementById("editor").value =
      "Recent activity:\n- Repo opened\n- File edits committed\n- Tabs system active\n- Void pipeline running";
    return;
  }

  /* ---------------- SETTINGS ---------------- */
  if (currentView === "settings") {
    document.getElementById("editor").value =
      `Repo Settings:\n- Owner: ${currentRepo.owner}\n- Repo: ${currentRepo.repo}\n- Mode: Void Studios IDE\n- Branch: main`;
    return;
  }

  /* ---------------- DEFAULT ---------------- */
  document.getElementById("editor").value =
    `${currentView} coming soon`;
}