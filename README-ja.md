# MockWorks

[![Homebrew](https://img.shields.io/badge/-Homebrew-555.svg?logo=homebrew&style=flat)](https://brew.sh/)
[![mise](https://img.shields.io/badge/mise-brightgreen)](https://mise.jdx.dev/)
[![beercss](https://img.shields.io/badge/beercss-brightgreen)](https://www.beercss.com/)
[![dredd](https://img.shields.io/badge/dredd-brightgreen)](https://dredd.org/en/latest/)
[![Go](https://img.shields.io/badge/-go-555.svg?logo=go&style=flat)](https://go.dev/)
[![TypeScript](https://img.shields.io/badge/-TypeScript-555.svg?logo=typescript&style=flat)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/-React-555.svg?logo=react&style=flat)](https://ja.react.dev/)
[![HTML](https://img.shields.io/badge/-html-555.svg?logo=html5&style=flat)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![Docker](https://img.shields.io/badge/-Docker-555.svg?logo=docker&style=flat)](https://www.docker.com/)

[English](./README.md)

GoとSwaggerの学習を目的として作成しました。

このリポジトリでは、Goで簡単に設定できる**mock APIサーバー**と、Next.jsを使用した**Web UI（routes.jsonエディター）**を提供します。フロントエンド開発時に、バックエンド環境を用意せずに仕様に沿ったレスポンスをテストできます。自分だけが個人利用することを想定して作成しましたが、APIクライアントを用意するほどではない規模で、mockサーバーを毎回用意するのが面倒だったり、無料のツールを探している人は利用してみてください。

- パスパラメーター対応（`/users/｛id｝`）
- CORSおよびOPTIONSプリフライトリクエスト対応
- Authorization： Bearer ...の検証 （JWT）
- レスポンス遅延シミュレーション （delay）
- リクエスト内容 （`body/query`） に基づく条件付きレスポンス
- Swagger UI ドキュメントとテスト
- `/api/routes` でルート定義を動的に編集
- Web UI で `routes.json`を編集

---

## ディレクトリ

```bash
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
├─ README-ja.md # This README for the entire project
└─ README.md # README English Ver.
```

## Docker環境

```bash
docker compose up --build -t mockserver .
```

このツールはデフォルトで `localhost`のポート `3000` と `8080` を使用します。

### 環境変数設定 （JWT 秘密鍵）

- デフォルトでは、`main.go` 内の `jwtSecret` が使用されます。
- 必要に応じて環境変数経由で再設定してください：

```go
jwtSecret ：= ［］byte（os.Getenv（「JWT_SECRET」））
```

## 設定

### Swagger UIの設定ファイルを配置： `mock-server/static/swagger/swagger.json`

- Swagger UIの設定ファイル `swagger.json`を `mock-server/static/swagger/`下に配置します。
- `swagger.json`は［OpenAPI Specification （OAS3.0）］（https://swagger.io/specification/）に基づいて作成されています。
- `swagger.json` は `Dredd （HTTP API Testing Framework）` によって参照され、API レスポンスが OAS 定義に準拠しているかを検証するために使用されます。
- `http://localhost:3000` にアクセスし、「Run API Tests」ボタンをクリックして `Dredd` でテストを実行します。
- ブラウザで http://localhost:8080/swagger/ にアクセスして API ドキュメントを開きます。

curl を使用してトークンを取得します

```bash
curl -X POST http://localhost:8080/token \
-H 「Content-Type： application/json」 \
-d 『｛『sub』：「2」｝』 # sub2： ユーザーID = 2 のトークン
```

応答例：

｛「token」：「eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…」｝

### API ルートを定義： `mock-server/routes.json`

`routes.json` では以下形式の JSON 配列で、各オブジェクトごとに単一の API ルートを定義します。

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
"source": "body", # Check 'username' in the request body (JSON)
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
"path": "/items1",
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
"path": "/items2",
"response_template": "items_default.json",
"match": {
"field": "type",
"source": "query", # Check 'type' in the query string (?type=)
"cases": {
"foo": "items_foo.json",
"bar": "items_bar.json"
},
"default": "items_default.json"
}
}
]
```

- method: HTTP メソッド (GET, POST, etc.)
- path: パラメーター ｛param｝ をサポート (/users/{id})
- response_template: responses/ ディレクトリ内の JSON ファイル名
- auth: true に設定すると JWT 認証（Bearer トークン形式）を有効化
- delay: レスポンス送信前に指定したミリ秒数だけ待機
- match: リクエストボディ/クエリに基づいて分岐する条件を設定

**WebUI から `http://localhost:3000` にアクセスして routes.json を編集できます。**

### responses ディレクトリ：`mock-server/responses`

- 各 API のレスポンス JSON を `mock-server/responses` フォルダーに配置します。
- ファイル名は、response_template または match.cases で指定されたものと一致する必要があります。

例:

```json
responses/
├ users_1.json # {"id":1,"name":"Taro"}
├ users_2.json # {"id":2,"name":"Hanako"}
├ login_admin.json # {"status":"admin_login"}
├ login_guest.json # {"status":"guest_login"}
└ login_default.json # {"status":"unknown_user"}
```

## リクエスト例

1. GET /users/ (with auth and delay)

```bash
curl -i \
-H "Authorization: Bearer eyJhbGciOi…" \
http://localhost:8080/users/123
```

- `responses/users_123.json` を返す
- 認証情報がないまたは無効 ⇒ 401 Unauthorized
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
curl -i 'http://localhost:8080/items2?type=foo'

# when type=bar
curl -i 'http://localhost:8080/items2?type=bar'

# when type is missing or other
curl -i 'http://localhost:8080/items2'
curl -i 'http://localhost:8080/items2?type=baz'
```

- `?type=foo` ⇒ `items_foo.json`
- `?type=bar` ⇒ `items_bar.json`
- Otherwise ⇒ `items_default.json`

---

## 主要な機能の説明

### CORS/Preflightリクエストのサポート

- すべてのレスポンスに `Access-Control-Allow-*` ヘッダーを追加
- `OPTIONS` リクエストに対してステータス 200 でレスポンス

### JWT 認証

- `Authorization： Bearer <token>` ヘッダーで検証

### レスポンス遅延シミュレーション

- `routes.json` の `delay` プロパティ（ms）を使用してレスポンスを遅延

### パスパラメーターサポート

- `/users/｛id｝` 形式で定義

### 条件付きレスポンス

- リクエストボディ/クエリ内の特定のフィールドに基づいてファイルを返すために `match` 設定を使用

### Swagger UI

- `static/swagger/` ディレクトリに Swagger UI の静的リソースを配置 + `/swagger/` を `swagger.json`
- Dreddを使用したテスト

---

## 事前準備（ローカル環境設定）

* **mise** コマンドが利用可能であること。
* Git がインストールされている
* Node.js が必須（yarn の実行環境）

### mise のインストール

```bash
brew install mise
```

### バックエンド設定

#### Go と yarn （mise） のインストール

```bash
mise i
```

#### Go モジュールの取得

```bash
cd mock-server
go mod tidy
go mod download
```

#### サーバーの起動

```bash
cd mock-server
go run main.go
```

初回起動時、`routes.json` をロードします。

### オプション： フロントエンド （Web UI） の設定

#### yarn でパッケージをインストール

```bash
cd web-ui
yarn install
```

#### 開発サーバーを起動

```bash
cd web-ui
yarn dev
```

`http://localhost:3000` でエディタが起動します。

---

## トラブルシューティング

- **サーバーが起動しない**： `mock-server` ディレクトリで `go mod download` を実行していることを確認してください。
- **JWT 検証エラー**： env ベースのシークレットに切り替えた場合、`JWT_SECRET` 環境変数が正しく設定されていることを確認してください。
- **CORS 問題**： ブラウザのキャッシュをクリアするか、リクエストのオリジンが許可されていることを確認してください。
- **Web UI が読み込まれない**： `web-ui/` ディレクトリで `yarn dev` を実行し、`http://localhost:3000` にアクセスできることを確認してください。

---

## ライセンス

- © aki-mia — [MIT License](./LICENSE)
- 第三者コンポーネントは[Apache License 2.0](./THIRD_PARTY_LICENSES/Apache-2.0.txt)の下で利用されています
  （詳細は `THIRD_PARTY_LICENSES/NOTICE.Apache-2.0.txt`を参照）
