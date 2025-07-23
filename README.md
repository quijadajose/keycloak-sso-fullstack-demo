# Demostración de SSO con Keycloak, Angular, Spring Boot y NestJS

Este repositorio contiene un proyecto de demostración y un tutorial paso a paso para configurar Keycloak como proveedor de identidad (IdP) dentro de un sistema de Single Sign-On (SSO).  
El objetivo es integrar dos aplicaciones backend (una con Spring Boot y otra con NestJS) junto a sus respectivos frontends desarrollados en Angular, para que compartan la autenticación mediante Keycloak, gestionando tanto la autenticación como la autorización basada en roles.  
Todo el código necesario está incluido, junto con instrucciones detalladas para reproducir la configuración y extenderla según tus necesidades.

### Contenido:
- [Requisitos previos](#requisitos-previos)
- [Características](#características)
  - [Configuración de los dominios](#configuración-de-los-dominios)
  - [Configuración de los Backends](#configuración-de-los-backends)
    - [Backend con NestJS](#backend-con-nestjs)
  - [Backend con Spring Boot](#backend-con-spring-boot)
  - [Configuración de las variables de entorno de Keycloak](#configuración-de-las-variables-de-entorno-de-keycloak)
- [Configuración de Keycloak para Single Sign-On (SSO)](#configuración-de-keycloak-para-single-sign-on-sso)
  - [Puesta en marcha de Keycloak](#puesta-en-marcha-de-keycloak)
  - [Configuración Inicial del Master Realm](#configuración-inicial-del-master-realm)
  - [Asigna el rol admin al usuario.](#asigna-el-rol-admin-al-usuario)
  - [Creación de un nuevo Realm (sso-realm)](#creación-de-un-nuevo-realm-sso-realm)
  - [Gestión de Roles en el Nuevo Realm](#gestión-de-roles-en-el-nuevo-realm)
  - [Gestión de Grupos en el Nuevo Realm](#gestión-de-grupos-en-el-nuevo-realm)
  - [Configuración del Cliente para NestJS API (nestjs-api)](#configuración-del-cliente-para-nestjs-api-nestjs-api)
  - [Variables de entorno para NestJS API](#variables-de-entorno-para-nestjs-api)
  - [Configuración del Cliente para Spring API (spring-api)](#configuración-del-cliente-para-spring-api-spring-api)
  - [Creación y configuración de usuarios de prueba (administrador y usuario simple)](#creación-y-configuración-de-usuarios-de-prueba-administrador-y-usuario-simple)
  - [Puesta en marcha de las aplicaciones](#puesta-en-marcha-de-las-aplicaciones)
  - [Verificación y Prueba](#verificación-y-prueba)
  - [Demostración del flujo de SSO:](#demostración-del-flujo-de-sso)
- [Glosario](#glosario)

<!-- ### Contenido:
[Requisitos previos](#requisitos-previos)

[Configuración de los dominios](#Configuracion-de-los-dominios)

[Configuración de los Backends](#Configuración-los dominios con SSL/TLS)

Puesta en marcha de Keycloak

Configuración Inicial del Master Realm

Creación de un Nuevo Realm (sso-realm)

Gestión de Roles en el Nuevo Realm

Gestión de Grupos en el Nuevo Realm

Configuración del Cliente para NestJS API (nestjs-api)

Variables de entorno para NestJS API

Configuración del Cliente para Spring API (spring-api)

Variables de entorno para Spring API

Creación y configuración de un Usuario de Prueba

Puesta en marcha de las aplicaciones

Verificación y prueba

Glosario -->


## Requisitos previos

Antes de comenzar, asegúrate de tener instalados los siguientes componentes:

Docker y Docker Compose

Acceso a un navegador web.

Conocimientos básicos de Keycloak (opcional, pero útil).

## Características

- **Single Sign-On (SSO)**: Centralización de la autenticación de usuarios a través de Keycloak.
- **Dos Stacks Completos**:
    1.  **Spring Boot**: Un backend robusto con Spring Security integrado con Keycloak.
    2.  **NestJS**: Un backend moderno de Node.js que utiliza `nest-keycloak-connect` para la integración con Keycloak.
- **Frontends en Angular**: Dos aplicaciones de una sola página (SPA). La aplicación para NestJS implementa un patrón **Backend-for-Frontend (BFF)** para el flujo de autenticación para la gestión de tokens

- **Seguridad de API**: Protección de endpoints de backend basados en tokens JWT (Access Tokens) emitidos por Keycloak.
- **Control de Acceso Basado en Roles (RBAC)**: Endpoints y componentes de UI que son accesibles solo para usuarios con roles.

### Configuración de los dominios

Voy a hacer es crear un dominio `*` para obtener un certificado de Let's Encrypt. Ustedes pueden crearlo con su dominio; en mi caso, usé: `quijadajosed.duckdns.org`.
Son varios subdominios, uno para cada uno de mis servicios:

```ts
keycloak.quijadajosed.duckdns.org
nest-sso-backend.quijadajosed.duckdns.org
spring-sso-backend.quijadajosed.duckdns.org
nest-frontend.quijadajosed.duckdns.org
spring-frontend.quijadajosed.duckdns.org
```

Cada uno apunta a mis servicios en local. Si quieres ver un ejemplo de ¿cómo lo hago con NixOS? Acá dejo un enlace a mi repo de ejemplo: https://github.com/quijadajose/nixos-local-https


### Configuración de los Backends

### Backend con NestJS

Este es el ejemplo del archivo .env del proyecto de nestjs. Este archivo debe estar en nest-sso-backend/.env

```ts
KEYCLOAK_AUTH_URL="https://keycloak.quijadajosed.duckdns.org"
KEYCLOAK_REALM="sso-realm"

KEYCLOAK_CLIENT_ID="nestjs-api"
KEYCLOAK_CLIENT_SECRET="secreto-generado-por-keycloak"

KEYCLOAK_ISSUER_URL="https://keycloak.quijadajosed.duckdns.org/realms/sso-realm"

KEYCLOAK_PKCE_CHALLENGE_METHOD="S256"
SPA_BASE_URL="https://nest-frontend.quijadajosed.duckdns.org"

KEYCLOAK_REDIRECT_URI="https://nest-sso-backend.quijadajosed.duckdns.org/auth/callback"
```

**KEYCLOAK_AUTH_URL**: 
Dirección base donde está desplegada la instancia de Keycloak.

**KEYCLOAK_REALM**: Nombre del realm en Keycloak, que actúa como un entorno aislado para gestionar usuarios, clientes, aplicaciones, roles y permisos (debe ser el mismo en ambos backend para que el inisio de sesion sea compartido).

**KEYCLOAK_CLIENT_ID**: Identificador único del cliente configurado en Keycloak. Representa la aplicación backend (Spring Boot en este caso) que realiza solicitudes de autenticación y autorización.
Es el nombre del cliente (este es único para cada cliente)

**KEYCLOAK_CLIENT_SECRET**: Clave secreta generada por Keycloak al crear el cliente. Sirve para validar la autenticidad del backend al solicitar tokens. Solo se usa en flujos confidenciales (como backend-server), ¡nunca en frontends!
**KEYCLOAK_ISSUER_URL**: Es la URL completa del emisor de tokens (iss en el JWT). Se usa para validar que los tokens provienen de este realm específico.

**KEYCLOAK_PKCE_CHALLENGE_METHOD**: Define el método usado en PKCE (Proof Key for Code Exchange), una protección adicional para el flujo Authorization Code. S256 es el más seguro y recomendado hoy día.

**SPA_BASE_URL**: Dirección base de tu aplicación frontend (por ejemplo, hecha con React, Angular, Vue). Se usa para configurar los allowed redirect URIs en Keycloak.

**KEYCLOAK_REDIRECT_URI**: URI donde Keycloak redirige al usuario después de autenticarse. NestJS tiene un endpoint que recibe este callback para completar el login.

### Backend con Spring Boot
En spring vamos a agregar la configuración en el `application.yml` que debe estar en `spring-sso-backend/src/main/resources/application.yml` como contiene los secretos del backend estara en el .gitignore, así que debes crearlo

```yml
keycloak:

client-id: spring-api
client-secret: secreto-generado-por-keycloak
redirect-uri: https://spring-sso-backend.quijadajosed.duckdns.org/auth/callback
issuer-uri: https://keycloak.quijadajosed.duckdns.org/realms/sso-realm

spa:
base-url: https://spring-frontend.quijadajosed.duckdns.org
```

**client-id**: Identificador único del cliente en Keycloak. En este caso, representa la aplicación backend desarrollada en Spring Boot. Debe coincidir con el nombre del cliente configurado en Keycloak.

**client-secret**: Clave secreta generada automáticamente por Keycloak al crear el cliente. Se usa para autenticar el backend durante el flujo de autorización. Solo se usa en flujos confidenciales.

**redirect-uri**: URI del backend Spring donde Keycloak redirige después del login exitoso. Este endpoint recibe el authorization_code para completar la autenticación.

**issuer-uri**: URL del emisor de tokens (iss en el JWT). Spring lo usa para verificar la procedencia del token y validar su firma contra los metadatos del realm.

### Configuración de las variables de entorno de Keycloak

```ts
KC_BOOTSTRAP_ADMIN_USERNAME=admin
KC_BOOTSTRAP_ADMIN_PASSWORD=password
KEYCLOAK_PORT=8080

KEYCLOAK_HOSTNAME=https://keycloak.quijadajosed.duckdns.org
KC_HOSTNAME_ADMIN_URL=https://keycloak.quijadajosed.duckdns.org
KC_HOSTNAME_URL=https://keycloak.quijadajosed.duckdns.org
KC_HOSTNAME=https://keycloak.quijadajosed.duckdns.org
KC_HOSTNAME_STRICT=false

POSTGRES_DB=keycloak
POSTGRES_USER=keycloak
POSTGRES_PASSWORD=db_secret_password
```

**KC_BOOTSTRAP_ADMIN_USERNAME**: Usuario inicial para administrar Keycloak. Se crea al iniciar el contenedor.

**KC_BOOTSTRAP_ADMIN_PASSWORD**: Contraseña del usuario admin. Es necesario para acceder al panel de Keycloak.

**KEYCLOAK_PORT**: Puerto en el que Keycloak se ejecutará dentro del contenedor o servidor.

**KEYCLOAK_HOSTNAME**: Hostname público que Keycloak usará en los enlaces generados (como redirecciones OAuth).

**KC_HOSTNAME_ADMIN_URL**: URL pública del panel de administración. Generalmente, igual al hostname base.

**KC_HOSTNAME_URL**: URL raíz pública del frontend de Keycloak. Se usa en las respuestas OAuth.

**KC_HOSTNAME**: Hostname principal configurado en el servidor. Usado para enlaces en correos, login, etc.

**KC_HOSTNAME_STRICT**: Si está en false, Keycloak permite peticiones externas no coincidentes con el hostname. Ideal para entornos no estrictos.

**POSTGRES_DB**: Nombre de la base de datos donde Keycloak almacenará usuarios, clientes y configuraciones.

**POSTGRES_USER**: Usuario que accede a la base de datos PostgreSQL. Debe tener permisos suficientes.

**POSTGRES_PASSWORD**: Contraseña del usuario de la base de datos.


## Configuración de Keycloak para Single Sign-On (SSO)

### Puesta en marcha de Keycloak

Para iniciar la instancia de Keycloak, utiliza el archivo docker-compose.yml proporcionado (asumiendo que está en la raíz de tu proyecto o en la ruta especificada).

Navega hasta el directorio que contiene tu archivo docker-compose.yml para Keycloak y ejecuta el siguiente comando:

```sh
docker-compose up keycloak
```

![docker-compose up keycloak](gallery/images/000-terminal-docker-compose-keycloak.png)

Una vez que Keycloak se haya iniciado correctamente, podrás acceder a la consola de administración en mi caso: https://keycloak.quijadajosed.duckdns.org



### Configuración Inicial del Master Realm

Al acceder por primera vez a la consola de Keycloak, se te pedirá que inicies sesión en el master realm. Por razones de seguridad y buenas prácticas, es recomendable crear un usuario administrador permanente y eliminar el usuario temporal.

![keycloak admin login](gallery/images/001-admin-login.png)

Inicia sesión en el master realm con las credenciales temporales del .env
`KC_BOOTSTRAP_ADMIN_USERNAME` y `KC_BOOTSTRAP_ADMIN_PASSWORD`

Navega a Users en el menú lateral.

Haz clic en Add user.

![admin real master users](gallery/images/003-admin-master-users.png)


Crea un nuevo usuario (ej. quijadajosed) con tu correo electrónico y nombre/apellido.

![admin real master create admin user](gallery/images/004-admin-master-createing-admin-user.png)

![admin real master created admin user](gallery/images/005-admin-master-created-admin-user.png)

Una vez creado el usuario, ve a la pestaña Role mapping para ese usuario.

### Asigna el rol admin al usuario.
![Captura de pantalla: Asignar rol admin al usuario](gallery/images/006-admin-master-rolemaping-admin-user.png)
![Captura de pantalla: Asignar rol admin al usuario](gallery/images/007-admin-master-rolemaping-admin-user.png)

Ve a la pestaña Credentials y establece una contraseña permanente para este usuario. Asegúrate de desactivar la opción "Temporary" si no deseas que la contraseña sea reseteada al primer inicio de sesión.

![Captura de pantalla: Establecer contraseña para el usuario](gallery/images/008.png)
![Captura de pantalla: Establecer contraseña para el usuario](gallery/images/009.png)


Una vez configurado, puedes cerrar sesión y volver a iniciarla con tu nuevo usuario quijadajosed. Es una buena práctica eliminar el usuario administrador temporal después de esto.

### Creación de un nuevo Realm (sso-realm)

Para aislar la configuración de identidad de tus aplicaciones del realm maestro de Keycloak, crearemos un nuevo realm dedicado.

Desde la consola de administración, selecciona el menú desplegable del realm actual (arriba a la izquierda, que dirá master).

Haz clic en Create realm.

![Captura de pantalla: Crear realm](gallery/images/010.png)


Ingresa el nombre del realm, por ejemplo, sso-realm.

Asegúrate de que la opción Enabled esté activada.
![Captura de pantalla: Crear realm](gallery/images/010-1.png)
Haz clic en Create.

![Captura de pantalla: Configurar nuevo realm sso-realm](gallery/images/011.png)

Una vez creado, se te redirigirá a la página de bienvenida del nuevo realm. Ahora, todas las configuraciones posteriores se realizarán dentro de sso-realm.

### Gestión de Roles en el Nuevo Realm

Crearemos un rol global que será asignado a nuestros usuarios para gestionar permisos.

En el menú lateral de sso-realm, ve a Realm roles.

Haz clic en Create role.
![Captura de pantalla: Crear rol admin en sso-realm](gallery/images/012.png)
Ingresa el nombre del rol, por ejemplo, admin.

![Captura de pantalla: Crear rol admin en sso-realm](gallery/images/013.png)

Haz clic en Save.


### Gestión de Grupos en el Nuevo Realm

Crearemos un grupo y le asignaremos el rol que acabamos de crear. Esto simplifica la gestión de permisos para los usuarios.

En el menú lateral de sso-realm, ve a Groups.
![Captura de pantalla: Crear grupo admins](gallery/images/014.png)
Haz clic en Create group.

Ingresa el nombre del grupo, por ejemplo, admins.

![Captura de pantalla: Crear grupo admins](gallery/images/014-1.png)
Haz clic en Create.

![Captura de pantalla: Crear grupo admins](gallery/images/015.png)


Una vez creado, selecciona el grupo admins y ve a la pestaña Role mapping.

![Captura de pantalla: Crear grupo admins](gallery/images/016.png)
Haz clic en Assign role.

Selecciona el rol admin del Filter by realm roles y haz clic en Assign.
![Captura de pantalla: Asignar rol admin al grupo admins](gallery/images/017.png)

![Captura de pantalla: Asignar rol admin al grupo admins](gallery/images/018.png)

### Configuración del Cliente para NestJS API (nestjs-api)

Ahora configuraremos el cliente de Keycloak para tu aplicación de backend NestJS y su frontend Angular.

En el menú lateral de sso-realm, ve a Clients.

Haz clic en Create client.
![](gallery/images/019.png)
En la sección "General settings":

Client type: OpenID Connect

Client ID: nestjs-api

Name: nestjs-api (o un nombre descriptivo)
![Captura de pantalla: Crear cliente nestjs-api - General settings](gallery/images/020.png)



Haz clic en Next.

En la sección "Capability config":

Asegúrate de que Client authentication esté On.

En Authentication flow, activa Standard flow, Direct access grants, y Service accounts roles. Implicit flow, OAuth 2.0 Device Authorization Grant y OIDC CIBA Grant también pueden estar activos según tus necesidades.
![Captura de pantalla: Crear cliente nestjs-api - Capability config](gallery/images/021.png)

Haz clic en Next.

En la sección "Login settings":

Root URL: https://nest-sso-backend.quijadajosed.duckdns.org (o la URL de tu backend NestJS)

Home URL: https://nest-frontend.quijadajosed.duckdns.org/dashboard (o la URL de tu frontend Angular)

Valid redirect URIs:

https://nest-sso-backend.quijadajosed.duckdns.org/auth/callback

https://nest-frontend.quijadajosed.duckdns.org/dashboard

(Añade cualquier otra URI de redirección necesaria)

Valid post logout redirect URIs:

https://nest-sso-backend.quijadajosed.duckdns.org/auth/logout

Web origins:

+ (para permitir todos los orígenes si no estás seguro, o especifica tus orígenes exactos)
![Captura de pantalla: Crear cliente nestjs-api - Login settings](gallery/images/022.png)


Haz clic en Save.
![Captura de pantalla: Crear cliente nestjs-api - Login settings](gallery/images/023.png)
Una vez creado, se te redirigirá a los detalles del cliente. 

Ve a la pestaña Credentials para obtener el Client Secret. Copia este secreto, ya que lo necesitarás en tu backend NestJS.
![Captura de pantalla: Cliente nestjs-api - Credentials (Client Secret)](gallery/images/024.png)


Ve a la pestaña Advanced. En la sección "Fine grain OpenID Connect configuration", asegúrate de que Proof Key for Code Exchange Code Challenge Method esté configurado como S256. Esto es crucial para la seguridad en aplicaciones SPA (Single Page Applications) y es un requisito recomendado.
![Captura de pantalla: Cliente nestjs-api - Advanced (PKCE)](gallery/images/025.png)
![Captura de pantalla: Cliente nestjs-api - Advanced (PKCE)](gallery/images/025-1.png)
![Captura de pantalla: Cliente nestjs-api - Advanced (PKCE)](gallery/images/025-2.png)

En la pestaña Roles (del cliente nestjs-api), haz clic en Create role y crea un rol llamado admin. Este rol será específico de este cliente.

![Captura de pantalla: Cliente nestjs-api - Roles (Crear rol admin)](gallery/images/026.png)
![Captura de pantalla: Cliente nestjs-api - Roles (Crear rol admin)](gallery/images/026-1.png)
![Captura de pantalla: Cliente nestjs-api - Roles (Crear rol admin)](gallery/images/026-2.png)
![Captura de pantalla: Cliente nestjs-api - Roles (Crear rol admin)](gallery/images/026-3.png)

### Variables de entorno para NestJS API

Estas son las variables de entorno que tu aplicación NestJS backend necesitará para comunicarse con Keycloak:

```ts
KEYCLOAK_AUTH_URL="https://keycloak.quijadajosed.duckdns.org/"
KEYCLOAK_REALM="sso-realm"
KEYCLOAK_CLIENT_ID="nestjs-api"
KEYCLOAK_CLIENT_SECRET="el-secret-que-copiaste-anteriormente"
KEYCLOAK_REDIRECT_URI="https://nest-sso-backend.quijadajosed.duckdns.org/auth/callback"
KEYCLOAK_ISSUER_URL="https://keycloak.quijadajosed.duckdns.org/realms/sso-realm"
KEYCLOAK_PKCE_CHALLENGE_METHOD="S256"
SPA_BASE_URL="https://nest-frontend.quijadajosed.duckdns.org"
```

### Configuración del Cliente para Spring API (spring-api)

Repite un proceso similar para tu aplicación Spring Boot backend.

En el menú lateral de sso-realm, ve a Clients.

Haz clic en Create client.

En la sección "General settings":

Client type: OpenID Connect

Client ID: spring-api

Name: spring-api (o un nombre descriptivo)
![Captura de pantalla: Crear cliente spring-api - General settings](gallery/images/028.png)

Haz clic en Next.

En la sección "Capability config":

Asegúrate de que Client authentication esté On.

En Authentication flow, activa Standard flow, Direct access grants, y Service accounts roles.
![Captura de pantalla: Crear cliente spring-api - Capability config](gallery/images/029.png)

Haz clic en Next.

En la sección "Login settings":
```yml
Root URL: https://spring-sso-backend.quijadajosed.duckdns.org (o la URL de tu backend Spring)

Home URL: https://spring-frontend.quijadajosed.duckdns.org/dashboard (o la URL de tu frontend Angular)

Valid redirect URIs:

https://spring-sso-backend.quijadajosed.duckdns.org/auth/callback

https://spring-frontend.quijadajosed.duckdns.org/dashboard

Valid post logout redirect URIs:

https://spring-sso-backend.quijadajosed.duckdns.org/auth/logout

Web origins:

+
```
![Captura de pantalla: Crear cliente spring-api - Login settings](gallery/images/029.png)
![Captura de pantalla: Crear cliente spring-api - Login settings](gallery/images/029-1.png)


Haz clic en Save.

Una vez creado, se te redirigirá a los detalles del cliente. Ve a la pestaña Credentials para obtener el Client Secret. Copia este secreto.
![Captura de pantalla: Cliente spring-api - Credentials (Client Secret)](gallery/images/030.png)


Similar al cliente NestJS, ve a la pestaña Advanced y configura Proof Key for Code Exchange Code Challenge Method como S256.
![Captura de pantalla: Cliente spring-api - Advanced (PKCE)](gallery/images/031.png)

En la pestaña Roles (del cliente spring-api), haz clic en Create role y crea un rol llamado admin.
![](gallery/images/032.png)
![](gallery/images/033.png)
![](gallery/images/034.png)

Variables de entorno para Spring API

Para tu aplicación Spring Boot backend, el archivo application.yml podría tener una configuración similar a esta:

```yaml
keycloak:
  client-id: spring-api
  client-secret: el-secret-que-copiamos-en-el-paso-anterior
  redirect-uri: https://spring-sso-backend.quijadajosed.duckdns.org/auth/callback
  issuer-uri: https://keycloak.quijadajosed.duckdns.org/realms/sso-realm
  spa:
    base-url: https://spring-frontend.quijadajosed.duckdns.org
```

Ubicación típica: spring-sso-backend/src/main/resources/application.yml

### Creación y configuración de usuarios de prueba (administrador y usuario simple)

Crearemos dos usuarios en nuestro sso-realm y le asignaremos a uno el grupo admins para que tenga el rol admin global y, por herencia, los roles admin a nivel de cliente y al otro no.

En el menú lateral de sso-realm, ve a Users.

Haz clic en Add user.

Ingresa el Username (ej. user), Email (ej. user@gmail.com), First name y Last name.
![Captura de pantalla: Crear usuario en sso-realm](gallery/images/035.png)
![Captura de pantalla: Crear usuario en sso-realm](gallery/images/036.png)

En la sección Groups, haz clic en Join Groups.

Selecciona el grupo admins y haz clic en Join.
![Captura de pantalla: Unir usuario al grupo admins](gallery/images/036-1.png)
![Captura de pantalla: Unir usuario al grupo admins](gallery/images/036-2.png)
![Captura de pantalla: Crear usuario en sso-realm](gallery/images/036-3.png)

Haz clic en Create.

Una vez creado el usuario, ve a la pestaña Credentials para establecer una contraseña para este usuario.
![Captura de pantalla: Establecer contraseña para usuario de prueba](gallery/images/037.png)

Asegúrate de desactivar la opción "Temporary" si no quieres que el usuario cambie la contraseña en el primer inicio de sesión.
![Captura de pantalla: Establecer contraseña para usuario de prueba](gallery/images/038.png)
![Captura de pantalla: Establecer contraseña para usuario de prueba](gallery/images/039.png)
Haz clic en Save password.

Repetimos el proceso para un usuario sin privilegios:

![Captura de pantalla: Crear usuario en sso-realm](gallery/images/040.png)
![Captura de pantalla: Crear usuario en sso-realm](gallery/images/041.png)
![Captura de pantalla: Crear usuario en sso-realm](gallery/images/042.png)
![Captura de pantalla: Crear usuario en sso-realm](gallery/images/043.png)
![Captura de pantalla: Crear usuario en sso-realm](gallery/images/044.png)



### Puesta en marcha de las aplicaciones

Asumiendo que tus aplicaciones de backend y frontend están configuradas para usar las variables de entorno o la configuración de Keycloak que acabamos de establecer, puedes iniciar los servicios.

Si utilizas Docker Compose para tus aplicaciones, podrías tener comandos similares a estos:

```sh
docker-compose up nest-sso-backend spring-sso-backend nest-frontend spring-frontend
```

O simplemente:

```sh
docker-compose up
```
![](gallery/images/045.png)


### Verificación y Prueba

Una vez que todas las aplicaciones y Keycloak estén en funcionamiento, puedes probar la configuración de SSO:

Abre tu navegador y navega a la URL de tu frontend Angular (ej. https://nest-frontend.quijadajosed.duckdns.org/dashboard o https://spring-frontend.quijadajosed.duckdns.org/dashboard).

Deberías ser redirigido a la página de inicio de sesión de Keycloak (sso-realm).

### Demostración del flujo de SSO:
<video controls src="gallery/videos/tests.mp4" title="Title"></video>

¡Felicidades! Has configurado Keycloak para gestionar el SSO entre tus aplicaciones.

## Glosario

- **IdP (Identity Provider)**: Proveedor de Identidad. Es el sistema que gestiona la identidad de los usuarios y proporciona servicios de autenticación. En este proyecto, es Keycloak.
- **SSO (Single Sign-On)**: Inicio de Sesión Único. Permite a un usuario iniciar sesión una sola vez y acceder a múltiples aplicaciones sin tener que volver a autenticarse.
- **Realm**: En Keycloak, un realm es un espacio aislado que gestiona un conjunto de usuarios, credenciales, roles y clientes. El realm `master` es para administrar Keycloak, mientras que se crean realms adicionales para las aplicaciones.
- **Cliente (Client)**: En Keycloak, un cliente es una entidad (aplicación o servicio) que solicita la autenticación de un usuario. En este proyecto, `nestjs-api` y `spring-api` son clientes.
- **Rol (Role)**: Un rol define un conjunto de permisos. Se pueden asignar a usuarios o grupos para implementar el Control de Acceso Basado en Roles (RBAC).
- **Grupo (Group)**: Una colección de usuarios. Asignar roles a grupos simplifica la gestión de permisos, ya que todos los miembros del grupo heredan los roles del grupo.
- **JWT (JSON Web Token)**: Un estándar abierto para crear tokens de acceso que afirman un número de "claims" (declaraciones). Son utilizados para transmitir de forma segura la identidad del usuario entre el IdP y las aplicaciones.
- **Access Token**: Un tipo de JWT que se utiliza para acceder a recursos protegidos (endpoints de API). Contiene información sobre el usuario y sus permisos.
- **BFF (Backend-for-Frontend)**: Un patrón de arquitectura donde se crea un backend específico para una experiencia de frontend. En este proyecto, el backend de NestJS actúa como un BFF para su frontend Angular, gestionando el flujo de autenticación y los tokens.
- **PKCE (Proof Key for Code Exchange)**: Una extensión de seguridad para el flujo de "Authorization Code" que previene ataques de intercepción del código de autorización. Es especialmente importante para clientes públicos como las SPAs.
- **URI de Redirección (Redirect URI)**: La URL a la que Keycloak redirige al usuario después de una autenticación exitosa. Debe estar en una lista blanca en la configuración del cliente de Keycloak por seguridad.
