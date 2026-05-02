(function () {
  "use strict";

  const sidebar = document.querySelector(".sidebar");
  const toggle  = document.querySelector(".toggle");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => sidebar.classList.toggle("close"));
  }

  const toggleSwitch = document.querySelector(".toggle-switch");
  const modeText     = document.querySelector(".mode-text");

  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    if (modeText) modeText.textContent = "Light Mode";
  }

  if (toggleSwitch) {
    toggleSwitch.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      if (modeText) modeText.textContent = isDark ? "Light Mode" : "Dark Mode";
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }

  const profileBtn = document.querySelector(".profile");
  if (profileBtn) {
    profileBtn.addEventListener("click", e => {
      e.stopPropagation();
      profileBtn.classList.toggle("active");
    });
    document.addEventListener("click", () => profileBtn.classList.remove("active"));
  }

  const filename = window.location.pathname.split("/").pop() || "dashboard.html";
  document.querySelectorAll(".nav-link a[data-page]").forEach(link => {
    const page = link.getAttribute("data-page");
    if (filename.includes(page)) {
      link.classList.add("active");
    }
  });

})();