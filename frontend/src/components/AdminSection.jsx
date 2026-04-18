import { useEffect, useMemo, useState } from "react";
import { ADMIN_TEMPLATES } from "../adminTemplates";

const ADMIN_AREAS = [
  { key: "dashboard", label: "Bảng điều khiển", hint: "Tổng quan hệ thống" },
  { key: "users", label: "Người dùng", hint: "Tài khoản, hồ sơ, hỗ trợ" },
  { key: "learning-content", label: "Học liệu", hint: "Khóa học, nội dung" },
  { key: "practice-exams", label: "Ôn luyện và bài thi", hint: "Bài tập, đề thi" },
  { key: "payments", label: "Gói mua và thanh toán", hint: "Gói, giao dịch, quyền học" },
  { key: "support", label: "Thông báo và hỗ trợ", hint: "Hộp thư, ticket" },
  { key: "community", label: "Cộng đồng", hint: "Báo cáo, nhóm, bảng xếp hạng" },
  { key: "system", label: "Cài đặt hệ thống", hint: "AI, feature flag, log" },
];

const AREA_COLLECTIONS = {
  "learning-content": ["languages", "levels", "roadmaps", "stages", "courses", "sections", "lessons", "vocabulary"],
  "practice-exams": ["practice", "exams"],
  payments: ["packages"],
};

const numberFormatter = new Intl.NumberFormat("vi-VN");

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return fallback;
  }
}

function formatCount(value) {
  return numberFormatter.format(value ?? 0);
}

function formatMoney(value) {
  return `${numberFormatter.format(value ?? 0)}đ`;
}

function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function fieldValueToString(field, value) {
  if (field.type === "json") return JSON.stringify(value ?? field.defaultValue, null, 2);
  return value ?? "";
}

function parseFieldValue(field, value) {
  if (field.type === "number") return value === "" ? null : Number(value);
  if (field.type === "checkbox") return Boolean(value);
  if (field.type === "json") return JSON.parse(value || "null");
  return value;
}

function getRecordTitle(item, tab) {
  if (tab === "languages") return item.name ?? item.code ?? "Ngôn ngữ";
  if (tab === "vocabulary") return item.word ?? "Học liệu";
  if (tab === "packages") return item.name ?? item.code ?? "Gói mua";
  return item.title ?? item.name ?? item.code ?? `#${item.id}`;
}

function getRecordChips(item, tab) {
  const chips = [item.id ? `ID ${item.id}` : null];
  if (tab === "courses") chips.push(item.language_code, item.is_free ? "Free" : "Mua");
  if (tab === "lessons") chips.push(`Chương ${item.section_id}`, `${item.estimated_minutes} phút`);
  if (tab === "practice") chips.push(item.language_code, item.activity_type, item.is_active ? "Đang mở" : "Đã tắt");
  if (tab === "packages") chips.push(item.language_code, item.is_free ? "Free" : "Trả phí");
  if (tab === "exams") chips.push(item.language_code, item.level_code);
  if (["levels", "roadmaps", "vocabulary"].includes(tab)) chips.push(item.language_code);
  return chips.filter(Boolean);
}

function WorkflowList({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="admin-workflow-strip">
      {items.map((item, index) => (
        <span key={`${item}-${index}`}>{item}</span>
      ))}
    </div>
  );
}

function MetricGrid({ metrics = {} }) {
  const entries = Object.entries(metrics);
  if (!entries.length) return null;
  return (
    <div className="admin-metric-grid">
      {entries.map(([key, value]) => (
        <article className="admin-metric-card" key={key}>
          <span>{key.replaceAll("_", " ")}</span>
          <strong>{formatCount(value)}</strong>
        </article>
      ))}
    </div>
  );
}

function parseIdList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map(Number)
    .filter((item) => Number.isFinite(item));
}

function formatPublicUserId(userId) {
  if (!userId) return "";
  return String(userId).padStart(5, "0");
}

