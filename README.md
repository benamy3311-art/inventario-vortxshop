# Inventario VORTXSHOP

App web con estilo iOS para contar el inventario de VORTXSHOP (cuadros y sillas publicados en Mercado Libre) entre varias personas.

**App:** https://benamy3311-art.github.io/inventario-vortxshop/

## Qué hace

- **Conteo:** cada producto con su foto, botones Hay / No hay y unidades. Desliza una fila a la derecha para marcar "Hay" o a la izquierda para "No hay".
- **Productos:** agrega productos nuevos con foto (cámara o galería), nombre, descripción, medida, categoría, disponibilidad y si están publicados en Mercado Libre.
- **Resumen:** progreso del conteo, unidades por producto, fecha y exportación a PDF.
- **Cuenta:** inicio de sesión con Google y lista de personas invitadas (administrador o editor).
- Funciona sin señal: los cambios se guardan en el teléfono y se suben solos al volver la conexión.

## Cómo está hecho

- HTML, CSS y JavaScript sin compilación, publicado con GitHub Pages.
- Firebase (proyecto `inventario-vortxshop`, plan gratuito Spark): Authentication con Google y Cloud Firestore.
- Las fotos de los productos agregados se comprimen en el teléfono (máx. 720 px, JPEG) y se guardan dentro del documento de Firestore, así no hace falta Cloud Storage.

### Datos en Firestore

| Colección | Documento | Contenido |
|---|---|---|
| `members` | correo de Google | `role` (`admin` o `editor`), `name`, `photo` |
| `items` | número del producto o id del producto agregado | `s` (`hay` / `no`), `q` (unidades), `by`, `at` |
| `products` | id automático | `name`, `desc`, `size`, `kind`, `photo`, `color`, `published` |
| `meta` | `conteo` | `fecha` |

Las reglas de seguridad están en [`firestore.rules`](firestore.rules): solo las personas de `members` pueden leer o escribir, y solo los administradores pueden invitar, cambiar permisos o reiniciar el conteo.

### Cambiar las reglas

Firebase console → Firestore → Reglas → pegar el contenido de `firestore.rules` → Publicar.

### Agregar un administrador sin la app

Firebase console → Firestore → colección `members` → documento con el correo en minúsculas → campo `role` = `admin`.

### Probar sin iniciar sesión

Abre la app con `?demo` al final de la dirección para ver datos de ejemplo (no se guarda nada).
