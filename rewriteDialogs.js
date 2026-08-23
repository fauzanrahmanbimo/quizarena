const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

// login
html = html.replace(
  /<dialog id="modal-login"([^>]+)>/,
  `<dialog id="modal-login" role="dialog" aria-modal="true" aria-labelledby="modal-login-title"$1>`
);
html = html.replace(
  /<h2 style="font-size:20px; color:var\(--primary\);">Login<\/h2>/,
  `<h2 id="modal-login-title" style="font-size:20px; color:var(--primary);">Login</h2>`
);
html = html.replace(
  /<p id="login-error" style="color:var\(--danger\); font-size:12px; margin-bottom:10px;"><\/p>/,
  `<p id="login-error" aria-live="assertive" role="alert" style="color:var(--danger); font-size:12px; margin-bottom:10px;"></p>`
);

// register
html = html.replace(
  /<dialog id="modal-register"([^>]+)>/,
  `<dialog id="modal-register" role="dialog" aria-modal="true" aria-labelledby="modal-register-title"$1>`
);
html = html.replace(
  /<h2 style="font-size:20px; color:var\(--primary\);">Daftar<\/h2>/,
  `<h2 id="modal-register-title" style="font-size:20px; color:var(--primary);">Daftar</h2>`
);
html = html.replace(
  /<p id="reg-error" style="color:var\(--danger\); font-size:12px; margin-bottom:10px;"><\/p>/,
  `<p id="reg-error" aria-live="assertive" role="alert" style="color:var(--danger); font-size:12px; margin-bottom:10px;"></p>`
);

// Add ARIA attributes to input fields (aria-describedby for errors)
html = html.replace(
  /id="login-password" required>/,
  `id="login-password" required aria-describedby="login-error">`
);
html = html.replace(
  /id="login-email" required>/,
  `id="login-email" required aria-describedby="login-error">`
);
html = html.replace(
  /id="reg-password" minlength="8" required>/,
  `id="reg-password" minlength="8" required aria-describedby="reg-error">`
);
html = html.replace(
  /id="reg-email" required>/,
  `id="reg-email" required aria-describedby="reg-error">`
);

fs.writeFileSync("index.html", html);
console.log("Done");
