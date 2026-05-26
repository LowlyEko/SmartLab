// SmartLab/config.js  –  Admin-side API config

const CONFIG = {
  BASE_URL: "http://localhost:5000/api",
};

function getHeaders() {
  const token = localStorage.getItem("smartlab_admin_token");
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : ""
  };
}

function setToken(newToken) {
  localStorage.setItem("smartlab_admin_token", newToken);
}

function clearToken() {
  localStorage.removeItem("smartlab_admin_token");
}

function getToken() {
  return localStorage.getItem("smartlab_admin_token");
}