// student/js/utils.js

window.logout = function() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "../admin/Login-Register.html";
  }
};