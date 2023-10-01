import { TOKEN, GITHUB_API_URL } from "./github.ts";

async function getReposOfOwner(owner: string) {
  const headers = new Headers({
    Authorization: `token ${TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  });

  let page = 1;
  let repos: any[] = [];
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

async function getContributorActivityForRepo(
  repository: string,
  startDate: string,
  contributors: string[]
) {
  const headers = new Headers({
    Authorization: `token ${TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  });

  const sinceParam = startDate ? `&since=${startDate}` : "";

  let page = 1;
  let issues: any = [];
  let hasNextPage = true;

  while (hasNextPage) {
    const issuesResponse = await fetch(
      `${GITHUB_API_URL}/repos/${repository}/issues?state=all${sinceParam}&page=${page}&per_page=100`,
      { headers }
    ).then((res) => res.json());
    issues = issues.concat(issuesResponse);
    hasNextPage = issuesResponse.length === 100;
    page++;
  }

  const filteredIssues = issues.filter((issue: any) =>
    contributors.includes(issue.user.login)
  );

  const { prsOpened, prsMerged, issuesOpened } = filteredIssues.reduce(
    (
      acc: { prsOpened: number; prsMerged: number; issuesOpened: number },
      curr: any
    ) => {
      if (curr.pull_request) {
        acc.prsOpened++;
        if (curr.pull_request.merged_at) {
          acc.prsMerged++;
        }
      } else {
        acc.issuesOpened++;
      }
      return acc;
    },
    { prsOpened: 0, prsMerged: 0, issuesOpened: 0 }
  );

  return { repository, prsOpened, prsMerged, issuesOpened };
}

async function main(owner = "opensearch-project", startDate = "2023-09-19") {
  const contributors = (await Deno.readTextFile("contributors.txt"))
    .split("\n")
    .filter(Boolean);
  const repositories = await getReposOfOwner(owner);

  const promises = repositories.map((repo) =>
    getContributorActivityForRepo(repo, startDate, contributors)
  );
  const results = await Promise.all(promises);
  // Filter out repositories with no activity
  const filteredResults = results.filter(
    (result) => result.prsOpened > 0 || result.issuesOpened > 0
  );

  // Aggregate results by repository (array to object)
  const aggregated = filteredResults.reduce((acc: any, curr: any) => {
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
const startDate = Deno.args[0]; // Format: 'YYYY-MM-DD'

main(owner, startDate);
