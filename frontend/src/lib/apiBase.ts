export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const { origin } = window.location;
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      return 'http://localhost:8000';
    }
  }

  return '';
}