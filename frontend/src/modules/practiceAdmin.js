function normalizePracticeBranch(branch, hasPaidPracticeAccess) {
  if (branch === "paid" && hasPaidPracticeAccess) {
    return "paid";
  }

  return "free";
}

export function getPracticeBranchFromSearch(search, hasPaidPracticeAccess) {
  const searchParams = new URLSearchParams((search || "").startsWith("?") ? search.slice(1) : search || "");
  return normalizePracticeBranch(searchParams.get("branch"), hasPaidPracticeAccess);
}

export function getBranchPracticeActivities(app, search = "") {
  const activeBranch = getPracticeBranchFromSearch(search, app?.hasPaidPracticeAccess);
  const items = Array.isArray(app?.practiceActivities) ? app.practiceActivities : [];

  return items.filter((item) => (activeBranch === "paid" ? !item.is_free : item.is_free));
}

export function getSkillPracticeActivities(app, search = "", skillKey) {
  return getBranchPracticeActivities(app, search).filter((item) => item.practice_skill === skillKey);
}

export function getActivityTypePracticeActivities(app, search = "", skillKey, activityType) {
  return getSkillPracticeActivities(app, search, skillKey).filter((item) => item.activity_type === activityType);
}

export function countPracticeTopics(items) {
  const topicKeys = new Set();

  items.forEach((item) => {
    const rawTopic = item.topic ?? item.payload?.topic;
    const normalizedTopic = typeof rawTopic === "string" ? rawTopic.trim() : "";
    topicKeys.add(normalizedTopic || "__default__");
  });

  return topicKeys.size;
}

export function countPracticeLessons(items) {
  const lessonKeys = new Set();

  items.forEach((item) => {
    const lessonKey = item.lesson_id ?? item.payload?.lesson_id ?? item.code ?? item.id;
    lessonKeys.add(String(lessonKey));
  });

  return lessonKeys.size;
}
