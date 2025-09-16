// Inicializar AOS
AOS.init({
  duration: 1200,
  once: true
});

// Botón arriba
const btnArriba = document.getElementById("boton-arriba");
window.addEventListener("scroll", () => {
  btnArriba.style.display = window.scrollY > 300 ? "block" : "none";
});
btnArriba.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Animación con Baffle
const text = baffle(".fade-in");
text.set({
  characters: '█▓▒░<>/',
  speed: 120
});
text.start();
text.reveal(2000); // 🔥 el texto se revela después de 2s

// Suave aparición con CSS
setTimeout(() => {
  document.querySelector(".fade-in").classList.add("revelado");
}, 2000);
