import { load } from "https://deno.land/std@0.202.0/dotenv/mod.ts";

const env = await load();
const GITHUB_API_URL = "https://api.github.com";
const TOKEN = env["TOKEN"]

async function getReposOfOwner(owner) {
  const headers = new Headers({
    Authorization: `token ${TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  });

  let page = 1;
  let repos = [];
  let hasNextPage = true;
  while (hasNextPage) {
    const reposResponse = await fetch(
      `${GITHUB_API_URL}/users/${owner}/repos?page=${page}
      &per_page=100
      &type=public`,
      { headers }
    )
      .then((res) => res.json())
      .catch((err) => console.log(err));
    repos = repos.concat(reposResponse);
    hasNextPage = reposResponse.length === 100;
    page++;
  }

  return repos.map((repo) => repo.full_name);
}

async function countContributorActivityForRepo(
  contributor,
  repository: string,
  startDate
) {
  const headers = new Headers({
    Authorization: `token ${TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  });

  const sinceParam = startDate ? `&since=${startDate}` : "";

  let page = 1;
  let issues = [];
  let hasNextPage = true;

  while (hasNextPage) {
    const issuesResponse = await fetch(
      `${GITHUB_API_URL}/repos/${repository}/issues?state=all&creator=${contributor}${sinceParam}&page=${page}&per_page=100`,
      { headers }
    ).then((res) => res.json());
    issues = issues.concat(issuesResponse);
    hasNextPage = issuesResponse.length === 100;
    page++;
  }

  const { prsOpened, prsMerged, issuesOpened } = issues.reduce(
    (acc, curr) => {
      if (curr.pull_request) {
        acc.prsOpened++;
        if (curr.pull_request.merged_at) {
          acc.prsMerged++;
        }
      } else {
        acc.issuesOpened++;
      }

      debugger;
      return acc;
    },
    { prsOpened: 0, prsMerged: 0, issuesOpened: 0 }
  );

  return { repository, prsOpened, prsMerged, issuesOpened };
}

async function main(owner, startDate) {
  const contributors = (await Deno.readTextFile("contributors.txt"))
    .split("\n")
    .filter(Boolean);
  const repositories = await getReposOfOwner(owner);

  const promises = contributors.flatMap((contributor) =>
    repositories.map((repo) =>
      countContributorActivityForRepo(contributor, repo, startDate)
    )
  );
  const results = await Promise.all(promises);
  debugger;

  const aggregated = results.reduce((acc, curr) => {
    if (!acc[curr.repository]) {
      acc[curr.repository] = { prsOpened: 0, prsMerged: 0, issuesOpened: 0 };
    }
    acc[curr.repository].prsOpened += curr.prsOpened;
    acc[curr.repository].prsMerged += curr.prsMerged;
    acc[curr.repository].issuesOpened += curr.issuesOpened;
    return acc;
  }, {});

  for (const repo in aggregated) {
    const repoStats = aggregated[repo];
    if (repoStats.prsOpened > 0 || repoStats.issuesOpened > 0) {
      console.log(`Repository: ${repo}`);
      console.log(`Total PRs opened by contributors: ${repoStats.prsOpened}`);
      console.log(`Total PRs merged by contributors: ${repoStats.prsMerged}`);
      console.log(
        `Total Issues opened by contributors: ${repoStats.issuesOpened}`
      );
      console.log("-----------------------");
    }
  }
}

const owner = "opensearch-project";
const startDate = "2023-09-25"; // Format: 'YYYY-MM-DD'
// const startDate = Deno.args[0]; // Format: 'YYYY-MM-DD'

if (!owner) {
  console.error("Please provide the GitHub owner as the first argument.");
  Deno.exit(1);
}

main(owner, startDate);
