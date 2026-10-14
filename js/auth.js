const ACCOUNTS_KEY = "tasty-bite-demo-accounts";
const SESSION_KEY = "tasty-bite-demo-session";
const PBKDF2_ITERATIONS = 310000;

function getAccounts() {
    try {
        const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
        return Array.isArray(accounts) ? accounts : [];
    } catch {
        return [];
    }
}

function toBase64(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(value) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

// Hash each password with a unique salt so browser storage never contains the password itself.
async function hashPassword(password, salt) {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
        key,
        256
    );
    return toBase64(bits);
}

async function handleSignup(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const error = document.querySelector("#signup-error");
    error.classList.add("hidden");
    const formData = new FormData(form);
    const name = formData.get("name").trim();
    const email = formData.get("email").trim().toLowerCase();
    const password = formData.get("password");

    const accounts = getAccounts();
    if (accounts.some((account) => account.email === email)) {
        error.textContent = "An account with that email already exists. Log in instead.";
        error.classList.remove("hidden");
        return;
    }

    if (!crypto.subtle) {
        error.textContent = "Password hashing is unavailable. Open this demo through localhost or HTTPS.";
        error.classList.remove("hidden");
        return;
    }

    try {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const passwordHash = await hashPassword(password, salt);
        // Save the name, email, salt, and hash; the original password is discarded.
        accounts.push({ name, email, salt: toBase64(salt), passwordHash });
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
        window.location.replace("login.html");
    } catch {
        error.textContent = "The account could not be saved in this browser.";
        error.classList.remove("hidden");
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const error = document.querySelector("#login-error");
    error.classList.add("hidden");
    const formData = new FormData(form);
    const email = formData.get("email").trim().toLowerCase();
    const password = formData.get("password");
    const account = getAccounts().find((item) => item.email === email);

    if (!account) {
        error.textContent = "Email or password is incorrect. Check your details or sign up.";
        error.classList.remove("hidden");
        return;
    }
    if (!crypto.subtle) {
        error.textContent = "Password hashing is unavailable. Open this demo through localhost or HTTPS.";
        error.classList.remove("hidden");
        return;
    }

    try {
        const submittedHash = await hashPassword(password, fromBase64(account.salt));
        // Compare the submitted password's hash with the saved hash before opening the site.
        if (submittedHash !== account.passwordHash) {
            error.textContent = "Email or password is incorrect. Check your details or sign up.";
            error.classList.remove("hidden");
            return;
        }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: account.email, name: account.name }));
        window.location.replace("index.html");
    } catch {
        error.textContent = "Login could not complete in this browser.";
        error.classList.remove("hidden");
    }
}

function initializeAuth() {
    // This is a navigation guard for the demo only; client-side code cannot secure page data.
    if (document.body.hasAttribute("data-requires-auth")) {
        try {
            if (!sessionStorage.getItem(SESSION_KEY)) {
                window.location.replace("login.html");
                return;
            }
        } catch {
            window.location.replace("login.html");
            return;
        }
    }

    document.querySelectorAll("[data-logout]").forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            sessionStorage.removeItem(SESSION_KEY);
            window.location.replace("login.html?logout=1");
        });
    });

    document.querySelector("#signup-form")?.addEventListener("submit", handleSignup);
    document.querySelector("#login-form")?.addEventListener("submit", handleLogin);
}

document.addEventListener("DOMContentLoaded", initializeAuth);
