/* global React */
const { useState, useEffect, useRef, useMemo } = React;

// ============== ICONS ==============
const Icon = ({ name, size = 16, stroke = 1.75 }) => {
  const paths = {
    "panel-left": (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" />
      </>
    ),
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
    "wrap-text": (
      <>
        <line x1="3" x2="21" y1="6" y2="6" />
        <path d="M3 12h15a3 3 0 1 1 0 6h-4" />
        <polyline points="16 16 14 18 16 20" />
        <line x1="3" x2="10" y1="18" y2="18" />
      </>
    ),
    "circle-dot": (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </>
    ),
    save: (
      <>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </>
    ),
    "more-horizontal": (
      <>
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
        <circle cx="5" cy="12" r="1" />
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

// ============== TITLE BAR (Window chrome) ==============
const TitleBar = ({ activeFile }) => (
  <div className="titlebar">
    <div className="titlebar__brand">
      <div className="titlebar__logo" aria-hidden />
      <span className="titlebar__title">{activeFile} — mdpad++</span>
    </div>
    <div className="titlebar__controls">
      <button className="titlebar__btn" aria-label="Minimize">
        <Icon name="minus" size={14} stroke={1.5} />
      </button>
      <button className="titlebar__btn" aria-label="Maximize">
        <Icon name="maximize" size={11} stroke={1.5} />
      </button>
      <button className="titlebar__btn titlebar__btn--close" aria-label="Close">
        <Icon name="x" size={14} stroke={1.5} />
      </button>
    </div>
  </div>
);

// ============== TABS BAR ==============
const Tab = ({ file, active, dirty, onClick, onClose }) => (
  <div
    className={`tab ${active ? "tab--active" : ""} ${dirty ? "tab--dirty" : ""}`}
    role="tab"
    aria-selected={active}
    onClick={onClick}
  >
    {dirty && <span className="tab__dot" aria-label="unsaved" />}
    {!dirty && <Icon name="file-text" size={13} stroke={1.5} />}
    <span className="tab__title">{file.name}</span>
    <button
      className="tab__close"
      aria-label="Close tab"
      onClick={(e) => {
        e.stopPropagation();
        onClose?.();
      }}
    >
      <Icon name="x" size={11} stroke={2} />
    </button>
  </div>
);

const TabsBar = ({
  tabs,
  activeId,
  onSelect,
  onClose,
  onToggleSidebar,
  sidebarVisible,
  layout,
}) => (
  <div className="tabs-bar">
    {layout === "top" && (
      <button
        className="tabs-bar__icon-btn"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <Icon
          name={sidebarVisible ? "panel-left-close" : "panel-left"}
          size={15}
        />
      </button>
    )}
    <div className="tabs-bar__tabs" role="tablist">
      {tabs.map((t) => (
        <Tab
          key={t.id}
          file={t}
          active={t.id === activeId}
          dirty={t.dirty}
          onClick={() => onSelect(t.id)}
          onClose={() => onClose(t.id)}
        />
      ))}
      <button className="tabs-bar__new" aria-label="New tab">
        <Icon name="plus" size={13} stroke={2} />
      </button>
    </div>
    <div className="tabs-bar__right">
      <button className="tabs-bar__icon-btn" aria-label="Search">
        <Icon name="search" size={15} />
      </button>
      <button className="tabs-bar__icon-btn" aria-label="Settings">
        <Icon name="settings" size={15} />
      </button>
    </div>
  </div>
);

// ============== SIDEBAR ==============
const FileTreeNode = ({
  node,
  depth = 0,
  expandedSet,
  setExpanded,
  activeId,
  onSelect,
}) => {
  const isExpanded = expandedSet.has(node.id);
  const isActive = node.id === activeId;
  const indent = 8 + depth * 14;
  if (node.type === "folder") {
    return (
      <>
        <div
          className="tree-row tree-row--folder"
          style={{ paddingLeft: indent }}
          onClick={() => {
            const next = new Set(expandedSet);
            if (isExpanded) next.delete(node.id);
            else next.add(node.id);
            setExpanded(next);
          }}
        >
          <Icon
            name={isExpanded ? "chevron-down" : "chevron-right"}
            size={12}
            stroke={2}
          />
          <Icon
            name={isExpanded ? "folder-open" : "folder"}
            size={13}
            stroke={1.6}
          />
          <span className="tree-row__label">{node.name}</span>
        </div>
        {isExpanded &&
          node.children?.map((c) => (
            <FileTreeNode
              key={c.id}
              node={c}
              depth={depth + 1}
              expandedSet={expandedSet}
              setExpanded={setExpanded}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}
      </>
    );
  }
  return (
    <div
      className={`tree-row tree-row--file ${isActive ? "tree-row--active" : ""} ${node.dirty ? "tree-row--dirty" : ""}`}
      style={{ paddingLeft: indent + 14 }}
      onClick={() => onSelect(node.id)}
    >
      {node.dirty ? (
        <span className="tree-row__dot" />
      ) : (
        <Icon name="file-text" size={13} stroke={1.5} />
      )}
      <span className="tree-row__label">{node.name}</span>
    </div>
  );
};

const Sidebar = ({
  state,
  tree,
  activeId,
  onSelect,
  onOpenFolder,
  layout,
  sidebarTitle = "mdpad-notes",
}) => {
  const [expanded, setExpanded] = useState(new Set(["docs", "drafts"]));
  const [query, setQuery] = useState("");

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__heading">Files</span>
        <div className="sidebar__head-actions">
          <button className="ghost-btn" aria-label="New file">
            <Icon name="plus" size={13} stroke={2} />
          </button>
          <button
            className="ghost-btn"
            aria-label="Open folder"
            onClick={onOpenFolder}
          >
            <Icon name="folder-open" size={13} stroke={1.6} />
          </button>
          <button className="ghost-btn" aria-label="More">
            <Icon name="more-horizontal" size={13} stroke={2} />
          </button>
        </div>
      </div>

      {state === "tree" && (
        <>
          <div className="sidebar__searchbox">
            <Icon name="search" size={12} stroke={1.8} />
            <input
              placeholder="Filter files…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="sidebar__path">
            <Icon name="folder-open" size={11} stroke={1.6} />
            <span>{sidebarTitle}</span>
          </div>
          <div className="sidebar__body">
            {tree.map((n) => (
              <FileTreeNode
                key={n.id}
                node={n}
                expandedSet={expanded}
                setExpanded={setExpanded}
                activeId={activeId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </>
      )}

      {state === "empty" && (
        <div className="sidebar__empty">
          <div className="sidebar__empty-illo" aria-hidden>
            <svg
              viewBox="0 0 64 64"
              width="48"
              height="48"
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
          <p>
            Откройте папку с заметками, чтобы видеть файлы здесь. Все вкладки
            можно открывать и без неё.
          </p>
          <button className="btn btn--primary" onClick={onOpenFolder}>
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
      )}

      {state === "loading" && (
        <div className="sidebar__loading">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="skel-row"
              style={{
                width: `${50 + ((i * 17) % 40)}%`,
                animationDelay: `${i * 60}ms`,
              }}
            />
          ))}
        </div>
      )}
    </aside>
  );
};

// ============== EDITOR ==============

// Sample content
const RENDERED_DOC = [
  { type: "h1", id: "b1", text: "mdpad++ — Заметки разработчика" },
  {
    type: "p",
    id: "b2",
    text: "Лёгкий редактор Markdown с многовкладочным интерфейсом. Идея — совместить структурированность Notepad++ и тишину Typora. Ниже — заметки к релизу 0.3.",
  },
  {
    type: "blockquote",
    id: "b3",
    text: "«Хорошие инструменты исчезают из-под рук — остаётся только работа.»",
  },
  { type: "h2", id: "b4", text: "Что нового" },
  {
    type: "ul",
    id: "b5",
    items: [
      "Inline-рендер блоков Markdown через CodeMirror Decoration",
      "F2 — переключение активного блока в raw-режим с подсветкой синтаксиса",
      "Дерево файлов с фильтрацией и быстрым переходом",
      "Status bar с переключением переноса строк и кодировки",
    ],
  },
  // RAW editing block — between rendered ones
  {
    type: "raw",
    id: "b6",
    lines: [
      { num: 12, tokens: [["heading", "## Архитектура"]] },
      { num: 13, tokens: [["text", ""]] },
      {
        num: 14,
        tokens: [
          ["text", "Документ — плоский Markdown в "],
          ["code", "EditorState"],
          ["text", ". Блоки рендерятся через "],
        ],
      },
      {
        num: 15,
        tokens: [
          ["code", "Decoration.replace"],
          ["text", " + "],
          ["code", "WidgetType"],
          ["text", ". F2 снимает виджет — раскрывается raw-блок."],
        ],
      },
      { num: 16, tokens: [["text", ""]] },
      {
        num: 17,
        tokens: [
          ["text", "См. "],
          ["link-bracket", "["],
          ["link", "docs/architecture.md"],
          ["link-bracket", "]"],
          ["link-bracket", "("],
          ["link-url", "./docs/architecture.md"],
          ["link-bracket", ")"],
          ["text", " для деталей."],
        ],
      },
    ],
  },
  { type: "h2", id: "b7", text: "Производительность" },
  {
    type: "p",
    id: "b8",
    text: "Цель — открывать файлы 5000+ строк без задержек. Подход: виртуализация рендеренных блоков, ленивый парсинг markdown-it и умное кэширование DOM.",
  },
  {
    type: "table",
    id: "b9",
    headers: ["Размер файла", "Открытие", "F2 переключение"],
    rows: [
      ["1 000 строк", "12 ms", "< 1 ms"],
      ["10 000 строк", "78 ms", "2 ms"],
      ["50 000 строк", "340 ms", "4 ms"],
    ],
  },
  { type: "h2", id: "b10", text: "Команды" },
  {
    type: "code",
    id: "b11",
    lang: "bash",
    text: "npm run tauri dev     # запуск с Tauri\nnpm run dev           # только frontend\nnpm run test          # vitest",
  },
  {
    type: "p",
    id: "b12",
    text: "Замечания и баги — в Linear, тег mdpad++. Документация дизайн-системы в DESIGN.md, обновляется при каждом изменении токенов.",
  },
];

const Block = ({ block, active, onActivate }) => {
  const cls = `mdblock mdblock--${block.type} ${active ? "mdblock--active" : ""}`;
  const handleProps = {
    onClick: () => onActivate(block.id),
    "data-block-id": block.id,
  };
  switch (block.type) {
    case "h1":
      return (
        <h1 className={cls} {...handleProps}>
          {block.text}
        </h1>
      );
    case "h2":
      return (
        <h2 className={cls} {...handleProps}>
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className={cls} {...handleProps}>
          {block.text}
        </h3>
      );
    case "p":
      return (
        <p className={cls} {...handleProps}>
          {block.text}
        </p>
      );
    case "blockquote":
      return (
        <blockquote className={cls} {...handleProps}>
          {block.text}
        </blockquote>
      );
    case "ul":
      return (
        <ul className={cls} {...handleProps}>
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );

    case "code":
      return (
        <pre className={cls} {...handleProps}>
          <div className="mdblock__code-lang">{block.lang}</div>
          <code>{block.text}</code>
        </pre>
      );

    case "table":
      return (
        <div className={cls} {...handleProps}>
          <table>
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return null;
  }
};

const RawBlock = ({ block, lineNumbers }) => (
  <div className="mdblock mdblock--raw" data-block-id={block.id}>
    <div className="mdblock__raw-tag">RAW · F2 to render</div>
    <div className="raw-grid">
      {block.lines.map((ln, i) => (
        <div key={i} className="raw-line">
          {lineNumbers && <span className="raw-line__num">{ln.num}</span>}
          <span className="raw-line__content">
            {ln.tokens.map((t, j) => (
              <span key={j} className={`tok tok--${t[0]}`}>
                {t[1] === "" ? "\u200B" : t[1]}
              </span>
            ))}
            {i === 3 && <span className="raw-cursor" />}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const FloatingToolbar = ({ visible }) => (
  <div
    className={`floating-toolbar ${visible ? "floating-toolbar--visible" : ""}`}
    role="toolbar"
    aria-label="Formatting"
  >
    <button className="ftb-btn" aria-label="Heading">
      <Icon name="heading" size={14} stroke={1.8} />
    </button>
    <span className="ftb-sep" />
    <button className="ftb-btn" aria-label="Bold">
      <Icon name="bold" size={14} stroke={2} />
    </button>
    <button className="ftb-btn" aria-label="Italic">
      <Icon name="italic" size={14} stroke={1.8} />
    </button>
    <button className="ftb-btn" aria-label="Code">
      <Icon name="code" size={14} stroke={1.8} />
    </button>
    <button className="ftb-btn" aria-label="Link">
      <Icon name="link" size={14} stroke={1.8} />
    </button>
    <span className="ftb-sep" />
    <button className="ftb-btn" aria-label="List">
      <Icon name="list" size={14} stroke={1.8} />
    </button>
    <button className="ftb-btn" aria-label="Ordered list">
      <Icon name="list-ordered" size={14} stroke={1.8} />
    </button>
    <button className="ftb-btn" aria-label="Quote">
      <Icon name="quote" size={14} stroke={1.8} />
    </button>
    <button className="ftb-btn" aria-label="Table">
      <Icon name="table" size={14} stroke={1.8} />
    </button>
  </div>
);

const Editor = ({
  activeBlockId,
  setActiveBlockId,
  lineNumbers,
  lineWrap,
  empty,
  blocks,
}) => {
  if (empty) {
    return (
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
  }
  return (
    <div
      className={`editor ${lineWrap ? "" : "editor--nowrap"} ${lineNumbers ? "editor--gutter" : ""}`}
    >
      <div className="editor__scroll">
        <div className="editor__inner">
          {lineNumbers && (
            <div className="gutter" aria-hidden>
              {Array.from({ length: 28 }).map((_, i) => {
                const status =
                  i === 13
                    ? "modified"
                    : i === 14 || i === 15
                      ? "modified"
                      : i === 21
                        ? "added"
                        : null;
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
          <div className="editor__content" style={{ textAlign: "left" }}>
            {blocks.map((b) =>
              b.type === "raw" ? (
                <RawBlock key={b.id} block={b} lineNumbers={lineNumbers} />
              ) : (
                <Block
                  key={b.id}
                  block={b}
                  active={b.id === activeBlockId}
                  onActivate={setActiveBlockId}
                />
              ),
            )}
          </div>
        </div>
      </div>
      <FloatingToolbar visible={true} />
    </div>
  );
};

// ============== STATUS BAR ==============
const StatusBar = ({
  lineWrap,
  setLineWrap,
  dirty,
  encoding = "UTF-8",
  eol = "LF",
  lang = "Markdown",
  line = 14,
  col = 36,
}) => (
  <footer className="statusbar" aria-label="Status bar">
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
      <button
        className="status-seg status-seg--btn"
        onClick={() => setLineWrap((v) => !v)}
      >
        <Icon name="wrap-text" size={11} stroke={1.8} />
        {lineWrap ? "Перенос: вкл" : "Перенос: выкл"}
      </button>
      <span className="status-seg">{encoding}</span>
      <span className="status-seg">{eol}</span>
      <span className="status-seg status-seg--lang">{lang}</span>
    </div>
  </footer>
);

// ============== APP ==============
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/ {
  theme: "light",
  accent: "ink",
  density: "default",
  layout: "top",
  screen: "editor",
  rawFrame: "bold",
}; /*EDITMODE-END*/

const FILE_TREE = [
  {
    id: "docs",
    type: "folder",
    name: "docs",
    children: [
      { id: "f-arch", type: "file", name: "architecture.md" },
      { id: "f-senar", type: "file", name: "senar.md" },
      { id: "f-design", type: "file", name: "DESIGN.md", dirty: true },
    ],
  },
  {
    id: "drafts",
    type: "folder",
    name: "drafts",
    children: [
      { id: "f-rel", type: "file", name: "release-0.3.md" },
      { id: "f-bench", type: "file", name: "benchmarks.md" },
    ],
  },
  { id: "f-readme", type: "file", name: "README.md" },
  { id: "f-todo", type: "file", name: "TODO.md", dirty: true },
  { id: "f-claude", type: "file", name: "CLAUDE.md" },
];

const App = () => {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [activeBlockId, setActiveBlockId] = useState("b6");
  const [lineWrap, setLineWrap] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [activeTabId, setActiveTabId] = useState("t1");
  const [openFolderModal, setOpenFolderModal] = useState(false);

  const [tabs, setTabs] = useState([
    { id: "t1", name: "release-0.3.md", dirty: true },
    { id: "t2", name: "architecture.md", dirty: false },
    { id: "t3", name: "DESIGN.md", dirty: true },
    { id: "t4", name: "untitled-2", dirty: false },
  ]);

  // Apply theme/accent/density/layout to root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", tweaks.theme);
    if (tweaks.accent === "ink") root.removeAttribute("data-accent");
    else root.setAttribute("data-accent", tweaks.accent);
    root.setAttribute("data-density", tweaks.density);
    if (tweaks.rawFrame === "bold") root.removeAttribute("data-raw-frame");
    else root.setAttribute("data-raw-frame", tweaks.rawFrame);
  }, [tweaks.theme, tweaks.accent, tweaks.density, tweaks.rawFrame]);

  const screen = tweaks.screen;
  const sidebarState =
    screen === "editor-empty"
      ? "tree"
      : screen === "sidebar-empty"
        ? "empty"
        : screen === "sidebar-loading"
          ? "loading"
          : screen === "open-folder"
            ? "empty"
            : "tree";

  const activeFile =
    tabs.find((t) => t.id === activeTabId)?.name ?? "untitled.md";
  const isEmpty = screen === "editor-empty";

  const handleOpenFolder = () => setOpenFolderModal(true);

  return (
    <div className={`app app--layout-${tweaks.layout}`}>
      <TitleBar activeFile={activeFile} />

      {tweaks.layout === "top" && (
        <TabsBar
          tabs={tabs}
          activeId={activeTabId}
          onSelect={setActiveTabId}
          onClose={(id) => setTabs((t) => t.filter((x) => x.id !== id))}
          onToggleSidebar={() => setSidebarVisible((v) => !v)}
          sidebarVisible={sidebarVisible}
          layout={tweaks.layout}
        />
      )}

      <div className="app__middle">
        {sidebarVisible && (
          <div className="app__sidebar">
            <Sidebar
              state={sidebarState}
              tree={FILE_TREE}
              activeId="f-rel"
              onSelect={() => {}}
              onOpenFolder={handleOpenFolder}
              layout={tweaks.layout}
            />

            {tweaks.layout === "side" && (
              <div className="app__side-tabs">
                {tabs.map((t) => (
                  <div
                    key={t.id}
                    className={`side-tab ${t.id === activeTabId ? "side-tab--active" : ""} ${t.dirty ? "side-tab--dirty" : ""}`}
                    onClick={() => setActiveTabId(t.id)}
                  >
                    {t.dirty ? (
                      <span className="side-tab__dot" />
                    ) : (
                      <Icon name="file-text" size={13} stroke={1.5} />
                    )}
                    <span>{t.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="app__editor">
          <Editor
            activeBlockId={activeBlockId}
            setActiveBlockId={setActiveBlockId}
            lineNumbers={lineNumbers}
            lineWrap={lineWrap}
            empty={isEmpty}
            blocks={RENDERED_DOC}
          />
        </div>
      </div>

      <StatusBar
        lineWrap={lineWrap}
        setLineWrap={setLineWrap}
        dirty={tabs.find((t) => t.id === activeTabId)?.dirty}
      />

      {(openFolderModal || screen === "open-folder") && (
        <div
          className="modal-backdrop"
          onClick={() => setOpenFolderModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <Icon name="folder-open" size={16} stroke={1.6} />
              <span>Открыть папку</span>
              <button
                className="modal__close"
                onClick={() => setOpenFolderModal(false)}
              >
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
              {[
                { name: "personal", count: 24, current: false },
                { name: "work", count: 18, current: true },
                { name: "research", count: 7, current: false },
                { name: "scratch", count: 3, current: false },
              ].map((f) => (
                <div
                  key={f.name}
                  className={`modal__item ${f.current ? "modal__item--current" : ""}`}
                >
                  <Icon name="folder" size={14} stroke={1.6} />
                  <span className="modal__item-name">{f.name}</span>
                  <span className="modal__item-meta">{f.count} файлов</span>
                </div>
              ))}
            </div>
            <div className="modal__footer">
              <span className="modal__hint">Выберите папку с .md файлами</span>
              <div className="modal__actions">
                <button
                  className="btn btn--ghost"
                  onClick={() => setOpenFolderModal(false)}
                >
                  Отмена
                </button>
                <button className="btn btn--primary">Открыть «work»</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TweaksPanel title="mdpad++ tweaks">
        <TweakSection title="Theme">
          <TweakRadio
            label="Mode"
            value={tweaks.theme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            onChange={(v) => setTweak("theme", v)}
          />
          <TweakRadio
            label="Accent"
            value={tweaks.accent}
            options={[
              { value: "ink", label: "Light" },
              { value: "orange", label: "Coral" },
              { value: "blue", label: "Light" },
              { value: "green", label: "Sage" },
            ]}
            onChange={(v) => setTweak("accent", v)}
          />
        </TweakSection>
        <TweakSection title="Layout">
          <TweakRadio
            label="Density"
            value={tweaks.density}
            options={[
              { value: "compact", label: "Compact" },
              { value: "default", label: "Default" },
              { value: "comfortable", label: "Comfy" },
            ]}
            onChange={(v) => setTweak("density", v)}
          />
          <TweakRadio
            label="RAW frame"
            value={tweaks.rawFrame}
            options={[
              { value: "bold", label: "Bold" },
              { value: "thin", label: "Thin" },
              { value: "none", label: "None" },
            ]}
            onChange={(v) => setTweak("rawFrame", v)}
          />
          <TweakRadio
            label="Tabs"
            value={tweaks.layout}
            options={[
              { value: "top", label: "Top" },
              { value: "side", label: "Side" },
            ]}
            onChange={(v) => setTweak("layout", v)}
          />
        </TweakSection>
        <TweakSection title="State">
          <TweakSelect
            label="Screen"
            value={tweaks.screen}
            options={[
              { value: "editor", label: "Editor — content + raw block" },
              { value: "editor-empty", label: "Editor — empty" },
              { value: "sidebar-empty", label: "Sidebar — no folder" },
              { value: "sidebar-loading", label: "Sidebar — loading" },
              { value: "open-folder", label: "Open folder dialog" },
            ]}
            onChange={(v) => setTweak("screen", v)}
          />
          <TweakToggle
            label="Line numbers"
            value={lineNumbers}
            onChange={setLineNumbers}
          />
          <TweakToggle
            label="Line wrap"
            value={lineWrap}
            onChange={setLineWrap}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};

window.MdpadApp = App;
