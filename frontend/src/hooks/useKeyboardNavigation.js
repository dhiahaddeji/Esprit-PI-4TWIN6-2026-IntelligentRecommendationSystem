import { useEffect } from "react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]),' +
  ' select:not([disabled]), textarea:not([disabled]),' +
  ' [tabindex]:not([tabindex="-1"])';

/** Get all focusable children of a container, in DOM order. */
function focusableIn(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (el) => !el.closest('[aria-hidden="true"]') && el.offsetParent !== null
  );
}

/** True if the element is inside a managed widget (dropdown, dialog, combobox). */
function inManagedWidget(el) {
  return !!el.closest(
    '[role="menu"], [role="listbox"], [role="dialog"],' +
    ' [role="combobox"], [role="tree"], [role="grid"]'
  );
}

// ── Handler 1 — Toolbar (Left / Right) ───────────────────────────────────────
function handleToolbar(e, target) {
  const toolbar = target.closest('[role="toolbar"]');
  if (!toolbar) return false;
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return false;

  const items = focusableIn(toolbar).filter(
    (el) => el.closest('[role="toolbar"]') === toolbar
  );
  const idx = items.indexOf(target);
  if (idx === -1) return false;

  e.preventDefault();
  let next = idx;
  if      (["ArrowRight", "ArrowDown"].includes(e.key)) next = (idx + 1) % items.length;
  else if (["ArrowLeft",  "ArrowUp"  ].includes(e.key)) next = (idx - 1 + items.length) % items.length;
  else if (e.key === "Home") next = 0;
  else if (e.key === "End")  next = items.length - 1;

  items[next]?.focus();
  return true;
}

// ── Handler 2 — HTML table cells (Up / Down / Left / Right) ──────────────────
function handleTableCell(e, target) {
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return false;
  const cell  = target.closest("td, th");
  const row   = cell?.closest("tr");
  const table = row?.closest("table");
  if (!cell || !row || !table) return false;

  const rows  = Array.from(table.querySelectorAll("tr"));
  const cells = Array.from(row.querySelectorAll("td, th"));
  const ri    = rows.indexOf(row);
  const ci    = cells.indexOf(cell);

  let dest = null;
  if      (e.key === "ArrowDown"  && ri < rows.length - 1) dest = rows[ri + 1].querySelectorAll("td,th")[ci];
  else if (e.key === "ArrowUp"    && ri > 0)                dest = rows[ri - 1].querySelectorAll("td,th")[ci];
  else if (e.key === "ArrowRight" && ci < cells.length - 1) dest = cells[ci + 1];
  else if (e.key === "ArrowLeft"  && ci > 0)                dest = cells[ci - 1];

  if (!dest) return false;
  e.preventDefault();
  const inner = dest.querySelector(FOCUSABLE);
  if (inner) inner.focus();
  else { dest.setAttribute("tabindex", "0"); dest.focus(); }
  dest.scrollIntoView({ block: "nearest", inline: "nearest" });
  return true;
}

// ── Handler 3 — Table row navigation (Up / Down between <tr> rows) ───────────
function handleTableRow(e, target) {
  if (!["ArrowUp", "ArrowDown"].includes(e.key)) return false;
  if (target.closest("td, th")) return false;           // handled by handler 2

  const row   = target.closest("tr");
  const table = row?.closest("table");
  if (!row || !table) return false;

  const rows = Array.from(table.querySelectorAll("tbody tr")).filter(
    (r) => r.querySelector(FOCUSABLE) || r.getAttribute("tabindex") !== null
  );
  const idx = rows.indexOf(row);
  if (idx === -1) return false;

  e.preventDefault();
  const next = e.key === "ArrowDown"
    ? Math.min(idx + 1, rows.length - 1)
    : Math.max(idx - 1, 0);
  const dest  = rows[next];
  const inner = dest.querySelector(FOCUSABLE);
  (inner || dest).focus();
  dest.scrollIntoView({ block: "nearest" });
  return true;
}

