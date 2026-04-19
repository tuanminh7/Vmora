import { Title } from "./ui";

function getProfileInitials(fullName, email) {
  const source = (fullName || email || "Vmora").trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() ?? "")
    .join("");
}

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
  const profileName = profileForm.fullName?.trim() || user?.full_name || user?.email?.split("@")[0] || "Vmora User";
  const profileAvatar = profileForm.avatarUrl?.trim() || user?.avatar_url || "";
  const profileInitials = getProfileInitials(profileName, user?.email ?? "");
  const profilePublicId = user?.public_user_id ?? String(user?.id ?? "").padStart(5, "0");

  function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onProfileFieldChange("avatarUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

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
            <div className="profile-form-head">
              <div>
                <p className="eyebrow">Hồ sơ cá nhân</p>
                <h3>Thông tin của bạn</h3>
              </div>
              <p className="profile-form-copy">Tải ảnh từ máy lên, cập nhật tên và các thông tin liên hệ ngay tại đây.</p>
            </div>

            <div className="profile-avatar-field">
              <div className="profile-avatar-upload">
                {profileAvatar ? (
                  <img alt={profileName} className="profile-avatar-preview" src={profileAvatar} />
                ) : (
                  <div className="profile-avatar-fallback">{profileInitials}</div>
                )}
              </div>

              <div className="profile-avatar-actions">
                <label className="primary-button profile-upload-button" htmlFor="profile-avatar-upload">
                  Chọn ảnh từ máy
                </label>
                <input
                  accept="image/*"
                  className="profile-avatar-input"
                  id="profile-avatar-upload"
                  onChange={handleAvatarUpload}
                  type="file"
                />
                <p>Ảnh avatar sẽ hiển thị theo khuôn tròn ở hồ sơ của bạn.</p>
              </div>
            </div>

            <div className="profile-form-grid">
              <label className="field">
                <span>Gmail</span>
                <input disabled value={user.email} />
              </label>
              <label className="field">
                <span>Tên hiển thị</span>
                <input onChange={(event) => onProfileFieldChange("fullName", event.target.value)} value={profileForm.fullName} />
              </label>
              <label className="field">
                <span>SĐT</span>
                <input onChange={(event) => onProfileFieldChange("phoneNumber", event.target.value)} value={profileForm.phoneNumber} />
              </label>
              <label className="field profile-form-grid-wide">
                <span>Địa chỉ</span>
                <input onChange={(event) => onProfileFieldChange("address", event.target.value)} value={profileForm.address} />
              </label>
            </div>

            <div className="profile-form-actions">
              <button className="primary-button" type="submit">
                Lưu
              </button>
              <button className="ghost-button" onClick={onLogout} type="button">
                Đăng xuất
              </button>
            </div>
          </form>

          <aside className="profile-preview-card">
            <p className="eyebrow">Profile của bạn</p>
            <div className="profile-preview-frame">
              {profileAvatar ? (
                <img alt={profileName} className="profile-preview-avatar" src={profileAvatar} />
              ) : (
                <div className="profile-preview-fallback">{profileInitials}</div>
              )}
            </div>
            <h3>{profileName}</h3>
            <p className="profile-preview-id">ID: {profilePublicId}</p>
            <p className="profile-preview-meta">{user.email}</p>
          </aside>
        </div>
      )}
    </section>
  );
}
