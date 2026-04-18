<script lang="ts"></script>

<section class="editor-area" aria-label="Editor">
  <div class="editor-area__inner">
    <p class="editor-area__placeholder">
      Editor will mount here in MDP-9 / MDP-10. F2 toggles raw mode once the
      CodeMirror wiring lands.
    </p>
  </div>
</section>

<style>
  .editor-area {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-width: 0;
    background: var(--bg-base);
    color: var(--fg-primary);
    overflow: hidden;
  }

  .editor-area__inner {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
    padding: var(--space-6);
    font-family: var(--font-mono);
    font-size: var(--fs-md);
  }

  .editor-area__placeholder {
    margin: 0;
    color: var(--fg-tertiary);
    font-family: var(--font-ui);
    font-size: var(--fs-base);
    line-height: var(--lh-normal);
    max-width: var(--prose-max-width);
  }
</style>
