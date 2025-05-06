# MockWorks

Created for the purpose of learning `Go` and `swagger`.

This repository provides an easy-to-set-up **mock API server** in Go and a **Web UI (routes.json editor)** using Next.js. The goal is to allow you to test responses according to specifications without a real backend when developing frontends.

- Support for path parameters (`/users/{id}`)
- Support for CORS & OPTIONS preflight requests
- Full validation of Authorization: Bearer ... (JWT)
- Response delay simulation (delay)
- Conditional responses based on request content (body/query)
- Documentation and testing with Swagger UI
- Dynamically edit route definitions in `/api/routes`
- Visualize and edit routes.json in Next.js Web UI

---

## Prerequisites

* **mise** command is available.
* Git is installed
* Node.js is required (as a runtime environment for yarn)

### Installing mise

```bash
brew install mise
```

---

## directory structure

```
mock_server_project/
├─ mock-server/ # Go-based backend
│ ├ main.go # Main server implementation
│ ├ go.mod
│ ├ routes.json # Route definition file
│ ├ responses/ # JSON responses
│ └ static/swagger/ # Static files for Swagger UI
├─ web-ui/ # Next.js-based frontend
│ ├ package.json
│ ├ next.config.js
│ └ pages/index.js # Root editor page
├─ THIRD_PARTY_LICENSES/
│ ├ Apache-2.0.txt
│ └ NOTICE.Apache-2.0.txt
├─ LICENCE
└─ README.md # This README for the entire project
```

---

## Backend setup

### Installing Go and yarn (mise)

```bash
mise i
```

### Getting Go modules

```bash
cd mock-server
go mod tidy
go mod download
```

### Server startup

```bash
cd mock-server
go run main.go
```

When launched for the first time, load `routes.json` and wait at `http://localhost:8080`.

### Environment variable settings (JWT secret)

- By default, `jwtSecret` in `main.go` is used.
- To make it closer to actual operation, please rewrite it via environment variables:
- ```go
  jwtSecret := []byte(os.Getenv("JWT_SECRET"))
  ```

---

## Optional: Front-end (Web UI) setup

### Install package with yarn

```bash
cd web-ui
yarn install
```

### Start development server

```bash
cd web-ui
yarn dev
```

`http://localhost:3000` launches the root definition editor.

---

## Explanation of key features

### CORS/Preflight Support

- Add the `Access-Control-Allow-*` header to all responses
- Respond immediately with status 200 to `OPTIONS` requests

### JWT Authentication

- Check the `Authorization: Bearer <token>` header format
- Perform signature verification using `github.com/golang-jwt/jwt/v4`

### Response delay simulation

- Use the `delay` property (ms) in `routes.json` to delay responses with `time.Sleep`

### Path parameter support

- Define in the format `/users/{id}` → Dynamically match to the client's `/users/123`

### Conditional responses

- Return a file based on specific fields in the request body/query using the `match` setting

### Swagger UI

- Static release of Swagger UI under `static/swagger/` + display `/swagger/` using `swagger.json`
- Try it out to test the API

### Route Definition API

- `GET /api/routes` → Returns the current `routes.json`
- `POST /api/routes` → Receives the modified JSON and saves it over the existing file

## How to write routes.json

`routes.json` is a JSON array like the following, where each object defines a single API route.

```json
[
  {
    "method": "GET",
    "path": "/users/{id}",
    "response_template": "users_{id}.json",
    "auth": true,
    "delay": 200
  },
  {
    "method": "POST",
    "path": "/login",
    "response_template": "login_default.json",
    "match": {
      "field": "username",
      "source": "body",            # Check 'username' in the request body (JSON)
      "cases": {
        "admin": "login_admin.json",
        "guest": "login_guest.json"
      },
      "default": "login_default.json"
    },
    "delay": 500
  },
  {
    "method": "GET",
    "path": "/items",
    "response_template": "items_default.json",
    "match": {
      "fields": ["type","sort"],
      "source": "query",
      "cases": {
        "foo_asc": "items_foo_asc.json", # ?type=foo&sort=asc
        "bar_desc": "items_bar_desc.json" # ?type=bar&sort=desc
      },
      "default": "items_default.json"
    }
  },
  {
    "method": "GET",
    "path": "/items",
    "response_template": "items_default.json",
    "match": {
      "field": "type",
      "source": "query",           # Check 'type' in the query string (?type=)
      "cases": {
        "foo": "items_foo.json",
        "bar": "items_bar.json"
      },
      "default": "items_default.json"
    }
  }
]
```

