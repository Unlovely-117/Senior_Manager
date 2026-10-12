# Documentación API
Registrar endpoints REST, métodos, contratos de solicitud/respuesta, autenticación, códigos HTTP y ejemplos sin datos personales reales.

## Directorio de profesionales

Las cuentas de acceso se almacenan en `usuarios.txt`; los datos complementarios de la ficha (documento y teléfono) se almacenan en `profesionales.txt`. El directorio considera profesionales únicamente las cuentas cuyo rol es `PROFESIONAL`. La respuesta de `GET /api/profesionales` combina ambos archivos por correo, sin incluir contraseñas:

```json
{
  "name": "Nombre de ejemplo",
  "document": "DOC-DEMO",
  "email": "profesional@example.test",
  "phone": "0000000000",
  "active": true,
  "accountLinked": true,
  "hasProfile": true
}
```

- `accountLinked` indica que el registro corresponde a una cuenta de profesional.
- `hasProfile` indica que existe una ficha en `profesionales.txt` asociada por correo.
- Las cuentas sin ficha también aparecen, con `document` y `phone` vacíos.
- Las fichas sin cuenta coincidente aparecen con `accountLinked: false` para permitir su vinculación manual.

Operaciones administrativas disponibles:

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/profesionales` | Listar cuentas profesionales y fichas complementarias |
| `POST` | `/api/profesionales` | Completar una ficha para una cuenta profesional existente; recibe `email`, `document` y `phone` |
| `PATCH` | `/api/profesionales/{document}/cuenta` | Vincular una ficha existente a una cuenta profesional; recibe `email` |
| `PUT` | `/api/profesionales/{document}` | Actualizar los datos de la ficha |
| `PATCH` | `/api/profesionales/{document}/estado` | Activar o desactivar la cuenta si está vinculada |
| `DELETE` | `/api/profesionales/{document}` | Eliminar la ficha y la cuenta profesional vinculada; una ficha sin cuenta se elimina sola |
| `DELETE` | `/api/profesionales/cuenta/{email}` | Eliminar una cuenta profesional que no tiene ficha vinculada |

Todas estas rutas requieren una sesión de administrador. Al borrar un profesional vinculado se elimina también su cuenta de `usuarios.txt` y se invalidan sus sesiones. Si solo existe una cuenta o una ficha, se elimina el registro existente.

Las operaciones de escritura guardan el TXT antes de responder correctamente. Las actualizaciones reescriben primero un archivo temporal y lo reemplazan al terminar, evitando que una lectura encuentre un archivo truncado. Los cambios de nombre, correo y estado de una cuenta profesional también se reflejan en su ficha vinculada; el estado actualizado queda guardado tanto en `usuarios.txt` como en `profesionales.txt`.

## Cambio obligatorio de contraseña

Las cuentas con contraseña inicial temporal se marcan en `usuarios.txt` junto al hash PBKDF2, nunca con la contraseña en texto plano. Tras autenticarse, `mustChangePassword` indica si el usuario debe definir una contraseña personal. Mientras siga pendiente, la sesión solo permite consultar `/api/auth/me`, cambiar la contraseña con `POST /api/auth/change-password` o cerrar sesión. El cambio requiere una contraseña de al menos 8 caracteres y su confirmación; al guardarse, la marca temporal se elimina.
