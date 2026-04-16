let token = "";
let reposData = [];

function connect() {
  token = document.getElementById("token").value;

  if (!token) return alert("Enter token");

  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  loadRepos();
}

// FETCH REPOS (GitHub API)
async function loadRepos() {
  const res = await fetch("https://api.github.com/user/repos", {
    headers: {
      Authorization: "token " + token
    }
  });

  const data = await res.json();
  reposData = data;

  const container = document.getElementById("repos");
  container.innerHTML = "";

  data.forEach(repo => {
    const div = document.createElement("div");
    div.className = "repo";
    div.innerHTML = `
      <b>${repo.name}</b><br/>
      ${repo.private ? "Private" : "Public"}
    `;

    div.onclick = () => openRepo(repo);
    container.appendChild(div);
  });
}

// OPEN REPO FILES (basic)
async function openRepo(repo) {
  document.getElementById("viewer").classList.remove("hidden");
  document.getElementById("repoName").innerText = repo.name;

  const res = await fetch(repo.url + "/contents", {
    headers: {
      Authorization: "token " + token
    }
  });

  const files = await res.json();

  document.getElementById("files").innerText =
    JSON.stringify(files, null, 2);
}
