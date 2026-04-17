let token = localStorage.getItem("token");
let currentRepo = null;
let currentFile = null;

// ---------------- ORGS ----------------
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

// ---------------- REPOS ----------------
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

// ---------------- TREE ----------------
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
}

// ---------------- OPEN FILE ----------------
async function openFile(path) {
  const res = await fetch(
    `/api/file?owner=${currentRepo.owner}&repo=${currentRepo.repo}&path=${path}&token=${token}`
  );

  const data = await res.json();

  document.getElementById("editor").value = data.content;
  document.getElementById("fileName").innerText = path;

  currentFile = { path, sha: data.sha };
}

// ---------------- SAVE ----------------
async function saveFile() {
  await fetch("/api/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      owner: currentRepo.owner,
      repo: currentRepo.repo,
      path: currentFile.path,
      message: "Void edit",
      content: document.getElementById("editor").value,
      sha: currentFile.sha
    })
  });

  alert("Saved 🔥");
}

// ---------------- DELETE ----------------
async function deleteFile() {
  await fetch("/api/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      owner: currentRepo.owner,
      repo: currentRepo.repo,
      path: currentFile.path,
      sha: currentFile.sha,
      message: "delete file"
    })
  });

  alert("Deleted");
}

// ---------------- RENAME ----------------
async function renameFile() {
  const newName = prompt("New file name?");

  const content = document.getElementById("editor").value;

  await fetch("/api/rename", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      owner: currentRepo.owner,
      repo: currentRepo.repo,
      oldPath: currentFile.path,
      newPath: newName,
      content,
      sha: currentFile.sha
    })
  });

  alert("Renamed 🔥");
}
