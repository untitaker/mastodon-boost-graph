import App from "./App.svelte";
import "./app.css";

type Account = { acct: string };

const getNextPage = (response: Response) => {
  const matches = (response.headers.get("Link") || "").match(
    /<(.+?)>; rel="next"/
  );
  if (!matches) return null;
  return matches[1];
};

const paginatedGet = async (url: string, each: (_: any) => Promise<any>) => {
  const response = await fetch(url);
  await each(response);
  const nextUrl = getNextPage(response);
  if (nextUrl) {
    await paginatedGet(nextUrl, each);
  }
};

const fetchAccount = async (
  acct: string,
  boostingAccounts: { [key: string]: object }
) => {
  const matches = acct.match(/^(.+?)@(.+)$/);
  if (!matches) return null;
  const [_, user, host] = matches;
  const accountsLookupUrl = `https://${host}/api/v1/accounts/lookup?acct=${user}`;
  const response = await fetch(accountsLookupUrl);
  const json = await response.json();
  if (!json.id) {
    return null;
  }

  const following = [];
  await paginatedGet(
    `https://${host}/api/v1/accounts/${json.id}/following`,
    async (pageResponse) => {
      const json = await pageResponse.json();
      if (Array.isArray(json)) {
        for (const account of json) {
          if (account.acct && account.acct in boostingAccounts) {
            following.push(account.acct);
          }
        }
      }
    }
  );

  return [acct, following];
};

const launchGraph = async (
  postUrl: string,
  updateProgress: (_: number) => void
) => {
  const matches = postUrl.match(/https:\/\/(.+?)\/@(.+?)\/([0-9]+)/);
  if (!matches) {
    return "invalid url";
  }
  const [_, host, authorAcctUser, postId] = matches;

  if (authorAcctUser.includes("@")) {
    return "need original status URL from author's instance";
  }

  const reblogsApiUrl = `https://${host}/api/v1/statuses/${postId}/reblogged_by`;
  const boostingAccounts = {};
  boostingAccounts[`${authorAcctUser}@${host}`] = true;
  await paginatedGet(reblogsApiUrl, async (pageResponse) => {
    const json = await pageResponse.json();
    for (const account of json) {
      boostingAccounts[account.acct] = true;
    }
  });

  const results: { [key: string]: { following: string[]; clout: number } } = {};
  const accountPromises = Object.keys(boostingAccounts).map((acct) =>
    fetchAccount(acct, boostingAccounts)
  );

  for (const promise of accountPromises) {
    let acct: string;
    let following: string[];

    updateProgress(
      Object.keys(results).length / Object.keys(boostingAccounts).length
    );

    try {
      const result = await promise;
      if (!result) continue;
      [acct, following] = result;
    } catch (e) {
      console.error(e);
      continue;
    }

    results[acct] = {
      clout: 0,
      following,
    };
  }

  for (const acct in results) {
    for (const acct2 of results[acct].following) {
      if (results[acct2]) {
        results[acct2].clout++;
      }
    }
  }

  return results;
};

new App({
  target: document.getElementById("app-root"),
  props: {
    launchGraph,
  },
});
