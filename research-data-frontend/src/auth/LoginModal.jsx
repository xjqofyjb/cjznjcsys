import { useEffect, useState } from "react";
import { Button, SurfaceCard } from "../shared-ui/components";
import { Icon } from "../shared-ui/icons";
import { useIsMobile } from "../shared-ui/useIsMobile";

export function LoginModal({ open, onClose, auth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("请输入邮箱和密码。");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await auth.login(email.trim(), password);
      onClose();
    } catch (nextError) {
      setError(nextError.message || "登录失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <SurfaceCard className="login-modal" style={{ width: isMobile ? "100%" : 440 }}>
        <div className="login-modal__hero" onClick={(event) => event.stopPropagation()}>
          <button className="login-modal__close" onClick={onClose}>
            <Icon type="close" size={16} />
          </button>
          <div className="login-modal__badge">
            <Icon type="shield" size={22} color="#fff" />
          </div>
          <div className="section-eyebrow" style={{ color: "rgba(255,255,255,0.75)" }}>
            Secure workspace
          </div>
          <h3>登录研究数据平台</h3>
          <p>登录后即可上传资料、查看记录，并进入管理员工作台监控数据状态。</p>
        </div>

        <form className="login-modal__form" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
          <label className="field">
            <span>邮箱</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" />
          </label>

          <label className="field">
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
            />
          </label>

          {error ? <div className="form-note form-note--error">{error}</div> : null}

          <div className="login-modal__actions">
            <Button variant="secondary" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "登录中..." : "进入平台"}
            </Button>
          </div>
        </form>
      </SurfaceCard>
    </div>
  );
}
