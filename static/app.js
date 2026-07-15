const form = document.querySelector("#receiptForm");
const receiptList = document.querySelector("#receiptList");
const searchInput = document.querySelector("#searchInput");
const statusFilter = document.querySelector("#statusFilter");
const monthlySummaryButton = document.querySelector("#monthlySummaryButton");
const monthlyModal = document.querySelector("#monthlyModal");
const closeMonthlyButton = document.querySelector("#closeMonthlyButton");
const summaryMonthInput = document.querySelector("#summaryMonthInput");
const monthlySummaryContent = document.querySelector("#monthlySummaryContent");
const receiptId = document.querySelector("#receiptId");
const formMode = document.querySelector("#formMode");
const formTitle = document.querySelector("#formTitle");
const printButtons = document.querySelectorAll(".print-button");
const previewButton = document.querySelector("#previewButton");
const previewModal = document.querySelector("#previewModal");
const previewContent = document.querySelector("#previewContent");
const closePreviewButton = document.querySelector("#closePreviewButton");
const printNowButton = document.querySelector("#printNowButton");
const savePdfButton = document.querySelector("#savePdfButton");
const formFolioBadge = document.querySelector("#formFolioBadge");
const pendingList = document.querySelector("#pendingList");
const statOverdue = document.querySelector("#statOverdue");
const backupReminder = document.querySelector("#backupReminder");
const dismissBackupReminder = document.querySelector("#dismissBackupReminder");
const deleteButton = document.querySelector("#deleteButton");
const clearButton = document.querySelector("#clearButton");
const newReceiptButton = document.querySelector("#newReceiptButton");
const exportCsvButton = document.querySelector("#exportCsvButton");
const exportJsonButton = document.querySelector("#exportJsonButton");
const importButton = document.querySelector("#importButton");
const importFile = document.querySelector("#importFile");
const toast = document.querySelector("#toast");

const DB_NAME = "danilu";
const STORE_NAME = "receipts";
const DB_VERSION = 1;
const BACKUP_KEY = "danilu_last_backup_at";
const BACKUP_DISMISS_KEY = "danilu_backup_dismissed_at";

let db = null;
let receipts = [];
let currentReceipt = null;

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const textFields = [
  "client_name",
  "client_rut",
  "phone",
  "email",
  "address",
  "device_type",
  "brand",
  "model",
  "serial_number",
  "accessories",
  "device_password",
  "warranty",
  "reported_issue",
  "diagnosis",
  "work_done",
  "parts_used",
  "technician",
  "status",
  "payment_method",
  "received_date",
  "promised_date",
  "delivered_date",
  "notes",
];

