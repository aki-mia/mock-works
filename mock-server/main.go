package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

type Route struct {
	Method           string           `json:"method"`
	Path             string           `json:"path"`
	ResponseTemplate string           `json:"response_template"`
	Match            *MatchDefinition `json:"match,omitempty"`
	AuthRequired     bool             `json:"auth,omitempty"`
	DelayMillis      int              `json:"delay,omitempty"`
}

type MatchDefinition struct {
	Field   string            `json:"field"`
	Source  string            `json:"source"`
	Cases   map[string]string `json:"cases"`
	Default string            `json:"default"`
}

var (
	routes    []Route
	jwtSecret = []byte("your-256-bit-secret")
)

// TokenRequest は /token 用のリクエストボディ型
type TokenRequest struct {
	Sub string `json:"sub"`
}

func main() {
	data, err := os.ReadFile("routes.json")
	if err != nil {
		log.Fatalf("Failed to read routes.json: %v", err)
	}
	if err := json.Unmarshal(data, &routes); err != nil {
		log.Fatalf("Failed to parse routes.json: %v", err)
	}

	// /token で JWT を発行する
	http.HandleFunc("/token", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}
		var req TokenRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Sub == "" {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		// 有効期限を設定（今から1時間後）
		expiresAt := time.Now().Add(time.Hour)
		claims := jwt.MapClaims{
			"sub": req.Sub,
			"exp": expiresAt.Unix(),
		}
		tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
		tokenString, err := tok.SignedString(jwtSecret)
		if err != nil {
			http.Error(w, "Token generation failed", http.StatusInternalServerError)
			return
		}

		// レスポンスに token と expires_at を含める
		resp := struct {
			Token     string `json:"token"`
			ExpiresAt string `json:"expires_at"` // Unix timestamp (秒)
		}{
			Token:     tokenString,
			ExpiresAt: expiresAt.Format(time.RFC3339),
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}))

	http.HandleFunc("/", withCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		for _, route := range routes {
			if r.Method != route.Method {
				continue
			}

			rePath := regexp.MustCompile(`\{(\w+)\}`)
			pattern := rePath.ReplaceAllString(route.Path, `([^/]+)`)
			re := regexp.MustCompile("^" + pattern + "$")
			matches := re.FindStringSubmatch(r.URL.Path)
			if matches == nil {
				continue
			}

			if route.DelayMillis > 0 {
				time.Sleep(time.Duration(route.DelayMillis) * time.Millisecond)
			}

			if route.AuthRequired && !validateJWT(r) {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			params := make(map[string]string)
			keys := rePath.FindAllStringSubmatch(route.Path, -1)
			for i, key := range keys {
				params[key[1]] = matches[i+1]
			}

			filename := route.ResponseTemplate
			for k, v := range params {
				filename = strings.ReplaceAll(filename, "{"+k+"}", v)
			}

			if route.Match != nil {
				var val string
				if route.Match.Source == "body" {
					var body map[string]string
					_ = json.NewDecoder(r.Body).Decode(&body)
					val = body[route.Match.Field]
				} else {
					val = r.URL.Query().Get(route.Match.Field)
				}
				if override, ok := route.Match.Cases[val]; ok {
					filename = override
				} else {
					filename = route.Match.Default
				}
			}

			respPath := filepath.Join("responses", filename)
			respData, err := os.ReadFile(respPath)
			if err != nil {
				http.Error(w, "Response file not found", http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.Write(respData)
			return
		}
		http.NotFound(w, r)
	}))

	http.HandleFunc("/api/routes", withCORS(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			data, _ := os.ReadFile("routes.json")
			w.Header().Set("Content-Type", "application/json")
			w.Write(data)
		case http.MethodPost:
			body, _ := io.ReadAll(r.Body)
			os.WriteFile("routes.json", body, 0644)
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		}
	}))

	fs := http.FileServer(http.Dir("./static/swagger"))
	http.Handle("/swagger/", http.StripPrefix("/swagger/", fs))

	port := "8080"
	fmt.Printf("Mock server running at http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

// --- CORS/プリフライト対応 with allowed hosts ---

// 環境変数 ALLOWED_ORIGINS に許可するオリジンをカンマ区切りで指定
// 例: export ALLOWED_ORIGINS="https://example.com,https://api.example.com"
var allowedOrigins []string

func init() {
	if env := os.Getenv("ALLOWED_ORIGINS"); env != "" {
		allowedOrigins = strings.Split(env, ",")
	} else {
		// デフォルトで全許可する場合は以下を有効化
		// allowedOrigins = []string{"*"}
		allowedOrigins = []string{}
	}
}

// withCORS は、リクエストの Origin ヘッダを確認し、
// 許可リストに含まれる場合のみ Access-Control-Allow-Origin を設定します。
func withCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		for _, o := range allowedOrigins {
			if o == origin || o == "*" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// プリフライトリクエストへの応答
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func validateJWT(r *http.Request) bool {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		return false
	}
	tokenString := strings.TrimPrefix(auth, "Bearer ")
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})
	return err == nil && token.Valid
}
