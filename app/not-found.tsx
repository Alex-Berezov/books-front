export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>404 - Page Not Found</h1>
          <p>The page you are looking for does not exist.</p>
          <a href="/en" style={{ color: '#0070f3', textDecoration: 'underline' }}>
            Go to Homepage
          </a>
        </div>
      </body>
    </html>
  );
}
