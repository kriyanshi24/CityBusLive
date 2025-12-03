// ====== CITYBUS LIVE DEMO LOGIC =====

// --- Constants ---
const DATA_KEY = "citybus_data";

// --- Helper: Current time, format DD-MM-YYYY HH:MM ---
function getFormattedNow() {
  const d = new Date();
  let day = String(d.getDate()).padStart(2, "0");
  let month = String(d.getMonth() + 1).padStart(2, "0");
  let year = d.getFullYear();
  let hour = String(d.getHours()).padStart(2, "0");
  let min = String(d.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hour}:${min}`;
}

// --- Data Handling ---
function loadData() {
  const data = localStorage.getItem(DATA_KEY);
  if (data) return JSON.parse(data);

  // INITIAL SAMPLE DATA
  const demoData = {
    routes: [
      {
        id: "101",
        name: "Central Station → Tech Park",
        start: "Central Station",
        end: "Tech Park",
        duration: 34,
        stops: [
          { name: "Central Station", eta: "09:00" },
          { name: "City Hall", eta: "09:14" },
          { name: "Green Avenue", eta: "09:22" },
          { name: "Tech Park", eta: "09:34" }
        ]
      },
      {
        id: "202",
        name: "Old Town → University",
        start: "Old Town",
        end: "University",
        duration: 41,
        stops: [
          { name: "Old Town", eta: "13:20" },
          { name: "Lakeview", eta: "13:36" },
          { name: "Library Rd", eta: "13:48" },
          { name: "University", eta: "14:01" }
        ]
      }
    ],
    buses: [
      { number: "C-101A", routeId: "101", status: "Active" },
      { number: "U-202B", routeId: "202", status: "Inactive" }
    ],
    updates: {
      "101": [],
      "202": []
    }
  };
  localStorage.setItem(DATA_KEY, JSON.stringify(demoData));
  return demoData;
}

function saveData(data) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

// UI STATE
let currentView = "home"; // home, routes, route-details, admin
let selectedRouteId = null;
let adminTab = "dashboard"; // dashboard, routes, stops, buses

// --- Routing ---
function showSection(section) {
  document.querySelectorAll(".main-section").forEach(sec => {
    sec.style.display = "none";
  });
  document.getElementById(`section-${section}`).style.display = "block";
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove("active"));
  if (section === "home") document.getElementById("nav-home").classList.add("active");
  else if (section === "routes") document.getElementById("nav-routes").classList.add("active");
  else if (section === "admin") document.getElementById("nav-admin").classList.add("active");
  currentView = section;
}

// Nav handlers
document.getElementById("nav-home").onclick = () => { showSection("home"); };
document.getElementById("nav-routes").onclick = () => { renderRoutesList(); showSection("routes"); };
document.getElementById("nav-admin").onclick = () => { renderAdminPanel(); showSection("admin"); };
document.getElementById("btn-view-routes").onclick = () => {
  renderRoutesList();
  showSection("routes");
  window.scrollTo({top:0, behavior:"smooth"});
};

// --- ROUTES LIST ---
function renderRoutesList(filter = "") {
  const data = loadData();
  let container = document.getElementById("routes-list");
  filter = filter.trim().toLowerCase();
  let routes = data.routes.filter(r =>
    r.id.toLowerCase().includes(filter) ||
    r.name.toLowerCase().includes(filter) ||
    r.start.toLowerCase().includes(filter) ||
    r.end.toLowerCase().includes(filter)
  );
  container.innerHTML = routes.length === 0
    ? `<p>No routes found.</p>`
    : routes.map(route => `
      <div class="route-card">
        <div>
          <div class="route-header">${route.id} – ${route.name}</div>
          <div class="route-info">${route.start} → ${route.end}</div>
          <div class="route-duration">~${route.duration} min</div>
        </div>
        <button class="route-btn" onclick="showRouteDetails('${route.id}')">View Details</button>
      </div>
    `).join("");
  document.getElementById("route-search").value = filter;
}
document.getElementById("route-search").oninput = function() {
  renderRoutesList(this.value);
};

// --- ROUTE DETAILS VIEW ---
window.showRouteDetails = function(routeId) {
  const data = loadData();
  const route = data.routes.find(r => r.id === routeId);
  if (!route) return;

  selectedRouteId = routeId;

  // SCHEDULE TABLE for route
  let stopsTable = `
    <table class="schedule-table">
      <tr><th>Stop</th><th>Expected Time</th></tr>
      ${route.stops.map(
        s => `<tr><td>${s.name}</td><td>${s.eta}</td></tr>`
      ).join("")}
    </table>
  `;

  // Simulate live position based on current minute
  let stops = route.stops;
  let now = new Date();
  let idx = Math.floor((now.getMinutes() % stops.length));
  let liveText, lastUpdated;
  if (idx < stops.length - 1) {
    liveText = `Bus is currently between <b>${stops[idx].name}</b> and <b>${stops[idx+1].name}</b>`;
  } else {
    liveText = `Bus is currently at <b>${stops[stops.length-1].name}</b>`;
  }
  lastUpdated = getFormattedNow();

  // Recent updates
  let updates = (data.updates[routeId] || []).slice(-10).reverse();
  let updatesHtml = updates.length === 0
    ? `<em>No recent updates.</em>`
    : `<ul class="update-list">` + updates.map(up =>
        `<li class="update-item">
          <span class="update-name">${up.name || "Anonymous"}</span>
          <span class="update-msg">${up.message}</span>
          <span class="update-time">${up.time}</span>
        </li>`)
      .join("") + `</ul>`;

  // Live update form
  const stopOptions = route.stops.map(
    (s, i) => `<option value="${s.name}">${s.name}</option>`
  ).join("");
  let form = `
    <form id="updateForm" class="form-block">
      <label for="uname">Your name (optional):</label>
      <input type="text" class="input" name="uname" id="uname" autocomplete="off" maxlength="18">
      <label for="utype">Update type:</label>
      <select class="input" name="utype" id="utype" required>
        <option value="">Select type...</option>
        <option value="arrived">Bus just arrived at</option>
        <option value="left">Bus just left</option>
        <option value="delayed">Bus delayed at</option>
      </select>
      <label for="ustop">Stop:</label>
      <select class="input" name="ustop" id="ustop" required>
        ${stopOptions}
      </select>
      <label for="unote">Note (optional):</label>
      <textarea class="input" name="unote" id="unote" rows="2" maxlength="80"></textarea>
      <button type="submit" class="primary-btn">Submit Live Update</button>
      <div id="formError" class="form-error"></div>
    </form>
  `;

  document.getElementById("route-details-content").innerHTML = `
    <div class="details-header">
      <h2>${route.id} – ${route.name}</h2>
      <button class="back-btn" onclick="renderRoutesList(); showSection('routes');">‹ Back to Routes</button>
    </div>
    <div class="details-block">
      <h3>Stops</h3>
      <ol class="stop-list">
        ${route.stops.map(s => `<li>${s.name}</li>`).join("")}
      </ol>
      <h3>Schedule</h3>
      ${stopsTable}
    </div>
    <div class="details-block">
      <div class="live-status">${liveText}</div>
      <div class="update-time">Last updated: ${lastUpdated}</div>
    </div>
    <div class="details-block">
      <h3>Recent Crowd-Sourced Updates</h3>
      ${updatesHtml}
      ${form}
    </div>
  `;

  showSection('route-details');

  // --- Update Form Handler ---
  document.getElementById("updateForm").onsubmit = function(e) {
    e.preventDefault();
    let name = document.getElementById("uname").value.trim();
    let type = document.getElementById("utype").value;
    let stop = document.getElementById("ustop").value;
    let note = document.getElementById("unote").value.trim();
    let error = "";
    if (!type) error = "Select an update type.";
    else if (!stop) error = "Choose a stop.";
    if (error) {
      document.getElementById("formError").textContent = error;
      return;
    }

    // Build message
    let message = "";
    if (type === "arrived") message = `Bus just arrived at ${stop}`;
    if (type === "left") message = `Bus just left ${stop}`;
    if (type === "delayed") message = `Bus delayed at ${stop}`;
    if (note) message += ` — ${note}`;
    let time = getFormattedNow();

    // Store in localStorage (max 30 per route)
    const data = loadData();
    let arr = data.updates[routeId] || [];
    arr.push({
      name: name || "Anonymous",
      message, time
    });
    if (arr.length > 30) arr = arr.slice(-30);
    data.updates[routeId] = arr;
    saveData(data);

    // Instant re-render
    showRouteDetails(routeId);
    document.getElementById("formError").textContent = "";
  };
}

// --- ADMIN/UI PANEL ---
function renderAdminPanel() {
  const data = loadData();

  // Tabs
  let tabHtml = `
    <div class="admin-tabs">
      <button class="admin-tab${adminTab==="dashboard"?" active":""}" onclick="switchAdminTab('dashboard')">Dashboard</button>
      <button class="admin-tab${adminTab==="routes"?" active":""}" onclick="switchAdminTab('routes')">Manage Routes</button>
      <button class="admin-tab${adminTab==="stops"?" active":""}" onclick="switchAdminTab('stops')">Manage Stops</button>
      <button class="admin-tab${adminTab==="buses"?" active":""}" onclick="switchAdminTab('buses')">Manage Buses</button>
    </div>
  `;
  document.getElementById("admin-dashboard").innerHTML = tabHtml;

  // Cards: total routes, buses, stops
  if (adminTab === "dashboard") {
    let routeCount = data.routes.length;
    let busCount = data.buses.length;
    let stopCount = data.routes.reduce((t, r) => t+r.stops.length, 0);

    document.getElementById("admin-dashboard").innerHTML += `
      <div class="admin-cards">
        <div class="admin-card">
          <div class="admin-card-title">Total Routes</div>
          <div class="admin-card-value">${routeCount}</div>
        </div>
        <div class="admin-card">
          <div class="admin-card-title">Total Buses</div>
          <div class="admin-card-value">${busCount}</div>
        </div>
        <div class="admin-card">
          <div class="admin-card-title">Total Stops</div>
          <div class="admin-card-value">${stopCount}</div>
        </div>
      </div>
    `;
    document.getElementById("admin-routes").innerHTML = "";
    document.getElementById("admin-stops").innerHTML = "";
    document.getElementById("admin-buses").innerHTML = "";
  }
  // --- Manage Routes ---
  else if (adminTab === "routes") {
    // Add Route Form
    document.getElementById("admin-routes").innerHTML = `
      <div class="admin-section">
        <h3>New Route</h3>
        <form id="adminAddRoute" class="admin-form">
          <label>Route ID:</label>
          <input type="text" id="arId" required maxlength="8">
          <label>Route Name:</label>
          <input type="text" id="arName" maxlength="36" required>
          <label>Start:</label>
          <input type="text" id="arStart" required maxlength="22">
          <label>End:</label>
          <input type="text" id="arEnd" required maxlength="22">
          <label>Duration:</label>
          <input type="number" id="arDur" required min="5" max="300">
          <button class="table-btn">Add Route</button>
        </form>
        <div id="arError" class="form-error"></div>
      </div>
      <div class="admin-section">
        <h3>Existing Routes</h3>
        <table class="admin-table">
          <tr>
            <th>ID</th><th>Name</th><th>Start → End</th><th>Duration</th><th>Actions</th>
          </tr>
          ${data.routes.map(r =>
            `<tr>
              <td>${r.id}</td>
              <td>${r.name}</td>
              <td>${r.start} → ${r.end}</td>
              <td>${r.duration} min</td>
              <td>
                <button class="table-btn" onclick="editRoute('${r.id}')">Edit</button>
                <button class="table-btn" onclick="deleteRoute('${r.id}')">Delete</button>
              </td>
            </tr>`
          ).join("")}
        </table>
      </div>
    `;
    document.getElementById("admin-stops").innerHTML = "";
    document.getElementById("admin-buses").innerHTML = "";

    // Add Route Handler
    document.getElementById("adminAddRoute").onsubmit = function(e) {
      e.preventDefault();
      const id = document.getElementById("arId").value.trim();
      const name = document.getElementById("arName").value.trim();
      const start = document.getElementById("arStart").value.trim();
      const end = document.getElementById("arEnd").value.trim();
      const duration = Number(document.getElementById("arDur").value);
      let errorMsg = "";
      if (!id || !name || !start || !end || !duration) errorMsg = "Fill all fields.";
      const data = loadData();
      if (data.routes.some(r => r.id === id)) errorMsg = "That Route ID exists.";
      if (errorMsg) {
        document.getElementById("arError").textContent = errorMsg;
        return;
      }
      data.routes.push({
        id, name, start, end, duration,
        stops: [{ name: start, eta: "" }, { name: end, eta: "" }]
      });
      data.updates[id] = [];
      saveData(data);
      renderAdminPanel();
    };
  }
  // --- Manage Stops ---
  else if (adminTab === "stops") {
    // Pick Route
    let routeOpts = data.routes.map(r => `<option value="${r.id}">${r.id} – ${r.name}</option>`).join("");
    let stopsHtml = "";
    let route = null;
    let selected = document.getElementById("routeSelectAdminStop") ? document.getElementById("routeSelectAdminStop").value : (data.routes[0] ? data.routes[0].id : "");
    if (selected) route = data.routes.find(r => r.id === selected);

    if (route) {
      stopsHtml += `
        <ol>
        ${route.stops.map((s, i) => `
          <li>
            <div class="stop-list-controls">
              <span>${s.name} ${s.eta ? "(" + s.eta + ")" : ""}</span>
              <button class="stop-btn" onclick="moveStop('${route.id}', ${i}, -1)">▲</button>
              <button class="stop-btn" onclick="moveStop('${route.id}', ${i}, 1)">▼</button>
              <button class="stop-btn" onclick="deleteStop('${route.id}', ${i})">Delete</button>
            </div>
          </li>
        `).join("")}
        </ol>
      `;
    }
    document.getElementById("admin-stops").innerHTML = `
      <div class="admin-section">
        <label for="routeSelectAdminStop" style="font-weight:bold;">Choose Route:</label>
        <select id="routeSelectAdminStop" class="input">
          ${routeOpts}
        </select>
      </div>
      <div class="admin-section">
        <h3>Stops for Route ${route ? route.id : ""}</h3>
        ${stopsHtml}
        <form id="adminAddStop" class="admin-form">
          <label>Stop Name:</label>
          <input type="text" id="asName" required maxlength="28">
          <label>Stop Time (ETA):</label>
          <input type="text" id="asETA" maxlength="8" placeholder="e.g. 09:20">
          <button class="table-btn">Add Stop</button>
        </form>
        <div id="asError" class="form-error"></div>
      </div>
    `;
    document.getElementById("admin-buses").innerHTML = "";

    // Handler change route dropdown
    document.getElementById("routeSelectAdminStop").onchange = function() {
      renderAdminPanel();
    };

    // Add Stop Handler
    document.getElementById("adminAddStop").onsubmit = function(e) {
      e.preventDefault();
      let name = document.getElementById("asName").value.trim();
      let eta = document.getElementById("asETA").value.trim();
      if (!name) {
        document.getElementById("asError").textContent = "Stop name required.";
        return;
      }
      const data = loadData();
      let route = data.routes.find(r => r.id === document.getElementById("routeSelectAdminStop").value);
      if (!route) return;
      route.stops.push({ name, eta });
      saveData(data);
      renderAdminPanel();
    };
  }
  // --- Manage Buses ---
  else if (adminTab === "buses") {
    // NEW BUS FORM
    let routeOpts = data.routes.map(r => `<option value="${r.id}">${r.id} – ${r.name}</option>`).join("");
    document.getElementById("admin-buses").innerHTML = `
      <div class="admin-section">
        <h3>Add Bus</h3>
        <form id="adminAddBus" class="admin-form">
          <label>Bus Number:</label>
          <input type="text" id="abNum" required maxlength="14">
          <label>Route:</label>
          <select id="abRoute" required>
            ${routeOpts}
          </select>
          <label>Status:</label>
          <select id="abStatus" required>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button class="table-btn">Add Bus</button>
        </form>
        <div id="abError" class="form-error"></div>
      </div>
      <div class="admin-section">
        <h3>Existing Buses</h3>
        <table class="admin-table">
          <tr>
            <th>Number</th><th>Route</th><th>Status</th><th>Actions</th>
          </tr>
          ${data.buses.map(bus =>
            `<tr>
              <td>${bus.number}</td>
              <td>${bus.routeId}</td>
              <td>${bus.status}</td>
              <td>
                <button class="table-btn" onclick="deleteBus('${bus.number}')">Delete</button>
              </td>
            </tr>`
          ).join("")}
        </table>
      </div>
    `;
    document.getElementById("admin-stops").innerHTML = "";
    document.getElementById("admin-routes").innerHTML = "";

    // Add Bus Handler
    document.getElementById("adminAddBus").onsubmit = function(e) {
      e.preventDefault();
      let number = document.getElementById("abNum").value.trim();
      let routeId = document.getElementById("abRoute").value;
      let status = document.getElementById("abStatus").value;
      if (!number || !routeId || !status) {
        document.getElementById("abError").textContent = "Fill all required fields.";
        return;
      }
      const data = loadData();
      if (data.buses.some(b => b.number === number)) {
        document.getElementById("abError").textContent = "Bus number already exists.";
        return;
      }
      data.buses.push({ number, routeId, status });
      saveData(data);
      renderAdminPanel();
    };
  }
}

// --- Admin Tab Switching ---
window.switchAdminTab = function(tab) {
  adminTab = tab;
  renderAdminPanel();
};

// --- Edit Route ---
window.editRoute = function(routeId) {
  const data = loadData();
  const route = data.routes.find(r => r.id === routeId);
  if (!route) return;

  // Modal approach could be used, but here we inline-edit below the table for simplicity
  document.getElementById("admin-routes").innerHTML += `
    <div class="admin-section" style="background:#eef8ff;">
      <h3>Edit Route ${route.id}</h3>
      <form id="adminEditRouteForm" class="admin-form">
        <label>Route Name:</label>
        <input type="text" id="erName" value="${route.name}" maxlength="36" required>
        <label>Start:</label>
        <input type="text" id="erStart" value="${route.start}" maxlength="22" required>
        <label>End:</label>
        <input type="text" id="erEnd" value="${route.end}" maxlength="22" required>
        <label>Duration:</label>
        <input type="number" id="erDur" value="${route.duration}" min="5" max="300">
        <button class="table-btn">Save Changes</button>
        <button class="table-btn" onclick="renderAdminPanel(); return false;">Cancel</button>
      </form>
      <div id="erError" class="form-error"></div>
    </div>
  `;
  document.getElementById("adminEditRouteForm").onsubmit = function(e) {
    e.preventDefault();
    const name = document.getElementById("erName").value.trim();
    const start = document.getElementById("erStart").value.trim();
    const end = document.getElementById("erEnd").value.trim();
    const duration = Number(document.getElementById("erDur").value);
    if (!name || !start || !end || !duration) {
      document.getElementById("erError").textContent = "Fill all fields.";
      return;
    }
    route.name = name;
    route.start = start;
    route.end = end;
    route.duration = duration;
    saveData(data);
    renderAdminPanel();
  };
};

// --- Delete Route ---
window.deleteRoute = function(routeId) {
  if (!confirm("Delete this route?")) return;
  const data = loadData();
  data.routes = data.routes.filter(r => r.id !== routeId);
  delete data.updates[routeId];
  data.buses = data.buses.filter(b => b.routeId !== routeId);
  saveData(data);
  renderAdminPanel();
};

// --- Move Stop / Delete Stop ---
window.moveStop = function(routeId, idx, offset) {
  const data = loadData();
  const route = data.routes.find(r => r.id === routeId);
  if (!route) return;
  const stops = route.stops;
  const newIdx = idx + offset;
  if (newIdx >= 0 && newIdx < stops.length) {
    [stops[idx], stops[newIdx]] = [stops[newIdx], stops[idx]];
    saveData(data);
    renderAdminPanel();
  }
};

window.deleteStop = function(routeId, idx) {
  if (!confirm("Delete this stop?")) return;
  const data = loadData();
  const route = data.routes.find(r => r.id === routeId);
  if (!route) return;
  route.stops.splice(idx, 1);
  saveData(data);
  renderAdminPanel();
};

// --- Delete Bus ---
window.deleteBus = function(busNum) {
  if (!confirm("Delete this bus?")) return;
  const data = loadData();
  data.buses = data.buses.filter(b => b.number !== busNum);
  saveData(data);
  renderAdminPanel();
};

// Initial render
showSection("home");
