<script lang="ts">
  export let launchGraph;

  let postUrlPromise = null;

  let progress = 0;

  function updateProgress(newProgress) {
    progress = Math.round(newProgress * 100);
  }

  function setPost(e) {
    postUrlPromise = launchGraph(e.target.postUrl.value, updateProgress);
    e.preventDefault();
  }
</script>

{#if postUrlPromise}
  {#await postUrlPromise}
    <p>Downloading more RAM...</p>
    <div class="progress">
      <div class="progress-inner" style={`width: ${progress}%`}>
        {progress}%
      </div>
    </div>
  {:then result}
    {#if typeof result === "string"}
      <p class="red">{result}</p>
    {:else}
      <hr />
      <p>
        Done. Here is a list of accounts that have boosted this post. Each
        sublist represents accounts they follow that have also boosted that
        post.
      </p>
      <ul>
        {#each Object.entries(result) as [acct, { clout, following }]}
          <li id={`account-${acct}`}>
            <code>{acct}</code>, {clout} followers{#if following.length},
              following:{/if}
            <ul>
              {#each following as acct2}
                <li><a href={`#account-${acct2}`}><code>{acct2}</code></a></li>
              {/each}
            </ul>
          </li>
        {/each}
      </ul>
    {/if}
  {/await}
{:else}
  <form class="pure-form pure-form-stacked" on:submit={setPost}>
    <fieldset>
      <label for="postUrl">Post URL</label>
      <input
        name="postUrl"
        type="text"
        class="pure-input-1"
        required
        placeholder="https://example.com/@username/123"
      />
      <input
        type="submit"
        class="pure-button pure-button-primary"
        value="Find follower relations"
      />
    </fieldset>
  </form>
{/if}
