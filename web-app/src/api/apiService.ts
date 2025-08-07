export {};

const BASE_URL = "http://localhost:5000/api";

export async function searchAddress(query: string) {
  const response = await fetch(`${BASE_URL}/search_address/${query}`);
  if (!response.ok) throw new Error("Failed to fetch");
  return response.json();
}
