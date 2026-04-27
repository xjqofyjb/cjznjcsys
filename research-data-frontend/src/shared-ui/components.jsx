import { useMemo, useState } from "react";
import { theme, tones } from "./theme";
import { Icon } from "./icons";
import { useIsMobile } from "./useIsMobile";

export function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  style,
  disabled = false,
  className = "",
}) {
  return (
    <button
      type={type}
      className={`app-button app-button--${variant} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "ocean", subtle = false }) {
  const palette = tones[tone] || tones.ocean;
  return (
    <span
      className="app-badge"
      style={{
        background: subtle ? palette.soft : palette.gradient,
        color: subtle ? palette.solid : "#fff",
      }}
    >
      {children}
    </span>
  );
}

export function SurfaceCard({ children, className = "", style }) {
  return (
    <div className={`surface-card ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export function PageSection({ eyebrow, title, subtitle, children, action }) {
  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          {eyebrow ? <div className="section-eyebrow">{eyebrow}</div> : null}
          <h2 className="section-title">{title}</h2>
          {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function MetricCard({ value, label, iconType, tone = "ocean" }) {
  const palette = tones[tone] || tones.ocean;
  return (
    <SurfaceCard className="metric-card">
      <div className="metric-card__icon" style={{ background: palette.gradient }}>
        <Icon type={iconType} size={22} color="#fff" />
      </div>
      <div className="metric-card__value" style={{ color: palette.solid }}>
        {value}
      </div>
      <div className="metric-card__label">{label}</div>
    </SurfaceCard>
  );
}

export function EmptyState({ iconType = "folder", title, description, action }) {
  return (
    <SurfaceCard className="empty-state">
      <div className="empty-state__icon">
        <Icon type={iconType} size={26} color={theme.colors.subtext} />
      </div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </SurfaceCard>
  );
}

export function LoadingState({ title = "正在加载内容..." }) {
  return (
    <SurfaceCard className="empty-state">
      <div className="loading-dot" />
      <h3>{title}</h3>
      <p>请稍等，我们正在整理最新数据。</p>
    </SurfaceCard>
  );
}

function DesktopNav({ active, onNavigate, onOpenLogin, authedUser, onLogout, resourceItems, labs }) {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [labsOpen, setLabsOpen] = useState(false);
  const isResourceActive = resourceItems.some((item) => item.key === active);
  const isLabActive = labs.some((item) => item.key === active);

  const items = useMemo(
    () => [
      { key: "home", label: "首页", iconType: "home" },
      { key: "data", label: "数据中心", iconType: "data" },
    ],
    [],
  );

  return (
    <>
      <nav className="topbar-nav">
        {items.map((item) => (
          <button
            key={item.key}
            className={`topbar-nav__item ${active === item.key ? "is-active" : ""}`}
            onClick={() => onNavigate(item.key)}
          >
            <Icon type={item.iconType} size={16} />
            <span>{item.label}</span>
          </button>
        ))}

        <div
          className="topbar-dropdown"
          onMouseEnter={() => setResourcesOpen(true)}
          onMouseLeave={() => setResourcesOpen(false)}
        >
          <button className={`topbar-nav__item ${isResourceActive ? "is-active" : ""}`}>
            <Icon type="folder" size={16} />
            <span>资源中心</span>
            <Icon type="chevronDown" size={14} style={{ opacity: 0.8 }} />
          </button>
          {resourcesOpen ? (
            <div className="topbar-menu">
              {resourceItems.map((item) => (
                <button key={item.key} className="topbar-menu__item" onClick={() => onNavigate(item.key)}>
                  <div className="topbar-menu__icon">
                    <Icon type={item.iconType} size={16} />
                  </div>
                  <div>
                    <div className="topbar-menu__title">{item.label}</div>
                    <div className="topbar-menu__desc">{item.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div
          className="topbar-dropdown"
          onMouseEnter={() => setLabsOpen(true)}
          onMouseLeave={() => setLabsOpen(false)}
        >
          <button className={`topbar-nav__item ${isLabActive ? "is-active" : ""}`}>
            <Icon type="lab" size={16} />
            <span>分实验室</span>
            <Icon type="chevronDown" size={14} style={{ opacity: 0.8 }} />
          </button>
          {labsOpen ? (
            <div className="topbar-menu topbar-menu--wide">
              {labs.map((lab) => (
                <button key={lab.key} className="topbar-menu__item" onClick={() => onNavigate(lab.key)}>
                  <div className="topbar-menu__icon">
                    <Icon type={lab.iconType} size={16} />
                  </div>
                  <div>
                    <div className="topbar-menu__title">{lab.shortLabel}</div>
                    <div className="topbar-menu__desc">{lab.highlights.join(" · ")}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </nav>

      <div className="topbar-actions">
        {authedUser ? (
          <>
            <div className="user-chip">
              <Icon type="users" size={16} />
              <span>{authedUser}</span>
            </div>
            <Button variant="ghost" onClick={onLogout}>
              <Icon type="logout" size={15} />
              <span>退出</span>
            </Button>
          </>
        ) : (
          <Button onClick={onOpenLogin}>登录平台</Button>
        )}
      </div>
    </>
  );
}

function MobileNav({ active, onNavigate, onOpenLogin, authedUser, onLogout, resourceItems, labs }) {
  const [open, setOpen] = useState(false);

  const closeAndGo = (key) => {
    setOpen(false);
    onNavigate(key);
  };

  return (
    <div className="mobile-nav">
      <button className="mobile-nav__toggle" onClick={() => setOpen((prev) => !prev)}>
        <Icon type={open ? "close" : "menu"} size={20} />
      </button>
      {open ? (
        <div className="mobile-nav__panel">
          <div className="mobile-nav__group">
            {[
              { key: "home", label: "首页", iconType: "home" },
              { key: "data", label: "数据中心", iconType: "data" },
            ].map((item) => (
              <button
                key={item.key}
                className={`mobile-nav__item ${active === item.key ? "is-active" : ""}`}
                onClick={() => closeAndGo(item.key)}
              >
                <Icon type={item.iconType} size={16} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mobile-nav__group">
            <div className="mobile-nav__title">资源中心</div>
            {resourceItems.map((item) => (
              <button
                key={item.key}
                className={`mobile-nav__item ${active === item.key ? "is-active" : ""}`}
                onClick={() => closeAndGo(item.key)}
              >
                <Icon type={item.iconType} size={16} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mobile-nav__group">
            <div className="mobile-nav__title">分实验室</div>
            {labs.map((lab) => (
              <button
                key={lab.key}
                className={`mobile-nav__item ${active === lab.key ? "is-active" : ""}`}
                onClick={() => closeAndGo(lab.key)}
              >
                <Icon type={lab.iconType} size={16} />
                <span>{lab.shortLabel}</span>
              </button>
            ))}
          </div>

          {authedUser ? (
            <div className="mobile-nav__auth">
              <div className="user-chip">
                <Icon type="users" size={16} />
                <span>{authedUser}</span>
              </div>
              <Button variant="ghost" onClick={onLogout}>
                <Icon type="logout" size={15} />
                <span>退出</span>
              </Button>
            </div>
          ) : (
            <Button
              className="mobile-nav__login"
              onClick={() => {
                setOpen(false);
                onOpenLogin();
              }}
            >
              登录平台
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AppTopBar({ active, onNavigate, onOpenLogin, authedUser, onLogout, resourceItems, labs }) {
  const isMobile = useIsMobile();

  return (
    <header className="topbar-shell">
      <div className="topbar">
        <button className="brand-lockup" onClick={() => onNavigate("home")}>
          <div className="brand-lockup__mark">
            <img src="/logo.png" alt="logo" />
          </div>
          <div className="brand-lockup__text">
            <span className="brand-lockup__eyebrow">Research Data Platform</span>
            <strong>长江三峡数字化管理与智能决策实验室</strong>
          </div>
        </button>

        {isMobile ? (
          <MobileNav
            active={active}
            onNavigate={onNavigate}
            onOpenLogin={onOpenLogin}
            authedUser={authedUser}
            onLogout={onLogout}
            resourceItems={resourceItems}
            labs={labs}
          />
        ) : (
          <DesktopNav
            active={active}
            onNavigate={onNavigate}
            onOpenLogin={onOpenLogin}
            authedUser={authedUser}
            onLogout={onLogout}
            resourceItems={resourceItems}
            labs={labs}
          />
        )}
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <div>
          <div className="section-eyebrow">Yangtze Three Gorges Lab</div>
          <h3>长江三峡数字化管理与智能决策实验室</h3>
        </div>
        <div className="app-footer__meta">
          <span>面向科研资料、公开资源、专题实验室与数据归档协同场景</span>
          <span>Digital governance · intelligent decision-making · long-term research assets</span>
        </div>
      </div>
    </footer>
  );
}
