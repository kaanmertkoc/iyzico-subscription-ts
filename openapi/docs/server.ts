/**
 * Simple static file server for OpenAPI documentation
 * Serves files from the current directory
 * Automatically resolves symlinks (like openapi.yaml)
 */

const PORT = 8080;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Default to index.html
    if (path === '/') {
      path = '/index.html';
    }

    // Try to serve the file
    try {
      const filePath = `${import.meta.dir}${path}`;
      const file = Bun.file(filePath);
      const exists = await file.exists();

      if (!exists) {
        return new Response('404 Not Found', { status: 404 });
      }

      // Bun.file automatically resolves symlinks
      return new Response(file);
    } catch (error) {
      console.error('Error serving file:', error);
      return new Response('500 Internal Server Error', { status: 500 });
    }
  },
});

console.log(`\n📚 Documentation server running at http://localhost:${PORT}\n`);
console.log(`   ✅ Serving OpenAPI docs`);
console.log(`   ✅ OpenAPI spec: symlinked to ../openapi.yaml`);
console.log(`   ✅ Visit: http://localhost:${PORT}`);
console.log(`   ✅ Press Ctrl+C to stop\n`);
