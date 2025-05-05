window.onload = function() {
  // クエリパラメータ ?url= を取得
  const params = new URLSearchParams(window.location.search);
  // 指定があればそれを、なければ同ディレクトリの swagger.json を使う
  const specUrl = params.get('url') || './swagger.json';

  // Swagger UI を初期化
  window.ui = SwaggerUIBundle({
    url: specUrl,
    dom_id: '#swagger-ui',
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    layout: 'StandaloneLayout',
    // 必要に応じて他のオプションも追加できます
  });
};
