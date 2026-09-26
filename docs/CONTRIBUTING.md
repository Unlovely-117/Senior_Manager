# Guía de Git y GitHub para el equipo — Senior-Manage

**Objetivo:** que cada integrante pueda subir su trabajo de forma segura, organizada y revisable, sin sobrescribir el trabajo de otros ni subir directamente a `main`.

## 1. Reglas obligatorias del equipo

1. Cada desarrollador trabaja en su propia rama: `David`, `Alejandro` o `Manuela` (o la rama que el Scrum Master le haya asignado).
2. **No hacer push directamente a `main`** ni integrar cambios de otros sin autorización.
3. Antes de comenzar, actualizar la rama local desde GitHub.
4. Hacer commits pequeños, con mensajes claros y relacionados con una tarea.
5. Antes de abrir el Pull Request, probar los cambios y revisar qué archivos se van a subir.
6. Todo cambio se entrega mediante Pull Request hacia `main` y debe pasar la revisión de QA y las aprobaciones acordadas por el equipo.
7. No subir contraseñas, tokens, claves privadas, archivos `.env`, datos personales reales ni archivos generados innecesarios.

## 2. Preparar el proyecto (solo la primera vez)

Instalar Git y clonar el repositorio:

```bash
git clone https://github.com/Unlovely-117/Senior_Manager.git
cd Senior_Manager
```

Configurar nombre y correo (usar el correo asociado a su cuenta de GitHub):

```bash
git config --global user.name "Tu nombre"
git config --global user.email "tu-correo@ejemplo.com"
```

Comprobar las ramas remotas:

```bash
git fetch origin
git branch -a
```

Cambiar a la rama asignada. Ejemplo para Alejandro:

```bash
git switch Alejandro
git pull origin Alejandro
```

Para David, usar `git switch David`; para Manuela, `git switch Manuela`. La rama debe existir en GitHub y tener el nombre exacto.

> Si todavía no existe la rama, no la creen con un nombre improvisado: avisen al responsable del repositorio para que la cree o confirme el nombre.

## 3. Flujo de trabajo cada vez que comiencen una tarea

### Paso 1. Entrar a su rama y actualizarla

```bash
git switch TU-RAMA
git pull origin TU-RAMA
```

Reemplacen `TU-RAMA` por su rama asignada. Confirmen que están en la rama correcta:

```bash
git branch --show-current
git status
```

### Paso 2. Trabajar y revisar los cambios

Modifiquen únicamente los archivos relacionados con la tarea asignada. Respeten la arquitectura y separación por capas definida en `docs/architecture/ARCHITECTURE.md`.

Antes de preparar el commit:

```bash
git status
git diff
```

Revisen que no aparezcan archivos ajenos a la tarea, contraseñas, configuraciones locales o datos sensibles.

### Paso 3. Preparar y guardar el commit

Agregar archivos específicos (recomendado):

```bash
git add ruta/del/archivo
```

O agregar todos los cambios revisados:

```bash
git add .
```

Crear el commit con un mensaje descriptivo:

```bash
git commit -m "feat: agregar registro de profesionales"
```

Ejemplos de mensajes:
- `feat: agregar inicio de sesión` — funcionalidad nueva.
- `fix: corregir validación de formulario` — corrección de error.
- `docs: actualizar guía de instalación` — documentación.
- `test: agregar pruebas de pacientes` — pruebas.
- `refactor: separar lógica del servicio` — reorganización sin cambiar el comportamiento esperado.

No usar mensajes como `cambios`, `cosas`, `avance` o `final`.

### Paso 4. Subir los commits a GitHub (push)

```bash
git push origin TU-RAMA
```

Ejemplo:

```bash
git push origin Alejandro
```

Esto sube los commits a la rama remota del integrante. **Todavía no incorpora los cambios a `main`.**

Si es la primera vez que suben esa rama y Git solicita establecer el upstream:

```bash
git push -u origin TU-RAMA
```

## 4. Entregar el trabajo mediante Pull Request

Cuando la tarea esté lista:

1. Abrir el repositorio en GitHub: https://github.com/Unlovely-117/Senior_Manager
2. Seleccionar **Pull requests** y luego **New pull request** (o usar el botón que GitHub muestra después del push).
3. En **base**, elegir `main`; en **compare**, elegir la rama del desarrollador.
4. Crear el Pull Request usando la plantilla del repositorio.
5. Escribir qué se hizo, qué tarea o historia atiende, cómo se probó y los resultados.
6. Indicar el nombre y usuario de GitHub del revisor de QA y el correo solicitado en la plantilla.
7. Avisar al responsable de QA y al equipo que el PR está listo.

**Importante:** escribir el correo del revisor en la plantilla no lo asigna automáticamente ni constituye una aprobación. Si GitHub no muestra al revisor asignado, soliciten la revisión desde la opción **Reviewers** del Pull Request.

No cerrar ni fusionar el PR por cuenta propia, salvo que el responsable del repositorio haya autorizado expresamente ese paso y se hayan cumplido las revisiones requeridas.

## 5. Si aparece un conflicto o un error

### “Everything up-to-date”
Git no detectó commits nuevos para subir. Revisen:

```bash
git status
git log --oneline -5
```

### “Updates were rejected” / “non-fast-forward”
La rama remota tiene cambios que no están en la copia local. Primero asegúrense de estar en su rama y de tener sus cambios guardados en un commit. Luego:

```bash
git pull --rebase origin TU-RAMA
```

Si hay conflictos, Git indicará los archivos. Abran cada archivo, resuelvan las marcas `<<<<<<<`, `=======` y `>>>>>>>` conservando el contenido correcto, y después ejecuten:

```bash
git add ruta/del/archivo-resuelto
git rebase --continue
```

Repitan si aparecen más conflictos. Al terminar:

```bash
git push origin TU-RAMA
```

Si no saben resolver un conflicto, deténganse y pidan ayuda. Durante un rebase pueden cancelar con:

```bash
git rebase --abort
```

No ejecuten `git push --force` ni `git push --force-with-lease` sin autorización explícita del responsable del repositorio.

### Me equivoqué de rama
Antes de hacer commit o push, revisen:

```bash
git branch --show-current
```

Si los cambios aún no están en un commit, no cambien de rama a ciegas ni los borren. Consulten al responsable o soliciten ayuda para moverlos de forma segura.

## 6. Comandos rápidos para el día a día

```bash
git switch TU-RAMA
git pull origin TU-RAMA
# trabajar en los archivos
git status
git diff
git add ruta/del/archivo
git commit -m "tipo: descripción breve"
git push origin TU-RAMA
```

## 7. Lista de verificación antes de subir

- [ ] Estoy en mi rama asignada, no en `main`.
- [ ] Actualicé mi rama con `git pull`.
- [ ] Los cambios corresponden a la tarea asignada y respetan la arquitectura.
- [ ] Revisé `git status` y `git diff`.
- [ ] No incluí secretos, archivos `.env`, datos reales ni archivos innecesarios.
- [ ] Ejecuté las pruebas que corresponden y anoté sus resultados.
- [ ] El commit tiene un mensaje claro.
- [ ] Hice push a mi propia rama.
- [ ] Si la tarea está lista, abrí un PR hacia `main` y solicité revisión de QA.

## Enlaces del proyecto

- Repositorio: https://github.com/Unlovely-117/Senior_Manager
- Arquitectura y reglas de capas: [docs/architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md)
- Plantilla de Pull Request: [PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md)

**Flujo resumido:** actualizar rama propia → desarrollar → revisar y probar → commit → push a rama propia → Pull Request hacia `main` → revisión de QA → aprobación e integración según las reglas del repositorio.
