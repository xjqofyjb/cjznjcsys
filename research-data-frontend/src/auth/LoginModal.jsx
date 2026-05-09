import { useEffect, useState } from "react";
import { Button, SurfaceCard } from "../shared-ui/components";
import { Icon } from "../shared-ui/icons";
import { useIsMobile } from "../shared-ui/useIsMobile";

const initialRegisterForm = {
  username: "",
  email: "",
  displayName: "",
  password: "",
  confirmPassword: "",
};

export function LoginModal({ open, onClose, auth }) {
  const [mode, setMode] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) {
      setMode("login");
      setIdentifier("");
      setPassword("");
      setRegisterForm(initialRegisterForm);
      setError("");
      setNotice("");
    }
  }, [open]);

  if (!open) return null;

  function updateRegisterField(key, value) {
    setRegisterForm((current) => ({ ...current, [key]: value }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  async function handleLogin(event) {
    event.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setError("请输入用户名/邮箱和密码。");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      await auth.login(identifier.trim(), password);
      onClose();
    } catch (nextError) {
      if (nextError.status === 403) {
        setError("账号正在等待管理员审批，审批通过后即可登录上传。");
      } else {
        setError(nextError.message || "登录失败，请稍后重试。");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const username = registerForm.username.trim();
    const email = registerForm.email.trim();
    const displayName = registerForm.displayName.trim();

    if (!username || !email || !registerForm.password) {
      setError("请填写用户名、邮箱和密码。");
      return;
    }

    if (registerForm.password.length < 10) {
      setError("密码至少需要 10 位。");
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      await auth.register({
        username,
        email,
        displayName: displayName || username,
        password: registerForm.password,
      });
      setNotice("注册申请已提交。管理员批准后，你就可以使用用户名或邮箱登录并上传数据。");
      setIdentifier(username);
      setPassword("");
      setRegisterForm(initialRegisterForm);
      setMode("login");
    } catch (nextError) {
      setError(nextError.message || "注册申请提交失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <SurfaceCard className="login-modal auth-modal" style={{ width: isMobile ? "100%" : 520 }}>
        <div className="login-modal__hero auth-modal__hero" onClick={(event) => event.stopPropagation()}>
          <button className="login-modal__close" onClick={onClose} aria-label="关闭登录窗口">
            <Icon type="close" size={16} />
          </button>
          <div className="login-modal__badge">
            <Icon type={mode === "login" ? "shield" : "users"} size={22} color="#fff" />
          </div>
          <div className="section-eyebrow" style={{ color: "rgba(255,255,255,0.75)" }}>
            Secure workspace
          </div>
          <h3>{mode === "login" ? "登录研究数据平台" : "申请上传者账号"}</h3>
          <p>
            {mode === "login"
              ? "使用已审批账号进入平台，上传数据、查看记录，并在管理员工作台监控资源状态。"
              : "提交用户名、邮箱和密码后，账号会进入待审批状态；管理员批准后即可登录上传。"}
          </p>
        </div>

        <div className="auth-modal__tabs" onClick={(event) => event.stopPropagation()}>
          <button className={mode === "login" ? "is-active" : ""} onClick={() => switchMode("login")}>
            登录
          </button>
          <button className={mode === "register" ? "is-active" : ""} onClick={() => switchMode("register")}>
            注册申请
          </button>
        </div>

        {mode === "login" ? (
          <form className="login-modal__form" onSubmit={handleLogin} onClick={(event) => event.stopPropagation()}>
            <label className="field">
              <span>用户名或邮箱</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="username 或 name@example.com"
                autoComplete="username"
              />
            </label>

            <label className="field">
              <span>密码</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </label>

            {notice ? <div className="form-note form-note--success">{notice}</div> : null}
            {error ? <div className="form-note form-note--error">{error}</div> : null}

            <div className="login-modal__actions">
              <Button variant="secondary" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "登录中..." : "进入平台"}
              </Button>
            </div>
          </form>
        ) : (
          <form className="login-modal__form auth-modal__register-form" onSubmit={handleRegister} onClick={(event) => event.stopPropagation()}>
            <label className="field">
              <span>用户名</span>
              <input
                value={registerForm.username}
                onChange={(event) => updateRegisterField("username", event.target.value)}
                placeholder="3-32 位英文、数字、点、横线或下划线"
                autoComplete="username"
              />
            </label>

            <label className="field">
              <span>联系邮箱</span>
              <input
                type="email"
                value={registerForm.email}
                onChange={(event) => updateRegisterField("email", event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </label>

            <label className="field field--wide">
              <span>显示名称</span>
              <input
                value={registerForm.displayName}
                onChange={(event) => updateRegisterField("displayName", event.target.value)}
                placeholder="可选，留空则使用用户名"
                autoComplete="name"
              />
            </label>

            <label className="field">
              <span>密码</span>
              <input
                type="password"
                value={registerForm.password}
                onChange={(event) => updateRegisterField("password", event.target.value)}
                placeholder="至少 10 位"
                autoComplete="new-password"
              />
            </label>

            <label className="field">
              <span>确认密码</span>
              <input
                type="password"
                value={registerForm.confirmPassword}
                onChange={(event) => updateRegisterField("confirmPassword", event.target.value)}
                placeholder="再次输入密码"
                autoComplete="new-password"
              />
            </label>

            {notice ? <div className="form-note form-note--success field--wide">{notice}</div> : null}
            {error ? <div className="form-note form-note--error field--wide">{error}</div> : null}

            <div className="login-modal__actions field--wide">
              <Button variant="secondary" onClick={() => switchMode("login")}>
                返回登录
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "提交中..." : "提交注册申请"}
              </Button>
            </div>
          </form>
        )}
      </SurfaceCard>
    </div>
  );
}