- method: HTTP method (GET, POST, etc.)
- path: Supports path parameters {param} (/users/{id})
- response_template: JSON file name under responses/
- auth: Enable JWT authentication (Bearer token format) when set to true
- delay: pauses for the specified number of milliseconds before sending the response
- match: Set conditions for branching based on request body/query

#### Request Examples

1. GET /users/ (with auth and delay)

```bash
curl -i \
  -H "Authorization: Bearer eyJhbGciOi…" \
  http://localhost:8080/users/123
```

- Returns `responses/users_123.json`
- Missing or invalid Authorization ⇒ 401 Unauthorized
- ~200 ms delay

2. POST /login (body-based routing with delay)

```bash
# admin
curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"xxx"}' \
  http://localhost:8080/login

# guest
curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"guest","password":"yyy"}' \
  http://localhost:8080/login

# others
curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"someone","password":"zzz"}' \
  http://localhost:8080/login
```

- `"admin"` ⇒ `login_admin.json`
- `"guest"` ⇒ `login_guest.json`
- Otherwise ⇒ `login_default.json`
- ~500 ms delay

3. GET /items?type= (query-based routing)

```bash
# when type=foo
curl -i 'http://localhost:8080/items?type=foo'

# when type=bar
curl -i 'http://localhost:8080/items?type=bar'

# when type is missing or other
curl -i 'http://localhost:8080/items'
curl -i 'http://localhost:8080/items?type=baz'
```

- `?type=foo` ⇒ `items_foo.json`
- `?type=bar` ⇒ `items_bar.json`
- Otherwise ⇒ `items_default.json`

---

## responses directory

- Place the response JSON for each API in the responses/ folder.
- File names must match those specified in response_template or match.cases.

  ex:

```json
responses/
├ users_1.json       # {"id":1,"name":"Taro"}
├ users_2.json       # {"id":2,"name":"Hanako"}
├ login_admin.json   # {"status":"admin_login"}
├ login_guest.json   # {"status":"guest_login"}
└ login_default.json # {"status":"unknown_user"}
```

---

## Swagger UI

- Place the static release of Swagger UI and swagger.json under static/swagger/.
- Access http://localhost:8080/swagger/ in your browser to open the API documentation.

Obtain the token using curl as follows

sub2: Token for user with user ID = 2

```bash
curl -X POST http://localhost:8080/token \
  -H "Content-Type: application/json" \
  -d '{"sub":"2"}'
```

Response example:

{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"}

---

## Docker

```bash
docker compose up --build -t mockserver .
```

---

## Troubleshooting

- **Server fails to start**: Ensure you’ve run `go mod download` in the `mock-server` directory.
- **JWT validation errors**: Verify `JWT_SECRET` environment variable is set correctly if you switched to env-based secrets.
- **CORS issues**: Clear browser cache or ensure the request origin is allowed.
- **Web UI not loading**: Make sure you ran `yarn dev` in `web-ui/` and opened `http://localhost:3000`.

---

For any questions or feedback, please open an issue or contact the maintainer.

## License

- © aki-mia — [MIT License](./LICENSE)
- Includes third-party components under [Apache License 2.0](./THIRD_PARTY_LICENSES/Apache-2.0.txt)
  (see `THIRD_PARTY_LICENSES/NOTICE.Apache-2.0.txt` for notices)
