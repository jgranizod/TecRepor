const STORAGE_KEY = "machine-procedure-app-v1";

const defaultSteps = [
  ["Contadora", "Preventivo", "Basico", "Fotos de evidencia inicial", "Tomar fotos claras de la maquina, placa, estado exterior, conexiones y area antes de intervenir."],
  ["Contadora", "Preventivo", "Basico", "Verificacion de seguridad", "Apagar la maquina, desconectar alimentacion y confirmar que no haya piezas sueltas o cables expuestos."],
  ["Contadora", "Preventivo", "Detallado", "Limpieza interna", "Retirar polvo, residuos y particulas en bandejas, sensores, rodillos y zonas de conteo sin forzar componentes."],
  ["Contadora", "Preventivo", "Detallado", "Revision de sensores", "Limpiar y revisar alineacion de sensores. Confirmar que no haya obstrucciones ni suciedad persistente."],
  ["Contadora", "Preventivo", "Critico", "Prueba de conteo", "Ejecutar conteo con muestra conocida, comparar resultado y registrar evidencia de la prueba."],
  ["Contadora", "Correctivo", "Basico", "Diagnostico de falla", "Registrar sintoma reportado, codigo de error, condicion al encender y evidencia visual antes de desmontar."],
  ["Contadora", "Correctivo", "Detallado", "Revision del modulo afectado", "Inspeccionar rodillos, sensores, motor, correas y tarjetas segun la falla reportada."],
  ["Contadora", "Correctivo", "Critico", "Validacion posterior", "Probar funcionamiento repetidas veces, registrar resultado y dejar recomendacion si queda pendiente."],

  ["Bascula", "Preventivo", "Basico", "Fotos y estado fisico", "Tomar evidencia de plataforma, display, celda de carga, nivelacion, conexiones y entorno de uso."],
  ["Bascula", "Preventivo", "Detallado", "Limpieza de plataforma", "Limpiar plataforma, base y uniones. Retirar residuos que puedan tocar o bloquear la medicion."],
  ["Bascula", "Preventivo", "Detallado", "Nivelacion", "Verificar que la bascula este firme, nivelada y sin contacto con paredes, cables u objetos externos."],
  ["Bascula", "Preventivo", "Critico", "Prueba con peso patron", "Realizar prueba con peso conocido, registrar lectura, tolerancia y foto de evidencia."],
  ["Bascula", "Correctivo", "Basico", "Registro de falla", "Documentar desviacion de peso, intermitencia, error en display o dano fisico con fotos iniciales."],
  ["Bascula", "Correctivo", "Detallado", "Inspeccion de celda y cableado", "Revisar celda de carga, conectores, soldaduras, humedad y golpes en estructura."],
  ["Bascula", "Correctivo", "Critico", "Prueba final de repetibilidad", "Tomar varias mediciones con el mismo peso y registrar si el resultado se mantiene estable."],

  ["Estandar", "Preventivo", "Basico", "Evidencia antes de trabajar", "Tomar fotos generales, placa, accesorios, conexion electrica y condicion inicial."],
  ["Estandar", "Preventivo", "Basico", "Desconexion segura", "Apagar, desconectar y confirmar que el equipo esta en condicion segura antes de abrir o limpiar."],
  ["Estandar", "Preventivo", "Detallado", "Limpieza general", "Limpiar carcasa, ventilacion, conectores y partes internas accesibles sin danar componentes."],
  ["Estandar", "Preventivo", "Detallado", "Ajustes y revision", "Revisar tornilleria, conexiones, partes moviles, desgaste visible y configuraciones basicas."],
  ["Estandar", "Preventivo", "Critico", "Prueba funcional", "Ejecutar ciclo de trabajo normal, registrar resultado y foto del equipo operando."],
  ["Estandar", "Correctivo", "Basico", "Levantamiento de falla", "Anotar lo reportado por el cliente, reproducir la falla si es posible y tomar evidencia."],
  ["Estandar", "Correctivo", "Detallado", "Correccion aplicada", "Registrar pieza, ajuste, limpieza, reparacion o cambio realizado con detalle suficiente."],
  ["Estandar", "Correctivo", "Critico", "Entrega y conformidad", "Probar con el cliente, dejar observaciones y obtener firma de recibido."],
].map(([machine, type, level, title, description], index) => ({
  id: crypto.randomUUID(),
  machine,
  type,
  level,
  title,
  description,
  photo: "",
  order: index + 1,
}));

