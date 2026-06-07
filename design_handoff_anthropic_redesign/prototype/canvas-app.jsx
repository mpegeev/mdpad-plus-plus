/* global React */
const { useState, useEffect } = React;

// ============== ICONS (subset) ==============
const Icon = ({ name, size = 16, stroke = 1.75 }) => {
  const paths = {
    "panel-left-close": (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" />
        <path d="m16 15-3-3 3-3" />
      </>
    ),
    "file-text": (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </>
    ),
    folder: (
      <>
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      </>
    ),
    "folder-open": (
      <>
        <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
      </>
    ),
    "chevron-right": (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
    "chevron-down": (
      <>
        <path d="m6 9 6 6 6-6" />
      </>
    ),
    x: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    plus: (
      <>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
    settings: (
      <>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    minus: (
      <>
        <path d="M5 12h14" />
      </>
    ),
    maximize: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="0.5" />
      </>
    ),
    "more-horizontal": (
      <>
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
      </>
    ),
    "wrap-text": (
      <>
        <line x1="3" x2="21" y1="6" y2="6" />
        <path d="M3 12h15a3 3 0 1 1 0 6h-4" />
        <polyline points="16 16 14 18 16 20" />
        <line x1="3" x2="10" y1="18" y2="18" />
      </>
    ),
    bold: (
      <>
        <path d="M14 12a4 4 0 0 0 0-8H6v8" />
        <path d="M15 20a4 4 0 0 0 0-8H6v8Z" />
      </>
    ),
    italic: (
      <>
        <line x1="19" x2="10" y1="4" y2="4" />
        <line x1="14" x2="5" y1="20" y2="20" />
        <line x1="15" x2="9" y1="4" y2="20" />
      </>
    ),
    code: (
      <>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </>
    ),
    list: (
      <>
        <line x1="8" x2="21" y1="6" y2="6" />
        <line x1="8" x2="21" y1="12" y2="12" />
        <line x1="8" x2="21" y1="18" y2="18" />
        <line x1="3" x2="3.01" y1="6" y2="6" />
        <line x1="3" x2="3.01" y1="12" y2="12" />
        <line x1="3" x2="3.01" y1="18" y2="18" />
      </>
    ),
    "list-ordered": (
      <>
        <line x1="10" x2="21" y1="6" y2="6" />
        <line x1="10" x2="21" y1="12" y2="12" />
        <line x1="10" x2="21" y1="18" y2="18" />
        <path d="M4 6h1v4" />
        <path d="M4 10h2" />
        <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
      </>
    ),
    quote: (
      <>
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
      </>
    ),
    heading: (
      <>
        <path d="M6 12h12" />
        <path d="M6 20V4" />
        <path d="M18 20V4" />
      </>
    ),
    table: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M3 15h18" />
        <path d="M9 3v18" />
        <path d="M15 3v18" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flexShrink: 0 }}
    >
      {paths[name]}
    </svg>
  );
};

// ============== STATIC SUB-COMPONENTS ==============

const TitleBar = ({ title }) => (
  <div className="titlebar">
    <div className="titlebar__brand">
      <div className="titlebar__logo" aria-hidden />
      <span className="titlebar__title">{title}</span>
    </div>
    <div className="titlebar__controls">
      <button className="titlebar__btn">
        <Icon name="minus" size={14} stroke={1.5} />
      </button>
      <button className="titlebar__btn">
        <Icon name="maximize" size={11} stroke={1.5} />
      </button>
      <button className="titlebar__btn titlebar__btn--close">
        <Icon name="x" size={14} stroke={1.5} />
      </button>
    </div>
  </div>
);

