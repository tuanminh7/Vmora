import { useEffect, useRef, useState } from "react";
import {
  activateFreePackage,
  addFriend,
  adminLockUser,
  adminResetUserPassword,
  adminUnlockUser,
  adminVerifyUser,
  buildExamFromQuestionBank,
  buildPracticeFromQuestionBank,
  broadcastNotification,
  cancelAdminPayment,
  checkInStudyStreak,
  completeLesson,
  completeNotebookReminder,
  confirmAdminPayment,
  confirmPasswordReset,
  createAdminCollectionItem,
  createCommunityComment,
  createCommunityPost,
  createGroupRoom,
  createManualAdminEntitlement,
  createMomoPayment,
  createNotebook,
  createNotebookReminder,
  createQuestionBankItem,
  createTicket,
  createVocabularyBankItem,
  deleteAdminCollectionItem,
  deleteCommunityPost,
  deleteQuestionBankItem,
  extendAdminEntitlement,
  getAdminCollection,
  getAdminDashboard,
  getAdminTickets,
  getAdminUserDetail,
  getAdminUsers,
  getAdminWorkspace,
  getCommunityPosts,
  getDirectMessages,
  getEntitlements,
  getExamDetail,
  getExams,
  getFriends,
  getGlobalChatMessages,
  getGroupRoomMessages,
  getGroupRooms,
  getHealth,
  getLeaderboard,
  getLearningOverview,
  getLanguages,
  getLessonDetail,
  getMe,
  getMyStats,
  getNotebook,
  getNotebookReminders,
  getNotifications,
  getPackages,
  getPet,
  getPetVoice,
  getPracticeActivities,
  getRealtimeUrl,
  getStudyStreak,
  getSupportAdminProfile,
  getTickets,
  getTournamentDetail,
  getTournamentLeaderboard,
  getTournaments,
  getUserSettings,
  getVocabulary,
  getVocabularyBank,
  getVocabularyPracticeFeed,
  grantAdmin,
  joinGroupRoom,
  login,
  logout,
  markNotificationRead,
  moderateAdminCommunityPost,
  previewAdminLesson,
  publishAdminLearningContent,
  register,
  registerTournament,
  reactCommunityPost,
  reportCommunityPost,
  refundAdminPayment,
  replyAdminTicket,
  replaceAdminPackageCourses,
  resolveAdminCommunityReport,
  requestPasswordReset,
  searchCommunityUsers,
  sendDirectMessage,
  sendGlobalChatMessage,
  sendGroupRoomMessage,
  sendAdminNotification,
  sendPetVoice,
  startTournamentRoom,
  submitExam,
  submitPracticeActivity,
  submitTournament,
  shareCommunityPost,
  updateCommunityPost,
  updateAdminCollectionItem,
  updateAdminFeatureFlag,
  updateAdminSystemSetting,
  updateAdminTicketWorkflow,
  updateQuestionBankItem,
  updateLearningLanguage,
  updatePet,
  updateProfile,
  updateUserSettings,
  updateVocabularyBankPractice,
  updateVocabularyBankSelection,
} from "../api";
import { ADMIN_TEMPLATES, buildTemplatePayload } from "../adminTemplates";

const TOKEN_STORAGE_KEY = "vmora_access_token";
const PROFILE_AVATAR_STORAGE_PREFIX = "vmora_profile_avatar_";

function getStoredToken() {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
}

function saveStoredToken(token) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function getProfileAvatarStorageKey(userId) {
  return `${PROFILE_AVATAR_STORAGE_PREFIX}${userId}`;
}

function getStoredProfileAvatar(userId) {
  if (!userId) return "";
  return window.localStorage.getItem(getProfileAvatarStorageKey(userId)) ?? "";
}

function saveStoredProfileAvatar(userId, value) {
  if (!userId) return;
  window.localStorage.setItem(getProfileAvatarStorageKey(userId), value);
}

function clearStoredProfileAvatar(userId) {
  if (!userId) return;
  window.localStorage.removeItem(getProfileAvatarStorageKey(userId));
}

function getAdminItemId(item) {
  return item.id ?? item.code;
}

function normalizeAdminEditPayload(collection, item) {
  const payload = buildTemplatePayload(collection);
  const fields = ADMIN_TEMPLATES[collection]?.fields ?? [];

  fields.forEach((field) => {
    if (item[field.key] === undefined) return;
    payload[field.key] = item[field.key];
  });

  if (collection === "exams" && Array.isArray(payload.questions)) {
    payload.questions = payload.questions.map(({ id: _id, ...question }) => question);
  }

  return payload;
}

function normalizeAdminContactProfile(profile, currentUser = null) {
  if (!profile) return null;
  const isCurrentAdmin =
    currentUser?.is_admin &&
    (currentUser.email === profile.email || currentUser.public_user_id === profile.public_user_id);

  return {
    ...profile,
    avatar_url: isCurrentAdmin && currentUser.avatar_url ? currentUser.avatar_url : profile.avatar_url || "",
  };
}

