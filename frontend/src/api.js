const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
const DEFAULT_REQUEST_TIMEOUT_MS = 8000;

function normalizeErrorDetail(detail) {
  if (!detail) return "Co loi xay ra";
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item.msg === "string") return item.msg;
        return JSON.stringify(item);
      })
      .join("; ");
  }

  if (typeof detail === "object") {
    if (typeof detail.message === "string") return detail.message;
    return JSON.stringify(detail);
  }

  return String(detail);
}

export function getRealtimeUrl(token) {
  const baseUrl = new URL(API_BASE_URL, window.location.origin);
  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, "")}/v1/realtime/ws`;
  baseUrl.search = new URLSearchParams({ token }).toString();
  return baseUrl.toString();
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
      method: options.method ?? "GET",
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Backend phản hồi quá lâu");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    let detail = "Có lỗi xảy ra";
    try {
      const payload = await response.json();
      detail = normalizeErrorDetail(payload.detail ?? payload.message ?? detail);
    } catch {
      detail = "Có lỗi xảy ra";
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getHealth() {
  return request("/health");
}

export function getLanguages() {
  return request("/v1/languages");
}

export function getVocabulary(languageCode, limit = 12) {
  return request(`/v1/vocabulary?language_code=${encodeURIComponent(languageCode)}&limit=${limit}`);
}

export function getLearningOverview(languageCode, token = "") {
  return request(`/v1/learning/overview?language_code=${encodeURIComponent(languageCode)}`, { token });
}

export function getLessonDetail(lessonId, token = "") {
  return request(`/v1/lessons/${lessonId}`, { token });
}

export function completeLesson(lessonId, token) {
  return request(`/v1/lessons/${lessonId}/complete`, { method: "POST", token });
}

export function getPracticeActivities(languageCode, token, practiceSkill = "") {
  const params = new URLSearchParams({ language_code: languageCode });
  if (practiceSkill) params.set("practice_skill", practiceSkill);
  return request(`/v1/practice/activities?${params.toString()}`, { token });
}

export function submitPracticeActivity(activityId, answers, token = "") {
  return request(`/v1/practice/activities/${activityId}/submit`, {
    method: "POST",
    token,
    body: { answers },
  });
}

export function getExams(languageCode, certificateCode = "") {
  const params = new URLSearchParams({ language_code: languageCode });
  if (certificateCode) params.set("certificate_code", certificateCode);
  return request(`/v1/exams?${params.toString()}`);
}

export function getExamDetail(examId) {
  return request(`/v1/exams/${examId}`);
}

export function submitExam(examId, answers, token = "") {
  return request(`/v1/exams/${examId}/submit`, {
    method: "POST",
    token,
    body: { answers },
  });
}

export function getTournaments(languageCode, token = "") {
  return request(`/v1/tournaments?language_code=${encodeURIComponent(languageCode)}`, { token });
}

export function getTournamentDetail(tournamentId, token = "") {
  return request(`/v1/tournaments/${tournamentId}`, { token });
}

export function registerTournament(token, tournamentId) {
  return request(`/v1/tournaments/${tournamentId}/register`, { method: "POST", token });
}

export function startTournamentRoom(token, tournamentId) {
  return request(`/v1/tournaments/${tournamentId}/start-room`, { method: "POST", token });
}

export function submitTournament(token, tournamentId, answers) {
  return request(`/v1/tournaments/${tournamentId}/submit`, {
    method: "POST",
    token,
    body: { answers },
  });
}

export function getTournamentLeaderboard(tournamentId) {
  return request(`/v1/tournaments/${tournamentId}/leaderboard`);
}

export function getPackages(languageCode) {
  return request(`/v1/packages?language_code=${encodeURIComponent(languageCode)}`);
}

export function getEntitlements(token) {
  return request("/v1/me/entitlements", { token });
}

export function activateFreePackage(token, packageId) {
  return request(`/v1/packages/${packageId}/activate-free`, { method: "POST", token });
}

export function createMomoPayment(token, packageId) {
  return request("/v1/payments/momo/create", {
    method: "POST",
    token,
    body: { package_id: packageId },
  });
}

export function register(payload) {
  return request("/v1/auth/register", { method: "POST", body: payload });
}

export function login(payload) {
  return request("/v1/auth/login", { method: "POST", body: payload });
}

export function requestPasswordReset(payload) {
  return request("/v1/auth/password-reset/request", { method: "POST", body: payload });
}

export function confirmPasswordReset(payload) {
  return request("/v1/auth/password-reset/confirm", { method: "POST", body: payload });
}

export function logout(token) {
  return request("/v1/auth/logout", { method: "POST", token });
}

export function getMe(token) {
  return request("/v1/me", { token });
}

export function getSupportAdminProfile() {
  return request("/v1/support/admin-profile");
}

export function updateProfile(token, payload) {
  return request("/v1/me", { method: "PATCH", token, body: payload });
}

export function updateLearningLanguage(token, learningLanguageCode) {
  return request("/v1/me/language", {
    method: "PATCH",
    token,
    body: { learning_language_code: learningLanguageCode },
  });
}

export function getMyStats(token) {
  return request("/v1/me/stats", { token });
}

export function getNotebook(token) {
  return request("/v1/me/notebook", { token });
}

export function createNotebook(token, payload) {
  return request("/v1/me/notebook", { method: "POST", token, body: payload });
}

export function getNotebookReminders(token) {
  return request("/v1/me/notebook/reminders", { token });
}

export function createNotebookReminder(token, payload) {
  return request("/v1/me/notebook/reminders", { method: "POST", token, body: payload });
}

export function completeNotebookReminder(token, reminderId) {
  return request(`/v1/me/notebook/reminders/${reminderId}/complete`, { method: "POST", token });
}

export function getStudyStreak(token) {
  return request("/v1/me/streak", { token });
}

export function checkInStudyStreak(token) {
  return request("/v1/me/streak/check-in", { method: "POST", token });
}

export function getVocabularyBank(token) {
  return request("/v1/me/vocabulary-bank", { token });
}

export function createVocabularyBankItem(token, payload) {
  return request("/v1/me/vocabulary-bank", { method: "POST", token, body: payload });
}

export function getVocabularyPracticeFeed(token) {
  return request("/v1/me/vocabulary-bank/practice-feed", { token });
}

export function updateVocabularyBankSelection(token, itemId, isSelected) {
  return request(`/v1/me/vocabulary-bank/${itemId}/select`, {
    method: "PATCH",
    token,
    body: { is_selected: isSelected },
  });
}

export function updateVocabularyBankPractice(token, itemId, isInPractice) {
  return request(`/v1/me/vocabulary-bank/${itemId}/practice`, {
    method: "PATCH",
    token,
    body: { is_in_practice: isInPractice },
  });
}

export function getNotifications(token) {
  return request("/v1/me/notifications", { token });
}

export function markNotificationRead(token, notificationId) {
  return request(`/v1/me/notifications/${notificationId}/read`, { method: "POST", token });
}

export function getTickets(token) {
  return request("/v1/me/tickets", { token });
}

export function createTicket(token, payload) {
  return request("/v1/me/tickets", { method: "POST", token, body: payload });
}

export function getUserSettings(token) {
  return request("/v1/me/settings", { token });
}

export function updateUserSettings(token, payload) {
  return request("/v1/me/settings", { method: "PATCH", token, body: payload });
}

export function getPet(token) {
  return request("/v1/me/pet", { token });
}

export function updatePet(token, payload) {
  return request("/v1/me/pet", { method: "PATCH", token, body: payload });
}

export function getPetVoice(token) {
  return request("/v1/me/pet/voice", { token });
}

export function sendPetVoice(token, payload) {
  return request("/v1/me/pet/voice", { method: "POST", token, body: payload });
}

export function getLeaderboard(languageCode = "") {
  const query = languageCode ? `?language_code=${encodeURIComponent(languageCode)}` : "";
  return request(`/v1/leaderboard${query}`);
}

export function getCommunityPosts(languageCode = "", token = "") {
  const query = languageCode ? `?language_code=${encodeURIComponent(languageCode)}` : "";
  return request(`/v1/community/posts${query}`, { token });
}

export function createCommunityPost(token, payload) {
  return request("/v1/community/posts", { method: "POST", token, body: payload });
}

export function updateCommunityPost(token, postId, payload) {
  return request(`/v1/community/posts/${postId}`, { method: "PATCH", token, body: payload });
}

export function deleteCommunityPost(token, postId) {
  return request(`/v1/community/posts/${postId}`, { method: "DELETE", token });
}

export function createCommunityComment(token, postId, payload) {
  return request(`/v1/community/posts/${postId}/comments`, { method: "POST", token, body: payload });
}

export function reactCommunityPost(token, postId, reactionType) {
  return request(`/v1/community/posts/${postId}/reactions`, {
    method: "POST",
    token,
    body: { reaction_type: reactionType },
  });
}

export function shareCommunityPost(token, postId) {
  return request(`/v1/community/posts/${postId}/share`, { method: "POST", token });
}

export function reportCommunityPost(token, postId, payload) {
  return request(`/v1/community/posts/${postId}/report`, { method: "POST", token, body: payload });
}

export function getFriends(token) {
  return request("/v1/community/friends", { token });
}

export function searchCommunityUsers(token, query) {
  return request(`/v1/community/users/search?query=${encodeURIComponent(query)}`, { token });
}

export function addFriend(token, friendUserId) {
  return request(`/v1/community/friends/${friendUserId}`, { method: "POST", token });
}

export function getGroupRooms(token) {
  return request("/v1/community/groups", { token });
}

export function createGroupRoom(token, payload) {
  return request("/v1/community/groups", { method: "POST", token, body: payload });
}

export function joinGroupRoom(token, payload) {
  return request("/v1/community/groups/join", { method: "POST", token, body: payload });
}

export function getGroupRoomMessages(token, roomId) {
  return request(`/v1/community/groups/${roomId}/messages`, { token });
}

export function sendGroupRoomMessage(token, roomId, payload) {
  return request(`/v1/community/groups/${roomId}/messages`, { method: "POST", token, body: payload });
}

export function getGlobalChatMessages(token) {
  return request("/v1/community/global-chat/messages", { token });
}

export function sendGlobalChatMessage(token, payload) {
  return request("/v1/community/global-chat/messages", { method: "POST", token, body: payload });
}

export function getDirectMessages(token, friendUserId) {
  return request(`/v1/community/direct-messages/${friendUserId}`, { token });
}

export function sendDirectMessage(token, friendUserId, payload) {
  return request(`/v1/community/direct-messages/${friendUserId}`, { method: "POST", token, body: payload });
}

export function getAdminDashboard(token) {
  return request("/v1/admin/dashboard", { token });
}

export function getAdminWorkspace(token, area) {
  return request(`/v1/admin/workspace/${area}`, { token });
}

export function previewAdminLesson(token, lessonId) {
  return request(`/v1/admin/learning-content/lessons/${lessonId}/preview`, { token });
}

export function publishAdminLearningContent(token, itemType, itemId, isPublished) {
  return request(`/v1/admin/learning-content/${itemType}/${itemId}/publish`, {
    method: "PATCH",
    token,
    body: { is_published: isPublished },
  });
}

export function getAdminUsers(token) {
  return request("/v1/admin/users", { token });
}

export function getAdminUserDetail(token, userId) {
  return request(`/v1/admin/users/${userId}/detail`, { token });
}

export function grantAdmin(token, userId) {
  return request(`/v1/admin/users/${userId}/grant-admin`, { method: "POST", token });
}

export function adminLockUser(token, userId) {
  return request(`/v1/admin/users/${userId}/lock`, { method: "POST", token });
}

export function adminUnlockUser(token, userId) {
  return request(`/v1/admin/users/${userId}/unlock`, { method: "POST", token });
}

export function adminVerifyUser(token, userId) {
  return request(`/v1/admin/users/${userId}/verify`, { method: "POST", token });
}

export function adminResetUserPassword(token, userId) {
  return request(`/v1/admin/users/${userId}/reset-password`, { method: "POST", token });
}

export function getAdminTickets(token) {
  return request("/v1/admin/tickets", { token });
}

export function replyAdminTicket(token, ticketId, payload) {
  return request(`/v1/admin/tickets/${ticketId}`, { method: "PATCH", token, body: payload });
}

export function updateAdminTicketWorkflow(token, ticketId, payload) {
  return request(`/v1/admin/tickets/${ticketId}/workflow`, { method: "PATCH", token, body: payload });
}

export function sendAdminNotification(token, payload) {
  return request("/v1/admin/notifications/send", { method: "POST", token, body: payload });
}

export function getAdminCollection(token, collection) {
  return request(`/v1/admin/${collection}`, { token });
}

export function createAdminCollectionItem(token, collection, payload) {
  return request(`/v1/admin/${collection}`, { method: "POST", token, body: payload });
}

export function updateAdminCollectionItem(token, collection, id, payload) {
  return request(`/v1/admin/${collection}/${id}`, { method: "PATCH", token, body: payload });
}

export function deleteAdminCollectionItem(token, collection, id) {
  return request(`/v1/admin/${collection}/${id}`, { method: "DELETE", token });
}

export function broadcastNotification(token, payload) {
  return request("/v1/admin/notifications/broadcast", { method: "POST", token, body: payload });
}

export function replaceAdminPackageCourses(token, packageId, courseIds) {
  return request(`/v1/admin/packages/${packageId}/courses`, {
    method: "PUT",
    token,
    body: { course_ids: courseIds },
  });
}

export function confirmAdminPayment(token, paymentId) {
  return request(`/v1/admin/payments/${paymentId}/confirm`, { method: "POST", token });
}

export function cancelAdminPayment(token, paymentId) {
  return request(`/v1/admin/payments/${paymentId}/cancel`, { method: "POST", token });
}

export function refundAdminPayment(token, paymentId) {
  return request(`/v1/admin/payments/${paymentId}/refund`, { method: "POST", token });
}

export function createManualAdminEntitlement(token, payload) {
  return request("/v1/admin/entitlements/manual", { method: "POST", token, body: payload });
}

export function extendAdminEntitlement(token, entitlementId, extendDays = 30) {
  return request(`/v1/admin/entitlements/${entitlementId}/extend`, {
    method: "POST",
    token,
    body: { extend_days: extendDays },
  });
}

export function moderateAdminCommunityPost(token, postId, payload) {
  return request(`/v1/admin/community/posts/${postId}/moderate`, { method: "POST", token, body: payload });
}

export function resolveAdminCommunityReport(token, reportId, payload) {
  return request(`/v1/admin/community/reports/${reportId}/resolve`, { method: "POST", token, body: payload });
}

export function updateAdminFeatureFlag(token, code, isEnabled) {
  return request(`/v1/admin/system/flags/${code}`, { method: "PATCH", token, body: { is_enabled: isEnabled } });
}

export function updateAdminSystemSetting(token, key, payload) {
  return request(`/v1/admin/system/settings/${key}`, { method: "PUT", token, body: payload });
}

export function createQuestionBankItem(token, payload) {
  return request("/v1/admin/question-bank", { method: "POST", token, body: payload });
}

export function updateQuestionBankItem(token, itemId, payload) {
  return request(`/v1/admin/question-bank/${itemId}`, { method: "PATCH", token, body: payload });
}

export function deleteQuestionBankItem(token, itemId) {
  return request(`/v1/admin/question-bank/${itemId}`, { method: "DELETE", token });
}

export function buildPracticeFromQuestionBank(token, payload) {
  return request("/v1/admin/question-bank/build-practice", { method: "POST", token, body: payload });
}

export function buildExamFromQuestionBank(token, payload) {
  return request("/v1/admin/question-bank/build-exam", { method: "POST", token, body: payload });
}