const TabsBar = ({ tabs, activeId }) => (
  <div className="tabs-bar">
    <button className="tabs-bar__icon-btn">
      <Icon name="panel-left-close" size={15} />
    </button>
    <div className="tabs-bar__tabs">
      {tabs.map((t) => (
        <div
          key={t.id}
          className={`tab ${t.id === activeId ? "tab--active" : ""} ${t.dirty ? "tab--dirty" : ""}`}
        >
          {t.dirty ? (
            <span className="tab__dot" />
          ) : (
            <Icon name="file-text" size={13} stroke={1.5} />
          )}
          <span className="tab__title">{t.name}</span>
          <button className="tab__close">
            <Icon name="x" size={11} stroke={2} />
          </button>
        </div>
      ))}
      <button className="tabs-bar__new">
        <Icon name="plus" size={13} stroke={2} />
      </button>
    </div>
    <div className="tabs-bar__right">
      <button className="tabs-bar__icon-btn">
        <Icon name="search" size={15} />
      </button>
      <button className="tabs-bar__icon-btn">
        <Icon name="settings" size={15} />
      </button>
    </div>
  </div>
);

const StatusBar = ({
  dirty = true,
  line = 14,
  col = 36,
  lang = "Markdown",
}) => (
  <footer className="statusbar">
    <div className="statusbar__left">
      <span className="status-seg status-seg--state">
        <span
          className={`status-dot ${dirty ? "status-dot--dirty" : "status-dot--saved"}`}
        />
        {dirty ? "Изменено" : "Сохранено"}
      </span>
      <span className="status-seg">
        Стр {line}, Кол {col}
      </span>
      <span className="status-seg">Sel: 0</span>
    </div>
    <div className="statusbar__right">
      <span className="status-seg status-seg--btn">
        <Icon name="wrap-text" size={11} stroke={1.8} />
        Перенос: вкл
      </span>
      <span className="status-seg">UTF-8</span>
      <span className="status-seg">LF</span>
      <span className="status-seg status-seg--lang">{lang}</span>
    </div>
  </footer>
);

const TreeRow = ({ kind, depth = 0, name, dirty, active, expanded, dot }) => (
  <div
    className={`tree-row tree-row--${kind} ${active ? "tree-row--active" : ""} ${dirty ? "tree-row--dirty" : ""}`}
    style={{ paddingLeft: 8 + depth * 14 + (kind === "file" ? 14 : 0) }}
  >
    {kind === "folder" ? (
      <>
        <Icon
          name={expanded ? "chevron-down" : "chevron-right"}
          size={12}
          stroke={2}
        />
        <Icon
          name={expanded ? "folder-open" : "folder"}
          size={13}
          stroke={1.6}
        />
      </>
    ) : dirty ? (
      <span className="tree-row__dot" />
    ) : (
      <Icon name="file-text" size={13} stroke={1.5} />
    )}
    <span className="tree-row__label">{name}</span>
  </div>
);

const SidebarTree = () => (
  <aside className="sidebar">
    <div className="sidebar__header">
      <span className="sidebar__heading">Files</span>
      <div className="sidebar__head-actions">
        <button className="ghost-btn">
          <Icon name="plus" size={13} stroke={2} />
        </button>
        <button className="ghost-btn">
          <Icon name="folder-open" size={13} stroke={1.6} />
        </button>
        <button className="ghost-btn">
          <Icon name="more-horizontal" size={13} stroke={2} />
        </button>
      </div>
    </div>
    <div className="sidebar__searchbox">
      <Icon name="search" size={12} stroke={1.8} />
      <input placeholder="Filter files…" defaultValue="" />
    </div>
    <div className="sidebar__path">
      <Icon name="folder-open" size={11} stroke={1.6} />
      <span>mdpad-notes</span>
    </div>
    <div className="sidebar__body">
      <TreeRow kind="folder" name="docs" expanded />
      <TreeRow kind="file" depth={1} name="architecture.md" />
      <TreeRow kind="file" depth={1} name="senar.md" />
      <TreeRow kind="file" depth={1} name="DESIGN.md" dirty />
      <TreeRow kind="folder" name="drafts" expanded />
      <TreeRow kind="file" depth={1} name="release-0.3.md" active />
      <TreeRow kind="file" depth={1} name="benchmarks.md" />
      <TreeRow kind="folder" name="archive" />
      <TreeRow kind="file" name="README.md" />
      <TreeRow kind="file" name="TODO.md" dirty />
      <TreeRow kind="file" name="CLAUDE.md" />
    </div>
  </aside>
);

