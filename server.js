import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const CLIENT_ID = process.env.YOUR_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUR_CLIENT_SECRET;

// 1. LOGIN REDIRECT
app.get("/login", (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo`;
  res.redirect(url);
});

// 2. CALLBACK (exchange code for token)
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code
    })
  });

  const data = await tokenRes.json();

  // send token to frontend (simple V1 method)
  res.redirect(`/success.html?token=${data.access_token}`);
});

// 3. GET REPOS
app.get("/api/repos", async (req, res) => {
  const token = req.headers.authorization;

  const response = await fetch("https://api.github.com/user/repos", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    }
  });

  res.json(await response.json());
});

// 4. GET FILE CONTENT
app.get("/api/file", async (req, res) => {
  const { owner, repo, path, token } = req.query;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  const data = await response.json();
  const content = Buffer.from(data.content, "base64").toString();

  res.json({ content, sha: data.sha });
});

// 5. UPDATE FILE (commit)
app.post("/api/update", async (req, res) => {
  const { token, owner, repo, path, message, content, sha } = req.body;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString("base64"),
        sha
      })
    }
  );

  res.json(await response.json());
});

app.listen(3000, () => {
  console.log("Void Studios running");
});
