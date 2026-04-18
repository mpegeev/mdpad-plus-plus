<script lang="ts"></script>

<footer class="status-bar" aria-label="Status bar">
  <span class="status-bar__segment">Ready</span>
  <span class="status-bar__segment">UTF-8</span>
  <span class="status-bar__segment">LF</span>
  <span class="status-bar__spacer"></span>
  <span class="status-bar__segment">Markdown</span>
</footer>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    height: var(--statusbar-height);
    background: var(--bg-elevated);
    color: var(--fg-secondary);
    font-size: var(--fs-xs);
    border-top: 1px solid var(--border-subtle);
    flex-shrink: 0;
    overflow: hidden;
  }

  .status-bar__segment {
    display: inline-flex;
    align-items: center;
    height: 100%;
    padding: 0 var(--space-3);
    border-right: 1px solid var(--border-subtle);
    white-space: nowrap;
  }
  .status-bar__segment:last-of-type {
    border-right: none;
  }

  .status-bar__spacer {
    flex: 1 1 auto;
  }
</style>
