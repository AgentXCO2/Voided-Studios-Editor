let token = null;
let current = null;

// GET TOKEN FROM CALLBACK
const params = new URLSearchParams(window.location.search);
if (params.get("token")) {
  token = params.get("token");
  localStorage.setItem("token", token);
}

token = token || localStorage.getItem("token");

// LOAD REPOS
async function loadRepos() {
  const res = await fetch("/api/repos", {
    headers: {
      Authorization: token
    }
  });

  const data = await res.json();

  document.getElementById("repos").innerHTML = data
    .map(
      r => `
      <div onclick="openRepo('${r.owner.login}','${r.name}')">
        ${r.name}
      </div>
    `
    )
    .join("");
}

// OPEN FILE (example main file)
async function openRepo(owner, repo) {
  current = { owner, repo, path: "README.md" };

  const res = await fetch(
    `/api/file?owner=${owner}&repo=${repo}&path=README.md&token=${token}`
  );

  const data = await res.json();

  document.getElementById("editor").value = data.content;
}

// SAVE FILE
async function saveFile() {
  await fetch("/api/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      owner: current.owner,
      repo: current.repo,
      path: current.path,
      message: "Void Studios edit",
      content: document.getElementById("editor").value,
      sha: current.sha
    })
  });

  alert("Saved to GitHub");
}

loadRepos();
