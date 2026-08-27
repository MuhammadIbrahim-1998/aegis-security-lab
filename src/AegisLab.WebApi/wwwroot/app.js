const API = "";
let token = null;

function addLog(text, ok) {
  const log = document.getElementById("log");
  if (log.children.length === 1 && log.children[0].textContent === "No activity yet.") {
    log.innerHTML = "";
  }
  const entry = document.createElement("div");
  entry.className = ok ? "ok" : "fail";
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  log.prepend(entry);
}

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const msgEl = document.getElementById("loginMsg");
  msgEl.innerHTML = "";

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      addLog(`Login failed for "${username}"`, false);
      msgEl.innerHTML = `<div class="msg msg-error">Login failed. Check your credentials.</div>`;
      return;
    }

    const data = await res.json();
    token = data.token;
    addLog(`Login succeeded for "${username}"`, true);
    await loadProfile();
  } catch (err) {
    msgEl.innerHTML = `<div class="msg msg-error">Could not reach server.</div>`;
  }
}

async function loadProfile() {
  const res = await fetch(`${API}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();

  document.getElementById("loginCard").classList.add("hidden");

  if (data.role === "Admin") {
    document.getElementById("adminDashboard").classList.remove("hidden");
    document.getElementById("userDashboard").classList.add("hidden");
    document.getElementById("adminName").textContent = data.username;
    const badge = document.getElementById("adminRoleBadge");
    badge.textContent = data.role;
    badge.className = "badge badge-admin";
  } else {
    document.getElementById("userDashboard").classList.remove("hidden");
    document.getElementById("adminDashboard").classList.add("hidden");
    document.getElementById("userName").textContent = data.username;
    const badge = document.getElementById("userRoleBadge");
    badge.textContent = data.role;
    badge.className = "badge badge-user";
  }
}

async function viewAdminPanel() {
  const msgEl = document.getElementById("dashboardMsg");
  const res = await fetch(`${API}/api/auth/admin-panel`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.ok) {
    const data = await res.json();
    addLog("Admin panel accessed successfully", true);
    msgEl.innerHTML = `<div class="msg msg-success">${data.message}<br>Secret: ${data.secret}</div>`;
  } else {
    addLog(`Admin panel access denied (${res.status})`, false);
    msgEl.innerHTML = `<div class="msg msg-error">Access denied (${res.status}). You are not an admin.</div>`;
  }
}

function base64url(obj) {
  return btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function tryForgedAttack() {
  const msgEl = document.getElementById("attackMsg");

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    unique_name: "attacker",
    role: "Admin",
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  const forgedToken = `${base64url(header)}.${base64url(payload)}.fake_signature_${Math.random().toString(36).slice(2)}`;

  const res = await fetch(`${API}/api/auth/admin-panel`, {
    headers: { Authorization: `Bearer ${forgedToken}` }
  });

  if (res.ok) {
    addLog("SECURITY BREACH — forged token was accepted!", false);
    msgEl.innerHTML = `<div class="msg msg-error">⚠️ SECURITY BREACH — Unauthorized access granted! The server accepted a forged token.</div>`;
  } else {
    addLog(`Forged token rejected (${res.status})`, true);
    msgEl.innerHTML = `<div class="msg msg-success">✅ Attack Blocked — Server rejected the forged token (${res.status}).</div>`;
  }
}

function logout() {
  token = null;
  document.getElementById("loginCard").classList.remove("hidden");
  document.getElementById("userDashboard").classList.add("hidden");
  document.getElementById("adminDashboard").classList.add("hidden");
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("dashboardMsg").innerHTML = "";
  document.getElementById("attackMsg").innerHTML = "";
  addLog("Logged out", true);
}

document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("adminPanelBtn").addEventListener("click", viewAdminPanel);
document.getElementById("logoutBtn").addEventListener("click", logout);
document.getElementById("forgedAttackBtn").addEventListener("click", tryForgedAttack);
