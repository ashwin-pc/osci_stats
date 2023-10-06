import { parse } from "https://deno.land/std@0.202.0/flags/mod.ts";
import { GITHUB_API_URL, fetchGithubAPIPaginated } from "./github.ts";

const flags = parse(Deno.args, {
  string: ["list", "start", "owner", "token"],
  default: {
    owner: "opensearch-project",
    start: "2023-09-19", // Format: 'YYYY-MM-DD'
  },
});

const OPTIONS: RequestInit = {};

if (flags.token) {
  OPTIONS.headers = new Headers({
    Authorization: `token ${flags.token}`,
  });
}

async function getReposOfOwner(owner: string) {
  const url = `${GITHUB_API_URL}/users/${owner}/repos?type=public`;
  const repos: any = await fetchGithubAPIPaginated(url, OPTIONS);

  return repos.map((repo: any) => repo.full_name);
}

async function getContributorActivityForRepo(
  repository: string,
  startDate: string,
  contributors: string[]
) {
  const sinceParam = startDate ? `&since=${startDate}` : "";
  const url = `${GITHUB_API_URL}/repos/${repository}/issues?state=all${sinceParam}`;
  const issues: any = await fetchGithubAPIPaginated(url, OPTIONS);

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

const getContributorList = async () => {
  let data: string;
  if (flags.list) {
    const response = await fetch(flags.list);
    data = await response.text();
  } else {
    data = await Deno.readTextFile("contributors.txt");
  }

  const contributors = data.split("\n").filter(Boolean);

  return contributors;
};

async function main() {
  try {
    const contributors = await getContributorList();
    const repositories = await getReposOfOwner(flags.owner);

    const promises = repositories.map((repo: any) =>
      getContributorActivityForRepo(repo, flags.start, contributors)
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
  } catch (error) {
    console.error(error);
  }
}

main();
