// student/js/config.js
const CONFIG = {
  BASE_URL: "http://localhost:5000/api",
};

/**
 * Helper to get authorization headers.
 * We fetch the token inside the function so it always uses the most current value.
 */
function getHeaders() {
  const currentToken = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": currentToken ? `Bearer ${currentToken}` : ""
  };
}

/**
 * Helper to update the token globally
 */
function setToken(newToken) {
  localStorage.setItem("token", newToken);
}

export { CONFIG, getHeaders, setToken };