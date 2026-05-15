(function () {
  "use strict";

  /* ============================
     DATA STORE
  ============================ */
  let records = [];

  let nextIdNum = 1;
  let currentPage = 1;
  const perPage = 6;
  let filterStatus = "all";
  let searchQuery = "";
  let editingId = null;
  let sortKey = null;
  let sortDir = 1;

  /* ============================
     HELPERS
  ============================ */
  function formatDate(str) {
    if (!str) return "—";
    const d = new Date(str + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatTime(str) {
    if (!str) return "—";
    const [h, m] = str.split(":");
    const hour = parseInt(h);
    const suffix = hour >= 12 ? "PM" : "AM";
    return ((hour % 12) || 12) + ":" + m + " " + suffix;
  }

  function formatTimeRange(start, end) {
    if (!start && !end) return "—";
    if (!end) return formatTime(start);
    return formatTime(start) + " - " + formatTime(end);
  }

  function cloneTemplate(id) {
    return document.getElementById(id).content.cloneNode(true);
  }

  function getFilteredRecords() {
  let result = records.filter(r => {
    const matchStatus = filterStatus === "all" || r.remarks === filterStatus;
    const q = searchQuery.toLowerCase();
    const namesStr = (r.persons || []).join(" ").toLowerCase();
    const matchSearch = !q
      || namesStr.includes(q)
      || r.id.toLowerCase().includes(q)
      || r.materialsBroken.toLowerCase().includes(q)
      || (r.teacher || "").toLowerCase().includes(q)
      || (r.subject || "").toLowerCase().includes(q)
      || (r.programSection || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  if (sortKey) {
    result = [...result].sort((a, b) => {
      let av = sortKey === "persons"
        ? (a.persons || []).join(", ")
        : (a[sortKey] || "");
      let bv = sortKey === "persons"
        ? (b.persons || []).join(", ")
        : (b[sortKey] || "");
      // date fields sort chronologically
      if (["dateBorrowed", "deadline", "dateReplaced"].includes(sortKey)) {
        av = av || "9999-12-31";
        bv = bv || "9999-12-31";
      }
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });
  }

  return result;
}

  /* ============================
     SUMMARY CARDS
  ============================ */
  function renderSummary() {
    document.getElementById("cnt-total").textContent    = records.length;
    document.getElementById("cnt-active").textContent   = records.filter(r => r.remarks === "active").length;
    document.getElementById("cnt-resolved").textContent = records.filter(r => r.remarks === "resolved").length;
    document.getElementById("cnt-overdue").textContent  = records.filter(r => r.remarks === "overdue").length;
  }

  /* ============================
     RENDER PERSONS CELL
  ============================ */
  function renderPersonsCell(persons) {
    if (!persons || persons.length === 0) {
      const span = document.createElement("span");
      span.style.color = "#aaa";
      span.textContent = "—";
      return span;
    }

    const frag = document.createDocumentFragment();
    persons.forEach(p => {
      const node = cloneTemplate("tmpl-person-name");
      node.querySelector(".person-name-plain").textContent = p;
      frag.appendChild(node);
    });
    return frag;
  }

  /* ============================
     TABLE
  ============================ */
  function renderTable() {
    const filtered = getFilteredRecords();
    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const slice = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
    const tbody = document.getElementById("accountability-tbody");
    tbody.innerHTML = "";

    if (slice.length === 0) {
      tbody.appendChild(cloneTemplate("tmpl-empty-state"));
    } else {
      slice.forEach(r => {
        const remarksLabel = r.remarks.charAt(0).toUpperCase() + r.remarks.slice(1);
        const rowFrag = cloneTemplate("tmpl-table-row");
        const row = rowFrag.querySelector("tr");

        row.dataset.id = r.id;

        row.querySelector(".col-date-borrowed").textContent    = formatDate(r.dateBorrowed);
        row.querySelector(".col-materials-broken").textContent = r.materialsBroken;
        row.querySelector(".col-teacher").textContent          = r.teacher || "—";
        row.querySelector(".col-subject").textContent          = r.subject || "—";
        row.querySelector(".col-time").textContent             = formatTimeRange(r.time, r.timeEnd);
        row.querySelector(".col-program-section").textContent  = r.programSection || "—";
        row.querySelector(".col-deadline").textContent         = formatDate(r.deadline);
        row.querySelector(".col-date-replaced").textContent    = formatDate(r.dateReplaced);
        row.querySelector(".col-received-by").textContent      = r.receivedBy || "—";

        // Remarks badge
        const badge = document.createElement("span");
        badge.className = "status-badge " + r.remarks;
        badge.textContent = remarksLabel;
        row.querySelector(".col-remarks").appendChild(badge);

        // Persons cell
        const personsCell = row.querySelector(".col-persons");
        personsCell.appendChild(renderPersonsCell(r.persons));

        // Action buttons
        const viewBtn    = row.querySelector(".action-btn.view");
        const editBtn    = row.querySelector(".action-btn.edit");
        const resolveBtn = row.querySelector(".action-btn.resolve");
        const deleteBtn  = row.querySelector(".action-btn.delete");

        viewBtn.addEventListener("click",   () => window.viewRecord(r.id));
        editBtn.addEventListener("click",   () => window.openEditModal(r.id));
        deleteBtn.addEventListener("click", () => window.deleteRecord(r.id));

        if (r.remarks === "resolved") {
          resolveBtn.remove();
        } else {
          resolveBtn.addEventListener("click", () => window.resolveRecord(r.id));
        }

        tbody.appendChild(rowFrag);
      });
    }

    document.getElementById("table-meta").textContent =
      `Showing ${slice.length} of ${filtered.length} record${filtered.length !== 1 ? "s" : ""}`;

    renderPagination(totalPages);
  }

  /* ============================
     PAGINATION
  ============================ */
  function renderPagination(totalPages) {
    const container = document.getElementById("pagination-btns");
    container.innerHTML = "";

    const prev = document.createElement("button");
    prev.className = "page-btn";
    prev.innerHTML = "<i class='bx bx-chevron-left'></i>";
    prev.disabled = currentPage === 1;
    prev.style.opacity = currentPage === 1 ? "0.4" : "1";
    prev.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderTable(); } });
    container.appendChild(prev);

    const cur = document.createElement("button");
    cur.className = "page-btn active";
    cur.textContent = currentPage;
    container.appendChild(cur);

    const next = document.createElement("button");
    next.className = "page-btn";
    next.innerHTML = "<i class='bx bx-chevron-right'></i>";
    next.disabled = currentPage === totalPages;
    next.style.opacity = currentPage === totalPages ? "0.4" : "1";
    next.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; renderTable(); } });
    container.appendChild(next);
  }

  /* ============================
     MULTI-PERSON FIELD BUILDER
  ============================ */
  function getPersonsContainer() {
    return document.getElementById("persons-container");
  }

  function buildPersonsField(persons) {
    const container = getPersonsContainer();
    container.innerHTML = "";
    const list = (persons && persons.length > 0) ? persons : [""];
    list.forEach(name => _appendPersonRow(name));
    _syncPersonUI();
  }

  function _appendPersonRow(value = "") {
    const container = getPersonsContainer();
    const frag = cloneTemplate("tmpl-person-row");
    const row = frag.querySelector(".person-input-row");

    row.querySelector(".person-num").textContent = container.children.length + 1;
    row.querySelector(".person-input").value = value;
    row.querySelector(".person-remove-btn").addEventListener("click", function () {
      window._removePerson(this);
    });

    container.appendChild(frag);
  }

  window._removePerson = function(btn) {
    const container = getPersonsContainer();
    if (container.children.length <= 1) return;
    btn.closest(".person-input-row").remove();
    _syncPersonUI();
  };

  function _syncPersonUI() {
    const rows = getPersonsContainer().querySelectorAll(".person-input-row");
    rows.forEach((row, i) => {
      row.querySelector(".person-num").textContent = i + 1;
      row.querySelector(".person-remove-btn").style.visibility = rows.length > 1 ? "visible" : "hidden";
    });
  }

  window.addPersonRow = function() {
    _appendPersonRow("");
    _syncPersonUI();
    const inputs = getPersonsContainer().querySelectorAll(".person-input");
    inputs[inputs.length - 1].focus();
  };

  function getPersonsFromForm() {
    return Array.from(getPersonsContainer().querySelectorAll(".person-input"))
      .map(i => i.value.trim())
      .filter(v => v.length > 0);
  }

  /* ============================
     MODAL: ADD / EDIT
  ============================ */
  window.openAddModal = function () {
    editingId = null;
    document.getElementById("modal-title-text").textContent = "Add Accountability Record";
    document.getElementById("acc-form").reset();
    document.getElementById("form-remarks").value = "active";
    buildPersonsField([""]);
    openModal("acc-modal");
  };

  window.openEditModal = function (id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    editingId = id;
    document.getElementById("modal-title-text").textContent  = "Edit Record";
    document.getElementById("form-date-borrowed").value      = r.dateBorrowed;
    document.getElementById("form-materials-broken").value   = r.materialsBroken;
    document.getElementById("form-teacher").value            = r.teacher;
    document.getElementById("form-subject").value            = r.subject;
    document.getElementById("form-time-start").value         = r.time    || "";
    document.getElementById("form-time-end").value           = r.timeEnd || "";
    document.getElementById("form-program-section").value    = r.programSection;
    document.getElementById("form-deadline").value           = r.deadline;
    document.getElementById("form-remarks").value            = r.remarks;
    document.getElementById("form-date-replaced").value      = r.dateReplaced || "";
    document.getElementById("form-received-by").value        = r.receivedBy || "";
    buildPersonsField(r.persons && r.persons.length > 0 ? r.persons : [""]);
    openModal("acc-modal");
  };

  function saveRecord() {
    const dateBorrowed    = document.getElementById("form-date-borrowed").value;
    const persons         = getPersonsFromForm();
    const materialsBroken = document.getElementById("form-materials-broken").value.trim();
    const teacher         = document.getElementById("form-teacher").value.trim();
    const subject         = document.getElementById("form-subject").value.trim();
    const time            = document.getElementById("form-time-start").value;
    const timeEnd         = document.getElementById("form-time-end").value;
    const programSection  = document.getElementById("form-program-section").value.trim();
    const deadline        = document.getElementById("form-deadline").value;
    const remarks         = document.getElementById("form-remarks").value;
    const dateReplaced    = document.getElementById("form-date-replaced").value;
    const receivedBy      = document.getElementById("form-received-by").value.trim();

    if (persons.length === 0 || !materialsBroken || !dateBorrowed) {
      showToast("Please fill in required fields.", true);
      return;
    }

    if (editingId) {
      const idx = records.findIndex(x => x.id === editingId);
      records[idx] = { ...records[idx], dateBorrowed, persons, materialsBroken, teacher, subject, time, timeEnd, programSection, deadline, remarks, dateReplaced, receivedBy };
      showToast("Record updated successfully.");
    } else {
      const id = "ACC-" + String(nextIdNum++).padStart(3, "0");
      records.push({ id, dateBorrowed, persons, materialsBroken, teacher, subject, time, timeEnd, programSection, deadline, remarks, dateReplaced, receivedBy });
      showToast("Record added successfully.");
    }

    closeModal("acc-modal");
    renderSummary();
    renderTable();
  }

  /* ============================
     VIEW DETAIL MODAL
  ============================ */
  window.viewRecord = function (id) {
    const r = records.find(x => x.id === id);
    if (!r) return;

    const remarksLabel = r.remarks.charAt(0).toUpperCase() + r.remarks.slice(1);
    const detailContent = document.getElementById("detail-content");
    detailContent.innerHTML = "";

    // --- Persons block ---
    const personsFrag = cloneTemplate("tmpl-detail-persons-block");
    const personsBlock = personsFrag.querySelector(".detail-persons-block");

    personsBlock.querySelector(".detail-persons-label").textContent =
      r.persons && r.persons.length > 1
        ? "Persons Responsible (" + r.persons.length + ")"
        : "Person Responsible";

    const remarksBadge = personsBlock.querySelector(".detail-remarks-badge");
    remarksBadge.classList.add(r.remarks);
    remarksBadge.textContent = remarksLabel;

    const personsList = personsBlock.querySelector(".detail-persons-list");
    (r.persons || []).forEach((p, i) => {
      const entryFrag = cloneTemplate("tmpl-detail-person-entry");
      entryFrag.querySelector(".person-index").textContent = (i + 1) + ".";
      entryFrag.querySelector(".person-name").textContent = p;
      personsList.appendChild(entryFrag);
    });

    personsBlock.querySelector(".detail-record-id").textContent = r.id;
    detailContent.appendChild(personsFrag);

    // --- Incident details ---
    const incidentFrag = cloneTemplate("tmpl-detail-incident");
    incidentFrag.querySelector(".col-date-borrowed").textContent   = formatDate(r.dateBorrowed);
    incidentFrag.querySelector(".col-time").textContent            = formatTimeRange(r.time, r.timeEnd);
    incidentFrag.querySelector(".col-materials-broken").textContent = r.materialsBroken;
    incidentFrag.querySelector(".col-teacher").textContent         = r.teacher || "—";
    incidentFrag.querySelector(".col-subject").textContent         = r.subject || "—";
    incidentFrag.querySelector(".col-program-section").textContent = r.programSection || "—";
    detailContent.appendChild(incidentFrag);

    // --- Resolution ---
    const resFrag = cloneTemplate("tmpl-detail-resolution");
    resFrag.querySelector(".tl-deadline + .time-label, li.tl-deadline .time-label").textContent = formatDate(r.deadline);

    const timeline = resFrag.querySelector(".timeline");

    if (r.dateReplaced) {
      const itemFrag = cloneTemplate("tmpl-timeline-item");
      itemFrag.querySelector(".tl-label").textContent = "Date Replaced";
      itemFrag.querySelector(".time-label").textContent = formatDate(r.dateReplaced);
      timeline.appendChild(itemFrag);
    }

    if (r.receivedBy) {
      const itemFrag = cloneTemplate("tmpl-timeline-item");
      itemFrag.querySelector(".tl-label").textContent = "Received By";
      itemFrag.querySelector(".time-label").textContent = r.receivedBy;
      timeline.appendChild(itemFrag);
    }

    detailContent.appendChild(resFrag);

    openModal("detail-modal");
  };

  /* ============================
     RESOLVE / DELETE
  ============================ */
  window.resolveRecord = function (id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    r.remarks = "resolved";
    r.dateReplaced = new Date().toISOString().split("T")[0];
    renderSummary();
    renderTable();
    showToast("Record marked as resolved.");
  };

  window.deleteRecord = function (id) {
    if (!confirm("Delete this accountability record?")) return;
    records = records.filter(x => x.id !== id);
    renderSummary();
    renderTable();
    showToast("Record deleted.");
  };

  /* ============================
     MODAL HELPERS
  ============================ */
  function openModal(id) {
    document.getElementById(id).classList.add("open");
  }

  function closeModal(id) {
    document.getElementById(id).classList.remove("open");
  }

  document.querySelectorAll(".modal-close, .btn-cancel-modal").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("open"));
    });
  });

  document.querySelectorAll(".modal-overlay").forEach(m => {
    m.addEventListener("click", e => {
      if (e.target === m) m.classList.remove("open");
    });
  });

  /* ============================
     TOAST
  ============================ */
  function showToast(msg, isError = false) {
    const t = document.getElementById("toast");
    const icon = document.createElement("i");
    icon.className = "bx " + (isError ? "bx-error-circle" : "bx-check-circle");
    t.innerHTML = "";
    t.appendChild(icon);
    t.appendChild(document.createTextNode(" " + msg));
    t.className = "toast" + (isError ? " error" : "");
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
  }

  /* ============================
     CONTROLS
  ============================ */
  document.getElementById("search-input").addEventListener("input", e => {
    searchQuery = e.target.value;
    currentPage = 1;
    renderTable();
  });

  document.getElementById("filter-status").addEventListener("change", e => {
    filterStatus = e.target.value;
    currentPage = 1;
    renderTable();
  });

  document.getElementById("btn-save-record").addEventListener("click", saveRecord);

  /* ============================
     INIT
  ============================ */
  renderSummary();
  renderTable();
  document.querySelectorAll(".accountability-table thead th[data-sort]").forEach(th => {
  th.style.cursor = "pointer";
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    if (sortKey === key) {
      sortDir *= -1;
    } else {
      sortKey = key;
      sortDir = 1;
    }
    // update sort icon
    document.querySelectorAll(".accountability-table thead th[data-sort] i").forEach(icon => {
      icon.className = "bx bx-sort-alt-2";
      icon.style.opacity = ".6";
    });
    const icon = th.querySelector("i");
    if (icon) {
      icon.className = sortDir === 1 ? "bx bx-sort-up" : "bx bx-sort-down";
      icon.style.opacity = "1";
    }
    currentPage = 1;
    renderTable();
  });
});

})();