let state = loadState();
let currentVisit = defaultVisit();
let deferredInstallPrompt = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { steps: defaultSteps, visits: [] };
  try {
    const parsed = JSON.parse(saved);
    return {
      steps: Array.isArray(parsed.steps) && parsed.steps.length ? parsed.steps : defaultSteps,
      visits: Array.isArray(parsed.visits) ? parsed.visits : [],
    };
  } catch {
    return { steps: defaultSteps, visits: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaultVisit() {
  return {
    id: crypto.randomUUID(),
    photos: { before: [], work: [], tests: [] },
    checks: {},
    notesByStep: {},
    signature: "",
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function activeSteps(machine = $("#machineType").value, type = $("#maintenanceType").value) {
  return state.steps
    .filter((step) => step.machine === machine && step.type === type)
    .sort((a, b) => a.order - b.order);
}

function renderChecklist() {
  const list = $("#checklist");
  const steps = activeSteps();
  $("#stepContext").textContent = `${steps.length} pasos para ${$("#machineType").value} - ${$("#maintenanceType").value}.`;
  list.innerHTML = "";

  if (!steps.length) {
    list.innerHTML = '<div class="empty-state">No hay pasos para esta combinacion. Agrega uno en Procedimientos.</div>';
    return;
  }

  const template = $("#stepTemplate");
  steps.forEach((step) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector("input[type='checkbox']");
    const title = node.querySelector(".check-wrap span");
    const meta = node.querySelector(".step-meta");
    const desc = node.querySelector(".step-body p");
    const note = node.querySelector("textarea");
    const photoWrap = node.querySelector(".step-photo");
    const img = node.querySelector("img");

    checkbox.checked = Boolean(currentVisit.checks[step.id]);
    checkbox.addEventListener("change", () => {
      currentVisit.checks[step.id] = checkbox.checked;
    });
    title.textContent = step.title;
    meta.innerHTML = `<span class="tag">${step.level}</span><span class="tag">${step.machine}</span><span class="tag">${step.type}</span><strong>${step.title}</strong>`;
    desc.textContent = step.description;
    note.value = currentVisit.notesByStep[step.id] || "";
    note.addEventListener("input", () => {
      currentVisit.notesByStep[step.id] = note.value;
    });
    if (step.photo) {
      img.src = step.photo;
      photoWrap.classList.remove("hidden");
    }
    list.appendChild(node);
  });
}

function renderProcedures() {
  const machine = $("#editorMachine").value;
  const type = $("#editorType").value;
  const list = $("#procedureList");
  const steps = activeSteps(machine, type);
  list.innerHTML = "";

  if (!steps.length) {
    list.innerHTML = '<div class="empty-state">Todavia no hay pasos guardados para esta seleccion.</div>';
    return;
  }

  steps.forEach((step) => {
    const item = document.createElement("article");
    item.className = "procedure-item";
    item.innerHTML = `
      <div>
        <div class="step-meta"><span class="tag">${escapeHtml(step.level)}</span><span class="tag">${escapeHtml(step.machine)}</span><span class="tag">${escapeHtml(step.type)}</span></div>
        <h3>${escapeHtml(step.title)}</h3>
        <p>${escapeHtml(step.description)}</p>
      </div>
      ${step.photo ? `<img class="procedure-thumb" alt="Foto de referencia" src="${step.photo}">` : '<div class="empty-state">Sin foto</div>'}
      <div class="item-actions">
        <button class="secondary-btn" type="button" data-edit="${step.id}">Editar</button>
        <button class="danger-btn" type="button" data-delete="${step.id}">Quitar</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function renderHistory() {
  const list = $("#historyList");
  list.innerHTML = "";
  if (!state.visits.length) {
    list.innerHTML = '<div class="empty-state">No hay visitas guardadas aun.</div>';
    return;
  }

  state.visits
    .slice()
    .reverse()
    .forEach((visit) => {
      const done = Object.values(visit.checks || {}).filter(Boolean).length;
      const item = document.createElement("article");
      item.className = "history-item";
      item.innerHTML = `
        <div>
          <h3>${escapeHtml(visit.clientName || "Cliente sin nombre")}</h3>
          <p>${escapeHtml(visit.visitDate || "")} - ${escapeHtml(visit.machineType || "")} - ${escapeHtml(visit.maintenanceType || "")} - ${done} checks completados</p>
        </div>
        <div class="empty-state">${escapeHtml(visit.technicianName || "Tecnico")}</div>
        <div class="item-actions">
          <button class="secondary-btn" type="button" data-load-visit="${visit.id}">Ver</button>
          <button class="danger-btn" type="button" data-delete-visit="${visit.id}">Borrar</button>
        </div>
      `;
      list.appendChild(item);
    });
}

function collectVisit() {
  return {
    ...currentVisit,
    clientName: $("#clientName").value.trim(),
    technicianName: $("#technicianName").value.trim(),
    machineType: $("#machineType").value,
    maintenanceType: $("#maintenanceType").value,
    machineSerial: $("#machineSerial").value.trim(),
    visitDate: $("#visitDate").value,
    visitNotes: $("#visitNotes").value.trim(),
    receiverName: $("#receiverName").value.trim(),
    signature: currentVisit.signature || getSignatureData(),
    savedAt: new Date().toISOString(),
  };
}

function fillVisit(visit) {
  currentVisit = {
    ...defaultVisit(),
    ...visit,
    photos: visit.photos || { before: [], work: [], tests: [] },
    checks: visit.checks || {},
    notesByStep: visit.notesByStep || {},
  };
  $("#clientName").value = currentVisit.clientName || "";
  $("#technicianName").value = currentVisit.technicianName || "";
  $("#machineType").value = currentVisit.machineType || "Contadora";
  $("#maintenanceType").value = currentVisit.maintenanceType || "Preventivo";
  $("#machineSerial").value = currentVisit.machineSerial || "";
  $("#visitDate").value = currentVisit.visitDate || today();
  $("#visitNotes").value = currentVisit.visitNotes || "";
  $("#receiverName").value = currentVisit.receiverName || "";
  renderPhotoPreviews();
  drawSignature(currentVisit.signature);
  renderChecklist();
}

function saveVisit() {
  const form = $("#visitForm");
  if (!form.reportValidity()) return;
  const visit = collectVisit();
  const existing = state.visits.findIndex((item) => item.id === visit.id);
  if (existing >= 0) state.visits[existing] = visit;
  else state.visits.push(visit);
  saveState();
  renderHistory();
  alert("Visita guardada en este dispositivo.");
}

async function handleEvidence(input, bucket) {
  const files = Array.from(input.files || []);
  const images = await Promise.all(files.map(fileToDataUrl));
  currentVisit.photos[bucket].push(...images);
  input.value = "";
  renderPhotoPreviews();
}

function renderPhotoPreviews() {
  renderPreview("#previewBefore", currentVisit.photos.before);
  renderPreview("#previewWork", currentVisit.photos.work);
  renderPreview("#previewTests", currentVisit.photos.tests);
}

function renderPreview(selector, images) {
  const target = $(selector);
  target.innerHTML = images.map((src, index) => `<img alt="Evidencia ${index + 1}" src="${src}">`).join("");
}

function setupSignature() {
  const canvas = $("#signatureCanvas");
  const ctx = canvas.getContext("2d");
  let drawing = false;

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return {
      x: (source.clientX - rect.left) * (canvas.width / rect.width),
      y: (source.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function start(event) {
    drawing = true;
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    event.preventDefault();
  }

  function move(event) {
    if (!drawing) return;
    const p = point(event);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#17211d";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    currentVisit.signature = getSignatureData();
    event.preventDefault();
  }

  function end() {
    drawing = false;
    currentVisit.signature = getSignatureData();
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);
}

function getSignatureData() {
  return $("#signatureCanvas").toDataURL("image/png");
}

function drawSignature(dataUrl) {
  const canvas = $("#signatureCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!dataUrl) return;
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.src = dataUrl;
}

function clearSignature() {
  currentVisit.signature = "";
  drawSignature("");
}

function printReport() {
  currentVisit = collectVisit();
  window.print();
}

async function saveProcedure(event) {
  event.preventDefault();
  const title = $("#stepTitle").value.trim();
  const description = $("#stepDescription").value.trim();
  if (!title || !description) return;
  const file = $("#stepPhoto").files[0];
  const photo = file ? await fileToDataUrl(file) : "";
  state.steps.push({
    id: crypto.randomUUID(),
    machine: $("#editorMachine").value,
    type: $("#editorType").value,
    level: $("#stepLevel").value,
    title,
    description,
    photo,
    order: state.steps.length + 1,
  });
  saveState();
  event.target.reset();
  $("#editorMachine").value = $("#machineType").value;
  $("#editorType").value = $("#maintenanceType").value;
  renderProcedures();
  renderChecklist();
}

function deleteStep(id) {
  if (!confirm("Quitar este paso del procedimiento?")) return;
  state.steps = state.steps.filter((step) => step.id !== id);
  saveState();
  renderProcedures();
  renderChecklist();
}

function editStep(id) {
  const step = state.steps.find((item) => item.id === id);
  if (!step) return;
  const title = prompt("Titulo del paso", step.title);
  if (title === null) return;
  const description = prompt("Descripcion del paso", step.description);
  if (description === null) return;
  step.title = title.trim() || step.title;
  step.description = description.trim() || step.description;
  saveState();
  renderProcedures();
  renderChecklist();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bitacora-tecnica-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importData(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported.steps) || !Array.isArray(imported.visits)) {
      throw new Error("Formato invalido");
    }
    state = imported;
    saveState();
    renderChecklist();
    renderProcedures();
    renderHistory();
    alert("Datos importados correctamente.");
  } catch (error) {
    alert("No se pudo importar el archivo JSON.");
  } finally {
    input.value = "";
  }
}

function setupNavigation() {
  $$(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".nav-btn").forEach((item) => item.classList.remove("active"));
      $$(".view").forEach((view) => view.classList.remove("active"));
      button.classList.add("active");
      $(`#${button.dataset.view}`).classList.add("active");
    });
  });
}

function setupInstall() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    $("#installBtn").classList.remove("hidden");
  });

  $("#installBtn").addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    $("#installBtn").classList.add("hidden");
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {
      $("#offlineStatus").textContent = "Offline limitado";
    });
  }
}

