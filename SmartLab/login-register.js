const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => {
    container.classList.add('active');
})

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
})
// LOGIN
let loginEye = document.getElementById("login-eyeicon");
let loginPass = document.getElementById("login-password");

loginEye.onclick = function () {
    if (loginPass.type === "password") {
        loginPass.type = "text";
        loginEye.src = "eye-solid.png";
    } else {
        loginPass.type = "password";
        loginEye.src = "eye-slash-solid.png";
    }
};

// REGISTER
let registerEye = document.getElementById("register-eyeicon");
let registerPass = document.getElementById("register-password");

registerEye.onclick = function () {
    if (registerPass.type === "password") {
        registerPass.type = "text";
        registerEye.src = "eye-solid.png";
    } else {
        registerPass.type = "password";
        registerEye.src = "eye-slash-solid.png";
    }
};