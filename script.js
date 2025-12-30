// ⚠️ Inserta tu token aquí (no recomendable en producción porque cualquiera puede verlo)
const TOKEN = "TU_TOKEN_AQUI";
const GIST_ID = "3690e860889f4588b37fb2406aee2c25";
const FILE_NAME = "actividades.json";

// 1. Cargar proyectos en projects.html
async function loadProjects() {
  try {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`);
    const data = await res.json();

    const fileContent = data.files[FILE_NAME].content;
    const projects = JSON.parse(fileContent);

    const container = document.getElementById("projects");
    container.innerHTML = "";

    projects.forEach(p => {
      const div = document.createElement("div");
      div.className = "project";
      div.innerHTML = `
        <h3>${p.name}</h3>
        <p>${p.description}</p>
        <a href="${p.url}" target="_blank">Ver proyecto</a>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error cargando proyectos:", err);
  }
}

// 2. Agregar proyectos desde admin.html
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addProjectForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("name").value;
      const description = document.getElementById("description").value;
      const url = document.getElementById("url").value;

      try {
        // Obtener proyectos actuales
        const res = await fetch(`https://api.github.com/gists/${GIST_ID}`);
        const data = await res.json();
        let projects = JSON.parse(data.files[FILE_NAME].content);

        // Agregar nuevo
        projects.push({ name, description, url });

        // Guardar en el Gist
        const update = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
          method: "PATCH",
          headers: {
            "Authorization": `token ${TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            files: {
              [FILE_NAME]: {
                content: JSON.stringify(projects, null, 2)
              }
            }
          })
        });

        if (update.ok) {
          document.getElementById("status").textContent = "✅ Proyecto agregado con éxito";
          form.reset();
        } else {
          document.getElementById("status").textContent = "❌ Error al guardar en Gist";
        }

      } catch (err) {
        console.error(err);
        document.getElementById("status").textContent = "❌ Error de red";
      }
    });
  }

  // Si estamos en projects.html, cargar proyectos
  if (document.getElementById("projects")) {
    loadProjects();
  }
});