const SidebarEmpty = () => (
  <aside className="sidebar">
    <div className="sidebar__header">
      <span className="sidebar__heading">Files</span>
      <div className="sidebar__head-actions">
        <button className="ghost-btn">
          <Icon name="plus" size={13} stroke={2} />
        </button>
        <button className="ghost-btn">
          <Icon name="folder-open" size={13} stroke={1.6} />
        </button>
      </div>
    </div>
    <div className="sidebar__empty">
      <div className="sidebar__empty-illo">
        <svg
          viewBox="0 0 64 64"
          width="40"
          height="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 18a3 3 0 0 1 3-3h12l4 5h26a3 3 0 0 1 3 3v25a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z" />
          <path d="M16 28h32" opacity=".4" />
          <path d="M16 36h22" opacity=".4" />
        </svg>
      </div>
      <h3>Папка не открыта</h3>
      <p>Откройте папку с заметками, чтобы видеть файлы здесь.</p>
      <button className="btn btn--primary">
        <Icon name="folder-open" size={13} stroke={1.6} />
        Открыть папку…
      </button>
      <button className="btn btn--ghost">Создать файл</button>
      <div className="sidebar__recent">
        <div className="sidebar__recent-label">Недавние</div>
        <button className="recent-item">
          <Icon name="folder" size={12} stroke={1.6} />
          <span>~/Documents/notes</span>
        </button>
        <button className="recent-item">
          <Icon name="folder" size={12} stroke={1.6} />
          <span>~/work/mdpad-plus-plus</span>
        </button>
      </div>
    </div>
  </aside>
);