// ── Handler 4 — Explicit opt-in list [data-kb-list] ──────────────────────────
function handleKbList(e, target) {
  const container = target.closest("[data-kb-list]");
  if (!container) return false;

  const dir     = container.dataset.kbList || "vertical";
  const isVert  = dir !== "horizontal";
  const prevKey = isVert ? "ArrowUp"   : "ArrowLeft";
  const nextKey = isVert ? "ArrowDown" : "ArrowRight";
  if (![prevKey, nextKey, "Home", "End"].includes(e.key)) return false;

  const items = Array.from(container.children).filter(
    (c) => c.querySelector(FOCUSABLE) || c.matches(FOCUSABLE)
  );
  const focused = items.find((el) => el === target || el.contains(target));
  const idx     = items.indexOf(focused);
  if (idx === -1) return false;

  e.preventDefault();
  let next = idx;
  if      (e.key === nextKey) next = Math.min(idx + 1, items.length - 1);
  else if (e.key === prevKey) next = Math.max(idx - 1, 0);
  else if (e.key === "Home")  next = 0;
  else if (e.key === "End")   next = items.length - 1;

  const el   = items[next];
  const dest = el.matches(FOCUSABLE) ? el : el.querySelector(FOCUSABLE);
  (dest || el).focus();
  el.scrollIntoView({ block: "nearest", inline: "nearest" });
  return true;
}

// ── Handler 5 — Smart auto-detect: card grids / lists ────────────────────────
//  Walks up the DOM looking for a parent that has 2+ sibling children of the
//  same element type where each contains at least one focusable element.
//  Works on any .map()-rendered list without touching the page code.
function handleSmartList(e, target) {
  if (!["ArrowUp", "ArrowDown"].includes(e.key)) return false;
  // Skip managed widgets — they have their own handlers
  if (inManagedWidget(target)) return false;
  // Skip table cells — handler 2/3 covers those
  if (target.closest("td, th, tr")) return false;
  // Skip sidebar nav — it has its own handler
  if (target.closest(".menu")) return false;

  let el = target;
  while (el && el !== document.body) {
    const parent = el.parentElement;
    if (!parent || parent === document.body) break;

    // Find siblings of the same tag that each contain focusable elements
    const siblings = Array.from(parent.children).filter(
      (c) =>
        c.tagName === el.tagName &&
        (c.querySelector(FOCUSABLE) || c.matches(FOCUSABLE))
    );

    if (siblings.length >= 2) {
      const idx = siblings.indexOf(el);
      if (idx === -1) { el = parent; continue; }

      e.preventDefault();
      const next = e.key === "ArrowDown"
        ? Math.min(idx + 1, siblings.length - 1)
        : Math.max(idx - 1, 0);

      const nextEl  = siblings[next];
      const dest    = nextEl.matches(FOCUSABLE) ? nextEl : nextEl.querySelector(FOCUSABLE);
      (dest || nextEl).focus();
      nextEl.scrollIntoView({ block: "nearest" });
      return true;
    }

    // Stop walking up when we hit a scroll boundary or section root
    const role = parent.getAttribute("role");
    if (role && ["main", "complementary", "navigation", "banner"].includes(role)) break;
    if (parent.tagName === "MAIN" || parent.id === "mainContent") break;

    el = parent;
  }
  return false;
}

// ── Auto-make table rows keyboard navigable ───────────────────────────────────
function makeTablesNavigable() {
  document.querySelectorAll("tbody tr").forEach((row) => {
    if (row.getAttribute("tabindex") === null && row.querySelector(FOCUSABLE)) {
      row.setAttribute("tabindex", "0");
    }
  });
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export default function useKeyboardNavigation() {
  useEffect(() => {
    // ── keyboard-nav body class ─────────────────────────────────────────
    const onMousedown = () => document.body.classList.remove("keyboard-nav");

    const onKeydown = (e) => {
      if (e.key === "Tab") document.body.classList.add("keyboard-nav");

      const target = document.activeElement;
      if (!target || target === document.body) return;

      // ── Global shortcuts ────────────────────────────────────────────
      if (e.altKey) {
        if (e.key === "m") { e.preventDefault(); document.getElementById("mainContent")?.focus(); return; }
        if (e.key === "s") { e.preventDefault(); document.querySelector(".sidebar .menuItem")?.focus(); return; }
        if (e.key === "t") { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      }

      // ── Don't hijack keys inside text fields ────────────────────────
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      // ── Arrow-key router (priority order) ───────────────────────────
      if (handleToolbar(e, target))    return;
      if (handleTableCell(e, target))  return;
      if (handleTableRow(e, target))   return;
      if (handleKbList(e, target))     return;
      if (handleSmartList(e, target))  return;
    };

    document.addEventListener("keydown", onKeydown);
    document.addEventListener("mousedown", onMousedown);

    // ── Auto-enhance tables now and on DOM changes ───────────────────
    makeTablesNavigable();
    const observer = new MutationObserver(makeTablesNavigable);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("keydown", onKeydown);
      document.removeEventListener("mousedown", onMousedown);
      observer.disconnect();
    };
  }, []);
}