export default function AdminSection({
  adminArea,
  adminEditingItem,
  adminItems,
  adminJson,
  adminLessonPreview,
  adminSelectedUserId,
  adminSubmitting,
  adminTab,
  adminUserDetail,
  adminUsers,
  adminWorkspace,
  onAnswerTicket,
  onCancelEdit,
  onCancelPayment,
  onConfirmPayment,
  onCreateEntitlement,
  onCreateItem,
  onCreateQuestion,
  onDeleteItem,
  onDeleteQuestion,
  onEditItem,
  onExtendEntitlement,
  onGrantAdmin,
  onLockUser,
  onModerateCommunityPost,
  onPreviewLesson,
  onPublishLearningContent,
  onRefundPayment,
  onResetUserPassword,
  onResolveCommunityReport,
  onSavePackageCourses,
  onSaveSystemSetting,
  onSelectUser,
  onSendBroadcast,
  onSendNotification,
  onToggleFeature,
  onUnlockUser,
  onUpdateQuestion,
  onUpdateTicketWorkflow,
  onVerifyUser,
  onBuildExamFromBank,
  onBuildPracticeFromBank,
  setAdminArea,
  setAdminJson,
  setAdminTab,
}) {
  const [jsonDrafts, setJsonDrafts] = useState({});
  const [jsonError, setJsonError] = useState("");
  const [packageCourseDrafts, setPackageCourseDrafts] = useState({});
  const [manualEntitlement, setManualEntitlement] = useState({ user_id: "", package_id: "" });
  const [notificationForm, setNotificationForm] = useState({
    title: "Thông báo hệ thống",
    content: "",
    notificationType: "gift",
    targetType: "user",
    targetValue: "",
  });
  const [questionForm, setQuestionForm] = useState({
    languageCode: "",
    levelCode: "",
    topic: "",
    questionType: "quiz",
    prompt: "",
    payload: '{\n  "options": [\n    { "id": "a", "text": "Đáp án A" },\n    { "id": "b", "text": "Đáp án B" }\n  ]\n}',
    correctAnswer: '"a"',
    mediaUrl: "",
    explanation: "",
    isActive: true,
  });
  const [questionEditingId, setQuestionEditingId] = useState(null);
  const [bankBuildForm, setBankBuildForm] = useState({
    questionIds: "",
    title: "",
    description: "",
    lessonId: "",
    languageCode: "",
    levelCode: "",
  });
  const [settingDrafts, setSettingDrafts] = useState({});
  const template = ADMIN_TEMPLATES[adminTab];
  const formPayload = safeJsonParse(adminJson, {}) ?? {};
  const collections = AREA_COLLECTIONS[adminArea] ?? [];

  useEffect(() => {
    const drafts = {};
    template?.fields
      .filter((field) => field.type === "json")
      .forEach((field) => {
        drafts[field.key] = fieldValueToString(field, formPayload[field.key]);
      });
    setJsonDrafts(drafts);
  }, [adminJson, template]);

  useEffect(() => {
    const drafts = {};
    (adminWorkspace.packages ?? []).forEach((item) => {
      drafts[item.id] = (item.course_ids ?? []).join(", ");
    });
    setPackageCourseDrafts(drafts);
  }, [adminWorkspace.packages]);

  useEffect(() => {
    const drafts = {};
    (adminWorkspace.settings ?? []).forEach((item) => {
      drafts[item.key] = JSON.stringify(item.value ?? {}, null, 2);
    });
    setSettingDrafts(drafts);
  }, [adminWorkspace.settings]);

  const selectedUser = useMemo(
    () => (adminWorkspace.users ?? adminUsers ?? []).find((item) => item.id === adminSelectedUserId),
    [adminWorkspace.users, adminUsers, adminSelectedUserId],
  );

  function chooseArea(areaKey) {
    setAdminArea(areaKey);
    const firstCollection = AREA_COLLECTIONS[areaKey]?.[0];
    if (firstCollection) setAdminTab(firstCollection);
  }

  function handleFieldChange(field, value) {
    const basePayload = safeJsonParse(adminJson, {});
    setJsonError("");
    setAdminJson(JSON.stringify({ ...basePayload, [field.key]: parseFieldValue(field, value) }, null, 2));
  }

  function handleJsonBlur(field) {
    try {
      handleFieldChange(field, jsonDrafts[field.key] ?? "");
    } catch {
      setJsonError(`JSON "${field.label}" chưa hợp lệ.`);
    }
  }

  function handleSubmit(event) {
    if (!safeJsonParse(adminJson, null)) {
      event.preventDefault();
      setJsonError("JSON chưa hợp lệ.");
      return;
    }
    onCreateItem(event);
  }

  function resetQuestionForm() {
    setQuestionEditingId(null);
    setQuestionForm({
      languageCode: "",
      levelCode: "",
      topic: "",
      questionType: "quiz",
      prompt: "",
      payload: '{\n  "options": [\n    { "id": "a", "text": "Đáp án A" },\n    { "id": "b", "text": "Đáp án B" }\n  ]\n}',
      correctAnswer: '"a"',
      mediaUrl: "",
      explanation: "",
      isActive: true,
    });
  }

  async function submitQuestionBank(event) {
    event.preventDefault();
    const payload = {
      language_code: questionForm.languageCode,
      level_code: questionForm.levelCode || null,
      topic: questionForm.topic || null,
      question_type: questionForm.questionType,
      prompt: questionForm.prompt,
      payload: safeJsonParse(questionForm.payload, {}),
      correct_answer: safeJsonParse(questionForm.correctAnswer, questionForm.correctAnswer),
      media_url: questionForm.mediaUrl || null,
      explanation: questionForm.explanation || null,
      is_active: questionForm.isActive,
    };
    if (questionEditingId) {
      await onUpdateQuestion(questionEditingId, payload);
    } else {
      await onCreateQuestion(payload);
    }
    resetQuestionForm();
  }

  async function submitNotificationForm(event) {
    event.preventDefault();
    if (notificationForm.targetType === "user" && String(notificationForm.targetValue || "").length < 5) {
      window.alert("User ID phai co it nhat 5 chu so.");
      return;
    }
    await onSendNotification({
      title: notificationForm.title,
      content: notificationForm.content,
      notification_type: notificationForm.notificationType,
      target_type: notificationForm.targetType,
      target_value: notificationForm.targetValue || null,
    });
    setNotificationForm((current) => ({ ...current, content: "", targetValue: "" }));
  }

  function renderCollectionEditor() {
    if (!collections.length) return null;

    return (
      <>
        <div className="practice-nav admin-tabs">
          {collections.map((tab) => (
            <button
              className={adminTab === tab ? "practice-tab practice-tab-active" : "practice-tab"}
              key={tab}
              onClick={() => setAdminTab(tab)}
              type="button"
            >
              <strong>{ADMIN_TEMPLATES[tab]?.label ?? tab}</strong>
              <span className="admin-tab-badge">{adminTab === tab ? formatCount(adminItems.length) : "0"}</span>
            </button>
          ))}
        </div>

        <div className="admin-workspace">
          <form className="admin-form-card" onSubmit={handleSubmit}>
            <div className="admin-form-head">
              <p className="eyebrow">{adminEditingItem ? "Chỉnh sửa" : "Tạo mới"}</p>
              <h3>{template?.label ?? adminTab}</h3>
              {adminEditingItem ? (
                <button className="ghost-button mini-button" onClick={onCancelEdit} type="button">
                  Hủy
                </button>
              ) : null}
            </div>

            <div className="admin-form-grid">
              {template?.fields.map((field) => (
                <label className={field.type === "json" || field.type === "textarea" ? "field admin-wide-field" : "field"} key={field.key}>
                  <span>{field.label}</span>
                  {field.type === "checkbox" ? (
                    <span className="admin-checkbox-row">
                      <input checked={Boolean(formPayload[field.key])} onChange={(event) => handleFieldChange(field, event.target.checked)} type="checkbox" />
                    </span>
                  ) : field.type === "json" ? (
                    <textarea
                      className="json-editor"
                      onBlur={() => handleJsonBlur(field)}
                      onChange={(event) => setJsonDrafts((current) => ({ ...current, [field.key]: event.target.value }))}
                      value={jsonDrafts[field.key] ?? fieldValueToString(field, formPayload[field.key])}
                    />
                  ) : field.type === "textarea" ? (
                    <textarea className="text-editor" onChange={(event) => handleFieldChange(field, event.target.value)} value={fieldValueToString(field, formPayload[field.key])} />
                  ) : (
                    <input onChange={(event) => handleFieldChange(field, event.target.value)} type={field.type ?? "text"} value={fieldValueToString(field, formPayload[field.key])} />
                  )}
                </label>
              ))}
            </div>

            <details className="raw-json-panel">
              <summary>JSON</summary>
              <textarea className="json-editor" onChange={(event) => setAdminJson(event.target.value)} value={adminJson} />
            </details>

            {jsonError ? <p className="admin-error">{jsonError}</p> : null}

            <button className="primary-button" disabled={adminSubmitting} type="submit">
              {adminEditingItem ? "Lưu" : "Tạo"}
            </button>
          </form>

          <div className="admin-content-panel">
            <div className="admin-content-head">
              <div>
                <p className="eyebrow">Danh sách</p>
                <h3>{template?.label ?? adminTab}</h3>
              </div>
              <span>{formatCount(adminItems.length)}</span>
            </div>
            {adminItems.length > 0 ? (
              <div className="admin-record-grid">
                {adminItems.slice(0, 30).map((item) => (
                  <article className="admin-record-card" key={item.id ?? item.code}>
                    <div className="admin-record-card-head">
                      <h4>{getRecordTitle(item, adminTab)}</h4>
                      <div className="admin-record-actions">
                        <button className="ghost-button mini-button" onClick={() => onEditItem(item)} type="button">Sửa</button>
                        <button className="ghost-button mini-button" onClick={() => onDeleteItem(item)} type="button">Xóa</button>
                      </div>
                    </div>
                    <div className="admin-record-chips">
                      {getRecordChips(item, adminTab).map((chip) => <span className="admin-chip" key={chip}>{chip}</span>)}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-copy">Chưa có dữ liệu.</p>
            )}
          </div>
        </div>
      </>
    );
  }

  function renderDashboard() {
    return (
      <div className="admin-panel-stack">
        <MetricGrid metrics={adminWorkspace.metrics} />
        <div className="admin-overview-grid">
          <article className="admin-action-card">
            <div className="admin-action-card-head"><p className="eyebrow">Người dùng mới</p><span>{formatCount(adminWorkspace.quick_users?.length)}</span></div>
            {(adminWorkspace.quick_users ?? []).map((item) => (
              <button className="admin-list-button" key={item.id} onClick={() => onSelectUser(item.id)} type="button">
                <div><strong>{item.full_name || item.email}</strong><small>{item.email}</small></div>
                <span className="admin-status">{item.estimated_points} điểm</span>
              </button>
            ))}
          </article>
          <article className="admin-action-card">
            <div className="admin-action-card-head"><p className="eyebrow">Ticket gần đây</p><span>{formatCount(adminWorkspace.quick_tickets?.length)}</span></div>
            {(adminWorkspace.quick_tickets ?? []).map((item) => (
              <div className="admin-list-button" key={item.id}><div><strong>{item.title}</strong><small>{formatDate(item.updated_at)}</small></div><span className="admin-status">{item.status}</span></div>
            ))}
          </article>
          <article className="admin-action-card admin-highlight-card">
            <p className="eyebrow">Thông báo và hỗ trợ</p>
            <h3>Gửi thông báo toàn hệ thống</h3>
            <button className="primary-button admin-hero-button" onClick={onSendBroadcast} type="button">Gửi</button>
          </article>
        </div>
      </div>
    );
  }

  function renderUsers() {
    const users = adminWorkspace.users ?? adminUsers ?? [];
    const detail = adminUserDetail;
    const profile = detail?.profile ?? selectedUser;
    return (
      <div className="admin-two-column">
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Danh sách</p><h3>Người dùng</h3></div><span>{formatCount(users.length)}</span></div>
          <div className="admin-list-stack">
            {users.map((item) => (
              <button className={item.id === adminSelectedUserId ? "admin-list-button admin-list-button-active" : "admin-list-button"} key={item.id} onClick={() => onSelectUser(item.id)} type="button">
                <div><strong>{item.full_name || item.email}</strong><small>{item.email} · {item.phone_number || "chưa có SĐT"}</small></div>
                <span className={item.is_locked ? "admin-status" : "admin-status admin-status-active"}>{item.is_locked ? "Khóa" : "Mở"}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Chi tiết</p><h3>{profile?.full_name || profile?.email || "Chọn người dùng"}</h3></div></div>
          {profile ? (
            <>
              <div className="admin-mini-grid">
                <span>Email: {profile.email}</span>
                <span>Ngôn ngữ: {profile.learning_language_code || "chưa chọn"}</span>
                <span>Gói: {profile.active_package_name || "chưa có"}</span>
                <span>Điểm: {formatCount(profile.estimated_points)}</span>
                <span>Bài xong: {formatCount(profile.completed_lessons)}</span>
                <span>Ôn / Thi: {formatCount(profile.practice_attempts)} / {formatCount(profile.exam_attempts)}</span>
              </div>
              <div className="admin-record-actions">
                <button className="ghost-button mini-button" onClick={() => onGrantAdmin(profile.id)} type="button">Cấp admin</button>
                {profile.is_locked ? (
                  <button className="ghost-button mini-button" onClick={() => onUnlockUser(profile.id)} type="button">Mở khóa</button>
                ) : (
                  <button className="ghost-button mini-button" onClick={() => onLockUser(profile.id)} type="button">Khóa</button>
                )}
                <button className="ghost-button mini-button" onClick={() => onVerifyUser(profile.id)} type="button">Xác minh</button>
                <button className="ghost-button mini-button" onClick={() => onResetUserPassword(profile.id)} type="button">Reset mật khẩu</button>
              </div>
              <h4>Gói đang dùng</h4>
              {(detail?.entitlements ?? []).map((item) => <p className="admin-chip" key={item.id}>{item.package_name} · {item.status} · hết hạn {formatDate(item.expires_at) || "không giới hạn"}</p>)}
              <h4>Lịch sử ôn / thi</h4>
              {[...(detail?.practice_history ?? []), ...(detail?.exam_history ?? []), ...(detail?.tournament_history ?? [])].slice(0, 8).map((item) => (
                <p className="admin-list-button" key={`${item.attempt_id}-${item.title}`}>{item.title} · {item.score_percent}% · {formatDate(item.created_at)}</p>
              ))}
              <h4>Vấn đề hỗ trợ</h4>
              {(detail?.tickets ?? []).map((item) => <p className="admin-list-button" key={item.id}>{item.title} · {item.status}</p>)}
            </>
          ) : <p className="empty-copy">Chọn người dùng để xem hồ sơ, gói, tiến độ, lịch sử và ticket.</p>}
        </div>
      </div>
    );
  }

  function renderLearningContentExtra() {
    if (adminArea !== "learning-content") return null;
    return (
      <div className="admin-two-column">
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Xem trước</p><h3>Bài học trước khi xuất bản</h3></div></div>
          {(adminWorkspace.lessons ?? []).slice(0, 12).map((item) => (
            <article className="admin-record-card" key={item.id}>
              <h4>{item.title}</h4>
              <small>{item.is_published ? "Đã xuất bản" : "Chưa xuất bản"} · {item.estimated_minutes} phút</small>
              <div className="admin-record-actions">
                <button className="ghost-button mini-button" onClick={() => onPreviewLesson(item.id)} type="button">Xem trước</button>
                <button className="ghost-button mini-button" onClick={() => onPublishLearningContent("lessons", item.id, !item.is_published)} type="button">
                  {item.is_published ? "Ẩn khỏi app" : "Xuất bản"}
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Preview</p><h3>{adminLessonPreview?.title || "Chọn bài học"}</h3></div></div>
          {adminLessonPreview ? (
            <>
              <p><strong>Khóa học:</strong> {adminLessonPreview.course_title}</p>
              <p><strong>Chương:</strong> {adminLessonPreview.section_title}</p>
              <p>{adminLessonPreview.summary}</p>
              <div className="admin-preview-box">{adminLessonPreview.content || "Chưa có nội dung."}</div>
            </>
          ) : (
            <p className="empty-copy">Bấm "Xem trước" để đọc bản preview của bài học trước khi publish live.</p>
          )}
        </div>
      </div>
    );
  }

  function renderPracticeExamExtra() {
    if (adminArea !== "practice-exams") return null;
    return (
      <div className="admin-two-column">
        <form className="admin-form-card" onSubmit={submitQuestionBank}>
          <div className="admin-form-head">
            <p className="eyebrow">Ngân hàng câu hỏi</p>
            <h3>{questionEditingId ? "Cập nhật câu hỏi" : "Tạo câu hỏi"}</h3>
          </div>
          <div className="admin-form-grid">
            <label className="field"><span>Ngôn ngữ</span><input onChange={(event) => setQuestionForm((current) => ({ ...current, languageCode: event.target.value }))} value={questionForm.languageCode} /></label>
            <label className="field"><span>Cấp độ</span><input onChange={(event) => setQuestionForm((current) => ({ ...current, levelCode: event.target.value }))} value={questionForm.levelCode} /></label>
            <label className="field"><span>Chủ đề</span><input onChange={(event) => setQuestionForm((current) => ({ ...current, topic: event.target.value }))} value={questionForm.topic} /></label>
            <label className="field"><span>Dạng bài</span><select onChange={(event) => setQuestionForm((current) => ({ ...current, questionType: event.target.value }))} value={questionForm.questionType}><option value="quiz">Trắc nghiệm</option><option value="matching">Ghép nối</option><option value="audio">Nghe</option><option value="image">Hình ảnh</option><option value="typing">Gõ đáp án</option></select></label>
            <label className="field admin-wide-field"><span>Câu hỏi</span><textarea className="text-editor" onChange={(event) => setQuestionForm((current) => ({ ...current, prompt: event.target.value }))} value={questionForm.prompt} /></label>
            <label className="field admin-wide-field"><span>Payload JSON</span><textarea className="json-editor" onChange={(event) => setQuestionForm((current) => ({ ...current, payload: event.target.value }))} value={questionForm.payload} /></label>
            <label className="field admin-wide-field"><span>Đáp án đúng JSON / text</span><textarea className="json-editor" onChange={(event) => setQuestionForm((current) => ({ ...current, correctAnswer: event.target.value }))} value={questionForm.correctAnswer} /></label>
            <label className="field"><span>Media URL</span><input onChange={(event) => setQuestionForm((current) => ({ ...current, mediaUrl: event.target.value }))} value={questionForm.mediaUrl} /></label>
            <label className="field"><span>Giải thích</span><input onChange={(event) => setQuestionForm((current) => ({ ...current, explanation: event.target.value }))} value={questionForm.explanation} /></label>
          </div>
          <div className="admin-record-actions">
            <button className="primary-button" type="submit">{questionEditingId ? "Lưu câu hỏi" : "Tạo câu hỏi"}</button>
            {questionEditingId ? <button className="ghost-button mini-button" onClick={resetQuestionForm} type="button">Hủy sửa</button> : null}
          </div>
        </form>
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Kho câu hỏi</p><h3>Dùng cho ôn luyện và bài thi</h3></div><span>{formatCount(adminWorkspace.question_bank?.length)}</span></div>
          <div className="admin-inline-form">
            <input placeholder="ID câu hỏi: 1,2,3" onChange={(event) => setBankBuildForm((current) => ({ ...current, questionIds: event.target.value }))} value={bankBuildForm.questionIds} />
            <input placeholder="Tiêu đề bộ ôn / đề thi" onChange={(event) => setBankBuildForm((current) => ({ ...current, title: event.target.value }))} value={bankBuildForm.title} />
            <input placeholder="Lesson ID (cho ôn luyện)" onChange={(event) => setBankBuildForm((current) => ({ ...current, lessonId: event.target.value }))} value={bankBuildForm.lessonId} />
          </div>
          <div className="admin-record-actions">
            <button className="ghost-button mini-button" onClick={() => onBuildPracticeFromBank({ question_ids: parseIdList(bankBuildForm.questionIds), title: bankBuildForm.title, lesson_id: bankBuildForm.lessonId ? Number(bankBuildForm.lessonId) : null })} type="button">Tạo bộ ôn luyện</button>
            <button className="ghost-button mini-button" onClick={() => onBuildExamFromBank({ question_ids: parseIdList(bankBuildForm.questionIds), title: bankBuildForm.title })} type="button">Tạo đề thi</button>
          </div>
          <div className="admin-record-grid">
            {(adminWorkspace.question_bank ?? []).slice(0, 20).map((item) => (
              <article className="admin-record-card" key={item.id}>
                <h4>{item.prompt}</h4>
                <div className="admin-record-chips">
                  <span className="admin-chip">ID {item.id}</span>
                  <span className="admin-chip">{item.language_code}</span>
                  <span className="admin-chip">{item.question_type}</span>
                  {item.topic ? <span className="admin-chip">{item.topic}</span> : null}
                </div>
                <div className="admin-record-actions">
                  <button className="ghost-button mini-button" onClick={() => { setQuestionEditingId(item.id); setQuestionForm({ languageCode: item.language_code || "", levelCode: item.level_code || "", topic: item.topic || "", questionType: item.question_type || "quiz", prompt: item.prompt || "", payload: JSON.stringify(item.payload || {}, null, 2), correctAnswer: JSON.stringify(item.correct_answer ?? "", null, 2), mediaUrl: item.media_url || "", explanation: item.explanation || "", isActive: item.is_active !== false }); }} type="button">Sửa</button>
                  <button className="ghost-button mini-button" onClick={() => onDeleteQuestion(item.id)} type="button">Xóa</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderPaymentsExtra() {
    if (adminArea !== "payments") return null;
    return (
      <div className="admin-two-column">
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Gắn khóa học</p><h3>Gói mở khóa học nào</h3></div></div>
          {(adminWorkspace.packages ?? []).map((item) => (
            <article className="admin-record-card" key={item.id}>
              <h4>{item.name}</h4>
              <small>{item.is_free ? "Gói miễn phí" : formatMoney(item.price_vnd)} · {item.duration_days || "không giới hạn"} ngày</small>
              <label className="field">
                <span>ID khóa học được mở</span>
                <input onChange={(event) => setPackageCourseDrafts((current) => ({ ...current, [item.id]: event.target.value }))} value={packageCourseDrafts[item.id] ?? ""} />
              </label>
              <button className="ghost-button mini-button" onClick={() => onSavePackageCourses(item.id, (packageCourseDrafts[item.id] || "").split(",").map((value) => value.trim()).filter(Boolean).map(Number))} type="button">Lưu khóa học</button>
            </article>
          ))}
        </div>
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Thanh toán</p><h3>Giao dịch và quyền học</h3></div></div>
          <div className="admin-inline-form">
            <input placeholder="User ID" value={manualEntitlement.user_id} onChange={(event) => setManualEntitlement((current) => ({ ...current, user_id: event.target.value }))} />
            <input placeholder="Package ID" value={manualEntitlement.package_id} onChange={(event) => setManualEntitlement((current) => ({ ...current, package_id: event.target.value }))} />
            <button className="ghost-button mini-button" onClick={() => onCreateEntitlement(manualEntitlement)} type="button">Kích hoạt thủ công</button>
          </div>
          {(adminWorkspace.transactions ?? []).slice(0, 10).map((item) => (
            <article className="admin-record-card" key={item.id}>
              <h4>{item.order_id}</h4>
              <small>User {item.user_id} · Gói {item.package_id} · {formatMoney(item.amount_vnd)} · {item.status}</small>
              <div className="admin-record-actions">
                <button className="ghost-button mini-button" onClick={() => onConfirmPayment(item.id)} type="button">Xác nhận</button>
                <button className="ghost-button mini-button" onClick={() => onCancelPayment(item.id)} type="button">Hủy</button>
                <button className="ghost-button mini-button" onClick={() => onRefundPayment(item.id)} type="button">Hoàn tiền</button>
              </div>
            </article>
          ))}
          {(adminWorkspace.entitlements ?? []).slice(0, 8).map((item) => (
            <p className="admin-list-button" key={item.id}>Quyền #{item.id} · user {item.user_id} · {item.status}<button className="ghost-button mini-button" onClick={() => onExtendEntitlement(item.id, 30)} type="button">Gia hạn 30 ngày</button></p>
          ))}
        </div>
      </div>
    );
  }

  function renderSupport() {
    return (
      <div className="admin-two-column">
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Thông báo</p><h3>Gửi vào hộp thư</h3></div></div>
          <form className="admin-form-grid" onSubmit={submitNotificationForm}>
            <label className="field admin-wide-field">
              <span>Tiêu đề</span>
              <input onChange={(event) => setNotificationForm((current) => ({ ...current, title: event.target.value }))} value={notificationForm.title} />
            </label>
            <label className="field admin-wide-field">
              <span>Nội dung</span>
              <textarea className="text-editor" onChange={(event) => setNotificationForm((current) => ({ ...current, content: event.target.value }))} value={notificationForm.content} />
            </label>
            <label className="field">
              <span>Loại</span>
              <select onChange={(event) => setNotificationForm((current) => ({ ...current, notificationType: event.target.value }))} value={notificationForm.notificationType}>
                <option value="admin">Tin nhắn</option>
                <option value="gift">Quà</option>
                <option value="badge">Huy hiệu</option>
                <option value="study_reminder">Nhắc học</option>
              </select>
            </label>
            <label className="field">
              <span>Người nhận</span>
              <select onChange={(event) => setNotificationForm((current) => ({ ...current, targetType: event.target.value, targetValue: "" }))} value={notificationForm.targetType}>
                <option value="all">Tất cả</option>
                <option value="language">Nhóm ngôn ngữ</option>
                <option value="user">Cá nhân</option>
                <option value="admins">Admin</option>
              </select>
            </label>
            {notificationForm.targetType === "language" ? (
              <label className="field">
                <span>Nhóm</span>
                <select onChange={(event) => setNotificationForm((current) => ({ ...current, targetValue: event.target.value }))} value={notificationForm.targetValue}>
                  <option value="">Chọn ngôn ngữ</option>
                  {(adminWorkspace.languages ?? []).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            ) : null}
            {notificationForm.targetType === "user" ? (
              <label className="field">
                <span>Cá nhân</span>
                <select onChange={(event) => setNotificationForm((current) => ({ ...current, targetValue: event.target.value }))} value={notificationForm.targetValue}>
                  <option value="">Chọn user</option>
                  {(adminUsers ?? []).map((item) => <option key={item.id} value={item.id}>{item.full_name || item.email}</option>)}
                </select>
              </label>
            ) : null}
            <button className="primary-button admin-hero-button" type="submit">Gửi thông báo</button>
          </form>
          <button className="ghost-button mini-button" onClick={onSendBroadcast} type="button">Gửi mẫu nhanh toàn hệ thống</button>
          {(adminWorkspace.notifications ?? []).map((item) => <p className="admin-list-button" key={item.id}>{item.title} · {item.notification_type}</p>)}
        </div>
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Hỗ trợ</p><h3>Ticket người dùng</h3></div></div>
          {(adminWorkspace.tickets ?? []).map((item) => (
            <article className="admin-record-card" key={item.id}>
              <h4>{item.title}</h4>
              <small>{item.user_name} · {item.status} · {formatDate(item.updated_at)}</small>
              <p>{item.content}</p>
              <label className="field admin-wide-field">
                <span>Người phụ trách</span>
                <select
                  onChange={(event) =>
                    onUpdateTicketWorkflow(item.id, {
                      assigned_admin_id: event.target.value ? Number(event.target.value) : null,
                      status: event.target.value ? "assigned" : item.status,
                    })
                  }
                  value={item.assigned_admin_id ?? ""}
                >
                  <option value="">Chưa phân công</option>
                  {(adminWorkspace.admins ?? []).map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="admin-record-actions">
                <button className="ghost-button mini-button" onClick={() => onAnswerTicket(item.id)} type="button">Trả lời mẫu</button>
                <button className="ghost-button mini-button" onClick={() => onUpdateTicketWorkflow(item.id, { status: "closed" })} type="button">Đóng yêu cầu</button>
                <button className="ghost-button mini-button" onClick={() => onUpdateTicketWorkflow(item.id, { assigned_admin_id: null, status: "open" })} type="button">Bỏ phụ trách</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  function renderCommunity() {
    return (
      <div className="admin-two-column">
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Cộng đồng</p><h3>Báo cáo và bài đăng</h3></div></div>
          {(adminWorkspace.reports ?? []).map((item) => (
            <article className="admin-record-card" key={item.id}>
              <h4>Báo cáo #{item.id}</h4>
              <small>{item.reporter_name || `User ${item.reporter_user_id}`} báo cáo: {item.post_title || `Bài #${item.post_id}`}</small>
              <p>{item.reason}</p>
              <button className="ghost-button mini-button" onClick={() => onResolveCommunityReport(item.id, { status: "resolved", admin_note: "Đã xử lý" })} type="button">Đánh dấu đã xử lý</button>
            </article>
          ))}
          {(adminWorkspace.posts ?? []).map((item) => (
            <article className="admin-record-card" key={item.id}>
              <h4>{item.title}</h4><small>{item.user_name} · {item.is_active ? "đang hiện" : "đã ẩn"}</small>
              <div className="admin-record-actions">
                <button className="ghost-button mini-button" onClick={() => onModerateCommunityPost(item.id, { action: "warn" })} type="button">Cảnh cáo</button>
                <button className="ghost-button mini-button" onClick={() => onModerateCommunityPost(item.id, { action: "delete" })} type="button">Xóa nội dung</button>
                <button className="ghost-button mini-button" onClick={() => onModerateCommunityPost(item.id, { action: "lock_user" })} type="button">Khóa tài khoản</button>
              </div>
            </article>
          ))}
        </div>
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Bảng xếp hạng & huy hiệu</p><h3>Điểm, giải đấu, nhóm</h3></div></div>
          {(adminWorkspace.leaderboard ?? []).map((item) => <p className="admin-list-button" key={item.user_id}>{item.user_name}<span className="admin-status">{item.score}</span></p>)}
          {(adminWorkspace.groups ?? []).map((item) => <p className="admin-list-button" key={item.id}>{item.name}<span className="admin-status">{item.member_count} thành viên</span></p>)}
        </div>
      </div>
    );
  }

  function renderSystem() {
    return (
      <div className="admin-two-column">
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Cấu hình</p><h3>AI, API, tính năng</h3></div></div>
          {(adminWorkspace.feature_flags ?? []).map((item) => (
            <article className="admin-record-card" key={item.code}>
              <h4>{item.name}</h4><small>{item.description}</small>
              <button className="ghost-button mini-button" onClick={() => onToggleFeature(item.code, !item.is_enabled)} type="button">{item.is_enabled ? "Tắt" : "Bật"}</button>
            </article>
          ))}
          {(adminWorkspace.settings ?? []).map((item) => (
            <article className="admin-record-card" key={item.key}>
              <h4>{item.key}</h4>
              <textarea className="json-editor" onChange={(event) => setSettingDrafts((current) => ({ ...current, [item.key]: event.target.value }))} value={settingDrafts[item.key] ?? ""} />
              <button className="ghost-button mini-button" onClick={() => onSaveSystemSetting(item.key, { category: item.category, value: safeJsonParse(settingDrafts[item.key], item.value) })} type="button">Lưu cấu hình</button>
            </article>
          ))}
        </div>
        <div className="admin-content-panel">
          <div className="admin-content-head"><div><p className="eyebrow">Nhật ký</p><h3>Lỗi, audit, sự cố</h3></div></div>
          {(adminWorkspace.audit_logs ?? []).map((item) => <p className="admin-list-button" key={item.id}>{item.action} · {item.target_type} #{item.target_id}<small>{formatDate(item.created_at)}</small></p>)}
        </div>
      </div>
    );
  }

  function renderSupportByUserId() {
    return (
      <div className="admin-two-column">
        <div className="admin-content-panel">
          <div className="admin-content-head">
            <div>
              <p className="eyebrow">Thong bao</p>
              <h3>Gui hop thu / qua theo user ID</h3>
            </div>
          </div>
          <form className="admin-form-grid" onSubmit={submitNotificationForm}>
            <label className="field admin-wide-field">
              <span>Tieu de</span>
              <input onChange={(event) => setNotificationForm((current) => ({ ...current, title: event.target.value }))} value={notificationForm.title} />
            </label>
            <label className="field admin-wide-field">
              <span>Noi dung</span>
              <textarea className="text-editor" onChange={(event) => setNotificationForm((current) => ({ ...current, content: event.target.value }))} value={notificationForm.content} />
            </label>
            <label className="field">
              <span>Loai gui</span>
              <select onChange={(event) => setNotificationForm((current) => ({ ...current, notificationType: event.target.value }))} value={notificationForm.notificationType}>
                <option value="gift">Qua</option>
                <option value="admin">Tin nhan</option>
                <option value="badge">Huy hieu</option>
                <option value="study_reminder">Nhac hoc</option>
              </select>
            </label>
            <label className="field">
              <span>Nhom nhan</span>
              <select onChange={(event) => setNotificationForm((current) => ({ ...current, targetType: event.target.value, targetValue: "" }))} value={notificationForm.targetType}>
                <option value="user">Theo user ID</option>
                <option value="all">Tat ca</option>
                <option value="language">Theo ngon ngu</option>
                <option value="admins">Admin</option>
              </select>
            </label>
            {notificationForm.targetType === "user" ? (
              <label className="field">
                <span>User ID</span>
                <input
                  inputMode="numeric"
                  minLength={5}
                  onChange={(event) =>
                    setNotificationForm((current) => ({
                      ...current,
                      targetValue: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="Nhap ID 5 so, vi du 00008"
                  value={notificationForm.targetValue}
                />
              </label>
            ) : null}
            {notificationForm.targetType === "language" ? (
              <label className="field">
                <span>Ngon ngu</span>
                <select onChange={(event) => setNotificationForm((current) => ({ ...current, targetValue: event.target.value }))} value={notificationForm.targetValue}>
                  <option value="">Chon ngon ngu</option>
                  {(adminWorkspace.languages ?? []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {notificationForm.targetType === "user" ? (
              <p className="empty-copy">Nhap user ID dang 5 chu so. He thong se tu gui dung toi user do.</p>
            ) : null}
            <button className="primary-button admin-hero-button" type="submit">
              Gui
            </button>
          </form>
          <button className="ghost-button mini-button" onClick={onSendBroadcast} type="button">
            Gui mau nhanh toan he thong
          </button>
          <div className="admin-list-stack">
            {(adminUsers ?? []).slice(0, 12).map((item) => (
              <p className="admin-list-button" key={item.id}>
                {item.full_name || item.email}
                <span className="admin-status">ID {item.public_user_id || formatPublicUserId(item.id)}</span>
              </p>
            ))}
          </div>
          {(adminWorkspace.notifications ?? []).map((item) => (
            <p className="admin-list-button" key={item.id}>
              {item.title} · {item.notification_type} · {item.public_user_id ? `User ${item.public_user_id}` : "Toan he thong"}
            </p>
          ))}
        </div>
        <div className="admin-content-panel">
          <div className="admin-content-head">
            <div>
              <p className="eyebrow">Ho tro</p>
              <h3>Ticket nguoi dung</h3>
            </div>
          </div>
          {(adminWorkspace.tickets ?? []).map((item) => (
            <article className="admin-record-card" key={item.id}>
              <h4>{item.title}</h4>
              <small>
                {item.user_name} · ID {item.public_user_id || formatPublicUserId(item.user_id)} · {item.status} · {formatDate(item.updated_at)}
              </small>
              <p>{item.content}</p>
              <label className="field admin-wide-field">
                <span>Nguoi phu trach</span>
                <select
                  onChange={(event) =>
                    onUpdateTicketWorkflow(item.id, {
                      assigned_admin_id: event.target.value ? Number(event.target.value) : null,
                      status: event.target.value ? "assigned" : item.status,
                    })
                  }
                  value={item.assigned_admin_id ?? ""}
                >
                  <option value="">Chua phan cong</option>
                  {(adminWorkspace.admins ?? []).map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="admin-record-actions">
                <button className="ghost-button mini-button" onClick={() => onAnswerTicket(item.id)} type="button">
                  Tra loi mau
                </button>
                <button className="ghost-button mini-button" onClick={() => onUpdateTicketWorkflow(item.id, { status: "closed" })} type="button">
                  Dong yeu cau
                </button>
                <button className="ghost-button mini-button" onClick={() => onUpdateTicketWorkflow(item.id, { assigned_admin_id: null, status: "open" })} type="button">
                  Bo phu trach
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  function renderAreaBody() {
    if (adminArea === "dashboard") return renderDashboard();
    if (adminArea === "users") return renderUsers();
    if (adminArea === "support") return renderSupportByUserId();
    if (adminArea === "community") return renderCommunity();
    if (adminArea === "system") return renderSystem();
    return (
      <div className="admin-panel-stack">
        <WorkflowList items={adminWorkspace.workflow} />
        <MetricGrid metrics={adminWorkspace.summary} />
        {renderCollectionEditor()}
        {renderLearningContentExtra()}
        {renderPracticeExamExtra()}
        {renderPaymentsExtra()}
      </div>
    );
  }

  const activeArea = ADMIN_AREAS.find((item) => item.key === adminArea) ?? ADMIN_AREAS[0];

  return (
    <section className="flow-card admin-shell">
      <div className="section-heading">
        <p className="eyebrow">Admin theo sơ đồ</p>
        <h2>{activeArea.label}</h2>
        <p>{activeArea.hint}</p>
      </div>

      <div className="practice-nav admin-tabs admin-area-tabs">
        {ADMIN_AREAS.map((area) => (
          <button className={adminArea === area.key ? "practice-tab practice-tab-active" : "practice-tab"} key={area.key} onClick={() => chooseArea(area.key)} type="button">
            <strong>{area.label}</strong>
            <span className="admin-tab-badge">{area.hint}</span>
          </button>
        ))}
      </div>

      {renderAreaBody()}
    </section>
  );
}
