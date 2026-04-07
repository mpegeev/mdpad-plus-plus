<script lang="ts">
  // Корневой компонент. Будет заменён в задаче MDP-2 (Layout skeleton).
  let appName = $state('mdpad++');
</script>

<main class="root">
  <h1>{appName}</h1>
  <p>Bootstrap OK. Layout будет реализован в следующих задачах.</p>
</main>

<style>
  .root {
    font-family: system-ui, sans-serif;
    padding: 2rem;
    color: var(--fg, #e6e6e6);
    background: var(--bg, #1e1e1e);
    height: 100vh;
  }
  h1 {
    margin: 0 0 1rem;
  }
</style>
