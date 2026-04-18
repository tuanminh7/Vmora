import { Title } from "./ui";

function getAuthTitle(authMode, passwordResetStep) {
  if (authMode === "register") return "Đăng ký";
  if (authMode === "forgot") {
    return passwordResetStep === "request" ? "Quên pass" : "Đặt lại pass";
  }
  return "Đăng nhập";
}

export default function AccountSection({
  authError,
  authForm,
  authMessage,
  authMode,
  authSubmitting,
  onAuthModeChange,
  onAuthSubmit,
  onLogout,
  onProfileFieldChange,
  onAuthFieldChange,
  onSaveProfile,
  passwordResetStep,
  profileForm,
  user,
}) {
  return (
    <section className="flow-card">
      <Title eyebrow="Tài khoản" title={user ? "Profile" : "Đăng nhập / Đăng ký"} />

      {!user ? (
        <form className="auth-card" onSubmit={onAuthSubmit}>
          <div className="mode-switch auth-mode-switch">
            <button
              className={authMode === "login" ? "mode-button active" : "mode-button"}
              onClick={() => onAuthModeChange("login")}
              type="button"
            >
              Đăng nhập
            </button>
            <button
              className={authMode === "register" ? "mode-button active" : "mode-button"}
              onClick={() => onAuthModeChange("register")}
              type="button"
            >
              Đăng ký
            </button>
            <button
              className={authMode === "forgot" ? "mode-button active" : "mode-button"}
              onClick={() => onAuthModeChange("forgot")}
              type="button"
            >
              Quên pass
            </button>
          </div>

          <div className="auth-form-head">
            <p className="eyebrow">{authMode === "forgot" ? "OTP" : "Auth"}</p>
            <h3>{getAuthTitle(authMode, passwordResetStep)}</h3>
          </div>

          <label className="field">
            <span>Gmail</span>
            <input
              autoComplete="email"
              onChange={(event) => onAuthFieldChange("email", event.target.value)}
              type="email"
              value={authForm.email}
            />
          </label>

          {authMode === "forgot" && passwordResetStep === "request" ? (
            <label className="field">
              <span>Pin</span>
              <input
                inputMode="numeric"
                maxLength={12}
                onChange={(event) => onAuthFieldChange("pin", event.target.value)}
                type="password"
                value={authForm.pin}
              />
            </label>
          ) : null}

          {authMode === "forgot" && passwordResetStep === "confirm" ? (
            <>
              <label className="field">
                <span>OTP</span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => onAuthFieldChange("otpCode", event.target.value)}
                  value={authForm.otpCode}
                />
              </label>
              <label className="field">
                <span>Mật khẩu mới</span>
                <input
                  autoComplete="new-password"
                  onChange={(event) => onAuthFieldChange("newPassword", event.target.value)}
                  type="password"
                  value={authForm.newPassword}
                />
              </label>
            </>
          ) : null}

          {authMode !== "forgot" ? (
            <label className="field">
              <span>Pass</span>
              <input
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                onChange={(event) => onAuthFieldChange("password", event.target.value)}
                type="password"
                value={authForm.password}
              />
            </label>
          ) : null}

          {authMode === "register" ? (
            <label className="field">
              <span>Pin</span>
              <input
                inputMode="numeric"
                maxLength={12}
                onChange={(event) => onAuthFieldChange("pin", event.target.value)}
                type="password"
                value={authForm.pin}
              />
            </label>
          ) : null}

          {authError ? <p className="form-message error">{authError}</p> : null}
          {authMessage ? <p className="form-message success">{authMessage}</p> : null}

          <button className="primary-button" disabled={authSubmitting} type="submit">
            {authMode === "login"
              ? "Đăng nhập"
              : authMode === "register"
                ? "Đăng ký"
                : passwordResetStep === "request"
                  ? "Gửi OTP"
                  : "Đặt lại pass"}
          </button>

          {authMode === "forgot" ? (
            <button className="ghost-button" onClick={() => onAuthModeChange("login")} type="button">
              Quay lại
            </button>
          ) : null}
        </form>
      ) : (
        <div className="profile-layout">
          <form className="profile-card" onSubmit={onSaveProfile}>
            <label className="field">
              <span>Avatar</span>
              <input onChange={(event) => onProfileFieldChange("avatarUrl", event.target.value)} value={profileForm.avatarUrl} />
            </label>
            <label className="field">
              <span>ID</span>
              <input disabled value={user.public_user_id ?? String(user.id).padStart(5, "0")} />
            </label>
            <p className="form-message success">Dùng ID này khi cần gửi cho admin kiểm tra tài khoản.</p>
            <label className="field">
              <span>Gmail</span>
              <input disabled value={user.email} />
            </label>
            <label className="field">
              <span>Name</span>
              <input onChange={(event) => onProfileFieldChange("fullName", event.target.value)} value={profileForm.fullName} />
            </label>
            <label className="field">
              <span>SĐT</span>
              <input onChange={(event) => onProfileFieldChange("phoneNumber", event.target.value)} value={profileForm.phoneNumber} />
            </label>
            <label className="field">
              <span>Địa chỉ</span>
              <input onChange={(event) => onProfileFieldChange("address", event.target.value)} value={profileForm.address} />
            </label>
            <button className="primary-button" type="submit">
              Lưu
            </button>
            <button className="ghost-button" onClick={onLogout} type="button">
              Đăng xuất
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
