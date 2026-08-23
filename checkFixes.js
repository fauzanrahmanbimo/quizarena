const fs=require("fs");
const html=fs.readFileSync("index.html","utf8");
const checks = [
  ["window.toggleReview exposed", html.includes("window.toggleReview")],
  ["login-email label has for=", html.includes("for=\"login-email\"")],
  ["login-password label has for=", html.includes("for=\"login-password\"")],
  ["modal-login dialog present", html.includes("id=\"modal-login\"")],
  ["modal-register dialog present", html.includes("id=\"modal-register\"")],
  ["timer-bar has aria-label", html.includes("aria-label=\"Timer waktu kuis\"")],
];
let ok = true;
checks.forEach(([name, result]) => {
  console.log((result ? "[OK]" : "[MISSING]") + " " + name);
  if (!result) ok = false;
});
process.exit(ok ? 0 : 1);
