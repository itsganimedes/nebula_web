# 🌌 Nebula — Setup Guide

## Estructura del proyecto

```
nebula/
├── index.html
├── manifest.json
├── css/
│   └── styles.css
├── js/
│   ├── firebase-config.js   ← Ponés acá tus keys
│   ├── auth.js
│   ├── transactions.js
│   └── app.js
└── img/
    ├── icon-192.png         ← Agregás tu ícono
    └── icon-512.png
```

---

## Paso 1 — Crear proyecto en Firebase

1. Entrá a https://console.firebase.google.com
2. Clic en "Agregar proyecto" → nombralo `nebula`
3. Desactivá Google Analytics (no lo necesitás ahora)
4. Esperá que se cree

---

## Paso 2 — Habilitar Firestore

1. En el menú lateral: **Build → Firestore Database**
2. Clic "Crear base de datos"
3. Elegí **Modo de prueba** (permite leer/escribir libremente durante 30 días)
4. Seleccioná la región más cercana (`us-east1` o `southamerica-east1`)

---

## Paso 3 — Habilitar Authentication con Google

1. En el menú lateral: **Build → Authentication**
2. Clic "Comenzar"
3. Pestaña "Sign-in method"
4. Habilitá **Google** → guardá

---

## Paso 4 — Registrar tu Web App y copiar keys

1. En la pantalla de inicio del proyecto, clic en el ícono `</>`
2. Nombrá la app `nebula-web`
3. **No** marques Firebase Hosting por ahora
4. Copiá el objeto `firebaseConfig` que te muestra

5. Abrí `js/firebase-config.js` y reemplazá los valores:

```js
const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "nebula-xxxx.firebaseapp.com",
  projectId:         "nebula-xxxx",
  storageBucket:     "nebula-xxxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc123"
};
```

---

## Paso 5 — Reglas de Firestore (importante)

En Firestore → pestaña **Reglas**, pegá esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuarios: solo pueden leer/escribir el suyo
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Familias: solo miembros registrados
    match /families/{familyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;

      // Transacciones dentro de la familia
      match /transactions/{txId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

---

## Paso 6 — Deploy gratis con Vercel

1. Subí el proyecto a un repo de GitHub
2. Entrá a https://vercel.com → conectá tu repo
3. Deploy automático → te da una URL tipo `nebula-xxx.vercel.app`
4. ¡Listo! PWA instalable desde el celular

---

## Agregar íconos (opcional)

Creá imágenes de 192×192 y 512×512 con el logo de Nebula y guardalas en `/img/`.
Podés usar https://www.pwabuilder.com para generarlos.

---

## Cambiar moneda

En `js/app.js`, buscá `formatCurrency` y cambiá `"ARS"` por la moneda que quieras:
```js
style: "currency", currency: "ARS"  // → "USD", "EUR", "CLP", etc.
```
