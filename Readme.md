## OSCI stats

A Collection of deno scripts for OSCI stats

## Prerequisites

Before running the script make sure to have the following files in the folder that you are running the script from.

`.env`

```
TOKEN=<Github Token>
```

`contributors.txt`

```
contributor_github_alias_1
contributor_github_alias_2
```

> You can also pass these values using command line args as follows:
>
> `deno run <script> --list=<url of the file> --token=<Github token>`

Once you have these two files, you also need to install Deno to run the scripts. To install Deno: https://docs.deno.com/runtime/manual/getting_started/installation

Once you have completed the pre-requisites, you can open a terminal window in the same folder and run the scripts.

### Running remotely

You can use these scripts by only having Deno installed on your computer.

Once you have deno installed make sure you have the prerequisite files in the folder (Or passed using command line args) you are running the script from.

To run the script:

```sh
deno run --allow-all https://raw.githubusercontent.com/ashwin-pc/osci_stats/master/osci_stats.ts

# or

deno run --allow-all https://raw.githubusercontent.com/ashwin-pc/osci_stats/master/osci_stats.ts --list="list_url" --token="github_token"
```

### Running locally

To get stats locally, clone the repo and add the prerequisite files to the project folder.

Then run

```sh
deno run --alow-all osci_stats.ts

// or

deno run --alow-all osci_stats.ts {YYYY-MM-DD}
```

To validate all the aliases of the github users:

```sh
deno run --allow-all validate_aliases.ts
```

### Available command line args

The args available are:

```
--list  List of all the contributors
--start start date to fetch data from (default: 2023-09-19)
--token github token
--owner owner of the github repositories to search within (default: opensearch-project)
```

### Generating a github token

Go to this url in your github account and create a new personal access token: https://github.com/settings/tokens

You dont need any special permissions, but just to be sure make sure to have the `repo` and `user` permissions for the token
