// student/js/config.js
const CONFIG = {
  BASE_URL: "http://localhost:5000/api",   // Change to your deployed URL later
  // BASE_URL: "https://yourdomain.com/api"
};

let token = localStorage.getItem("token");

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": token ? `Bearer ${token}` : ""
  };
}

function setToken(newToken) {
  token = newToken;
  localStorage.setItem("token", newToken);
}

export { CONFIG, getHeaders, setToken };