function newVisit() {
  fillVisit(defaultVisit());
  $("#visitDate").value = today();
}

function wireEvents() {
  $("#machineType").addEventListener("change", renderChecklist);
  $("#maintenanceType").addEventListener("change", renderChecklist);
  $("#editorMachine").addEventListener("change", renderProcedures);
  $("#editorType").addEventListener("change", renderProcedures);
  $("#photoBefore").addEventListener("change", (event) => handleEvidence(event.target, "before"));
  $("#photoWork").addEventListener("change", (event) => handleEvidence(event.target, "work"));
  $("#photoTests").addEventListener("change", (event) => handleEvidence(event.target, "tests"));
  $("#saveVisitBtn").addEventListener("click", saveVisit);
  $("#printReportBtn").addEventListener("click", printReport);
  $("#resetVisitBtn").addEventListener("click", newVisit);
  $("#clearSignatureBtn").addEventListener("click", clearSignature);
  $("#stepEditor").addEventListener("submit", saveProcedure);
  $("#exportBtn").addEventListener("click", exportData);
  $("#importFile").addEventListener("change", (event) => importData(event.target));
  $("#procedureList").addEventListener("click", (event) => {
    const deleteId = event.target.dataset.delete;
    const editId = event.target.dataset.edit;
    if (deleteId) deleteStep(deleteId);
    if (editId) editStep(editId);
  });
  $("#historyList").addEventListener("click", (event) => {
    const loadId = event.target.dataset.loadVisit;
    const deleteId = event.target.dataset.deleteVisit;
    if (loadId) {
      const visit = state.visits.find((item) => item.id === loadId);
      if (visit) fillVisit(visit);
    }
    if (deleteId && confirm("Borrar esta visita?")) {
      state.visits = state.visits.filter((item) => item.id !== deleteId);
      saveState();
      renderHistory();
    }
  });
  $("#clearHistoryBtn").addEventListener("click", () => {
    if (!confirm("Borrar todo el historial local?")) return;
    state.visits = [];
    saveState();
    renderHistory();
  });
}

function init() {
  setupNavigation();
  setupSignature();
  setupInstall();
  wireEvents();
  $("#visitDate").value = today();
  $("#editorMachine").value = $("#machineType").value;
  $("#editorType").value = $("#maintenanceType").value;
  renderChecklist();
  renderProcedures();
  renderHistory();
}

init();
