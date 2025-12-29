// GitHub API Configuration
class GitHubUploader {
    constructor() {
        // Configuración - debes modificar estos valores
        this.config = {
            token: 'YOUR_GITHUB_TOKEN', // Token de acceso personal de GitHub
            username: 'YOUR_USERNAME',  // Tu nombre de usuario de GitHub
            repo: 'YOUR_REPO_NAME',     // Nombre del repositorio
            branch: 'main'              // Rama principal
        };
        
        this.baseUrl = 'https://api.github.com';
    }

    // Método para configurar las credenciales
    setConfig(token, username, repo) {
        this.config.token = token;
        this.config.username = username;
        this.config.repo = repo;
    }

    // Subir archivo a GitHub
    async uploadFile(fileName, content, contentType = 'application/pdf', folder = 'pdfs') {
        const path = `${folder}/${fileName}`; // Carpeta donde se guardarán los archivos
        const url = `${this.baseUrl}/repos/${this.config.username}/${this.config.repo}/contents/${path}`;
        
        // Convertir a base64 si es necesario
        const base64Content = typeof content === 'string' && content.startsWith('data:') 
            ? content.split(',')[1] 
            : btoa(content);

        const body = {
            message: `Upload ${fileName}`,
            content: base64Content,
            branch: this.config.branch
        };

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error uploading file: ${error.message}`);
            }

            const result = await response.json();
            return {
                success: true,
                url: result.content.download_url,
                path: path,
                sha: result.content.sha
            };
        } catch (error) {
            console.error('Error uploading to GitHub:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Subir imagen específicamente
    async uploadImage(imageFile, projectName) {
        const fileName = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_image.jpg`;
        return await this.uploadFile(fileName, imageFile, 'image/jpeg', 'images');
    }

    // Subir PDF específicamente
    async uploadPDF(pdfFile, projectName) {
        const fileName = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        return await this.uploadFile(fileName, pdfFile, 'application/pdf', 'pdfs');
    }

    // Guardar datos del proyecto en un JSON
    async saveProjectData(projectData) {
        const fileName = `projects.json`;
        const url = `${this.baseUrl}/repos/${this.config.username}/${this.config.repo}/contents/${fileName}`;
        
        try {
            // Primero intentar obtener el archivo existente
            let existingData = [];
            try {
                const getResponse = await fetch(url, {
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (getResponse.ok) {
                    const existingFile = await getResponse.json();
                    const content = atob(existingFile.content);
                    existingData = JSON.parse(content);
                }
            } catch (error) {
                // Si no existe, crear nuevo array
                existingData = [];
            }

            // Agregar nuevo proyecto
            existingData.push(projectData);

            // Subir archivo actualizado
            const body = {
                message: `Add project ${projectData.titulo}`,
                content: btoa(JSON.stringify(existingData, null, 2)),
                branch: this.config.branch
            };

            // Si el archivo existía, incluir SHA
            if (existingData.length > 1) {
                const getResponse = await fetch(url, {
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                if (getResponse.ok) {
                    const existingFile = await getResponse.json();
                    body.sha = existingFile.sha;
                }
            }

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error saving project data: ${error.message}`);
            }

            return { success: true };
        } catch (error) {
            console.error('Error saving project data:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener todos los proyectos desde GitHub
    async getProjects() {
        const url = `${this.baseUrl}/repos/${this.config.username}/${this.config.repo}/contents/projects.json`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return []; // No hay proyectos aún
                }
                throw new Error('Error fetching projects');
            }

            const file = await response.json();
            const content = atob(file.content);
            return JSON.parse(content);
        } catch (error) {
            console.error('Error fetching projects:', error);
            return [];
        }
    }

    // Eliminar proyecto completo
    async deleteProject(projectData) {
        const results = [];
        
        // Eliminar PDF si existe
        if (projectData.pdfPath) {
            const pdfResult = await this.deleteFileByPath(projectData.pdfPath);
            results.push({ type: 'pdf', ...pdfResult });
        }
        
        // Eliminar imagen si existe
        if (projectData.imagePath) {
            const imageResult = await this.deleteFileByPath(projectData.imagePath);
            results.push({ type: 'image', ...imageResult });
        }
        
        // Actualizar projects.json
        const updateResult = await this.updateProjectsList(projectData, 'delete');
        results.push({ type: 'data', ...updateResult });
        
        return results;
    }

    // Eliminar archivo por路径
    async deleteFileByPath(path) {
        const url = `${this.baseUrl}/repos/${this.config.username}/${this.config.repo}/contents/${path}`;
        
        try {
            // Obtener SHA del archivo
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error('File not found');
            }

            const fileData = await response.json();
            
            // Eliminar el archivo
            const deleteResponse = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    message: `Delete ${path}`,
                    sha: fileData.sha,
                    branch: this.config.branch
                })
            });

            if (!deleteResponse.ok) {
                throw new Error('Error deleting file');
            }

            return { success: true };
        } catch (error) {
            console.error('Error deleting file:', error);
            return { success: false, error: error.message };
        }
    }

    // Actualizar lista de proyectos
    async updateProjectsList(projectData, action = 'delete') {
        const fileName = `projects.json`;
        const url = `${this.baseUrl}/repos/${this.config.username}/${this.config.repo}/contents/${fileName}`;
        
        try {
            // Obtener proyectos actuales
            let projects = [];
            try {
                const getResponse = await fetch(url, {
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (getResponse.ok) {
                    const existingFile = await getResponse.json();
                    const content = atob(existingFile.content);
                    projects = JSON.parse(content);
                }
            } catch (error) {
                return { success: false, error: 'Could not fetch existing projects' };
            }

            // Modificar lista según acción
            if (action === 'delete') {
                projects = projects.filter(p => p.titulo !== projectData.titulo);
            }

            // Subir lista actualizada
            const body = {
                message: `${action === 'delete' ? 'Remove' : 'Update'} project ${projectData.titulo}`,
                content: btoa(JSON.stringify(projects, null, 2)),
                branch: this.config.branch
            };

            // Obtener SHA si el archivo existe
            const getResponse = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (getResponse.ok) {
                const existingFile = await getResponse.json();
                body.sha = existingFile.sha;
            }

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Error updating projects list: ${error.message}`);
            }

            return { success: true };
        } catch (error) {
            console.error('Error updating projects list:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener lista de archivos PDFs (método legacy)
    async getPdfFiles() {
        const url = `${this.baseUrl}/repos/${this.config.username}/${this.config.repo}/contents/pdfs`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error('Error fetching files');
            }

            const files = await response.json();
            return files.filter(file => file.name.endsWith('.pdf'));
        } catch (error) {
            console.error('Error fetching files:', error);
            return [];
        }
    }

    // Eliminar archivo (método legacy)
    async deleteFile(fileName) {
        const path = `pdfs/${fileName}`;
        return await this.deleteFileByPath(path);
    }
}

// Exportar para uso global
window.GitHubUploader = GitHubUploader;
