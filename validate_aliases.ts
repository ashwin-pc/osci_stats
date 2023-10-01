import { TOKEN, GITHUB_API_URL } from "./github.ts";

async function isValidUser(username: string): Promise<boolean> {
  const headers = new Headers({
    Authorization: `token ${TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  });

  const userResponse = await fetch(`${GITHUB_API_URL}/users/${username}`, {
    headers,
  });
  return userResponse.status === 200; // Status 200 indicates a valid user.
}

async function main() {
  const contributors = (await Deno.readTextFile("contributors.txt"))
    .split("\n")
    .filter(Boolean);

  const validationPromises = contributors.map(async (contributor) => {
    const valid = await isValidUser(contributor);
    return { contributor, valid };
  });

  const results = await Promise.all(validationPromises);

  const invalidUsers = results
    .filter((result) => !result.valid)
    .map((result) => result.contributor);
  if (invalidUsers.length > 0) {
    console.log("The following users are not valid GitHub users:");
    invalidUsers.forEach((user) => console.log(user));
  } else {
    console.log("All contributors are valid GitHub users.");
  }
}

main();