const moneyFields = ["labor_cost", "other_cost", "discount", "paid_amount"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("folio", "folio", { unique: true });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("updated_at", "updated_at", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runStore(mode, callback) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = callback(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllReceipts() {
  return await runStore("readonly", (store) => requestToPromise(store.getAll()));
}

async function getReceipt(id) {
  return await runStore("readonly", (store) => requestToPromise(store.get(Number(id))));
}

async function saveReceiptRecord(payload) {
  if (payload.id) {
    payload.id = Number(payload.id);
    payload.updated_at = nowIso();
    await runStore("readwrite", (store) => store.put(payload));
    return payload;
  }

  payload.created_at = nowIso();
  payload.updated_at = payload.created_at;
  const id = await runStore("readwrite", (store) => requestToPromise(store.add(payload)));
  payload.id = id;
  if (!payload.folio) {
    payload.folio = makeFolio(id);
    await runStore("readwrite", (store) => store.put(payload));
  }
  return payload;
}

async function deleteReceipt(id) {
  await runStore("readwrite", (store) => store.delete(Number(id)));
}

function makeFolio(id) {
  return `ST-${new Date().getFullYear()}-${String(id).padStart(5, "0")}`;
}

function cleanPayload(raw) {
  const payload = {};
  for (const field of textFields) {
    payload[field] = String(raw[field] || "").trim();
  }
  for (const field of moneyFields) {
    const value = Number(raw[field] || 0);
    payload[field] = Number.isFinite(value) ? value : 0;
  }

  if (raw.id) payload.id = Number(raw.id);
  if (raw.folio) payload.folio = raw.folio;
  if (raw.created_at) payload.created_at = raw.created_at;
  if (!payload.status) payload.status = "Recibido";
  if (!payload.received_date) payload.received_date = today();

  payload.total = Math.max(
    payload.labor_cost + payload.other_cost - payload.discount,
    0
  );
  payload.balance = Math.max(payload.total - payload.paid_amount, 0);
  return payload;
}

function formData() {
  return Object.fromEntries(new FormData(form).entries());
}

function fillForm(receipt) {
  form.reset();
  for (const [key, value] of Object.entries(receipt)) {
    const field = form.elements[key];
    if (field) field.value = value ?? "";
  }
  receiptId.value = receipt.id || "";
  currentReceipt = receipt.id ? receipt : null;
  formMode.textContent = receipt.id ? receipt.folio : "Nueva boleta";
  formTitle.textContent = receipt.id ? `Editando ${receipt.client_name}` : "Registrar servicio";
  formFolioBadge.textContent = receipt.id ? `BOLETA ${receipt.folio}` : "Sin folio";
  printButtons.forEach((button) => {
    button.disabled = !receipt.id;
  });
  deleteButton.disabled = !receipt.id;
  updateTotals();
}

function resetForm() {
  fillForm({
    received_date: today(),
    status: "Recibido",
    warranty: "30",
    payment_method: "",
    labor_cost: 0,
    other_cost: 0,
    discount: 0,
    paid_amount: 0,
  });
  renderList();
}

function getNumber(name) {
  const value = Number(form.elements[name].value || 0);
  return Number.isFinite(value) ? value : 0;
}

function updateTotals() {
  const total = Math.max(
    getNumber("labor_cost") +
      getNumber("other_cost") -
      getNumber("discount"),
    0
  );
  const balance = Math.max(total - getNumber("paid_amount"), 0);
  document.querySelector("#totalPreview").textContent = money.format(total);
  document.querySelector("#balancePreview").textContent = money.format(balance);
}

function statusClass(status) {
  return `status ${String(status || "").toLowerCase().replaceAll(" ", "-")}`;
}

function isClosed(receipt) {
  return receipt.status === "Entregado" || receipt.status === "Anulado";
}

function isOverdue(receipt) {
  return Boolean(receipt.promised_date && !isClosed(receipt) && receipt.promised_date < today());
}

function daysUntil(dateText) {
  if (!dateText) return null;
  const start = new Date(`${today()}T00:00:00`);
  const end = new Date(`${dateText}T00:00:00`);
  return Math.round((end - start) / 86400000);
}

function dueLabel(receipt) {
  if (!receipt.promised_date) return "Sin fecha prometida";
  const days = daysUntil(receipt.promised_date);
  if (days < 0) return `${Math.abs(days)} día(s) atrasado`;
  if (days === 0) return "Prometido para hoy";
  return `Faltan ${days} día(s)`;
}

function formatWarranty(value) {
  const clean = String(value || "").trim();
  if (!clean || clean === "0") return "Sin garantía";
  if (/^\d+$/.test(clean)) return `${clean} día${clean === "1" ? "" : "s"}`;
  return clean;
}

function filteredReceipts() {
  const q = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  return receipts
    .filter((receipt) => {
      const haystack = [
        receipt.folio,
        receipt.client_name,
        receipt.phone,
        receipt.device_type,
        receipt.brand,
        receipt.model,
        receipt.serial_number,
        receipt.reported_issue,
      ]
        .join(" ")
        .toLowerCase();

      return (!q || haystack.includes(q)) && (!status || receipt.status === status);
    })
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
}

function renderList() {
  const visible = filteredReceipts();
  if (!visible.length) {
    receiptList.innerHTML = `
      <div class="empty-state">
        No hay boletas para mostrar. Crea la primera con el formulario de la derecha.
      </div>
    `;
    return;
  }

  receiptList.innerHTML = visible
    .map(
      (receipt) => `
        <button class="receipt-card ${currentReceipt?.id === receipt.id ? "active" : ""} ${isOverdue(receipt) ? "overdue" : ""}" data-id="${receipt.id}" type="button">
          <header>
            <div>
              <strong>${escapeHtml(receipt.client_name || "Sin cliente")}</strong>
              <small>${escapeHtml(receipt.folio)}</small>
            </div>
            <span class="${statusClass(receipt.status)}">${escapeHtml(receipt.status || "")}</span>
          </header>
          <div class="receipt-meta">
            <small>${escapeHtml([receipt.device_type, receipt.brand, receipt.model].filter(Boolean).join(" · ") || "Equipo sin detalle")}</small>
            <small>${escapeHtml(dueLabel(receipt))}</small>
            <small>Total ${money.format(receipt.total || 0)} · Saldo ${money.format(receipt.balance || 0)}</small>
          </div>
        </button>
      `
    )
    .join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadReceipts() {
  receipts = await getAllReceipts();
  renderList();
}

function loadStats() {
  const active = receipts.filter((receipt) => !isClosed(receipt)).length;
  const done = receipts.filter((receipt) => receipt.status === "Entregado").length;
  const pending = receipts.reduce((sum, receipt) => sum + Number(receipt.balance || 0), 0);
  const overdue = receipts.filter(isOverdue).length;
  document.querySelector("#statAll").textContent = receipts.length;
  document.querySelector("#statActive").textContent = active;
  document.querySelector("#statDone").textContent = done;
  document.querySelector("#statPending").textContent = money.format(pending);
  statOverdue.textContent = `${overdue} atrasado${overdue === 1 ? "" : "s"}`;
  renderPendingPanel();
  renderBackupReminder();
}

function renderPendingPanel() {
  const pending = receipts
    .filter((receipt) => !isClosed(receipt))
    .sort((a, b) => {
      const dateA = a.promised_date || "9999-12-31";
      const dateB = b.promised_date || "9999-12-31";
      return dateA.localeCompare(dateB);
    })
    .slice(0, 6);

  if (!pending.length) {
    pendingList.innerHTML = `<p class="empty-inline">No hay equipos pendientes.</p>`;
    return;
  }

  pendingList.innerHTML = pending
    .map(
      (receipt) => `
        <button class="pending-item ${isOverdue(receipt) ? "overdue" : ""}" data-id="${receipt.id}" type="button">
          <span>
            <strong>${escapeHtml(receipt.folio || "Sin folio")}</strong>
            ${escapeHtml(receipt.client_name || "Sin cliente")}
          </span>
          <small>${escapeHtml([receipt.device_type, receipt.brand, receipt.model].filter(Boolean).join(" · ") || "Equipo sin detalle")}</small>
          <b>${escapeHtml(dueLabel(receipt))}</b>
        </button>
      `
    )
    .join("");
}

function renderBackupReminder() {
  if (!receipts.length) {
    backupReminder.hidden = true;
    return;
  }

  const lastBackup = Number(localStorage.getItem(BACKUP_KEY) || 0);
  const dismissed = Number(localStorage.getItem(BACKUP_DISMISS_KEY) || 0);
  const week = 7 * 24 * 60 * 60 * 1000;
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  backupReminder.hidden = now - lastBackup < week || now - dismissed < day;
}

async function refresh() {
  await loadReceipts();
  loadStats();
}

async function saveReceipt(event) {
  event.preventDefault();
  const existing = currentReceipt || {};
  const payload = cleanPayload({ ...existing, ...formData() });
  const saved = await saveReceiptRecord(payload);
  fillForm(saved);
  await refresh();
  showToast(`Boleta ${saved.folio} guardada`);
}

async function selectReceipt(id) {
  const receipt = await getReceipt(id);
  if (!receipt) {
    showToast("La boleta no existe");
    return;
  }
  fillForm(receipt);
  renderList();
}

async function deleteCurrent() {
  if (!currentReceipt) return;
  const typed = window.prompt(
    `Para eliminar esta boleta escribe exactamente el folio:\n${currentReceipt.folio}`
  );
  if (typed === null) return;
  if (typed.trim() !== currentReceipt.folio) {
    showToast("Folio incorrecto. No se eliminó la boleta");
    return;
  }
  await deleteReceipt(currentReceipt.id);
  resetForm();
  await refresh();
  showToast("Boleta eliminada");
}

function monthKey(dateText) {
  return String(dateText || "").slice(0, 7);
}

function currentMonthKey() {
  return today().slice(0, 7);
}

function receiptMonth(receipt) {
  return monthKey(receipt.received_date || receipt.created_at || today());
}

function showMonthlySummary() {
  summaryMonthInput.value = summaryMonthInput.value || currentMonthKey();
  renderMonthlySummary();
  if (typeof monthlyModal.showModal === "function") {
    monthlyModal.showModal();
  } else {
    monthlyModal.setAttribute("open", "");
  }
}

function closeMonthlySummary() {
  if (typeof monthlyModal.close === "function") {
    monthlyModal.close();
  } else {
    monthlyModal.removeAttribute("open");
  }
}

function renderMonthlySummary() {
  const selectedMonth = summaryMonthInput.value || currentMonthKey();
  const monthReceipts = receipts.filter((receipt) => receiptMonth(receipt) === selectedMonth);
  const totalSold = monthReceipts.reduce((sum, receipt) => sum + Number(receipt.total || 0), 0);
  const totalPaid = monthReceipts.reduce((sum, receipt) => sum + Number(receipt.paid_amount || 0), 0);
  const totalBalance = monthReceipts.reduce((sum, receipt) => sum + Number(receipt.balance || 0), 0);
  const delivered = monthReceipts.filter((receipt) => receipt.status === "Entregado").length;
  const active = monthReceipts.filter((receipt) => !isClosed(receipt)).length;
  const overdue = monthReceipts.filter(isOverdue).length;

  const byPayment = monthReceipts.reduce((acc, receipt) => {
    const method = receipt.payment_method || "Pendiente";
    acc[method] = (acc[method] || 0) + Number(receipt.paid_amount || 0);
    return acc;
  }, {});

  monthlySummaryContent.innerHTML = `
    <div class="monthly-grid">
      ${summaryCard("Boletas", monthReceipts.length)}
      ${summaryCard("Vendido", money.format(totalSold))}
      ${summaryCard("Pagado", money.format(totalPaid))}
      ${summaryCard("Saldo pendiente", money.format(totalBalance))}
      ${summaryCard("Entregadas", delivered)}
      ${summaryCard("En proceso", active)}
      ${summaryCard("Atrasadas", overdue)}
    </div>
    <section class="monthly-section">
      <h3>Pagos recibidos</h3>
      ${
        Object.keys(byPayment).length
          ? Object.entries(byPayment)
              .map(([method, amount]) => `<p><span>${escapeHtml(method)}</span><strong>${money.format(amount)}</strong></p>`)
              .join("")
          : `<p><span>Sin pagos registrados</span><strong>${money.format(0)}</strong></p>`
      }
    </section>
    <section class="monthly-section">
      <h3>Boletas del mes</h3>
      ${
        monthReceipts.length
          ? monthReceipts
              .sort((a, b) => String(b.received_date || "").localeCompare(String(a.received_date || "")))
              .map(
                (receipt) => `
                  <button class="monthly-receipt" data-id="${receipt.id}" type="button">
                    <span>
                      <strong>${escapeHtml(receipt.folio || "")}</strong>
                      ${escapeHtml(receipt.client_name || "Sin cliente")}
                    </span>
                    <small>${escapeHtml(receipt.status || "")} · ${money.format(receipt.total || 0)}</small>
                  </button>
                `
              )
              .join("")
          : `<p class="empty-inline">No hay boletas registradas en este mes.</p>`
      }
    </section>
  `;
}

function summaryCard(label, value) {
  return `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function receiptForPreview() {
  const draft = cleanPayload({ ...(currentReceipt || {}), ...formData() });
  return {
    ...draft,
    folio: currentReceipt?.folio || "SIN GUARDAR",
    created_at: currentReceipt?.created_at || nowIso(),
  };
}

function buildReceiptDocument(receipt) {
  const totalRows = [
    ["Mano de obra", receipt.labor_cost],
    ["Otros", receipt.other_cost],
    ["Descuento", -Math.abs(receipt.discount || 0)],
    ["Total", receipt.total],
    ["Pagado", receipt.paid_amount],
    ["Saldo", receipt.balance],
  ];

  return `
    <div class="print-sheet">
      <div class="print-head">
        <div class="print-brand">
          <img src="assets/danilu-logo.png" alt="Logo Danilu">
          <div>
            <h1>Danilu</h1>
            <p>Servicio técnico</p>
            <p>Dirección: Mario Gongora 102</p>
            <p>Correo: LYMSERVICIO@GMAIL.COM</p>
            <p>Fono / WhatsApp: +56 9 9659 6155</p>
          </div>
        </div>
        <div class="print-folio">
          <span>Boleta de servicio técnico</span>
          <h2>${escapeHtml(receipt.folio || "SIN FOLIO")}</h2>
          <p>Estado: ${escapeHtml(receipt.status || "")}</p>
          <p>Ingreso: ${escapeHtml(receipt.received_date || "")}</p>
          <p>Prometida: ${escapeHtml(receipt.promised_date || "Sin fecha")}</p>
          <p>Pago: ${escapeHtml(receipt.payment_method || "Pendiente")}</p>
        </div>
      </div>

      <div class="print-section">
        <h3>Cliente</h3>
        <div class="print-grid">
          <div><strong>Nombre:</strong> ${escapeHtml(receipt.client_name || "")}</div>
          <div><strong>RUT:</strong> ${escapeHtml(receipt.client_rut || "")}</div>
          <div><strong>Teléfono:</strong> ${escapeHtml(receipt.phone || "")}</div>
          <div><strong>Correo:</strong> ${escapeHtml(receipt.email || "")}</div>
          <div class="span-2"><strong>Dirección:</strong> ${escapeHtml(receipt.address || "")}</div>
        </div>
      </div>

      <div class="print-section">
        <h3>Equipo recibido</h3>
        <div class="print-grid">
          <div><strong>Equipo:</strong> ${escapeHtml(receipt.device_type || "")}</div>
          <div><strong>Marca / modelo:</strong> ${escapeHtml([receipt.brand, receipt.model].filter(Boolean).join(" · "))}</div>
          <div><strong>Serie / IMEI:</strong> ${escapeHtml(receipt.serial_number || "")}</div>
          <div><strong>Clave / PIN:</strong> ${escapeHtml(receipt.device_password || "No informado")}</div>
          <div><strong>Garantía:</strong> ${escapeHtml(formatWarranty(receipt.warranty || "30"))}</div>
          <div><strong>Fecha entrega:</strong> ${escapeHtml(receipt.delivered_date || "Pendiente")}</div>
          <div class="span-2"><strong>Accesorios:</strong> ${escapeHtml(receipt.accessories || "")}</div>
        </div>
      </div>

      ${printBlock("Falla reportada", receipt.reported_issue)}
      ${printBlock("Diagnóstico", receipt.diagnosis)}
      ${printBlock("Trabajo realizado", receipt.work_done)}
      ${printBlock("Repuestos", receipt.parts_used)}
      ${printBlock("Observaciones", receipt.notes)}
      ${printBlock(
        "Condiciones de garantía",
        "La garantía cubre únicamente el trabajo realizado por Danilu. No cubre daños por humedad, golpes, intervención de terceros, mal uso, nuevas fallas no relacionadas o manipulación posterior del equipo."
      )}

      <div class="print-bottom">
        <div class="signature-row">
          <div class="signature-box">
            <span>Firma cliente al retirar</span>
          </div>
          <div class="signature-box">
            <span>Firma técnico${receipt.technician ? `: ${escapeHtml(receipt.technician)}` : ""}</span>
          </div>
        </div>
        <div class="print-total">
          ${totalRows
            .map(([label, value]) => `<p><strong>${label}:</strong> ${money.format(value || 0)}</p>`)
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function printBlock(title, value) {
  if (!value) return "";
  return `<div class="print-block"><strong>${title}</strong><p>${escapeHtml(value)}</p></div>`;
}

function printCurrent() {
  if (!currentReceipt) return;
  showPreview(receiptForPreview());
}

function renderPrint(receipt) {
  document.querySelector("#printArea").innerHTML = buildReceiptDocument(receipt);
}

function showPreview(receipt = receiptForPreview()) {
  previewContent.innerHTML = buildReceiptDocument(receipt);
  renderPrint(receipt);
  if (typeof previewModal.showModal === "function") {
    previewModal.showModal();
  } else {
    previewModal.setAttribute("open", "");
  }
}

function closePreview() {
  if (typeof previewModal.close === "function") {
    previewModal.close();
  } else {
    previewModal.removeAttribute("open");
  }
}

function printFromPreview() {
  printReceipt(currentReceipt || receiptForPreview());
}

function savePdfFromPreview() {
  showToast("En la ventana de impresión elige Microsoft Print to PDF o Guardar como PDF");
  printReceipt(currentReceipt || receiptForPreview());
}

function printReceipt(receipt) {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    showToast("El navegador bloqueó la ventana de impresión");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <base href="${window.location.href.slice(0, window.location.href.lastIndexOf("/") + 1)}">
        <title>${escapeHtml(receipt.folio || "Boleta Danilu")}</title>
        <style>
          ${receiptPrintStyles()}
        </style>
      </head>
      <body>${buildReceiptDocument(receipt)}</body>
    </html>
  `);
  printWindow.document.close();

  const doPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  const images = Array.from(printWindow.document.images);
  if (!images.length) {
    window.setTimeout(doPrint, 150);
    return;
  }

  let loaded = 0;
  const done = () => {
    loaded += 1;
    if (loaded === images.length) window.setTimeout(doPrint, 150);
  };
  images.forEach((image) => {
    if (image.complete) {
      done();
    } else {
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
    }
  });
}

function receiptPrintStyles() {
  return `
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      background: #ffffff;
      color: #111111;
      font-family: Arial, sans-serif;
      font-size: 14px;
    }

    .print-sheet {
      width: 100%;
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      color: #111111;
      padding: 24px;
      font-family: Arial, sans-serif;
    }

    .print-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 18px;
      border-bottom: 2px solid #111111;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }

    .print-brand {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      min-width: 0;
    }

    .print-brand img {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      object-fit: cover;
      flex: 0 0 auto;
    }

    .print-brand h1,
    .print-folio h2,
    .print-section h3 {
      margin: 0;
    }

    .print-brand h1 {
      font-size: 30px;
      line-height: 1.05;
    }

    .print-brand p,
    .print-folio p {
      margin: 3px 0;
      line-height: 1.2;
    }

    .print-folio {
      min-width: 240px;
      text-align: right;
    }

    .print-folio span {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 700;
      color: #444444;
    }

    .print-folio h2 {
      font-size: 28px;
      line-height: 1.05;
    }

    .print-section,
    .print-block {
      border: 1px solid #c7c7c7;
      border-radius: 6px;
      padding: 10px;
      margin-top: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .print-section h3,
    .print-block strong {
      display: block;
      margin-bottom: 8px;
      font-size: 18px;
    }

    .print-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 22px;
    }

    .span-2 {
      grid-column: span 2;
    }

    .print-block p {
      margin: 0;
      white-space: pre-wrap;
      line-height: 1.35;
    }

    .print-bottom {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 18px;
      align-items: end;
      margin-top: 18px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .signature-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      align-items: end;
    }

    .signature-box {
      min-height: 78px;
      border-top: 1px solid #111111;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 8px;
    }

    .signature-box span {
      font-size: 13px;
    }

    .print-total {
      border: 1px solid #111111;
      padding: 10px;
    }

    .print-total p {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin: 4px 0;
    }

    @page {
      size: A4;
      margin: 12mm;
    }

    @media print {
      .print-sheet {
        max-width: none;
        padding: 0;
      }
    }
  `;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function exportCsv() {
  const headers = [
    "folio",
    "created_at",
    "client_name",
    "client_rut",
    "phone",
    "email",
    "address",
    "device_type",
    "brand",
    "model",
    "serial_number",
    "accessories",
    "device_password",
    "warranty",
    "reported_issue",
    "diagnosis",
    "work_done",
    "parts_used",
    "technician",
    "status",
    "payment_method",
    "received_date",
    "promised_date",
    "delivered_date",
    "labor_cost",
    "other_cost",
    "discount",
    "paid_amount",
    "total",
    "balance",
    "notes",
  ];
  const lines = [headers.join(",")];
  for (const receipt of receipts) {
    lines.push(headers.map((header) => csvValue(receipt[header])).join(","));
  }
  downloadFile(`boletas-danilu-${today()}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
  showToast("CSV exportado");
}

function exportJson() {
  const payload = {
    app: "Danilu",
    exported_at: nowIso(),
    receipts,
  };
  downloadFile(
    `respaldo-danilu-${today()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8"
  );
  localStorage.setItem(BACKUP_KEY, String(Date.now()));
  renderBackupReminder();
  showToast("Respaldo exportado");
}

async function importJson(file) {
  const text = await file.text();
  const payload = JSON.parse(text);
  const imported = Array.isArray(payload) ? payload : payload.receipts;
  if (!Array.isArray(imported)) {
    throw new Error("El archivo no tiene boletas válidas");
  }

  const ok = window.confirm(`Se importarán ${imported.length} boletas. Las boletas con el mismo folio se actualizarán.`);
  if (!ok) return;

  const existingByFolio = new Map(receipts.map((receipt) => [receipt.folio, receipt]));
  for (const item of imported) {
    const existing = existingByFolio.get(item.folio);
    const payloadToSave = cleanPayload({ ...existing, ...item });
    if (existing) {
      payloadToSave.id = existing.id;
      payloadToSave.folio = existing.folio;
    } else {
      delete payloadToSave.id;
      payloadToSave.folio = item.folio;
    }
    await saveReceiptRecord(payloadToSave);
  }

  await refresh();
  showToast("Respaldo importado");
}

let searchTimer = null;
function scheduleSearch() {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(renderList, 120);
}

form.addEventListener("submit", saveReceipt);
form.addEventListener("input", updateTotals);
receiptList.addEventListener("click", (event) => {
  const card = event.target.closest(".receipt-card");
  if (card) selectReceipt(card.dataset.id);
});
pendingList.addEventListener("click", (event) => {
  const item = event.target.closest(".pending-item");
  if (item) selectReceipt(item.dataset.id);
});
searchInput.addEventListener("input", scheduleSearch);
statusFilter.addEventListener("change", renderList);
monthlySummaryButton.addEventListener("click", showMonthlySummary);
closeMonthlyButton.addEventListener("click", closeMonthlySummary);
summaryMonthInput.addEventListener("change", renderMonthlySummary);
monthlySummaryContent.addEventListener("click", (event) => {
  const item = event.target.closest(".monthly-receipt");
  if (!item) return;
  closeMonthlySummary();
  selectReceipt(item.dataset.id);
});
clearButton.addEventListener("click", resetForm);
newReceiptButton.addEventListener("click", resetForm);
deleteButton.addEventListener("click", deleteCurrent);
printButtons.forEach((button) => button.addEventListener("click", printCurrent));
previewButton.addEventListener("click", () => showPreview());
closePreviewButton.addEventListener("click", closePreview);
printNowButton.addEventListener("click", printFromPreview);
savePdfButton.addEventListener("click", savePdfFromPreview);
dismissBackupReminder.addEventListener("click", () => {
  localStorage.setItem(BACKUP_DISMISS_KEY, String(Date.now()));
  renderBackupReminder();
});
exportCsvButton.addEventListener("click", exportCsv);
exportJsonButton.addEventListener("click", exportJson);
importButton.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const [file] = importFile.files;
  if (!file) return;
  try {
    await importJson(file);
  } catch (error) {
    showToast(error.message);
  } finally {
    importFile.value = "";
  }
});

async function boot() {
  try {
    db = await openDb();
    resetForm();
    await refresh();
  } catch (error) {
    showToast("No se pudo abrir la base local del navegador");
    console.error(error);
  }
}

boot();
