// Helper function to get auth token from localStorage (client-side only)
function getAuthTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

// Enhanced fetch wrapper that automatically includes JWT token in Authorization header
export async function fetchAuth(
  url: string | URL | Request,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthTokenFromStorage();

  const headers = new Headers(options.headers);

  // Add Authorization header if token exists and not already set
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Add Content-Type header for JSON requests if not already set
  if (
    (options.method === "POST" ||
      options.method === "PUT" ||
      options.method === "PATCH") &&
    options.body &&
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
