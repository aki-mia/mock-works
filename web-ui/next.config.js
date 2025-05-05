// 以下、通常のリライトルール定義
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*'
      },
      {
        source: '/swagger/:path*',
        destination: 'http://localhost:8080/swagger/:path*'
      }
    ];
  }
};