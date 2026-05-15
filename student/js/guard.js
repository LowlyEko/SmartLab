// student/js/guard.js

export function guardPage() {
  const token = localStorage.getItem("token");
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  const protectedPages = ["index.html", "reservations.html", "inventory.html", "accountability.html"];

  if (protectedPages.includes(currentPage) && !token) {
    window.location.href = "login.html";
  }

  if (currentPage === "login.html" && token) {
    window.location.href = "index.html";
  }
}

export function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// Auto-run on every page load
document.addEventListener("DOMContentLoaded", guardPage);