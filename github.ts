import { load } from "https://deno.land/std@0.202.0/dotenv/mod.ts";

export const env = await load({
  defaultsPath: null,
  examplePath: null,
});

export const GITHUB_API_URL = "https://api.github.com";
export const TOKEN = env["TOKEN"];

export function getAuthHeaders(): Headers {
  const headers = new Headers({
    Accept: "application/vnd.github.v3+json",
  });

  if (TOKEN) {
    headers.append("Authorization", `token ${TOKEN}`);
  }

  return headers;
}

export async function fetchGithubAPI(
  url: string,
  options?: RequestInit
): Promise<Response> {
  if (!options) options = {};
  if (!options.headers) options.headers = new Headers();

  const headers = getAuthHeaders();
  for (const pair of headers.entries()) {
    (options.headers as Headers).set(pair[0], pair[1]);
  }

  return fetch(url, options);
}

export async function fetchGithubAPIPaginated(
  url: string,
  options?: RequestInit
): Promise<any[]> {
  const allResults: any[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const paginatedUrl = `${url}${
      url.includes("?") ? "&" : "?"
    }page=${page}&per_page=100`;
    const response = await fetchGithubAPI(paginatedUrl, options);

    if (response.status !== 200) {
      const { message } = await response.json();
      throw new Error(
        `Looks like the data could not be fetched for the URL \n\n${paginatedUrl} \n\nHere is what Github says: \n   ${message}`
      );
    }

    const data = await response.json();
    allResults.push(...data);

    hasNextPage = data.length === 100; // If we got 100 results, there might be more.
    page++;
  }

  return allResults;
}
