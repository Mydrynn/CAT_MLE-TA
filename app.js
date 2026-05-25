/* app.js — Translation Assist reviewer workflow mockup (front-end only)
   - Plain HTML/CSS/Vanilla JS
   - Uses in-memory state (no persistence)
   - Renders screens: Reach Content Manager, Catalyst Design, Reviewer View
   - Modals: Edit Course, MLE Review (4-step), Assign Reviewers (4-step), Review Progress
   - Toasts + Demo control bar included
*/

(() => {
  // -----------------------------
  // 0) State
  // -----------------------------
  const initialState = () => ({
    currentScreen: "reach", // "reach" | "design" | "reviewer"
    reviewerMode: false,
    reviewerLanguage: null, // "frCA" | "esLA"

    mleApplied: true,
    reviewersAssigned: false,
    publishingLock: true,

    activeModal: null, // null | "editCourse" | "mleReview" | "assignReviewers" | "reviewProgress" | "submitSuccess"
    modalStep: 1,

    selectedLanguages: ["frCA", "esLA"],

    allowComments: true,
    restrictToAssigned: true,
    preventPublishUntilApproved: true,

    dueDate: "",
    instructions:
      "Please review the Translation Assist suggestions for accuracy, tone, terminology, and local compliance. Approve each field if acceptable. Reject or comment where changes are required.",
    notifyEmail: true,
    notifyLink: true,
    notifyOnComplete: true,

    course: {
      title: "Insider Trading",
      catalogId: "CMP224-a92en",
      metaLine: "Market Conduct | CMP224 | Course",
      duration: "~25 mins",
      pages: "38 Pages",
      description:
        'This course summarizes the laws prohibiting insider trading and the key components of an effective insider trading policy. It provides guidelines to help all employees avoid the serious penalties that can result from trading, or helping others trade, based on "inside" information.'
    },

    languages: {
      en: {
        name: "English",
        catalogId: "CMP224-a92en",
        statusBadge: "Draft",
        reviewerStatus: null
      },
      frCA: {
        code: "frCA",
        name: "French (Canada)",
        shortName: "French (CA)",
        catalogId: "CMP224-a92frCA",
        reviewerOptions: [
          { name: "Marie Dubois", role: "Legal Reviewer" },
          { name: "Jean Tremblay", role: "Regional SME" },
          { name: "Sophie Martin", role: "Compliance Reviewer" }
        ],
        reviewer: "Marie Dubois",
        reviewerRole: "Legal Reviewer",
        status: "Not assigned", // Not assigned | In Review | Approved | Changes Requested | Ready to Publish
        taChanges: 1,
        approved: 0,
        rejected: 0,
        comments: 0,
        suggestion: "Nouveau texte ici",
        review: {
          decision: null, // "approve" | "reject" | null
          comment: "",
          submitted: false
        }
      },
      esLA: {
        code: "esLA",
        name: "Spanish (Latin America)",
        shortName: "Spanish (LA)",
        catalogId: "CMP224-a92esLA",
        reviewerOptions: [
          { name: "Carlos Rivera", role: "Regional SME" },
          { name: "Ana Morales", role: "Legal Reviewer" },
          { name: "Lucia Fernandez", role: "Compliance Reviewer" }
        ],
        reviewer: "Carlos Rivera",
        reviewerRole: "Regional SME",
        status: "Not assigned",
        taChanges: 1,
        approved: 0,
        rejected: 0,
        comments: 0,
        suggestion: "Nuevo texto aquí",
        review: {
          decision: null,
          comment: "",
          submitted: false
        }
      }
    },

    // used for MLE modal
    mle: {
      step: 1
    }
  });

  let state = initialState();

  // -----------------------------
  // 1) DOM bootstrap
  // -----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function ensureBaseScaffold() {
    // Require a root container
    let app = document.getElementById("app");
    if (!app) {
      app = document.createElement("div");
      app.id = "app";
      document.body.appendChild(app);
    }

    // If the app is empty, inject a baseline layout that styles.css can target
    if (!app.dataset.scaffolded) {
      app.innerHTML = `
        <div class="shell">
          <aside class="sidebar" aria-label="Reach sidebar">
            <div class="rail">
              <button class="rail-icon active" title="Content">▦</button>
              <button class="rail-icon" title="Catalog">☰</button>
              <button class="rail-icon" title="Users">👤</button>
              <button class="rail-icon" title="Reports">📊</button>
              <button class="rail-icon" title="Settings">⚙</button>
            </div>
          </aside>

          <div class="main">
            <header class="topbar">
              <div class="topbar-left">
                <div class="brand"><span class="brand-mark">Reach</span></div>
              </div>
              <div class="topbar-right">
                <button class="toplink" data-action="               <button class="iconbtn" title="Settings" data-action=" data-action="v class="userchip">Ed Hickey (Super User)</div>
              </div>
            </header>

            <div class="content" id="screenHost"></div>
          </div>

          <button class="chat-fab" title="Help / Chat" aria-label="Help / Chat">💬</button>

          <div class="toast-host" id="toastHost" aria-live="polite" aria-atomic="true"></div>

          <div class="modal-host" id="modalHost" aria-live="polite"></div>

          <div class="demo-bar" id="demoBar">
            <button class="demobtn" data-action="resetDemoon class="demobtn" data-action="jumpAdminutton class="demobtn" data-action="jumpReviewer <button class="demobtn" data-action="completeAll   </div>
        </div>
      `;
      app.dataset.scaffolded = "true";
    }
  }

  // -----------------------------
  // 2) Rendering helpers
  // -----------------------------
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function badge(text, variant = "warning") {
    // variants: warning, success, danger, neutral, info
    return `<span class="badge badge-${variant}">${escapeHtml(text)}</span>`;
  }

  function pill(text, variant = "neutral") {
    return `<span class="pill pill-${variant}">${escapeHtml(text)}</span>`;
  }

  function setBrand(mode) {
    // Reach vs Design branding
    const brand = $(".brand-mark");
    const sidebar = $(".sidebar");
    if (!brand) return;

    if (mode === "design" || mode === "reviewer") {
      brand.textContent = "Design";
      brand.parentElement.classList.add("brand-design");
      sidebar?.classList.add("sidebar-hidden"); // design looks more full-width in video
    } else {
      brand.textContent = "Reach";
      brand.parentElement.classList.remove("brand-design");
      sidebar?.classList.remove("sidebar-hidden");
    }
  }

  function render() {
    ensureBaseScaffold();
    const host = $("#screenHost");
    if (!host) return;

    // Set brand based on screen
    setBrand(state.currentScreen);

    // Render screen
    if (state.currentScreen === "reach") {
      host.innerHTML = renderReachScreen();
    } else if (state.currentScreen === "design") {
      host.innerHTML = renderDesignScreen();
    } else {
      host.innerHTML = renderReviewerScreen();
    }

    // Render modal overlay if needed
    renderModal();
    // Update demo bar visibility (always visible per spec)
    // Keep chat FAB visible
  }

  // -----------------------------
  // 3) Screen A: Reach Content Manager
  // -----------------------------
  function renderReachScreen() {
    const { course, languages } = state;
    const fr = languages.frCA;
    const es = languages.esLA;

    const reviewerStatusBadge = (lang) => {
      if (!lang) return "";
      const s = lang.status;
      if (s === "Not assigned") return pill("Not assigned", "neutral");
      if (s === "In Review") return pill("In Review", "info");
      if (s === "Approved") return pill("Review Approved", "success");
      if (s === "Changes Requested") return pill("Changes Requested", "danger");
      if (s === "Ready to Publish") return pill("Ready to Publish", "success");
      return pill(s, "neutral");
    };

    const showProgressButton = state.reviewersAssigned;

    return `
      <div class="reach-page">
        <div class="page-top">
          <button class="btn btn-ghost" data-action="back      <div class="course-hero card">
          <div class="hero-img">
            <div class="img-placeholder"></div>
          </div>
          <div class="hero-text">
            <div class="kicker">${escapeHtml(course.metaLine)}</div>
            <h1 class="title">${escapeHtml(course.title)}</h1>
            <div class="meta">${escapeHtml(course.duration)} • ${escapeHtml(course.pages)}</div>
            <p class="desc">${escapeHtml(course.description)}</p>
          </div>
        </div>

        <div class="stats-bar card">
          <div class="stat"><div class="stat-num">52</div><div class="stat-lbl">Available Languages</div></div>
          <div class="stat"><div class="stat-num">3</div><div class="stat-lbl">Language in Use</div></div>
          <div class="stat"><div class="stat-num">3</div><div class="stat-lbl">Draft</div></div>
          <div class="stat"><div class="stat-num">0</div><div class="stat-lbl">Published</div></div>
        </div>

        <div class="lang-accordion card">
          <div class="section-title">Languages</div>

          ${renderLanguageRow({
            code: "en",
            name: "English",
            catalogId: languages.en.catalogId,
            expanded: true,
            draftBadge: true,
            reviewerBadge: null,
            actions: `
              <button class="iconbtn" title="Preview" data-action="previewEnglishle="Edit" data-action="openEditCoursetn" title="Upload" data-action="noople="Download" dataandedBody: `
              <div class="lang-expanded">
                <div class="expanded-left">
                  <div class="small">Library Version <strong>CMP224-a92en</strong></div>
                  <div class="expanded-title">Insider Trading</div>
                  <div class="small">Published by LRN on Apr 28, 2025</div>
                </div>
                <div class="expanded-right">
                  <button class="btn btn-primary" data-action="openAssignReviewers{showProgressButton ? `<button class="btn btn-outline" data-action="openReviewProgress        </div>
              </div>
            `
          })}

          ${renderLanguageRow({
            code: "frCA",
            name: "French (Canada)",
            catalogId: fr.catalogId,
            expanded: false,
            draftBadge: true,
            reviewerBadge: reviewerStatusBadge(fr),
            actions: `<button class="iconbtn" title="Menu" data-action="noopageRow({
            code: "esLA",
            name: "Spanish (Latin America)",
            catalogId: es.catalogId,
            expanded: false,
            draftBadge: true,
            reviewerBadge: reviewerStatusBadge(es),
            actions: `<button class="iconbtn" title="Menu" data-action="noopiv>
    `;
  }

  function renderLanguageRow({ code, name, catalogId, expanded, draftBadge, reviewerBadge, actions, expandedBody }) {
    return `
      <div class="lang-row ${expanded ? "expanded" : ""}">
        <div class="lang-main">
          <button class="chev" data-action="toggleLang" data-lang="${code}" aria-label="Expandname">${escapeHtml(name)}</div>
            <div class="lang-sub">${escapeHtml(catalogId)}</div>
          </div>
          <div class="lang-badges">
            ${draftBadge ? badge("Draft", "warning") : ""}
            ${reviewerBadge || ""}
          </div>
          <div class="lang-actions">${actions || ""}</div>
        </div>
        ${expanded && expandedBody ? `<div class="lang-body">${expandedBody}</div>` : ""}
      </div>
    `;
  }

  // -----------------------------
  // 4) Screen B: Catalyst Design editor
  // -----------------------------
  function renderDesignScreen() {
    const { course, languages } = state;

    const rightPanelNotice = state.mleApplied
      ? `
        <div class="notice-card notice-warning">
          <div class="notice-title">There are 2 language drafts with TA changes awaiting review.</div>
          <button class="btn btn-outline btn-sm" data-action="openAssignReviewers;

    const progressButton = state.reviewersAssigned
      ? `<button class="btn btn-outline btn-sm" data-action="openReviewProgressrn `
      <div class="design-page">
        <header class="design-header">
          <div class="design-logo"><span class="logo-mark">C</span> Design</div>
          <nav class="design-tabs">
            <a class="tab active" href="#" data-action="noop">Getting Started</a>
            <a class="tab" href="#" data-action="noop">Customize Your Course</a>
            <a class="tab" href="#" data-action="noop">Adaptive</a>
            <a class="tab" href="#" data-action="noop">Knowledge Check</a>
            <a class="tab" href="#" data-action="noop">Disclosure</a>
            <a class="tab" href="#" data-action="noop">Gamification</a>
            <a class="tab" href="#" data-action="noop">Features</a>
          </nav>
          <div class="design-actions">
            <button class="btn btn-outline btn-sm" data-action<div class="form-grid">
              <label class="field">
                <span>Course Name</span>
                <input type="text" value="${escapeHtml(course.title)}" />
              </label>

              <label class="field field-wide">
                <span>Get Started Page</span>
                <textarea rows="4">${escapeHtml(course.description)}</textarea>
              </label>

              <label class="field field-wide">
                <span>Long Course Description</span>
                <textarea rows="3">This Insider Trading training course will help learners apply knowledge of insider trading legislation to real-world situations and scenarios.</textarea>
              </label>

              <label class="field">
                <span>Course Duration (Minutes)</span>
                <input type="text" value="25" />
              </label>

              <label class="field">
                <span>Video</span>
                <select><option selected>YES</option><option>NO</option></select>
              </label>

              <label class="field">
                <span>Audio</span>
                <select><option selected>YES</option><option>NO</option></select>
              </label>
            </div>
          </div>

          <aside class="design-right card">
            <div class="panel-title">Multilingual Editing</div>
            <div class="panel-copy">Do you want to simultaneously edit the localized version of this course</div>
            <div class="toggle-row">
              <span>Toggle:</span>
              <span class="toggle-pill on">Yes</span>
            </div>

            <button class="btn btn-primary btn-full" data-action="openMleReviewl-divider"></div>

            <div class="panel-title">AI-Powered Translation Assist</div>
            <div class="panel-copy">Do you want textual changes to be automatically translated by AI?</div>
            <div class="toggle-row">
              <span>Toggle:</span>
              <span class="toggle-pill on">Yes</span>
            </div>

            <div class="ta-box">
              <div class="ta-hdr">Translation assist available for languages below.</div>
              <div class="ta-sub">2 languages are available for Translation Assist</div>

              <div class="ta-lang">
                <div class="ta-name">CA - French</div>
                <span class="toggle-mini on">On</span>
              </div>
              <div class="ta-lang">
                <div class="ta-name">LA - Spanish</div>
                <span class="toggle-mini on">On</span>
              </div>
            </div>

            ${rightPanelNotice}
            ${progressButton}

            <div class="panel-divider"></div>

            <div class="kv">
              <div class="kv-row"><div>Status</div><div>${badge("Draft", "warning")}</div></div>
              <div class="kv-row"><div>System ID</div><div class="muted">75477</div></div>
              <div class="kv-row"><div>Catalog ID</div><div class="muted">${escapeHtml(languages.en.catalogId)}</div></div>
            </div>

            ${
              state.preventPublishUntilApproved && state.reviewersAssigned
                ? `<div class="notice-card notice-warning">
                    <div class="notice-title">Publishing is locked until all assigned translation reviews are approved.</div>
                  </div>`
                : ""
            }
          </aside>
        </div>
      </div>
    `;
  }

  // -----------------------------
  // 5) Screen: Reviewer view
  // -----------------------------
  function renderReviewerScreen() {
    const langCode = state.reviewerLanguage || "frCA";
    const lang = state.languages[langCode];

    const reviewerName = lang.reviewer;
    const languageName = lang.name;
    const courseTitle = state.course.title;

    const reviewedCount = lang.review.decision ? 1 : 0;

    const decision = lang.review.decision; // approve | reject | null

    const cardClass =
      decision === "approve" ? "review-card approved" : decision === "reject" ? "review-card rejected" : "review-card";

    const submitEnabled =
      decision === "approve"
        ? true
        : decision === "reject"
        ? state.allowComments && lang.review.comment.trim().length > 0
        : false;

    return `
      <div class="reviewer-page">
        <div class="reviewer-banner">
          <div class="banner-title">Translation Review Mode</div>
          <div class="banner-meta">
            Reviewer: <strong>${escapeHtml(reviewerName)}</strong> &nbsp;|&nbsp;
            Language: <strong>${escapeHtml(languageName)}</strong> &nbsp;|&nbsp;
            Course: <strong>${escapeHtml(courseTitle)}</strong>
          </div>
          <div class="banner-note">Access is restricted to the assigned language draft only.</div>
        </div>

        <header class="design-header">
          <div class="design-logo"><span class="logo-mark">C</span> Design</div>
          <nav class="design-tabs">
            <a class="tab active" href="#" data-action="noop">Getting Started</a>
            <a class="tab" href="#" data-action="noop">Customize Your Course</a>
            <a class="tab" href="#" data-action="noop">Adaptive</a>
            <a class="tab" href="#" data-action="noop">Knowledge Check</a>
            <a class="tab" href="#" data-action="noop">Disclosure</a>
            <a class="tab" href="#" data-action="noop">Gamification</a>
            <a class="tab" href="#" data-action="noop">Features</a>
          </nav>
          <div class="design-actions">
            <button class="btn btn-ghost btn-sm" data-action="backToProgress         <li>What Is Insider...</li>
              <li class="indent">1. YOU are an IN...</li>
              <li class="indent">2. Dinner Conver...</li>
              <li class="indent">3. Remember...</li>
              <li class="indent">4. Broker Dilemma</li>
              <li class="indent">5. Remember...</li>
              <li class="indent">6. Keep It Betwe...</li>
              <li class="indent">7. Thanks for hel...</li>
            </ul>
          </aside>

          <main class="review-main">
            <div class="card editor-card">
              <div class="editor-title">Title</div>
              <div class="editor-value">${escapeHtml(
                langCode === "frCA"
                  ? "VOUS êtes un INITIÉ dans notre entreprise!"
                  : "¡USTED es un INFORMADO en nuestra empresa!"
              )}</div>

              <div class="editor-title mt16">Description</div>
              <div class="empty-field">${badge("Pending", "danger")} <span class="muted">Current field is empty / needs verification.</span></div>

              <div class="editor-title mt16">Description Translation</div>
              <div class="${cardClass}" data-field="descTranslation">
                <div class="review-field-left">
                  <div class="orig">
                    <div class="label">Original English:</div>
                    <div class="value">New text here</div>
                  </div>
                  <div class="suggest">
                    <div class="label">TA suggestion:</div>
                    <div class="value">${escapeHtml(lang.suggestion)}</div>
                    <div class="subvalue">${escapeHtml(langCode === "frCA" ? "Nouveau texte ici" : "Nuevo texto aquí")}</div>
                  </div>
                </div>

                <div class="review-field-actions">
                  <button class="iconbtn iconbtn-approve" title="Approve" data-action="reviewApproveitle="Reject" data-action="reviewReject</div>
          </main>

          <aside class="review-panel card">
            <div class="panel-title">Review task</div>
            <div class="kv">
              <div class="kv-row"><div>Language:</div><div><strong>${escapeHtml(languageName)}</strong></div></div>
              <div class="kv-row"><div>Assigned to:</div><div>${escapeHtml(reviewerName)}</div></div>
              <div class="kv-row"><div>TA changes:</div><div>${lang.taChanges}</div></div>
              <div class="kv-row"><div>Reviewed:</div><div>${reviewedCount} of ${lang.taChanges}</div></div>
            </div>

            <div class="panel-divider"></div>

            <div class="panel-subtitle">Original English:</div>
            <div class="panel-box">New text here</div>

            <div class="panel-subtitle mt12">TA suggestion:</div>
            <div class="panel-box">${escapeHtml(lang.suggestion)}</div>

            <div class="panel-subtitle mt12">Decision:</div>
            <div class="btnrow">
              <button class="btn btn-outline btn-sm ${decision === "approve" ? "selected" : ""}" data-action="reviewApproveselected" : ""}" data-action="reviewReject
            <textarea class="commentbox" rows="4" placeholder="Add a comment (required if rejecting)..." data-action="reviewn class="btn btn-primary btn-full mt12 ${submitEnabled ? "" : "disabled"}" ${
      submitEnabled ? "" : "disabled"
    } data-action="ls
  // -----------------------------
  function renderModal() {
    const modalHost = $("#modalHost");
    if (!modalHost) return;

    if (!state.activeModal) {
      modalHost.innerHTML = "";
      return;
    }

    let content = "";
    if (state.activeModal === "editCourse") content = modalEditCourse();
    if (state.activeModal === "mleReview") content = modalMleReview();
    if (state.activeModal === "assignReviewers") content = modalAssignReviewers();
    if (state.activeModal === "reviewProgress") content = modalReviewProgress();
    if (state.activeModal === "submitSuccess") content = modalSubmitSuccess();

    modalHost.innerHTML = `
      <div class="modal-backdrop" data-action="closeModal"dialog" aria-modal="true" aria-label="Modal" onclick="event.stopPropagation()">
          ${content}
        </div>
      </div>
    `;
  }

  function modalEditCourse() {
    return `
      <div class="modal-header">
        <div class="modal-title">Edit Course</div>
        <button class="iconbtn" title="Close" data-action="closeModaly">
        <p>You will be directed to Catalyst Design to edit this course.</p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-action="closeModaltn btn-primary" data-action="continue      </div>
    `;
  }

  function modalMleReview() {
    const step = state.modalStep;

    const steps = [
      { n: 1, t: "Structural Edits" },
      { n: 2, t: "Textual Edits" },
      { n: 3, t: "Confirm Languages" },
      { n: 4, t: "Apply" }
    ];

    const stepper = `
      <div class="stepper">
        ${steps
          .map((s) => {
            const done = s.n < step;
            const active = s.n === step;
            return `
              <div class="step ${done ? "done" : ""} ${active ? "active" : ""}">
                <div class="circle">${s.n}</div>
                <div class="label">${s.t}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    let body = "";
    let footer = "";

    if (step === 1) {
      body = `
        <div class="modal-section-title">Multilingual Editing Review</div>
        ${stepper}
        <div class="notice-card notice-success">
          <div class="notice-title">No structural changes detected.</div>
        </div>
      `;
      footer = `
        <button class="btn btn-ghost" data<button class="btn btn-primary" data-action="nextModal(step === 2) {
      body = `
        <div class="modal-section-title">Multilingual Editing Review</div>
        ${stepper}

        <div class="split">
          <div class="pane">
            <input class="search" placeholder="Search" />
            <div class="treebox">
              <div class="treeitem">What Is Insider Trading?</div>
              <div class="treeitem indent">YOU are an INSIDER at our company!</div>
            </div>
          </div>

          <div class="pane">
            <div class="small muted">Content &gt; Description</div>
            <div class="contentbox">New text here</div>
          </div>
        </div>
      `;
      footer = `
        <button class="btn btn-ghost" data <button class="btn btn-primary" data-action="nextModalStepp === 3) {
      body = `
        <div class="modal-section-title">Multilingual Editing Review</div>
        ${stepper}

        <div class="two-col">
          <div class="col card-lite">
            <div class="col-title">Structural Changes</div>
            <div class="small muted">Applies to 0 languages</div>
            <div class="empty">No languages found</div>
          </div>

          <div class="col card-lite">
            <div class="col-title">Textual Changes</div>
            <div class="small muted">Applies to 2 languages</div>
            <ul class="list">
              <li>French (CA)</li>
              <li>Spanish (LA)</li>
            </ul>
          </div>
        </div>

        <div class="notice-card notice-warning">
          <div class="notice-title">
            Once proceed, textual changes will be saved as Drafts in all compatible languages. Open each draft, review and save to publish.
          </div>
        </div>
      `;
      footer = `
        <button class="btn btn-ghost" data-action="prevModalStepn-primary"      `;
    }

    if (step === 4) {
      body = `
        <div class="modal-section-title">Multilingual Editing Review</div>
        ${stepper}

        <div class="notice-card notice-success">
          <div class="notice-title">
            All Changes Applied Successfully! Language translations are now in Draft state. Navigate to each language draft, review and save to publish.
          </div>
        </div>

        <div class="two-col">
          <div class="col card-lite">
            <div class="col-title">Structural Changes</div>
            <div class="small muted">Saved 0 languages</div>
            <div class="empty">No languages found</div>
          </div>

          <div class="col card-lite">
            <div class="col-title">Textual Changes</div>
            <div class="small muted">Applied to 2 languages</div>
            <ul class="list">
              <li>French (CA)</li>
              <li>Spanish (LA)</li>
            </ul>
          </div>
        </div>
      `;
      footer = `
        <button class="btn btn-ghost" data-action="closeModalbtn-primary" data
    // Include the exact MLE status message somewhere (per your copy list)
    // It appears in the video modal as an informational note.
    const mleStatusMessage = `
      <div class="notice-card notice-warning">
        <div class="notice-title">There are 2 languages which don't have a draft.</div>
        <div class="notice-body">Create drafts to enable full multilingual editing.</div>
      </div>
    `;

    return `
      <div class="modal-header">
        <div class="modal-title">Multilingual Editing Review</div>
        <button class="iconbtn" title="Close" data-action=""modal-body">
        ${step <= 2 ? mleStatusMessage : ""}
        ${body}
      </div>
      <div class="modal-footer">${footer}</div>
    `;
  }

  function modalAssignReviewers() {
    const step = state.modalStep;
    const fr = state.languages.frCA;
    const es = state.languages.esLA;

    const steps = [
      { n: 1, t: "Select Languages" },
      { n: 2, t: "Assign Reviewers" },
      { n: 3, t: "Review Instructions" },
      { n: 4, t: "Confirm" }
    ];

    const stepper = `
      <div class="stepper">
        ${steps
          .map((s) => {
            const done = s.n < step;
            const active = s.n === step;
            return `
              <div class="step ${done ? "done" : ""} ${active ? "active" : ""}">
                <div class="circle">${s.n}</div>
                <div class="label">${s.t}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    let body = "";
    let footer = "";

    if (step === 1) {
      body = `
        <div class="modal-section-title">Assign Translation Reviewers</div>
        ${stepper}

        <div class="summary">
          <div class="summary-title">${escapeHtml(state.course.title)}</div>
          <div class="small muted">${escapeHtml(state.course.catalogId)}</div>
          <div class="small">2 languages have Translation Assist changes awaiting review.</div>
        </div>

        <div class="card-grid">
          ${languageSelectCard("frCA")}
          ${languageSelectCard("esLA")}
        </div>
      `;
      footer = `
        <button class="btn btn-ghost" data<button class="btn btn-primary" data-action }

    if (step === 2) {
      body = `
        <div class="modal-section-title">Assign Translation Reviewers</div>
        ${stepper}

        <div class="split">
          <div class="pane">
            <div class="pane-title">Selected languages</div>
            <div class="chips">
              ${state.selectedLanguages.includes("frCA") ? `<span class="chip">French (Canada)</span>` : ""}
              ${state.selectedLanguages.includes("esLA") ? `<span class="chip">Spanish (Latin America)</span>` : ""}
            </div>

            <div class="checklist">
              <label class="check">
                <input type="checkbox" data-action="toggleAllowComments" ${state.allowComments ? "checked" : ""  </label>

              <label class="check">
                <input type="checkbox" data-action="toggleRestrictAssigned" ${state.restrictToAssigned ? "checked" : ""  </label>

              <label class="check">
                <input type="checkbox" data-action="togglePreventPublish" ${state.preventPublishUntilApproved ? "             </label>
            </div>
          </div>

          <div class="pane">
            <div class="pane-title">Assign reviewers</div>

            ${
              state.selectedLanguages.includes("frCA")
                ? `
              <div class="assign-block">
                <div class="assign-title">French (Canada)</div>
                <div class="small muted">Reviewer:</div>
                <select data-action="setReviewer" data-lang="frCAs
                    .map((o) => `<option ${o.name === fr.reviewer ? "selected" : ""} value="${escapeHtml(o.name)}">${escapeHtml(
                      o.name
                    )} - ${escapeHtml(o.role)}</option>`)
                    .join("")}
                </select>
              </div>`
                : ""
            }

            ${
              state.selectedLanguages.includes("esLA")
                ? `
              <div class="assign-block">
                <div class="assign-title">Spanish (Latin America)</div>
                <div class="small muted">Reviewer:</div>
                <select data-action="setReviewer" data-lang="esLAs
                    .map((o) => `<option ${o.name === es.reviewer ? "selected" : ""} value="${escapeHtml(o.name)}">${escapeHtml(
                      o.name
                    )} - ${escapeHtml(o.role)}</option>`)
                    .join("")}
                </select>
              </div>`
                : ""
            }
          </div>
        </div>
      `;
      footer = `
        <button class="btn btn-ghost" data-action="class="btn btn-primary" data-action="

    if (step === 3) {
      body = `
        <div class="modal-section-title">Assign Translation Reviewers</div>
        ${stepper}

        <div class="form-grid">
          <label class="field">
            <span>Due date</span>
            <input type="date" value="${escapeHtml(state.dueDate)}" data-action="setDueDate       <span>Instructions to reviewers</span>
            <textarea rows="4" data-actionate.instructions)}</textarea>
          </label>
        </div>

        <div class="checklist">
          <label class="check">
            <input type="checkbox" data-action="toggleNotifyEmail" ${state.notifyEmail ? "checked" :el class="check">
            <input type="checkbox" data-action="toggleNotifyLink" ${state.notifyLink ? "checked"  </label>

          <label class="check">
            <input type="checkbox" data-action="toggleNotifyOnComplete" ${state.notifyOnComplete ? "abel>
        </div>
      `;
      footer = `
        <button class="btn btn-ghost" data-action="prevModalStepn-primary" data-action }

    if (step === 4) {
      const lockText = state.preventPublishUntilApproved
        ? "Publishing lock: Enabled until reviews are approved"
        : "Publishing lock: Not enabled";

      body = `
        <div class="modal-section-title">Assign Translation Reviewers</div>
        ${stepper}

        <div class="confirm-copy">
          You are assigning translation review tasks for ${escapeHtml(state.course.title)}.
        </div>

        <div class="confirm-block">
          ${
            state.selectedLanguages.includes("frCA")
              ? `
            <div class="confirm-lang">
              <div class="confirm-title">French (Canada)</div>
              <div class="small">Reviewer: <strong>${escapeHtml(fr.reviewer)}</strong></div>
              <div class="small">Scope: 1 TA change</div>
              <div class="small">Access: Assigned language draft only</div>
            </div>`
              : ""
          }

          ${
            state.selectedLanguages.includes("esLA")
              ? `
            <div class="confirm-lang">
              <div class="confirm-title">Spanish (Latin America)</div>
              <div class="small">Reviewer: <strong>${escapeHtml(es.reviewer)}</strong></div>
              <div class="small">Scope: 1 TA change</div>
              <div class="small">Access: Assigned language draft only</div>
            </div>`
              : ""
          }
        </div>

        <div class="notice-card notice-warning">
          <div class="notice-title">${escapeHtml(lockText)}</div>
        </div>

        <div class="small muted">
          Notifications: ${state.notifyEmail ? "Email reviewers" : "No email"} ${
        state.notifyOnComplete ? "and notify admin on completion" : ""
      }
        </div>
      `;

      footer = `
        <button class="btn btn-ghost" data-actionn class="btn btn-primary" data-action="assign   `;
    }

    return `
      <div class="modal-header">
        <div class="modal-title">Assign Translation Reviewers</div>
        <button class="iconbtn" title="Close" data-action="closel-body">${body}</div>
      <div class="modal-footer">${footer}</div>
    `;
  }

  function languageSelectCard(code) {
    const lang = state.languages[code];
    const selected = state.selectedLanguages.includes(code);

    // Reviewer status display per spec
    const reviewerStatusText = lang.status === "Not assigned" ? "Not assigned" : lang.status;

    return `
      <button class="lang-card ${selected ? "selected" : ""}" data-action="toggleLanguageSelect" data-lang="${code"small muted">Catalog ID: ${escapeHtml(lang.catalogId)}</div>
        <div class="small">TA changes: ${lang.taChanges}</div>
        <div class="small">Status: Draft</div>
        <div class="small">Reviewer status: ${escapeHtml(reviewerStatusText)}</div>
      </button>
    `;
  }

  function modalReviewProgress() {
    const fr = state.languages.frCA;
    const es = state.languages.esLA;

    const allApproved = fr.status === "Approved" && es.status === "Approved";

    return `
      <div class="modal-header">
        <div class="modal-title">Translation Review Progress</div>
        <button class="iconbtn" title="Close" data-actionss="modal-body">
        ${
          allApproved
            ? `
          <div class="notice-card notice-success">
            <div class="notice-title">All reviews approved. Language drafts are ready for final admin review and publishing.</div>
            <button class="btn btn-outline btn-sm" dataton>
          </div>`
            : ""
        }

        <table class="table">
          <thead>
            <tr>
              <th>Language</th>
              <th>Reviewer</th>
              <th class="num">TA Changes</th>
              <th class="num">Approved</th>
              <th class="num">Rejected</th>
              <th class="num">Comments</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${escapeHtml(fr.name)}</td>
              <td>${escapeHtml(fr.reviewer)}</td>
              <td class="num">${fr.taChanges}</td>
              <td class="num">${fr.approved}</td>
              <td class="num">${fr.rejected}</td>
              <td class="num">${fr.comments}</td>
              <td>${statusPill(fr.status)}</td>
            </tr>
            <tr>
              <td>${escapeHtml(es.name)}</td>
              <td>${escapeHtml(es.reviewer)}</td>
              <td class="num">${es.taChanges}</td>
              <td class="num">${es.approved}</td>
              <td class="num">${es.rejected}</td>
              <td class="num">${es.comments}</td>
              <td>${statusPill(es.status)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" data-action="openReviewer" data-lang="frCAbtn-outline" data-action="openReviewer" data-lang="esLA btn-ghost" data-action="sendton class="btn btn-primary" data-action="closeModalction statusPill(status) {
    if (status === "Not assigned") return pill("Not assigned", "neutral");
    if (status === "In Review") return pill("In Review", "info");
    if (status === "Approved") return pill("Approved", "success");
    if (status === "Changes Requested") return pill("Changes Requested", "danger");
    if (status === "Ready to Publish") return pill("Ready to Publish", "success");
    return pill(status, "neutral");
  }

  function modalSubmitSuccess() {
    return `
      <div class="modal-header">
        <div class="modal-title">Success</div>
        <button class="iconbtn" title="Close" data-action="closeModaly">
        <div class="notice-card notice-success">
          <div class="notice-title">Review submitted successfully. The administrator has been notified.</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" data</div>
    `;
  }

  // -----------------------------
  // 7) Toasts
  // -----------------------------
  function toast(message, variant = "success", ms = 3200) {
    const host = $("#toastHost");
    if (!host) return;

    const el = document.createElement("div");
    el.className = `toast toast-${variant}`;
    el.textContent = message;

    host.appendChild(el);
    setTimeout(() => {
      el.classList.add("out");
      setTimeout(() => el.remove(), 300);
    }, ms);
  }

  // -----------------------------
  // 8) Actions / Updates
  // -----------------------------
  function openModal(name, step = 1) {
    state.activeModal = name;
    state.modalStep = step;
    render();
  }

  function closeModal() {
    state.activeModal = null;
    state.modalStep = 1;
    render();
  }

  function nextStep(max = 4) {
    state.modalStep = Math.min(max, state.modalStep + 1);
    render();
  }

  function prevStep(min = 1) {
    state.modalStep = Math.max(min, state.modalStep - 1);
    render();
  }

  function goToDesign() {
    state.currentScreen = "design";
    closeModal();
  }

  function goToReach() {
    state.currentScreen = "reach";
    state.reviewerMode = false;
    state.reviewerLanguage = null;
    closeModal();
  }

  function assignReviewers() {
    // Update language statuses
    const selected = state.selectedLanguages.slice();
    if (selected.includes("frCA")) state.languages.frCA.status = "In Review";
    if (selected.includes("esLA")) state.languages.esLA.status = "In Review";

    state.reviewersAssigned = true;
    state.publishingLock = state.preventPublishUntilApproved;

    closeModal();
    toast("Reviewers assigned successfully. French and Spanish are now In Review.", "success");
  }

  function openReviewer(langCode) {
    state.currentScreen = "reviewer";
    state.reviewerMode = true;
    state.reviewerLanguage = langCode;
    closeModal();
  }

  function submitCurrentReview() {
    const langCode = state.reviewerLanguage;
    const lang = state.languages[langCode];
    if (!lang) return;

    if (lang.review.decision === "approve") {
      lang.approved = 1;
      lang.rejected = 0;
      lang.comments = 0;
      lang.status = "Approved";
    } else if (lang.review.decision === "reject") {
      lang.approved = 0;
      lang.rejected = 1;
      lang.comments = lang.review.comment.trim() ? 1 : 0;
      lang.status = "Changes Requested";
    }

    lang.review.submitted = true;

    // If all selected languages approved, show final completion toast
    const allApproved = state.languages.frCA.status === "Approved" && state.languages.esLA.status === "Approved";
    if (allApproved) {
      toast("All reviews approved.", "success");
    } else {
      toast("Review submitted successfully.", "success");
    }

    // Show success modal then return to progress
    state.activeModal = "submitSuccess";
    state.modalStep = 1;
    render();
  }

  function returnToProgressModal() {
    // Return to Review Progress modal
    state.currentScreen = "design"; // admin context by default after submission
    state.reviewerMode = false;
    state.reviewerLanguage = null;
    state.activeModal = "reviewProgress";
    state.modalStep = 1;

    // Update Reach screen badge states if both approved
    if (state.languages.frCA.status === "Approved") {
      // nothing else required; pill display shows "Review Approved"
    }
    if (state.languages.esLA.status === "Approved") {
      // nothing else required
    }

    render();
  }

  function resetDemo() {
    state = initialState();
    toast("Demo reset.", "info");
    render();
  }

  function completeAllReviews() {
    // Mark both approved
    ["frCA", "esLA"].forEach((code) => {
      const lang = state.languages[code];
      lang.review.decision = "approve";
      lang.review.comment = "";
      lang.review.submitted = true;
      lang.approved = 1;
      lang.rejected = 0;
      lang.comments = 0;
      lang.status = "Approved";
    });
    state.reviewersAssigned = true;
    toast("All reviews approved. Language drafts are ready for final admin review and publishing.", "success");
    render();
  }

  // -----------------------------
  // 9) Global event delegation
  // -----------------------------
  function handleAction(action, el) {
    switch (action) {
      // Demo bar
      case "resetDemo":
        resetDemo();
        break;
      case "jumpAdmin":
        state.currentScreen = "design";
        state.reviewerMode = false;
        state.reviewerLanguage = null;
        closeModal();
        break;
      case "jumpReviewer":
        state.currentScreen = "reviewer";
        state.reviewerMode = true;
        state.reviewerLanguage = "frCA";
        closeModal();
        break;
      case "completeAll":
        completeAllReviews();
        break;

      // Reach / Design navigation
      case "openEditCourseModal":
        openModal("editCourse", 1);
        break;
      case "continueToDesign":
        goToDesign();
        break;
      case "saveExit":
        goToReach();
        break;

      // MLE modal
      case "openMleReview":
        openModal("mleReview", 1);
        break;
      case "nextModalStep":
        nextStep(4);
        break;
      case "prevModalStep":
        prevStep(1);
        break;
      case "mleDone":
        // After MLE apply done, remain in Design and show notice
        closeModal();
        state.mleApplied = true;
        toast("MLE changes applied. Language drafts are now in Draft state.", "success");
        render();
        break;

      // Assign reviewers modal
      case "openAssignReviewers":
        openModal("assignReviewers", 1);
        break;
      case "toggleLanguageSelect": {
        const code = el?.dataset?.lang;
        if (!code) break;
        const idx = state.selectedLanguages.indexOf(code);
        if (idx >= 0) state.selectedLanguages.splice(idx, 1);
        else state.selectedLanguages.push(code);
        render();
        break;
      }
      case "setReviewer": {
        const code = el?.dataset?.lang;
        const val = el?.value;
        if (!code || !val) break;
        const lang = state.languages[code];
        lang.reviewer = val;

        // Update role from option list
        const found = lang.reviewerOptions.find((o) => o.name === val);
        if (found) lang.reviewerRole = found.role;

        render();
        break;
      }

      case "toggleAllowComments":
        state.allowComments = !!el.checked;
        render();
        break;
      case "toggleRestrictAssigned":
        state.restrictToAssigned = !!el.checked;
        render();
        break;
      case "togglePreventPublish":
        state.preventPublishUntilApproved = !!el.checked;
        render();
        break;
      case "toggleNotifyEmail":
        state.notifyEmail = !!el.checked;
        render();
        break;
      case "toggleNotifyLink":
        state.notifyLink = !!el.checked;
        render();
        break;
      case "toggleNotifyOnComplete":
        state.notifyOnComplete = !!el.checked;
        render();
        break;

      case "setDueDate":
        state.dueDate = el.value || "";
        break;

      case "setInstructions":
        // handled in input listener
        break;

      case "assignReviewersConfirm":
        assignReviewers();
        break;

      // Progress modal
      case "openReviewProgress":
        openModal("reviewProgress", 1);
        break;
      case "openReviewer": {
        const code = el?.dataset?.lang;
        if (!code) break;
        openReviewer(code);
        break;
      }
      case "sendReminder":
        toast("Reminder sent to reviewers.", "info");
        break;

      case "openLanguageDrafts":
        toast("Opening language drafts (demo).", "info");
        break;

      // Reviewer view interactions
      case "backToProgress":
        // return to progress modal (admin context)
        state.currentScreen = "design";
        openModal("reviewProgress", 1);
        break;

      case "reviewApprove": {
        const code = state.reviewerLanguage;
        const lang = state.languages[code];
        lang.review.decision = "approve";
        if (!state.allowComments) lang.review.comment = "";
        render();
        break;
      }

      case "reviewReject": {
        const code = state.reviewerLanguage;
        const lang = state.languages[code];
        lang.review.decision = "reject";
        render();
        break;
      }

      case "reviewComment":
        // handled by input listener
        break;

      case "submitReview":
        submitCurrentReview();
        break;

      // Submit success
      case "returnToProgress":
        returnToProgressModal();
        break;

      // Generic modal close
      case "closeModal":
        closeModal();
        break;

      case "closeModalBackdrop":
        closeModal();
        break;

      // No-ops
      case "noop":
      default:
        // intentionally do nothing
        break;
    }
  }

  document.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    handleAction(action, actionEl);
  });

  // Handle textarea/input changes with delegation
  document.addEventListener("input", (e) => {
    const el = e.target;
    const action = el?.dataset?.action;
    if (!action) return;

    if (action === "setInstructions") {
      state.instructions = el.value;
      return;
    }

    if (action === "reviewComment") {
      const code = state.reviewerLanguage;
      const lang = state.languages[code];
      lang.review.comment = el.value;
      // Re-render to enable submit button when rejecting + comment exists
      render();
      return;
    }
  });

  // -----------------------------
  // 10) Init
  // -----------------------------
  window.addEventListener("DOMContentLoaded", () => {
    ensureBaseScaffold();
    render();

    // Small initial tip toast (optional)
    // toast("Demo ready: Click English edit icon to start.", "info", 3500);
  });
})();