const SidebarLoading = () => (
  <aside className="sidebar">
    <div className="sidebar__header">
      <span className="sidebar__heading">Files</span>
    </div>
    <div className="sidebar__path">
      <Icon name="folder-open" size={11} stroke={1.6} />
      <span>mdpad-notes / loading…</span>
    </div>
    <div className="sidebar__loading">
      {[60, 80, 70, 55, 90, 65, 75, 50].map((w, i) => (
        <div
          key={i}
          className="skel-row"
          style={{ width: `${w}%`, animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  </aside>
);

// ============== EDITOR FRAGMENTS ==============

const EditorWithContent = ({ withGutter = true, density = "default" }) => (
  <div className={`editor editor--gutter`}>
    <div className="editor__scroll">
      <div className="editor__inner">
        {withGutter && (
          <div className="gutter">
            {Array.from({ length: 22 }).map((_, i) => {
              const status =
                i === 8 || i === 9 ? "modified" : i === 14 ? "added" : null;
              return (
                <div
                  key={i}
                  className={`gutter__line ${status ? `gutter__line--${status}` : ""}`}
                >
                  <span className="gutter__num">{i + 1}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="editor__content">
          <h1 className="mdblock mdblock--h1">
            mdpad++ — Заметки разработчика
          </h1>
          <p className="mdblock mdblock--p">
            Лёгкий редактор Markdown с многовкладочным интерфейсом. Идея —
            совместить структурированность Notepad++ и тишину Typora.
          </p>
          <blockquote className="mdblock mdblock--blockquote">
            «Хорошие инструменты исчезают из-под рук — остаётся только работа.»
          </blockquote>
          <h2 className="mdblock mdblock--h2">Что нового</h2>
          <ul className="mdblock mdblock--ul">
            <li>Inline-рендер блоков Markdown</li>
            <li>F2 — переключение блока в raw-режим</li>
            <li>Дерево файлов с фильтрацией</li>
          </ul>
          {/* RAW BLOCK */}
          <div className="mdblock mdblock--raw">
            <div className="mdblock__raw-tag">RAW · F2 to render</div>
            <div className="raw-grid">
              <div className="raw-line">
                <span className="raw-line__num">12</span>
                <span className="raw-line__content">
                  <span className="tok tok--heading">## Архитектура</span>
                </span>
              </div>
              <div className="raw-line">
                <span className="raw-line__num">13</span>
                <span className="raw-line__content">{"\u200B"}</span>
              </div>
              <div className="raw-line">
                <span className="raw-line__num">14</span>
                <span className="raw-line__content">
                  <span className="tok tok--text">
                    Документ — плоский Markdown в{" "}
                  </span>
                  <span className="tok tok--code">EditorState</span>
                  <span className="tok tok--text">
                    . Блоки рендерятся через{" "}
                  </span>
                </span>
              </div>
              <div className="raw-line">
                <span className="raw-line__num">15</span>
                <span className="raw-line__content">
                  <span className="tok tok--code">Decoration.replace</span>
                  <span className="tok tok--text"> + </span>
                  <span className="tok tok--code">WidgetType</span>
                  <span className="tok tok--text">
                    . F2 раскрывает raw-блок.
                  </span>
                  <span className="raw-cursor" />
                </span>
              </div>
              <div className="raw-line">
                <span className="raw-line__num">16</span>
                <span className="raw-line__content">{"\u200B"}</span>
              </div>
              <div className="raw-line">
                <span className="raw-line__num">17</span>
                <span className="raw-line__content">
                  <span className="tok tok--text">См. </span>
                  <span className="tok tok--link-bracket">[</span>
                  <span className="tok tok--link">docs/architecture.md</span>
                  <span className="tok tok--link-bracket">](</span>
                  <span className="tok tok--link-url">
                    ./docs/architecture.md
                  </span>
                  <span className="tok tok--link-bracket">)</span>
                </span>
              </div>
            </div>
          </div>
          <h2 className="mdblock mdblock--h2">Производительность</h2>
          <p className="mdblock mdblock--p">
            Цель — открывать файлы 5000+ строк без задержек. Виртуализация
            блоков и ленивый парсинг markdown-it.
          </p>
          <div className="mdblock mdblock--table">
            <table>
              <thead>
                <tr>
                  <th>Размер файла</th>
                  <th>Открытие</th>
                  <th>F2</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1 000 строк</td>
                  <td>12 ms</td>
                  <td>&lt; 1 ms</td>
                </tr>
                <tr>
                  <td>10 000 строк</td>
                  <td>78 ms</td>
                  <td>2 ms</td>
                </tr>
                <tr>
                  <td>50 000 строк</td>
                  <td>340 ms</td>
                  <td>4 ms</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h2 className="mdblock mdblock--h2">Команды</h2>
          <pre className="mdblock mdblock--code">
            <div className="mdblock__code-lang">bash</div>
            <code>{`npm run tauri dev     # запуск с Tauri\nnpm run dev           # только frontend\nnpm run test          # vitest`}</code>
          </pre>
        </div>
      </div>
    </div>
  </div>
);

const EditorEmpty = () => (
  <div className="editor editor--empty">
    <div className="editor__empty-card">
      <div className="editor__empty-keys">
        <kbd>Ctrl</kbd>
        <span>+</span>
        <kbd>N</kbd>
      </div>
      <h2>Новый файл</h2>
      <p>
        Начните писать или откройте файл из дерева слева. F2 переключает
        активный блок между рендером и raw-режимом.
      </p>
      <div className="editor__empty-actions">
        <button className="btn btn--primary">
          <Icon name="plus" size={13} stroke={2} /> Создать файл
        </button>
        <button className="btn btn--ghost">
          <Icon name="folder-open" size={13} stroke={1.6} /> Открыть…
        </button>
      </div>
      <div className="editor__empty-shortcuts">
        <div>
          <kbd>Ctrl</kbd> <kbd>P</kbd> — переход к файлу
        </div>
        <div>
          <kbd>Ctrl</kbd> <kbd>S</kbd> — сохранить
        </div>
        <div>
          <kbd>F2</kbd> — raw / rendered
        </div>
      </div>
    </div>
  </div>
);

const FloatingToolbar = () => (
  <div className="floating-toolbar floating-toolbar--visible">
    <button className="ftb-btn">
      <Icon name="heading" size={14} stroke={1.8} />
    </button>
    <span className="ftb-sep" />
    <button className="ftb-btn">
      <Icon name="bold" size={14} stroke={2} />
    </button>
    <button className="ftb-btn">
      <Icon name="italic" size={14} stroke={1.8} />
    </button>
    <button className="ftb-btn">
      <Icon name="code" size={14} stroke={1.8} />
    </button>
    <button className="ftb-btn">
      <Icon name="link" size={14} stroke={1.8} />
    </button>
    <span className="ftb-sep" />
    <button className="ftb-btn">
      <Icon name="list" size={14} stroke={1.8} />
    </button>
    <button className="ftb-btn">
      <Icon name="list-ordered" size={14} stroke={1.8} />
    </button>
    <button className="ftb-btn">
      <Icon name="quote" size={14} stroke={1.8} />
    </button>
    <button className="ftb-btn">
      <Icon name="table" size={14} stroke={1.8} />
    </button>
  </div>
);

// ============== ARTBOARDS ==============

// Full app frame (1180x720)
const FullAppFrame = ({
  tabs,
  sidebarKind = "tree",
  editorKind = "content",
  titleSuffix = "release-0.3.md — mdpad++",
}) => (
  <div className="app">
    <TitleBar title={titleSuffix} />
    <TabsBar
      tabs={tabs}
      activeId={tabs.find((t) => t.active)?.id || tabs[0].id}
    />
    <div className="app__middle">
      <div className="app__sidebar">
        {sidebarKind === "tree" && <SidebarTree />}
        {sidebarKind === "empty" && <SidebarEmpty />}
        {sidebarKind === "loading" && <SidebarLoading />}
      </div>
      <div className="app__editor">
        {editorKind === "content" && <EditorWithContent />}
        {editorKind === "empty" && <EditorEmpty />}
      </div>
    </div>
    <StatusBar dirty={editorKind === "content"} />
  </div>
);

// Tab states detail
const TabsDetail = () => (
  <div style={{ background: "var(--bg-base)", padding: 24, height: "100%" }}>
    <div
      className="tabs-bar"
      style={{ borderRadius: 4, border: "1px solid var(--border-subtle)" }}
    >
      <button className="tabs-bar__icon-btn">
        <Icon name="panel-left-close" size={15} />
      </button>
      <div className="tabs-bar__tabs">
        <div className="tab tab--active">
          <Icon name="file-text" size={13} stroke={1.5} />
          <span className="tab__title">README.md</span>
          <button className="tab__close">
            <Icon name="x" size={11} stroke={2} />
          </button>
        </div>
        <div
          className="tab tab--dirty tab--active"
          style={{ background: "var(--bg-base)" }}
        >
          <span className="tab__dot" />
          <span className="tab__title">DESIGN.md</span>
          <button className="tab__close">
            <Icon name="x" size={11} stroke={2} />
          </button>
        </div>
        <div className="tab">
          <Icon name="file-text" size={13} stroke={1.5} />
          <span className="tab__title">architecture.md</span>
        </div>
        <div className="tab tab--dirty">
          <span className="tab__dot" />
          <span className="tab__title">TODO.md</span>
        </div>
        <div
          className="tab"
          style={{ background: "var(--bg-hover)", color: "var(--fg-primary)" }}
        >
          <Icon name="file-text" size={13} stroke={1.5} />
          <span className="tab__title">notes.md</span>
          <button className="tab__close" style={{ opacity: 1 }}>
            <Icon name="x" size={11} stroke={2} />
          </button>
        </div>
        <button className="tabs-bar__new">
          <Icon name="plus" size={13} stroke={2} />
        </button>
      </div>
    </div>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "8px 16px",
        marginTop: 28,
        fontSize: 12,
        color: "var(--fg-secondary)",
        fontFamily: "var(--font-ui)",
        maxWidth: 540,
      }}
    >
      <strong style={{ color: "var(--fg-primary)" }}>Active</strong>
      <span>
        Фон совпадает с областью редактора, верхняя полоса акцента 2px, полная
        контрастность текста.
      </span>
      <strong style={{ color: "var(--fg-primary)" }}>Dirty</strong>
      <span>
        Заменяет иконку файла точкой акцентного цвета, имя — italic. Появляется
        при первом изменении.
      </span>
      <strong style={{ color: "var(--fg-primary)" }}>Hover</strong>
      <span>Светлый фон, кнопка close становится видимой.</span>
      <strong style={{ color: "var(--fg-primary)" }}>Idle</strong>
      <span>Фон тон-в-тон с панелью таб-бара, текст fg-secondary.</span>
    </div>
  </div>
);

// Status bar detail
const StatusBarDetail = () => (
  <div
    style={{
      background: "var(--bg-base)",
      padding: 24,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 24,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--fg-tertiary)",
          marginBottom: 8,
        }}
      >
        Saved state
      </div>
      <StatusBar dirty={false} />
    </div>
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--fg-tertiary)",
          marginBottom: 8,
        }}
      >
        Dirty state
      </div>
      <StatusBar dirty={true} line={142} col={8} />
    </div>
    <div>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--fg-tertiary)",
          marginBottom: 8,
        }}
      >
        Plain text mode
      </div>
      <StatusBar dirty={true} line={1} col={1} lang="Plain Text" />
    </div>
    <div
      style={{
        fontSize: 12,
        color: "var(--fg-secondary)",
        lineHeight: 1.55,
        fontFamily: "var(--font-ui)",
      }}
    >
      <strong style={{ color: "var(--fg-primary)" }}>Сегменты слева:</strong>{" "}
      состояние документа, позиция курсора, выделение.
      <br />
      <strong style={{ color: "var(--fg-primary)" }}>
        Сегменты справа:
      </strong>{" "}
      переключатель переноса (кликабельный ghost-button), кодировка, тип EOL,
      язык. Все разделены тонкими полосами border-subtle.
    </div>
  </div>
);

// Floating toolbar
const ToolbarDetail = () => (
  <div
    style={{
      background: "var(--bg-base)",
      padding: 32,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 32,
    }}
  >
    <div
      style={{
        position: "relative",
        height: 48,
        display: "flex",
        alignItems: "center",
      }}
    >
      <FloatingToolbar />
    </div>
    <div
      style={{
        fontSize: 12,
        color: "var(--fg-secondary)",
        lineHeight: 1.55,
        fontFamily: "var(--font-ui)",
        maxWidth: 380,
        textAlign: "center",
      }}
    >
      Появляется при выделении текста или при наведении на блок в режиме
      редактирования. Группы разделены 1px-полосой: формат текста · вставки ·
      списки и таблица.
    </div>
  </div>
);

// Open folder dialog
const OpenFolderDialog = () => (
  <div
    style={{
      position: "relative",
      height: "100%",
      background: "var(--bg-base)",
    }}
  >
    <div className="app">
      <TitleBar title="mdpad++" />
      <TabsBar
        tabs={[{ id: "t1", name: "untitled-1", active: true }]}
        activeId="t1"
      />
      <div className="app__middle">
        <div className="app__sidebar">
          <SidebarEmpty />
        </div>
        <div className="app__editor">
          <EditorEmpty />
        </div>
      </div>
      <StatusBar dirty={false} line={1} col={1} />
    </div>
    <div className="modal-backdrop" style={{ position: "absolute" }}>
      <div className="modal">
        <div className="modal__header">
          <Icon name="folder-open" size={16} stroke={1.6} />
          <span>Открыть папку</span>
          <button className="modal__close">
            <Icon name="x" size={14} stroke={1.8} />
          </button>
        </div>
        <div className="modal__path">
          <span className="modal__breadcrumb">
            <span>~</span>
            <Icon name="chevron-right" size={11} stroke={2} />
            <span>Documents</span>
            <Icon name="chevron-right" size={11} stroke={2} />
            <span className="modal__crumb-active">notes</span>
          </span>
        </div>
        <div className="modal__body">
          <div className="modal__item">
            <Icon name="folder" size={14} stroke={1.6} />
            <span className="modal__item-name">personal</span>
            <span className="modal__item-meta">24 файла</span>
          </div>
          <div className="modal__item modal__item--current">
            <Icon name="folder" size={14} stroke={1.6} />
            <span className="modal__item-name">work</span>
            <span className="modal__item-meta">18 файлов</span>
          </div>
          <div className="modal__item">
            <Icon name="folder" size={14} stroke={1.6} />
            <span className="modal__item-name">research</span>
            <span className="modal__item-meta">7 файлов</span>
          </div>
          <div className="modal__item">
            <Icon name="folder" size={14} stroke={1.6} />
            <span className="modal__item-name">scratch</span>
            <span className="modal__item-meta">3 файла</span>
          </div>
        </div>
        <div className="modal__footer">
          <span className="modal__hint">Выберите папку с .md файлами</span>
          <div className="modal__actions">
            <button className="btn btn--ghost">Отмена</button>
            <button className="btn btn--primary">Открыть «work»</button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ============== CANVAS APP ==============
const SAMPLE_TABS = [
  { id: "t1", name: "release-0.3.md", dirty: true, active: true },
  { id: "t2", name: "architecture.md" },
  { id: "t3", name: "DESIGN.md", dirty: true },
  { id: "t4", name: "untitled-2" },
];

const Frame = ({ children }) => <div className="frame">{children}</div>;

const CanvasApp = () => {
  return (
    <DesignCanvas
      title="mdpad++ — состояния и компоненты"
      subtitle="Anthropic-style hi-fi · April 2026"
    >
      <DCSection
        id="overview"
        title="01 · Главные состояния редактора"
        subtitle="Editor с контентом · Editor пустой"
      >
        <DCArtboard
          id="editor-content"
          label="Editor с контентом + RAW-блок (F2)"
          width={1180}
          height={720}
        >
          <Frame>
            <FullAppFrame
              tabs={SAMPLE_TABS}
              sidebarKind="tree"
              editorKind="content"
            />
          </Frame>
        </DCArtboard>

        <DCArtboard
          id="editor-empty"
          label="Editor — пустой (welcome)"
          width={1180}
          height={720}
        >
          <Frame>
            <FullAppFrame
              tabs={[{ id: "t1", name: "untitled-1", active: true }]}
              sidebarKind="tree"
              editorKind="empty"
              titleSuffix="untitled-1 — mdpad++"
            />
          </Frame>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="sidebar"
        title="02 · Sidebar — состояния файлового дерева"
        subtitle="Tree · Empty (open folder flow) · Loading"
      >
        <DCArtboard
          id="sidebar-tree"
          label="File tree — раскрытые папки"
          width={300}
          height={560}
        >
          <Frame>
            <SidebarTree />
          </Frame>
        </DCArtboard>

        <DCArtboard
          id="sidebar-empty"
          label="Empty — open folder CTA"
          width={300}
          height={560}
        >
          <Frame>
            <SidebarEmpty />
          </Frame>
        </DCArtboard>

        <DCArtboard
          id="sidebar-loading"
          label="Loading — скелет"
          width={300}
          height={560}
        >
          <Frame>
            <SidebarLoading />
          </Frame>
        </DCArtboard>

        <DCArtboard
          id="sidebar-flow"
          label="Open folder dialog"
          width={920}
          height={620}
        >
          <Frame>
            <OpenFolderDialog />
          </Frame>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="tabs"
        title="03 · Tabs"
        subtitle="Активная · неактивная · dirty · hover · close"
      >
        <DCArtboard
          id="tabs-detail"
          label="Tab states"
          width={780}
          height={360}
        >
          <Frame>
            <TabsDetail />
          </Frame>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="status"
        title="04 · Status bar"
        subtitle="Saved · dirty · plain text — все сегменты"
      >
        <DCArtboard
          id="status-detail"
          label="Status bar — варианты"
          width={780}
          height={400}
        >
          <Frame>
            <StatusBarDetail />
          </Frame>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="toolbar"
        title="05 · Floating toolbar"
        subtitle="Plank с группами действий"
      >
        <DCArtboard
          id="toolbar-detail"
          label="Floating toolbar"
          width={620}
          height={260}
        >
          <Frame>
            <ToolbarDetail />
          </Frame>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="dark"
        title="06 · Dark theme"
        subtitle="Та же геометрия, инвертированная палитра"
      >
        <DCArtboard
          id="dark-editor"
          label="Editor — dark"
          width={1180}
          height={720}
        >
          <Frame>
            <div data-theme="dark" style={{ height: "100%" }}>
              <FullAppFrame
                tabs={SAMPLE_TABS}
                sidebarKind="tree"
                editorKind="content"
              />
            </div>
          </Frame>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
};

window.CanvasApp = CanvasApp;