export default function useVmoraApp() {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [apiStatus, setApiStatus] = useState("Đang kiểm tra backend...");
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
    pin: "",
    otpCode: "",
    newPassword: "",
  });
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [passwordResetStep, setPasswordResetStep] = useState("request");
  const [profileForm, setProfileForm] = useState({ fullName: "", phoneNumber: "", address: "", avatarUrl: "" });
  const [message, setMessage] = useState("");

  const [languages, setLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [vocabulary, setVocabulary] = useState([]);
  const [overview, setOverview] = useState(null);
  const [packages, setPackages] = useState([]);
  const [entitlements, setEntitlements] = useState([]);
  const [entitlementsLoaded, setEntitlementsLoaded] = useState(false);
  const [lessonDetail, setLessonDetail] = useState(null);

  const [practiceActivities, setPracticeActivities] = useState([]);
  const [practiceId, setPracticeId] = useState(null);
  const [practiceAnswers, setPracticeAnswers] = useState({});
  const [practiceResult, setPracticeResult] = useState(null);

  const [exams, setExams] = useState([]);
  const [examCertificate, setExamCertificate] = useState("");
  const [examDetail, setExamDetail] = useState(null);
  const [examAnswers, setExamAnswers] = useState({});
  const [examResult, setExamResult] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentId, setTournamentId] = useState(null);
  const [tournamentDetail, setTournamentDetail] = useState(null);
  const [tournamentAnswers, setTournamentAnswers] = useState({});
  const [tournamentResult, setTournamentResult] = useState(null);
  const [tournamentLeaderboard, setTournamentLeaderboard] = useState([]);

  const [stats, setStats] = useState(null);
  const [notebook, setNotebook] = useState([]);
  const [notebookReminders, setNotebookReminders] = useState([]);
  const [streak, setStreak] = useState(null);
  const [vocabularyBank, setVocabularyBank] = useState([]);
  const [vocabularyPracticeFeed, setVocabularyPracticeFeed] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [userSettings, setUserSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    themeMode: "light",
    backgroundCode: "default",
  });
  const [contactForm, setContactForm] = useState({
    title: "Liên hệ admin",
    content: "",
  });
  const [adminContactProfile, setAdminContactProfile] = useState(null);
  const [pet, setPet] = useState(null);
  const [petVoice, setPetVoice] = useState([]);
  const [petForm, setPetForm] = useState({
    name: "Mora",
    petType: "owl",
    colorTheme: "forest",
    voiceCode: "warm",
    message: "",
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [posts, setPosts] = useState([]);
  const [communityPostForm, setCommunityPostForm] = useState({ title: "", content: "", imageUrl: "" });
  const [communityCommentForms, setCommunityCommentForms] = useState({});
  const [editingCommunityPostId, setEditingCommunityPostId] = useState(null);
  const [communityPostEditForm, setCommunityPostEditForm] = useState({ title: "", content: "", imageUrl: "" });
  const [friends, setFriends] = useState([]);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState([]);
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [directMessages, setDirectMessages] = useState([]);
  const [directMessageText, setDirectMessageText] = useState("");
  const [groupRooms, setGroupRooms] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [globalChatMessages, setGlobalChatMessages] = useState([]);
  const [globalChatText, setGlobalChatText] = useState("");
  const [globalChatAttachment, setGlobalChatAttachment] = useState({ imageUrl: "", audioUrl: "", audioName: "" });
  const [groupForm, setGroupForm] = useState({ name: "Nhóm riêng", roomCode: "", passcode: "" });
  const [groupMessage, setGroupMessage] = useState("");
  const [groupMessageAttachment, setGroupMessageAttachment] = useState({ imageUrl: "", audioUrl: "", audioName: "" });

  const [adminDashboard, setAdminDashboard] = useState(null);
  const [adminArea, setAdminArea] = useState("dashboard");
  const [adminLessonPreview, setAdminLessonPreview] = useState(null);
  const [adminWorkspace, setAdminWorkspace] = useState({});
  const [adminSelectedUserId, setAdminSelectedUserId] = useState(null);
  const [adminUserDetail, setAdminUserDetail] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminTickets, setAdminTickets] = useState([]);
  const [adminTab, setAdminTab] = useState("languages");
  const [adminItems, setAdminItems] = useState([]);
  const [adminJson, setAdminJson] = useState(() => JSON.stringify(buildTemplatePayload("languages"), null, 2));
  const [adminEditingItem, setAdminEditingItem] = useState(null);
  const [adminSubmitting, setAdminSubmitting] = useState(false);

  const languageCode = user?.learning_language_code ?? selectedLanguage;
  const currentLanguageEntitlements = entitlements.filter(
    (item) => item.language_code === languageCode && item.status === "active",
  );
  const canOpenPractice = currentLanguageEntitlements.length > 0;
  const hasPaidPracticeAccess = currentLanguageEntitlements.some((item) => !item.is_free);
  const selectedPractice = practiceActivities.find((item) => item.id === practiceId);
  const [realtimeReconnectKey, setRealtimeReconnectKey] = useState(0);
  const realtimeReconnectAttemptRef = useRef(0);
  const realtimeContextRef = useRef({});
  const adminTabAreaMap = {
    dashboard: "dashboard",
    users: "users",
    languages: "learning-content",
    levels: "learning-content",
    roadmaps: "learning-content",
    stages: "learning-content",
    courses: "learning-content",
    sections: "learning-content",
    lessons: "learning-content",
    vocabulary: "learning-content",
    "learning-content": "learning-content",
    practice: "practice-exams",
    exams: "practice-exams",
    "practice-exams": "practice-exams",
    packages: "payments",
    payments: "payments",
    tickets: "support",
    support: "support",
    community: "community",
    system: "system",
  };

  realtimeContextRef.current = {
    adminArea,
    adminSelectedUserId,
    adminTab,
    examCertificate,
    isAdmin: user?.is_admin,
    languageCode,
    selectedFriendId,
    selectedGroupId,
    token,
    tournamentId,
  };

  async function loadAdminContactProfile(currentUser = user) {
    try {
      const payload = await getSupportAdminProfile();
      const nextProfile = normalizeAdminContactProfile(payload, currentUser);
      setAdminContactProfile(nextProfile);
      return nextProfile;
    } catch {
      setAdminContactProfile(null);
      return null;
    }
  }

  function refreshLeaderboardRealtime(targetLanguage = languageCode) {
    if (!targetLanguage) return;
    getLeaderboard(targetLanguage).then(setLeaderboard).catch(() => {});
    if (token) {
      getMyStats(token).then(setStats).catch(() => {});
    }
  }

  function refreshLearningRealtime(targetLanguage = languageCode) {
    if (!targetLanguage) return;
    getLearningOverview(targetLanguage, token).then(setOverview).catch(() => {});
    if (token) {
      getMyStats(token).then(setStats).catch(() => {});
      getPet(token).then(setPet).catch(() => {});
    }
  }

  function refreshTournamentRealtime(targetTournamentId = tournamentId) {
    if (!targetTournamentId) return;
    getTournamentDetail(targetTournamentId, token).then(setTournamentDetail).catch(() => {});
    getTournamentLeaderboard(targetTournamentId).then(setTournamentLeaderboard).catch(() => {});
    if (languageCode) {
      getTournaments(languageCode, token).then(setTournaments).catch(() => {});
    }
  }

  function refreshAdminRealtime(targetTab = adminTab, targetArea = null) {
    if (!token || !user?.is_admin) return;

    const area = targetArea || adminTabAreaMap[targetTab];

    if (adminArea === "dashboard" || targetTab === "dashboard") {
      getAdminDashboard(token).then(setAdminDashboard).catch(() => {});
    }

    if (targetTab === "users" || area === "users") {
      getAdminUsers(token).then(setAdminUsers).catch(() => {});
      if (adminArea === "users") {
        getAdminWorkspace(token, "users").then(setAdminWorkspace).catch(() => setAdminWorkspace({}));
        if (adminSelectedUserId) {
          getAdminUserDetail(token, adminSelectedUserId).then(setAdminUserDetail).catch(() => setAdminUserDetail(null));
        }
      }
      return;
    }

    if (targetTab === "tickets" || area === "support") {
      getAdminTickets(token).then(setAdminTickets).catch(() => {});
      if (adminArea === "support") {
        getAdminWorkspace(token, "support").then(setAdminWorkspace).catch(() => setAdminWorkspace({}));
      }
      return;
    }

    if (area && adminArea === area) {
      getAdminWorkspace(token, adminArea).then(setAdminWorkspace).catch(() => setAdminWorkspace({}));
    }

    if (targetTab && adminTab === targetTab && adminTabAreaMap[targetTab] && !["users", "tickets"].includes(targetTab)) {
      getAdminCollection(token, targetTab).then(setAdminItems).catch(() => {});
    }
  }

  useEffect(() => {
    getHealth()
      .then((data) => {
        setApiStatus(data.database === "connected" ? "Backend và PostgreSQL đã sẵn sàng" : "Backend chạy, DB chưa kết nối");
      })
      .catch(() => setApiStatus("Chưa kết nối backend"));
    getLanguages()
      .then((items) => {
        setLanguages(items);
      })
      .catch(() => setLanguages([]));
    loadAdminContactProfile();
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setUserSettings(null);
      return;
    }
    getMe(token)
      .then((payload) => {
        const localAvatar = getStoredProfileAvatar(payload.id);
        const avatarUrl = localAvatar || payload.avatar_url || "";
        const nextUser = { ...payload, avatar_url: avatarUrl };
        setUser(nextUser);
        setSelectedLanguage(payload.learning_language_code ?? "");
        setProfileForm({
          fullName: payload.full_name ?? "",
          phoneNumber: payload.phone_number ?? "",
          address: payload.address ?? "",
          avatarUrl,
        });
        loadAdminContactProfile(nextUser);
      })
      .catch(() => {
        clearStoredToken();
        setToken("");
      });
  }, [token]);

  useEffect(() => {
    if (!user?.id) return;
    if (profileForm.avatarUrl?.startsWith("data:")) {
      saveStoredProfileAvatar(user.id, profileForm.avatarUrl);
      return;
    }
    if (!profileForm.avatarUrl?.trim()) {
      clearStoredProfileAvatar(user.id);
    }
  }, [profileForm.avatarUrl, user?.id]);

  useEffect(() => {
    if (!languageCode) return;
    getVocabulary(languageCode, 12).then(setVocabulary).catch(() => setVocabulary([]));
    getLearningOverview(languageCode, token).then(setOverview).catch(() => setOverview(null));
    getPackages(languageCode).then(setPackages).catch(() => setPackages([]));
    if (token) {
      getPracticeActivities(languageCode, token)
        .then((items) => {
          setPracticeActivities(items);
          setPracticeId(items[0]?.id ?? null);
          setPracticeAnswers({});
          setPracticeResult(null);
        })
        .catch(() => setPracticeActivities([]));
    } else {
      setPracticeActivities([]);
      setPracticeId(null);
    }
    getExams(languageCode).then(setExams).catch(() => setExams([]));
    getTournaments(languageCode, token)
      .then((items) => {
        setTournaments(items);
        setTournamentId((current) => current ?? items[0]?.id ?? null);
      })
      .catch(() => {
        setTournaments([]);
        setTournamentId(null);
      });
    getLeaderboard(languageCode).then(setLeaderboard).catch(() => setLeaderboard([]));
    getCommunityPosts(languageCode, token).then(setPosts).catch(() => setPosts([]));
  }, [languageCode, token]);

  useEffect(() => {
    if (!languageCode) return;
    getExams(languageCode, examCertificate).then(setExams).catch(() => setExams([]));
    setExamDetail(null);
    setExamAnswers({});
    setExamResult(null);
  }, [languageCode, examCertificate]);

  useEffect(() => {
    if (!token || !user) {
      setEntitlementsLoaded(false);
      return;
    }
    setEntitlementsLoaded(false);
    getEntitlements(token)
      .then(setEntitlements)
      .catch(() => setEntitlements([]))
      .finally(() => setEntitlementsLoaded(true));
    getMyStats(token).then(setStats).catch(() => setStats(null));
    getNotebook(token).then(setNotebook).catch(() => setNotebook([]));
    getNotebookReminders(token).then(setNotebookReminders).catch(() => setNotebookReminders([]));
    getStudyStreak(token).then(setStreak).catch(() => setStreak(null));
    getVocabularyBank(token).then(setVocabularyBank).catch(() => setVocabularyBank([]));
    getVocabularyPracticeFeed(token).then(setVocabularyPracticeFeed).catch(() => setVocabularyPracticeFeed([]));
    getNotifications(token).then(setNotifications).catch(() => setNotifications([]));
    getTickets(token).then(setTickets).catch(() => setTickets([]));
    getUserSettings(token)
      .then((payload) => {
        setUserSettings(payload);
        setSettingsForm({
          themeMode: payload.theme_mode ?? "light",
          backgroundCode: payload.background_code ?? "default",
        });
      })
      .catch(() => setUserSettings(null));
    getPet(token).then(setPet).catch(() => setPet(null));
    getPetVoice(token).then(setPetVoice).catch(() => setPetVoice([]));
    getFriends(token).then(setFriends).catch(() => setFriends([]));
    getGroupRooms(token)
      .then((items) => {
        setGroupRooms(items);
        setSelectedGroupId((current) => current ?? items[0]?.id ?? null);
      })
      .catch(() => {
        setGroupRooms([]);
        setSelectedGroupId(null);
      });
    getGlobalChatMessages(token).then(setGlobalChatMessages).catch(() => setGlobalChatMessages([]));
  }, [token, user]);

  useEffect(() => {
    if (!pet) return;
    setPetForm((current) => ({
      ...current,
      name: pet.name ?? "Mora",
      petType: pet.pet_type ?? "owl",
      colorTheme: pet.color_theme ?? "forest",
      voiceCode: pet.voice_code ?? "warm",
    }));
  }, [pet]);

  useEffect(() => {
    if (!token || !selectedGroupId) {
      setGroupMessages([]);
      return;
    }
    getGroupRoomMessages(token, selectedGroupId).then(setGroupMessages).catch(() => setGroupMessages([]));
  }, [token, selectedGroupId]);

  useEffect(() => {
    if (!selectedFriendId && friends.length > 0) {
      setSelectedFriendId(friends[0].friend_user_id);
    }
  }, [friends, selectedFriendId]);

  useEffect(() => {
    if (!token || !selectedFriendId) {
      setDirectMessages([]);
      return;
    }
    getDirectMessages(token, selectedFriendId).then(setDirectMessages).catch(() => setDirectMessages([]));
  }, [token, selectedFriendId]);

  useEffect(() => {
    if (!tournamentId) {
      setTournamentDetail(null);
      setTournamentLeaderboard([]);
      return;
    }
    getTournamentDetail(tournamentId, token).then(setTournamentDetail).catch(() => setTournamentDetail(null));
    getTournamentLeaderboard(tournamentId).then(setTournamentLeaderboard).catch(() => setTournamentLeaderboard([]));
  }, [tournamentId, token]);

  useEffect(() => {
    if (!token || !user?.is_admin) return;
    getAdminDashboard(token).then(setAdminDashboard).catch(() => setAdminDashboard(null));
    getAdminUsers(token).then(setAdminUsers).catch(() => setAdminUsers([]));
    getAdminTickets(token).then(setAdminTickets).catch(() => setAdminTickets([]));
    getAdminCollection(token, adminTab).then(setAdminItems).catch(() => setAdminItems([]));
    getAdminWorkspace(token, adminArea).then(setAdminWorkspace).catch(() => setAdminWorkspace({}));
  }, [token, user?.is_admin, adminTab, adminArea]);

  useEffect(() => {
    if (!token || !user?.is_admin || !adminSelectedUserId) {
      setAdminUserDetail(null);
      return;
    }
    getAdminUserDetail(token, adminSelectedUserId).then(setAdminUserDetail).catch(() => setAdminUserDetail(null));
  }, [token, user?.is_admin, adminSelectedUserId]);

  useEffect(() => {
    if (!adminSelectedUserId && adminUsers.length > 0) {
      setAdminSelectedUserId(adminUsers[0].id);
    }
  }, [adminUsers, adminSelectedUserId]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = new WebSocket(getRealtimeUrl(token));
    let pingTimer = null;
    let reconnectTimer = null;
    let closedByCleanup = false;

    socket.onopen = () => {
      realtimeReconnectAttemptRef.current = 0;
      pingTimer = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ event: "system:ping", client_time: Date.now() }));
        }
      }, 25000);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const payload = message.payload ?? {};
        const realtimeContext = realtimeContextRef.current;
        const currentAdminArea = realtimeContext.adminArea;
        const currentAdminSelectedUserId = realtimeContext.adminSelectedUserId;
        const currentAdminTab = realtimeContext.adminTab;
        const currentExamCertificate = realtimeContext.examCertificate;
        const currentIsAdmin = realtimeContext.isAdmin;
        const currentLanguageCode = realtimeContext.languageCode;
        const currentSelectedGroupId = realtimeContext.selectedGroupId;
        const currentToken = realtimeContext.token || token;
        const currentTournamentId = realtimeContext.tournamentId;

        if (message.event === "system:pong" || message.event === "system:connected") {
          return;
        }

        if (message.event === "notification:new" && payload.notification) {
          setNotifications((current) => {
            const next = [payload.notification, ...current.filter((item) => item.id !== payload.notification.id)];
            return next;
          });
          return;
        }

        if (message.event === "notification:read" && payload.notification_id) {
          setNotifications((current) =>
            current.map((item) => (item.id === payload.notification_id ? { ...item, is_read: true } : item)),
          );
          return;
        }

        if (message.event === "group:message" && payload.room_id === currentSelectedGroupId && payload.message) {
          setGroupMessages((current) => {
            if (current.some((item) => item.id === payload.message.id)) return current;
            return [...current, payload.message];
          });
          return;
        }

        if (message.event === "global:message" && payload.message) {
          setGlobalChatMessages((current) => {
            if (current.some((item) => item.id === payload.message.id)) return current;
            return [...current, payload.message];
          });
          return;
        }

        if (message.event === "community:post:new" && payload.post) {
          if (!payload.language_code || payload.language_code === currentLanguageCode) {
            setPosts((current) => [payload.post, ...current.filter((item) => item.id !== payload.post.id)]);
          }
          return;
        }

        if (message.event === "community:post:update" && payload.post) {
          if (!payload.language_code || payload.language_code === currentLanguageCode) {
            setPosts((current) =>
              current.map((item) =>
                item.id === payload.post_id
                  ? {
                      ...item,
                      title: payload.post.title,
                      content: payload.post.content,
                      image_url: payload.post.image_url ?? null,
                    }
                  : item,
              ),
            );
          }
          return;
        }

        if (message.event === "community:comment:new" && payload.comment) {
          if (!payload.language_code || payload.language_code === currentLanguageCode) {
            setPosts((current) =>
              current.map((item) => {
                if (item.id !== payload.post_id) return item;
                const comments = item.comments ?? [];
                if (comments.some((comment) => comment.id === payload.comment.id)) return item;
                return { ...item, comments: [...comments, payload.comment] };
              }),
            );
          }
          return;
        }

        if (message.event === "community:reaction:update" && payload.summary) {
          if (!payload.language_code || payload.language_code === currentLanguageCode) {
            setPosts((current) =>
              current.map((item) =>
                item.id === payload.post_id
                  ? {
                      ...item,
                      reactions: payload.summary.reactions ?? {},
                      my_reaction: payload.summary.my_reaction ?? item.my_reaction ?? null,
                    }
                  : item,
              ),
            );
          }
          return;
        }

        if (message.event === "community:share:update" && payload.summary) {
          if (!payload.language_code || payload.language_code === currentLanguageCode) {
            setPosts((current) =>
              current.map((item) =>
                item.id === payload.post_id ? { ...item, share_count: payload.summary.share_count ?? item.share_count ?? 0 } : item,
              ),
            );
          }
          return;
        }

        if (message.event === "direct:message" && payload.message) {
          const targetFriendId = payload.friend_user_id;
          if (targetFriendId === realtimeContext.selectedFriendId) {
            setDirectMessages((current) => {
              if (current.some((item) => item.id === payload.message.id)) return current;
              return [...current, payload.message];
            });
          }
          return;
        }

        if (message.event === "community:post:removed" && payload.post_id) {
          if (!payload.language_code || payload.language_code === currentLanguageCode) {
            setPosts((current) => current.filter((item) => item.id !== payload.post_id));
          }
          return;
        }

        if (message.event === "notebook:update" && payload.entry) {
          setNotebook((current) => [payload.entry, ...current.filter((item) => item.id !== payload.entry.id)]);
          return;
        }

        if (message.event === "notebook:delete" && payload.entry_id) {
          setNotebook((current) => current.filter((item) => item.id !== payload.entry_id));
          return;
        }

        if (message.event === "notebook:reminder:update" && payload.reminder) {
          setNotebookReminders((current) => [payload.reminder, ...current.filter((item) => item.id !== payload.reminder.id)]);
          return;
        }

        if (message.event === "streak:update" && payload.streak) {
          setStreak(payload.streak);
          return;
        }

        if (message.event === "vocabulary-bank:update" && payload.item) {
          setVocabularyBank((current) => [payload.item, ...current.filter((item) => item.id !== payload.item.id)]);
          if (payload.item.is_in_practice) {
            setVocabularyPracticeFeed((current) => [payload.item, ...current.filter((item) => item.id !== payload.item.id)]);
          } else {
            setVocabularyPracticeFeed((current) => current.filter((item) => item.id !== payload.item.id));
          }
          return;
        }

        if (message.event === "vocabulary-bank:delete" && payload.item_id) {
          setVocabularyBank((current) => current.filter((item) => item.id !== payload.item_id));
          setVocabularyPracticeFeed((current) => current.filter((item) => item.id !== payload.item_id));
          return;
        }

        if (message.event === "leaderboard:update") {
          if (!payload.language_code || payload.language_code === currentLanguageCode) {
            refreshLeaderboardRealtime(payload.language_code || currentLanguageCode);
          }
          return;
        }

        if (message.event === "progress:update") {
          if (!payload.language_code || payload.language_code === currentLanguageCode) {
            refreshLearningRealtime(payload.language_code || currentLanguageCode);
          }
          return;
        }

        if (message.event === "practice:submitted") {
          if (!payload.language_code || payload.language_code === currentLanguageCode) {
            refreshLearningRealtime(payload.language_code || currentLanguageCode);
            getPracticeActivities(payload.language_code || currentLanguageCode, currentToken)
              .then(setPracticeActivities)
              .catch(() => {});
          }
          return;
        }

        if (message.event === "exam:submitted") {
          refreshLeaderboardRealtime(currentLanguageCode);
          getExams(currentLanguageCode, currentExamCertificate).then(setExams).catch(() => {});
          getPet(currentToken).then(setPet).catch(() => {});
          return;
        }

        if (message.event === "tournament:registered") {
          refreshTournamentRealtime(payload.tournament_id || currentTournamentId);
          return;
        }

        if (message.event === "tournament:room:update" || message.event === "tournament:room:started") {
          refreshTournamentRealtime(payload.tournament_id || currentTournamentId);
          return;
        }

        if (message.event === "tournament:submitted") {
          refreshTournamentRealtime(payload.tournament_id || currentTournamentId);
          refreshLeaderboardRealtime(currentLanguageCode);
          getPet(currentToken).then(setPet).catch(() => {});
          return;
        }

        if (message.event === "ticket:update" && payload.ticket) {
          setTickets((current) => [payload.ticket, ...current.filter((item) => item.id !== payload.ticket.id)]);
          return;
        }

        if (message.event === "settings:update" && payload.settings) {
          setUserSettings(payload.settings);
          setSettingsForm({
            themeMode: payload.settings.theme_mode ?? "light",
            backgroundCode: payload.settings.background_code ?? "default",
          });
          return;
        }

        if (message.event === "pet:update") {
          getPet(currentToken).then(setPet).catch(() => {});
          return;
        }

        if (message.event === "pet:voice" && Array.isArray(payload.messages)) {
          setPetVoice((current) => [...current, ...payload.messages.filter((item) => !current.some((existing) => existing.id === item.id))]);
          getPet(currentToken).then(setPet).catch(() => {});
          return;
        }

        if (message.event === "entitlement:update" || message.event === "payment:succeeded") {
          getEntitlements(currentToken).then(setEntitlements).catch(() => {});
          if (currentLanguageCode) {
            getLearningOverview(currentLanguageCode, currentToken).then(setOverview).catch(() => {});
            getPracticeActivities(currentLanguageCode, currentToken)
              .then((items) => {
                setPracticeActivities(items);
                setPracticeId((current) => current ?? items[0]?.id ?? null);
              })
              .catch(() => {});
          }
          setMessage(message.event === "payment:succeeded" ? "Thanh toán đã xác nhận, quyền học đã mở." : "Quyền học đã cập nhật.");
          return;
        }

        if (message.event === "content:update") {
          if (!payload.language_code || payload.language_code === currentLanguageCode) {
            getLanguages().then(setLanguages).catch(() => {});
            if (currentLanguageCode) {
              getLearningOverview(currentLanguageCode, currentToken).then(setOverview).catch(() => {});
              getPackages(currentLanguageCode).then(setPackages).catch(() => {});
              getExams(currentLanguageCode, currentExamCertificate).then(setExams).catch(() => {});
              getVocabulary(currentLanguageCode, 12).then(setVocabulary).catch(() => {});
              if (currentToken) {
                getPracticeActivities(currentLanguageCode, currentToken).then(setPracticeActivities).catch(() => {});
              }
            }
          }
          return;
        }

        if (message.event === "admin:refresh" && currentIsAdmin) {
          const targetTab = payload.tab || null;
          const targetArea = payload.area || adminTabAreaMap[targetTab];

          if (currentAdminArea === "dashboard" || targetTab === "dashboard") {
            getAdminDashboard(currentToken).then(setAdminDashboard).catch(() => {});
          }

          if (targetTab === "users" || targetArea === "users") {
            getAdminUsers(currentToken).then(setAdminUsers).catch(() => {});
            if (currentAdminArea === "users") {
              getAdminWorkspace(currentToken, "users").then(setAdminWorkspace).catch(() => {});
              if (currentAdminSelectedUserId) {
                getAdminUserDetail(currentToken, currentAdminSelectedUserId).then(setAdminUserDetail).catch(() => {});
              }
            }
            return;
          }

          if (targetTab === "tickets" || targetArea === "support") {
            getAdminTickets(currentToken).then(setAdminTickets).catch(() => {});
            if (currentAdminArea === "support") {
              getAdminWorkspace(currentToken, "support").then(setAdminWorkspace).catch(() => {});
            }
            return;
          }

          if (targetArea && currentAdminArea === targetArea) {
            getAdminWorkspace(currentToken, currentAdminArea).then(setAdminWorkspace).catch(() => {});
          }

          if (targetTab && currentAdminTab === targetTab && adminTabAreaMap[targetTab] && !["users", "tickets"].includes(targetTab)) {
            getAdminCollection(currentToken, currentAdminTab).then(setAdminItems).catch(() => {});
          }
          return;
        }

        if (message.event === "system:broadcast") {
          setMessage(payload.title ? `${payload.title}: ${payload.content ?? ""}` : "Có thông báo hệ thống mới.");
          getNotifications(currentToken).then(setNotifications).catch(() => {});
          return;
        }

        if (message.event === "tournament:leaderboard:update" && payload.tournament_id === currentTournamentId) {
          refreshTournamentRealtime(currentTournamentId);
        }
      } catch {
        // Ignore malformed realtime events.
      }
    };

    socket.onerror = () => {
      if (socket.readyState !== WebSocket.CLOSED) {
        socket.close();
      }
    };

    socket.onclose = () => {
      if (pingTimer) window.clearInterval(pingTimer);
      if (closedByCleanup) return;
      const delay = Math.min(30000, 1000 * 2 ** Math.min(realtimeReconnectAttemptRef.current, 5));
      realtimeReconnectAttemptRef.current += 1;
      reconnectTimer = window.setTimeout(() => {
        setRealtimeReconnectKey((current) => current + 1);
      }, delay);
    };

    return () => {
      closedByCleanup = true;
      if (pingTimer) window.clearInterval(pingTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket.close();
    };
  }, [token, realtimeReconnectKey]);

  useEffect(() => {
    setAdminEditingItem(null);
    setAdminJson(JSON.stringify(buildTemplatePayload(adminTab), null, 2));
  }, [adminTab]);

  function changeAuthMode(mode) {
    setAuthMode(mode);
    setAuthError("");
    setAuthMessage("");
    if (mode !== "forgot") {
      setPasswordResetStep("request");
    }
  }

  async function authSubmit(event) {
    event.preventDefault();
    setAuthSubmitting(true);
    setAuthError("");
    setAuthMessage("");
    try {
      if (authMode === "forgot") {
        if (passwordResetStep === "request") {
          const payload = await requestPasswordReset({ email: authForm.email, pin: authForm.pin });
          setPasswordResetStep("confirm");
          setAuthForm((current) => ({ ...current, otpCode: payload.dev_otp ?? "" }));
          setAuthMessage(
            payload.dev_otp
              ? `${payload.message} OTP test: ${payload.dev_otp}`
              : payload.message,
          );
          return;
        }

        const payload = await confirmPasswordReset({
          email: authForm.email,
          otp_code: authForm.otpCode,
          new_password: authForm.newPassword,
        });
        setAuthForm({ email: authForm.email, password: "", pin: "", otpCode: "", newPassword: "" });
        setPasswordResetStep("request");
        setAuthMode("login");
        setAuthMessage(payload.message);
        return;
      }

      if (authMode === "register") {
        const payload = await register({ email: authForm.email, password: authForm.password, pin: authForm.pin });
        setAuthForm({ email: authForm.email, password: "", pin: "", otpCode: "", newPassword: "" });
        setAuthMode("login");
        setAuthMessage(payload.message);
        setAuthError("");
        return;
      }

      const payload = await login({ email: authForm.email, password: authForm.password });
      saveStoredToken(payload.access_token);
      setToken(payload.access_token);
      setAuthForm({ email: "", password: "", pin: "", otpCode: "", newPassword: "" });
      setAuthError("");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function doLogout() {
    try {
      if (token) await logout(token);
    } catch {
      // Local logout still clears browser state.
    }
    clearStoredToken();
    setToken("");
    setUser(null);
  }

  async function saveProfile(event) {
    event.preventDefault();
    const localAvatar = profileForm.avatarUrl?.startsWith("data:") ? profileForm.avatarUrl : "";
    const remoteAvatar =
      profileForm.avatarUrl && !profileForm.avatarUrl.startsWith("data:")
        ? profileForm.avatarUrl
        : user?.avatar_url && !user.avatar_url.startsWith("data:")
          ? user.avatar_url
          : null;
    const payload = await updateProfile(token, {
      full_name: profileForm.fullName || null,
      phone_number: profileForm.phoneNumber || null,
      address: profileForm.address || null,
      avatar_url: remoteAvatar || null,
    });
    if (localAvatar) {
      saveStoredProfileAvatar(payload.id, localAvatar);
    } else if (!remoteAvatar) {
      clearStoredProfileAvatar(payload.id);
    }
    const nextUser = { ...payload, avatar_url: localAvatar || payload.avatar_url || "" };
    setUser(nextUser);
    if (nextUser.is_admin) {
      loadAdminContactProfile(nextUser);
    }
    setMessage("Đã lưu hồ sơ");
  }

  async function changeLanguage(event) {
    setSelectedLanguage(event.target.value);
    if (token) {
      const payload = await updateLearningLanguage(token, event.target.value);
      setUser(payload);
    }
  }

  async function packageAction(item) {
    if (!token) {
      setMessage("Bạn cần đăng nhập.");
      return { ok: false };
    }
    if (item.is_free) {
      await activateFreePackage(token, item.id);
      const nextEntitlements = await getEntitlements(token).catch(() => null);
      if (nextEntitlements) {
        setEntitlements(nextEntitlements);
      }
      setEntitlementsLoaded(true);
      if (languageCode) {
        const nextOverview = await getLearningOverview(languageCode, token).catch(() => null);
        const nextPracticeActivities = await getPracticeActivities(languageCode, token).catch(() => null);
        if (nextOverview) {
          setOverview(nextOverview);
        }
        if (nextPracticeActivities) {
          setPracticeActivities(nextPracticeActivities);
        }
      }
      setMessage("Đã kích hoạt gói free.");
      return { ok: true, redirectToPractice: true };
    }
    const payment = await createMomoPayment(token, item.id);
    const externalUrl = payment.pay_url || payment.deeplink || payment.qr_code_url || "";
    const isSucceeded = payment.status === "succeeded";
    if (isSucceeded) {
      const nextEntitlements = await getEntitlements(token).catch(() => null);
      if (nextEntitlements) {
        setEntitlements(nextEntitlements);
      }
      setEntitlementsLoaded(true);
      if (languageCode) {
        const nextOverview = await getLearningOverview(languageCode, token).catch(() => null);
        const nextPracticeActivities = await getPracticeActivities(languageCode, token).catch(() => null);
        if (nextOverview) {
          setOverview(nextOverview);
        }
        if (nextPracticeActivities) {
          setPracticeActivities(nextPracticeActivities);
        }
      }
    }
    setMessage(isSucceeded ? "Đã mở gói mua, vào ôn luyện." : "Đã tạo giao dịch MoMo.");
    if (isSucceeded) return { ok: true, redirectToPractice: true };
    if (externalUrl) return { ok: true, externalUrl };
    return { ok: true };
  }

  async function openLesson(item) {
    setLessonDetail(await getLessonDetail(item.id, token));
  }

  async function finishLesson() {
    const result = await completeLesson(lessonDetail.id, token);
    setLessonDetail((current) => (current ? { ...current, is_completed: true } : current));
    setMessage("Đã hoàn thành bài học.");
    refreshLearningRealtime(languageCode);
    return result;
  }

  async function submitPractice(activityOverride = selectedPractice) {
    if (!activityOverride) return;
    const body =
      activityOverride.activity_type === "matching"
        ? { pairs: practiceAnswers.pairs ?? {} }
        : activityOverride.activity_type === "mixed"
          ? { items: practiceAnswers.mixed ?? {} }
          : ["typing", "audio", "voice"].includes(activityOverride.activity_type)
            ? { text: practiceAnswers.text ?? "" }
            : activityOverride.activity_type === "video"
              ? { completed: true }
              : activityOverride.activity_type === "flashcard"
                ? { revealed: true }
                : { option_id: practiceAnswers.option_id ?? null };
    const result = await submitPracticeActivity(activityOverride.id, body, token);
    setPracticeResult(result);
    refreshLearningRealtime(activityOverride.language_code);
  }

  async function submitPracticeAnswers(activity, answers) {
    if (!activity) return null;
    const result = await submitPracticeActivity(activity.id, answers, token);
    setPracticeResult(result);
    refreshLearningRealtime(activity.language_code);
    return result;
  }

  async function openExam(item) {
    setExamDetail(await getExamDetail(item.id));
    setExamAnswers({});
    setExamResult(null);
  }

  async function finishExam() {
    const result = await submitExam(examDetail.id, examAnswers, token);
    setExamResult(result);
    refreshLeaderboardRealtime(languageCode);
  }

  async function openTournament(id) {
    setTournamentId(id);
    setTournamentAnswers({});
    setTournamentResult(null);
  }

  async function joinTournament(item) {
    if (!token) return;
    const result = await registerTournament(token, item.id);
    setTournamentId(item.id);
    setTournamentAnswers({});
    setTournamentResult(null);
    setMessage(result.message);
    refreshTournamentRealtime(item.id);
    return result;
  }

  async function openTournamentRoom(item) {
    if (!token || !item) return;
    const result = await startTournamentRoom(token, item.id);
    setMessage(result.message);
    refreshTournamentRealtime(item.id);
    return result;
  }

  async function finishTournament(tournamentOverrideId = null) {
    const targetTournamentId = tournamentOverrideId ?? tournamentDetail?.id ?? tournamentId;
    if (!token || !targetTournamentId) {
      setMessage("Bạn cần đăng nhập và chọn giải đấu trước khi nộp bài.");
      return null;
    }
    try {
      const result = await submitTournament(token, targetTournamentId, tournamentAnswers);
      setTournamentResult(result);
      setMessage(`Đã nộp bài: ${result.score_percent}% - hạng #${result.rank ?? "-"}.`);
      refreshTournamentRealtime(targetTournamentId);
      refreshLeaderboardRealtime(languageCode);
      return result;
    } catch (error) {
      setMessage(error.message || "Không nộp được bài, bạn thử lại giúp mình.");
      return null;
    }
  }

  async function quickCreate(type) {
    if (!token) return;
    if (type === "note") {
      await createNotebook(token, { title: "Ghi chú mới", content: "Nội dung mẫu", tag: languageCode });
    }
    if (type === "reminder") {
      const remindAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await createNotebookReminder(token, { title: "Nhắc học hôm nay", remind_at: remindAt });
    }
    if (type === "bank") {
      await createVocabularyBankItem(token, {
        language_code: languageCode,
        word: vocabulary[0]?.word ?? "sample",
        meaning: vocabulary[0]?.meaning_vi || vocabulary[0]?.meaning_en || "sample",
        note: "Lưu nhanh",
        level_code: "basic",
      });
    }
    if (type === "ticket") {
      await createTicket(token, { title: "Cần hỗ trợ", content: "Nhờ admin kiểm tra giúp mình." });
    }
    if (type === "post") {
      await createCommunityPost(token, { title: "Bài đăng mới", content: "Mình đang ôn bài hôm nay.", language_code: languageCode });
    }
  }

  function setCommunityCommentDraft(postId, value) {
    setCommunityCommentForms((current) => ({ ...current, [postId]: value }));
  }

  function fillCommunityEditForm(post) {
    setEditingCommunityPostId(post.id);
    setCommunityPostEditForm({
      title: post.title ?? "",
      content: post.content ?? "",
      imageUrl: post.image_url ?? "",
    });
  }

  function cancelCommunityPostEdit() {
    setEditingCommunityPostId(null);
    setCommunityPostEditForm({ title: "", content: "", imageUrl: "" });
  }

  async function uploadCommunityPostImage(file) {
    if (!file) {
      setCommunityPostForm((current) => ({ ...current, imageUrl: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCommunityPostForm((current) => ({ ...current, imageUrl: typeof reader.result === "string" ? reader.result : "" }));
    };
    reader.readAsDataURL(file);
  }

  async function uploadCommunityPostEditImage(file) {
    if (!file) {
      setCommunityPostEditForm((current) => ({ ...current, imageUrl: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCommunityPostEditForm((current) => ({ ...current, imageUrl: typeof reader.result === "string" ? reader.result : "" }));
    };
    reader.readAsDataURL(file);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Không đọc được file"));
      reader.readAsDataURL(file);
    });
  }

  async function uploadGroupChatAttachment(file) {
    if (!file) {
      setGroupMessageAttachment({ imageUrl: "", audioUrl: "", audioName: "" });
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    if (file.type.startsWith("image/")) {
      setGroupMessageAttachment({ imageUrl: dataUrl, audioUrl: "", audioName: "" });
      return;
    }
    if (file.type.startsWith("audio/")) {
      setGroupMessageAttachment({ imageUrl: "", audioUrl: dataUrl, audioName: file.name || "voice-message" });
    }
  }

  async function uploadGlobalChatAttachment(file) {
    if (!file) {
      setGlobalChatAttachment({ imageUrl: "", audioUrl: "", audioName: "" });
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    if (file.type.startsWith("image/")) {
      setGlobalChatAttachment({ imageUrl: dataUrl, audioUrl: "", audioName: "" });
      return;
    }
    if (file.type.startsWith("audio/")) {
      setGlobalChatAttachment({ imageUrl: "", audioUrl: dataUrl, audioName: file.name || "voice-message" });
    }
  }

  async function submitCommunityPost(event) {
    event?.preventDefault?.();
    if (!token || !communityPostForm.content.trim()) return;
    const post = await createCommunityPost(token, {
      title: communityPostForm.title.trim() || "Bài đăng mới",
      content: communityPostForm.content.trim(),
      language_code: languageCode || null,
      image_url: communityPostForm.imageUrl || null,
    });
    setPosts((current) => [post, ...current.filter((item) => item.id !== post.id)]);
    setCommunityPostForm({ title: "", content: "", imageUrl: "" });
    setMessage("Đã đăng bài vào cộng đồng.");
  }

  async function saveCommunityPostEdit(postId) {
    if (!token || !communityPostEditForm.content.trim()) return;
    const post = await updateCommunityPost(token, postId, {
      title: communityPostEditForm.title.trim() || "Bài đăng mới",
      content: communityPostEditForm.content.trim(),
      image_url: communityPostEditForm.imageUrl || null,
    });
    setPosts((current) => current.map((item) => (item.id === postId ? { ...item, ...post } : item)));
    cancelCommunityPostEdit();
    setMessage("Đã cập nhật bài viết.");
  }

  async function removeCommunityPost(postId) {
    if (!token) return;
    await deleteCommunityPost(token, postId);
    setPosts((current) => current.filter((item) => item.id !== postId));
    if (editingCommunityPostId === postId) {
      cancelCommunityPostEdit();
    }
    setMessage("Đã xóa bài viết.");
  }

  async function submitCommunityComment(postId) {
    const content = (communityCommentForms[postId] || "").trim();
    if (!token || !content) return;
    const comment = await createCommunityComment(token, postId, { content });
    setPosts((current) =>
      current.map((item) =>
        item.id === postId ? { ...item, comments: [...(item.comments ?? []), comment] } : item,
      ),
    );
    setCommunityCommentForms((current) => ({ ...current, [postId]: "" }));
  }

  async function reactPost(postId, reactionType) {
    if (!token) return;
    const summary = await reactCommunityPost(token, postId, reactionType);
    setPosts((current) =>
      current.map((item) =>
        item.id === postId ? { ...item, reactions: summary.reactions ?? {}, my_reaction: summary.my_reaction ?? null } : item,
      ),
    );
  }

  async function sharePost(postId) {
    if (!token) return;
    const summary = await shareCommunityPost(token, postId);
    setPosts((current) =>
      current.map((item) => (item.id === postId ? { ...item, share_count: summary.share_count ?? item.share_count ?? 0 } : item)),
    );
    setMessage("Đã chia sẻ bài viết.");
  }

  async function reportPost(postId, reason = "Người dùng báo cáo nội dung vi phạm.") {
    if (!token) {
      setMessage("Bạn cần đăng nhập để báo cáo vi phạm.");
      return;
    }
    await reportCommunityPost(token, postId, { reason });
    setMessage("Đã gửi báo cáo vi phạm cho admin cộng đồng.");
  }

  async function createContactTicket(event) {
    event.preventDefault();
    if (!token || !contactForm.content.trim()) return;
    const ticket = await createTicket(token, {
      title: contactForm.title.trim() || "Liên hệ admin",
      content: contactForm.content.trim(),
    });
    setTickets((current) => [ticket, ...current.filter((item) => item.id !== ticket.id)]);
    setContactForm((current) => ({ ...current, content: "" }));
    setMessage("Đã gửi liên hệ tới admin.");
  }

  async function saveUserSettings(event) {
    event.preventDefault();
    if (!token) return;
    const payload = await updateUserSettings(token, {
      theme_mode: settingsForm.themeMode,
      background_code: settingsForm.backgroundCode,
    });
    setUserSettings(payload);
    setSettingsForm({
      themeMode: payload.theme_mode ?? "light",
      backgroundCode: payload.background_code ?? "default",
    });
    setMessage("Đã lưu cài đặt.");
  }

  async function renamePet() {
    if (!token) return;
    await updatePet(token, {
      name: petForm.name || "Mora",
      pet_type: petForm.petType || "owl",
      color_theme: petForm.colorTheme || "forest",
      voice_code: petForm.voiceCode || "warm",
    });
    getPet(token).then(setPet).catch(() => {});
  }

  async function savePetConfig() {
    await renamePet();
  }

  async function sendVoiceToPet() {
    if (!token || !petForm.message.trim()) return;
    await sendPetVoice(token, { message: petForm.message.trim() });
    setPetForm((current) => ({ ...current, message: "" }));
  }

  async function addReminderQuick() {
    if (!token) return;
    await quickCreate("reminder");
  }

  async function completeReminder(id) {
    await completeNotebookReminder(token, id);
  }

  async function keepStudyStreak() {
    await checkInStudyStreak(token);
  }

  async function toggleVocabularySelection(item) {
    await updateVocabularyBankSelection(token, item.id, !item.is_selected);
  }

  async function pushVocabularyToPractice(item) {
    await updateVocabularyBankPractice(token, item.id, !item.is_in_practice);
  }

  async function searchFriendProfiles(event) {
    event?.preventDefault?.();
    if (!token || !friendSearchQuery.trim()) {
      setFriendSearchResults([]);
      return;
    }
    const results = await searchCommunityUsers(token, friendSearchQuery.trim());
    setFriendSearchResults(results);
    setMessage(results.length ? `Tìm thấy ${results.length} hồ sơ.` : "Không tìm thấy hồ sơ phù hợp.");
  }

  async function addFriendProfile(profile) {
    if (!token || !profile?.id) return;
    const friend = await addFriend(token, profile.id);
    setFriends((current) => [friend, ...current.filter((item) => item.friend_user_id !== friend.friend_user_id)]);
    setFriendSearchResults((current) => current.filter((item) => item.id !== profile.id));
    setMessage(`Đã kết bạn với ${friend.friend_name || friend.friend_email}.`);
  }

  async function addQuickFriend() {
    if (friendSearchResults[0]) {
      await addFriendProfile(friendSearchResults[0]);
      return;
    }
    await searchFriendProfiles();
  }

  async function createPrivateGroup() {
    if (!token || !groupForm.passcode.trim()) return;
    const room = await createGroupRoom(token, {
      name: groupForm.name.trim() || "Nhóm riêng",
      passcode: groupForm.passcode.trim(),
    });
    setGroupForm((current) => ({ ...current, roomCode: room.room_code }));
    setSelectedGroupId(room.id);
    setGroupRooms((current) => [room, ...current.filter((item) => item.id !== room.id)]);
  }

  async function joinPrivateGroup() {
    if (!token || !groupForm.roomCode.trim() || !groupForm.passcode.trim()) return;
    const room = await joinGroupRoom(token, {
      room_code: groupForm.roomCode.trim().toUpperCase(),
      passcode: groupForm.passcode.trim(),
    });
    setSelectedGroupId(room.id);
    setGroupRooms((current) => [room, ...current.filter((item) => item.id !== room.id)]);
  }

  async function sendPrivateGroupMessage() {
    const content = groupMessage.trim();
    if (!token || !selectedGroupId) return;
    if (!content && !groupMessageAttachment.imageUrl && !groupMessageAttachment.audioUrl) return;
    await sendGroupRoomMessage(token, selectedGroupId, {
      content,
      image_url: groupMessageAttachment.imageUrl || null,
      audio_url: groupMessageAttachment.audioUrl || null,
      audio_name: groupMessageAttachment.audioName || null,
    });
    setGroupMessage("");
    setGroupMessageAttachment({ imageUrl: "", audioUrl: "", audioName: "" });
  }

  async function sendGlobalMessage() {
    const content = globalChatText.trim();
    if (!token) return;
    if (!content && !globalChatAttachment.imageUrl && !globalChatAttachment.audioUrl) return;
    const message = await sendGlobalChatMessage(token, {
      content,
      image_url: globalChatAttachment.imageUrl || null,
      audio_url: globalChatAttachment.audioUrl || null,
      audio_name: globalChatAttachment.audioName || null,
    });
    setGlobalChatMessages((current) => {
      if (current.some((item) => item.id === message.id)) return current;
      return [...current, message];
    });
    setGlobalChatText("");
    setGlobalChatAttachment({ imageUrl: "", audioUrl: "", audioName: "" });
  }

  async function sendFriendMessage() {
    if (!token || !selectedFriendId || !directMessageText.trim()) return;
    const message = await sendDirectMessage(token, selectedFriendId, { content: directMessageText.trim() });
    setDirectMessages((current) => [...current, message]);
    setDirectMessageText("");
  }

  async function markRead(id) {
    await markNotificationRead(token, id);
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
  }

  function startAdminEdit(item) {
    setAdminEditingItem(item);
    setAdminJson(JSON.stringify(normalizeAdminEditPayload(adminTab, item), null, 2));
  }

  function cancelAdminEdit() {
    setAdminEditingItem(null);
    setAdminJson(JSON.stringify(buildTemplatePayload(adminTab), null, 2));
  }

  async function createAdminItem(event) {
    event.preventDefault();
    setAdminSubmitting(true);
    try {
      const payload = JSON.parse(adminJson);
      if (adminEditingItem) {
        await updateAdminCollectionItem(token, adminTab, getAdminItemId(adminEditingItem), payload);
        setMessage(`Đã cập nhật ${ADMIN_TEMPLATES[adminTab]?.label?.toLowerCase() ?? "dữ liệu"}.`);
      } else {
        await createAdminCollectionItem(token, adminTab, payload);
        setMessage(`Đã tạo ${ADMIN_TEMPLATES[adminTab]?.label?.toLowerCase() ?? "dữ liệu"}.`);
      }
      cancelAdminEdit();
      refreshAdminRealtime(adminTab);
    } finally {
      setAdminSubmitting(false);
    }
  }

  async function removeAdminItem(item) {
    await deleteAdminCollectionItem(token, adminTab, getAdminItemId(item));
    if (adminEditingItem && getAdminItemId(adminEditingItem) === getAdminItemId(item)) {
      cancelAdminEdit();
    }
    setAdminItems((current) => current.filter((entry) => getAdminItemId(entry) !== getAdminItemId(item)));
    refreshAdminRealtime(adminTab);
  }

  async function makeAdmin(id) {
    await grantAdmin(token, id);
    refreshAdminRealtime("users");
  }

  async function answerTicket(id) {
    await replyAdminTicket(token, id, {
      status: "answered",
      admin_reply: "Admin đã tiếp nhận và xử lý ticket.",
    });
    refreshAdminRealtime("tickets");
  }

  async function sendBroadcast() {
    await broadcastNotification(token, {
      title: "Thông báo hệ thống",
      content: "Hệ thống vừa được cập nhật module mới.",
    });
    refreshAdminRealtime(adminTab);
  }

  async function selectAdminUser(userId) {
    setAdminArea("users");
    setAdminSelectedUserId(userId);
    if (!token) return;
    const detail = await getAdminUserDetail(token, userId);
    setAdminUserDetail(detail);
  }

  async function lockAdminUser(userId) {
    await adminLockUser(token, userId);
    refreshAdminRealtime("users");
    if (adminSelectedUserId === userId) getAdminUserDetail(token, userId).then(setAdminUserDetail).catch(() => {});
  }

  async function unlockAdminUser(userId) {
    await adminUnlockUser(token, userId);
    refreshAdminRealtime("users");
    if (adminSelectedUserId === userId) getAdminUserDetail(token, userId).then(setAdminUserDetail).catch(() => {});
  }

  async function verifyAdminUser(userId) {
    await adminVerifyUser(token, userId);
    refreshAdminRealtime("users");
    if (adminSelectedUserId === userId) getAdminUserDetail(token, userId).then(setAdminUserDetail).catch(() => {});
  }

  async function resetAdminUserPassword(userId) {
    const payload = await adminResetUserPassword(token, userId);
    setMessage(`Mật khẩu tạm: ${payload.temporary_password}`);
    refreshAdminRealtime("users");
  }

  async function saveAdminPackageCourses(packageId, courseIds) {
    await replaceAdminPackageCourses(token, packageId, courseIds);
    setMessage("Đã cập nhật khóa học cho gói.");
    refreshAdminRealtime(adminTab);
  }

  async function confirmPaymentAdmin(paymentId) {
    await confirmAdminPayment(token, paymentId);
    setMessage("Đã xác nhận thanh toán.");
    refreshAdminRealtime(adminTab);
  }

  async function cancelPaymentAdmin(paymentId) {
    await cancelAdminPayment(token, paymentId);
    setMessage("Đã hủy giao dịch.");
    refreshAdminRealtime(adminTab);
  }

  async function refundPaymentAdmin(paymentId) {
    await refundAdminPayment(token, paymentId);
    setMessage("Đã hoàn tiền giao dịch.");
    refreshAdminRealtime(adminTab);
  }

  async function createAdminEntitlement(payload) {
    await createManualAdminEntitlement(token, payload);
    setMessage("Đã kích hoạt quyền học thủ công.");
    refreshAdminRealtime(adminTab);
  }

  async function extendUserEntitlement(entitlementId, extendDays = 30) {
    await extendAdminEntitlement(token, entitlementId, extendDays);
    setMessage("Đã gia hạn quyền học.");
    refreshAdminRealtime(adminTab);
  }

  async function updateSupportWorkflow(ticketId, payload) {
    await updateAdminTicketWorkflow(token, ticketId, payload);
    setMessage("Đã cập nhật hỗ trợ.");
    refreshAdminRealtime(adminTab);
  }

  async function moderateCommunityPost(postId, payload) {
    await moderateAdminCommunityPost(token, postId, payload);
    setMessage("Đã xử lý nội dung cộng đồng.");
    refreshAdminRealtime(adminTab);
  }

  async function resolveCommunityReport(reportId, payload) {
    await resolveAdminCommunityReport(token, reportId, payload);
    setMessage("Đã cập nhật báo cáo.");
    refreshAdminRealtime(adminTab);
  }

  async function toggleAdminFeature(code, isEnabled) {
    await updateAdminFeatureFlag(token, code, isEnabled);
    setMessage("Đã cập nhật cờ tính năng.");
    refreshAdminRealtime(adminTab);
  }

  async function saveAdminSystemSetting(key, payload) {
    await updateAdminSystemSetting(token, key, payload);
    setMessage("Đã lưu cài đặt hệ thống.");
    refreshAdminRealtime(adminTab);
  }

  async function previewLearningLesson(lessonId) {
    const payload = await previewAdminLesson(token, lessonId);
    setAdminLessonPreview(payload);
  }

  async function publishLearningContent(itemType, itemId, isPublished) {
    await publishAdminLearningContent(token, itemType, itemId, isPublished);
    setMessage(isPublished ? "Đã xuất bản học liệu." : "Đã ẩn học liệu.");
    refreshAdminRealtime(adminTab);
  }

  async function createAdminQuestion(payload) {
    await createQuestionBankItem(token, payload);
    setMessage("Đã tạo câu hỏi trong ngân hàng câu hỏi.");
    refreshAdminRealtime(adminTab);
  }

  async function updateAdminQuestion(itemId, payload) {
    await updateQuestionBankItem(token, itemId, payload);
    setMessage("Đã cập nhật câu hỏi.");
    refreshAdminRealtime(adminTab);
  }

  async function deleteAdminQuestion(itemId) {
    await deleteQuestionBankItem(token, itemId);
    setMessage("Đã xóa câu hỏi.");
    refreshAdminRealtime(adminTab);
  }

  async function buildPracticeFromBank(payload) {
    await buildPracticeFromQuestionBank(token, payload);
    setMessage("Đã tạo bộ ôn luyện từ ngân hàng câu hỏi.");
    refreshAdminRealtime(adminTab);
  }

  async function buildExamFromBank(payload) {
    await buildExamFromQuestionBank(token, payload);
    setMessage("Đã tạo đề thi từ ngân hàng câu hỏi.");
    refreshAdminRealtime(adminTab);
  }

  async function sendTargetedNotification(payload) {
    await sendAdminNotification(token, payload);
    setMessage("Đã gửi thông báo vào hộp thư.");
    refreshAdminRealtime(adminTab);
  }

  return {
    addQuickFriend,
    addReminderQuick,
    adminArea,
    adminContactProfile,
    adminDashboard,
    adminEditingItem,
    adminItems,
    adminJson,
    adminLessonPreview,
    adminSelectedUserId,
    adminSubmitting,
    adminTab,
    adminTickets,
    adminUserDetail,
    adminUsers,
    adminWorkspace,
    apiStatus,
    authError,
    authForm,
    authMessage,
    authMode,
    authSubmit,
    authSubmitting,
    buildExamFromBank,
    buildPracticeFromBank,
    cancelPaymentAdmin,
    canOpenPractice,
    cancelAdminEdit,
    changeAuthMode,
    changeLanguage,
    completeReminder,
    confirmPaymentAdmin,
    createPrivateGroup,
    createAdminItem,
    createAdminEntitlement,
    createAdminQuestion,
    createContactTicket,
    communityCommentForms,
    communityPostEditForm,
    communityPostForm,
    cancelCommunityPostEdit,
    currentLanguageEntitlements,
    contactForm,
    directMessages,
    directMessageText,
    doLogout,
    deleteAdminQuestion,
    entitlements,
    entitlementsLoaded,
    examCertificate,
    examAnswers,
    examDetail,
    examResult,
    exams,
    finishExam,
    finishTournament,
    finishLesson,
    friends,
    friendSearchQuery,
    friendSearchResults,
    globalChatMessages,
    globalChatAttachment,
    globalChatText,
    fillCommunityEditForm,
    groupForm,
    groupMessage,
    groupMessageAttachment,
    groupMessages,
    groupRooms,
    hasPaidPracticeAccess,
    joinPrivateGroup,
    joinTournament,
    keepStudyStreak,
    languageCode,
    languages,
    leaderboard,
    lessonDetail,
    lockAdminUser,
    loadAdminContactProfile,
    makeAdmin,
    markRead,
    message,
    notebook,
    notebookReminders,
    openExam,
    openLesson,
    openTournament,
    openTournamentRoom,
    overview,
    packageAction,
    packages,
    passwordResetStep,
    pet,
    petForm,
    petVoice,
    editingCommunityPostId,
    posts,
    practiceActivities,
    practiceAnswers,
    practiceId,
    practiceResult,
    profileForm,
    pushVocabularyToPractice,
    quickCreate,
    previewLearningLesson,
    publishLearningContent,
    removeAdminItem,
    removeCommunityPost,
    resolveCommunityReport,
    resetAdminUserPassword,
    reportPost,
    reactPost,
    renamePet,
    refundPaymentAdmin,
    saveProfile,
    saveAdminPackageCourses,
    savePetConfig,
    saveAdminSystemSetting,
    saveUserSettings,
    searchFriendProfiles,
    selectAdminUser,
    selectedFriendId,
    selectedPractice,
    selectedGroupId,
    sendBroadcast,
    sendFriendMessage,
    sendGlobalMessage,
    sendPrivateGroupMessage,
    sendTargetedNotification,
    sendVoiceToPet,
    setAdminArea,
    setAdminJson,
    setAdminSelectedUserId,
    setAdminTab,
    setAuthForm,
    setAuthMode: changeAuthMode,
    setExamCertificate,
    setExamAnswers,
    setFriendSearchQuery,
    setGlobalChatText,
    setGroupForm,
    setGroupMessage,
    setCommunityCommentDraft,
    setCommunityPostEditForm,
    setCommunityPostForm,
    setDirectMessageText,
    setPracticeAnswers,
    setPracticeId,
    setPracticeResult,
    setPetForm,
    setProfileForm,
    setContactForm,
    setSelectedFriendId,
    setSelectedGroupId,
    setSettingsForm,
    setTournamentAnswers,
    startAdminEdit,
    stats,
    streak,
    settingsForm,
    toggleAdminFeature,
    saveCommunityPostEdit,
    submitCommunityComment,
    submitCommunityPost,
    submitPractice,
    submitPracticeAnswers,
    tickets,
    unlockAdminUser,
    updateAdminQuestion,
    updateSupportWorkflow,
    tournamentAnswers,
    addFriendProfile,
    sharePost,
    tournamentDetail,
    tournamentId,
    tournamentLeaderboard,
    tournamentResult,
    tournaments,
    toggleVocabularySelection,
    uploadCommunityPostImage,
    uploadCommunityPostEditImage,
    uploadGlobalChatAttachment,
    uploadGroupChatAttachment,
    user,
    userSettings,
    verifyAdminUser,
    vocabulary,
    vocabularyBank,
    vocabularyPracticeFeed,
    answerTicket,
    moderateCommunityPost,
    extendUserEntitlement,
  };
}
