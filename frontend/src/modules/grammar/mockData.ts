import type {
  GrammarLesson,
  GrammarQuestion,
  GrammarTopic,
  SupportedGrammarLanguageCode,
} from "./types";

function q(id: string, prompt: string, sentence: string, options: string[], correctAnswer: string, explanation: string): GrammarQuestion {
  return { id, prompt, sentence, options, correctAnswer, explanation };
}

function lesson(
  id: string,
  title: string,
  description: string,
  difficulty: GrammarLesson["difficulty"],
  rule: string,
  questions: GrammarQuestion[],
): GrammarLesson {
  return { id, title, description, difficulty, rule, questions };
}

function topic(id: string, label: string, title: string, description: string, lessons: GrammarLesson[]): GrammarTopic {
  return { id, label, title, description, lessons };
}

export const grammarTopicsByLanguage: Record<SupportedGrammarLanguageCode, GrammarTopic[]> = {
  zh: [
    topic("zh-grammar-basic", "CƠ BẢN", "Ngữ pháp giao tiếp nền tảng", "Học các cấu trúc cơ bản để đặt câu đúng và tự nhiên.", [
      lesson(
        "zh-grammar-le-ba",
        "Bài 1 - Câu hỏi với ma",
        "Nhận biết cách dùng trợ từ ma trong câu hỏi yes/no.",
        "Cơ bản",
        "Trợ từ ma đặt ở cuối câu để biến câu trần thuật thành câu hỏi.",
        [
          q("zh-ma-1", "Chọn câu hỏi đúng:", "Bạn có phải học sinh không?", ["你是学生。", "你是学生吗？", "吗你是学生？", "你吗是学生？"], "你是学生吗？", "Câu hỏi yes/no trong tiếng Trung thường thêm ma ở cuối câu."),
          q("zh-ma-2", "Câu nào đúng về trợ từ ma?", "Tôi là giáo viên.", ["我是老师吗？", "吗我是老师？", "我是吗老师？", "我是老师。"], "我是老师吗？", "Ma được đặt sau toàn bộ câu trần thuật."),
          q("zh-ma-3", "Chọn câu đúng:", "Hôm nay bạn có bận không?", ["你今天忙吗？", "你吗今天忙？", "今天你忙吗你？", "你今天吗忙？"], "你今天忙吗？", "Thứ tự chủ ngữ + trạng ngữ + tính từ/động từ + ma là đúng."),
        ],
      ),
      lesson(
        "zh-grammar-bu",
        "Bài 2 - Phủ định với bu",
        "Dùng bu để phủ định động từ, tính từ đơn giản.",
        "Cơ bản",
        "Bu đặt trước động từ hoặc tính từ để phủ định.",
        [
          q("zh-bu-1", "Chọn câu phủ định đúng:", "Tôi không biết.", ["我知道不。", "我不知道。", "不我知道。", "我不知到。"], "我不知道。", "Bu đặt trước động từ zhi dao."),
          q("zh-bu-2", "Chọn câu đúng:", "Hôm nay tôi không bận.", ["我今天忙不。", "我今天不忙。", "我不今天忙。", "今天我忙不。"], "我今天不忙。", "Bu đặt trước tính từ mang."),
          q("zh-bu-3", "Câu nào đúng?", "Tôi không học tiếng Trung.", ["我汉语不学。", "我不学汉语。", "我学不汉语。", "不我学汉语。"], "我不学汉语。", "Bu đặt trước động từ học."),
        ],
      ),
    ]),
    topic("zh-grammar-advanced", "ỨNG DỤNG", "Ngữ pháp ứng dụng hằng ngày", "Các cấu trúc nói ý định, thời gian và hành động sắp tới.", [
      lesson(
        "zh-grammar-le-yao",
        "Bài 3 - Ý định với yao",
        "Diễn đạt dự định sẽ làm gì.",
        "Trung cấp",
        "Yao có thể chỉ ý định, cần thiết hoặc hành động sắp diễn ra tùy văn cảnh.",
        [
          q("zh-yao-1", "Chọn câu đúng:", "Ngày mai tôi sẽ đến thư viện.", ["我明天图书馆要去。", "我明天要去图书馆。", "我要明天去图书馆吗。", "明天我去图书馆要。"], "我明天要去图书馆。", "Yao đặt trước động từ chính."),
          q("zh-yao-2", "Câu nào diễn đạt ý định đúng?", "Tôi muốn mua sách.", ["我要买书。", "我买要书。", "我要书买。", "我书要买。"], "我要买书。", "Chủ ngữ + yao + động từ + tân ngữ."),
          q("zh-yao-3", "Chọn câu đúng:", "Chúng tôi sắp học.", ["我们上课要。", "我们要上课。", "我们课要上。", "要我们上课。"], "我们要上课。", "Cấu trúc cơ bản là wo men yao shang ke."),
        ],
      ),
    ]),
  ],
  en: [
    topic("en-grammar-basic", "BASIC", "Foundation sentence patterns", "Nhớ các điểm ngữ pháp căn bản để đặt câu chuẩn và dễ hiểu.", [
      lesson(
        "en-grammar-be",
        "Lesson 1 - Verb to be",
        "Use am/is/are correctly in simple sentences.",
        "Cơ bản",
        "To be changes with the subject: I am, he/she is, you/we/they are.",
        [
          q("en-be-1", "Choose the correct sentence:", "She ___ a teacher.", ["She am a teacher.", "She is a teacher.", "She are a teacher.", "She be a teacher."], "She is a teacher.", "She goes with is."),
          q("en-be-2", "Choose the correct sentence:", "They ___ at home.", ["They is at home.", "They am at home.", "They are at home.", "They be at home."], "They are at home.", "They goes with are."),
          q("en-be-3", "Choose the correct question:", "___ you busy today?", ["Am you busy today?", "Are you busy today?", "Is you busy today?", "Be you busy today?"], "Are you busy today?", "You goes with are in questions."),
        ],
      ),
      lesson(
        "en-grammar-do",
        "Lesson 2 - Do / Does",
        "Make present simple questions with do and does.",
        "Cơ bản",
        "Use does with he/she/it and do with I/you/we/they.",
        [
          q("en-do-1", "Choose the correct question:", "___ she like coffee?", ["Do she like coffee?", "Does she like coffee?", "Is she like coffee?", "Are she like coffee?"], "Does she like coffee?", "She takes does in present simple questions."),
          q("en-do-2", "Choose the correct question:", "___ they study English?", ["Does they study English?", "Do they study English?", "Are they study English?", "Did they studies English?"], "Do they study English?", "They takes do."),
          q("en-do-3", "Choose the correct sentence:", "He ___ not work on Sunday.", ["do", "does", "is", "are"], "does", "Negative present simple with he uses does not."),
        ],
      ),
    ]),
    topic("en-grammar-advanced", "APPLY", "Applied grammar for daily use", "Practice tense and modal structures in short contexts.", [
      lesson(
        "en-grammar-going-to",
        "Lesson 3 - Be going to",
        "Express future plans with be going to.",
        "Trung cấp",
        "Use am/is/are + going to + verb to talk about plans.",
        [
          q("en-going-1", "Choose the correct sentence:", "I ___ visit my friend tomorrow.", ["am going to", "is going to", "are going to", "going to am"], "am going to", "I goes with am going to."),
          q("en-going-2", "Choose the correct sentence:", "They ___ watch a movie tonight.", ["is going to", "am going to", "are going to", "be going"], "are going to", "They goes with are going to."),
          q("en-going-3", "Choose the correct question:", "___ she going to cook dinner?", ["Do", "Does", "Is", "Are"], "Is", "She requires is in this structure."),
        ],
      ),
    ]),
  ],
  ja: [
    topic("ja-grammar-basic", "KISO", "Basic Japanese grammar", "Các mẫu câu nền tảng trong hội thoại cơ bản.", [
      lesson(
        "ja-grammar-desu",
        "Lesson 1 - Desu sentence",
        "Use desu at the end of polite statements.",
        "Cơ bản",
        "Desu stands at the end of a polite nominal or adjective sentence.",
        [
          q("ja-desu-1", "Choose the correct sentence:", "Watashi wa gakusei ___ .", ["desu", "wa", "ga", "ni"], "desu", "Desu completes the polite sentence."),
          q("ja-desu-2", "Choose the correct sentence:", "Kore wa hon ___ .", ["desu", "o", "ka", "de"], "desu", "Desu closes the sentence correctly."),
          q("ja-desu-3", "Choose the correct polite form:", "Ashita wa yasumi ___ .", ["desu", "ni", "wo", "ga"], "desu", "Desu is used after noun/adjective predicates."),
        ],
      ),
      lesson(
        "ja-grammar-ka",
        "Lesson 2 - Question with ka",
        "Form polite questions with ka.",
        "Cơ bản",
        "Add ka at the end of a polite sentence to ask a question.",
        [
          q("ja-ka-1", "Choose the correct question:", "Anata wa sensei ___ ?", ["desu", "ka", "o", "ni"], "ka", "Ka marks the sentence as a question."),
          q("ja-ka-2", "Choose the correct sentence:", "Kore wa pen desu ___ ?", ["ga", "o", "ka", "ni"], "ka", "Place ka at the end."),
          q("ja-ka-3", "Which ending is correct?", "Kyoo wa isogashii ___ ?", ["desu", "ka", "o", "de"], "ka", "Ka makes it a question in polite style."),
        ],
      ),
    ]),
    topic("ja-grammar-advanced", "OUYOU", "Applied Japanese grammar", "Mẫu câu mở rộng về hành động và dự định.", [
      lesson(
        "ja-grammar-masu",
        "Lesson 3 - Verb masu form",
        "Use polite verb endings with masu.",
        "Trung cấp",
        "Masu is added to verb stems for polite present/future sentences.",
        [
          q("ja-masu-1", "Choose the correct sentence:", "Watashi wa mainichi benkyoo shi___ .", ["masu", "desu", "ka", "wa"], "masu", "Shi + masu forms the polite verb."),
          q("ja-masu-2", "Choose the correct ending:", "Ashita Osaka ni iki___ .", ["masu", "desu", "o", "ka"], "masu", "Iki + masu is the polite form."),
          q("ja-masu-3", "Choose the correct sentence:", "Kare wa mizu o nomi___ .", ["masu", "desu", "ga", "ni"], "masu", "Nomi + masu creates the verb phrase."),
        ],
      ),
    ]),
  ],
  ko: [
    topic("ko-grammar-basic", "BASIC", "Korean sentence basics", "Mẫu câu lịch sự căn bản để nói đúng và hỏi đáp.", [
      lesson(
        "ko-grammar-ieyo",
        "Lesson 1 - 이에요 / 예요",
        "Use noun ending correctly after nouns.",
        "Cơ bản",
        "Use 이에요 after consonant-ending nouns and 예요 after vowel-ending nouns.",
        [
          q("ko-ieyo-1", "Choose the correct sentence:", "저는 학생___ .", ["이에요", "예요", "하세요", "있어요"], "이에요", "학생 ends with a consonant, so use 이에요."),
          q("ko-ieyo-2", "Choose the correct sentence:", "저는 의사___ .", ["이에요", "예요", "합니다", "없어요"], "예요", "의사 ends with a vowel, so use 예요."),
          q("ko-ieyo-3", "Choose the right ending:", "여기는 학교___ .", ["이에요", "예요", "해요", "가요"], "예요", "학교 ends with a vowel sound."),
        ],
      ),
      lesson(
        "ko-grammar-an",
        "Lesson 2 - Negation with 안",
        "Use an before the verb to make a simple negative.",
        "Cơ bản",
        "Place an before the verb for simple spoken negation.",
        [
          q("ko-an-1", "Choose the correct sentence:", "저는 오늘 학교에 ___ 가요.", ["안", "못", "잘", "더"], "안", "An before the verb makes the sentence negative."),
          q("ko-an-2", "Choose the correct sentence:", "그 사람은 커피를 ___ 마셔요.", ["안", "잘", "더", "만"], "안", "An negates the action of drinking."),
          q("ko-an-3", "Choose the right word:", "저는 한국어를 ___ 공부해요.", ["안", "너무", "아주", "가끔"], "안", "An before gongbuhaeyo gives a negative meaning."),
        ],
      ),
    ]),
    topic("ko-grammar-advanced", "APPLY", "Applied Korean grammar", "Dùng các đuôi câu thông dụng trong ngữ cảnh hằng ngày.", [
      lesson(
        "ko-grammar-go-ship-eoyo",
        "Lesson 3 - 고 싶어요",
        "Express wants and intentions politely.",
        "Trung cấp",
        "Attach go sipeoyo to verb stems to say want to do something.",
        [
          q("ko-want-1", "Choose the correct sentence:", "저는 물을 마시___ .", ["고 싶어요", "이에요", "안", "예요"], "고 싶어요", "Masi + go sipeoyo means want to drink."),
          q("ko-want-2", "Choose the correct sentence:", "주말에 영화 보고 ___ .", ["싶어요", "예요", "안", "이에요"], "싶어요", "보고 싶어요 expresses wanting to watch."),
          q("ko-want-3", "Choose the correct ending:", "친구를 만나___ .", ["고 싶어요", "이에요", "안", "예요"], "고 싶어요", "Manna + go sipeoyo is the correct pattern."),
        ],
      ),
    ]),
  ],
  de: [
    topic("de-grammar-basic", "BASIS", "Grundlagen der Grammatik", "Các mẫu câu cơ bản trong giao tiếp tiếng Đức.", [
      lesson(
        "de-grammar-sein",
        "Lektion 1 - Verb sein",
        "Use sein correctly with personal pronouns.",
        "Cơ bản",
        "Sein changes by subject: ich bin, du bist, er ist, wir/sie sind.",
        [
          q("de-sein-1", "Choose the correct sentence:", "Ich ___ Student.", ["bin", "bist", "ist", "seid"], "bin", "Ich goes with bin."),
          q("de-sein-2", "Choose the correct sentence:", "Sie ___ Lehrerin.", ["bin", "bist", "ist", "sind"], "ist", "Singular sie takes ist."),
          q("de-sein-3", "Choose the correct question:", "___ du heute frei?", ["Bin", "Bist", "Ist", "Sind"], "Bist", "Du goes with bist."),
        ],
      ),
      lesson(
        "de-grammar-nicht",
        "Lektion 2 - Negation with nicht",
        "Negate statements with nicht.",
        "Cơ bản",
        "Nicht is used to negate verbs, adjectives, or whole statements.",
        [
          q("de-nicht-1", "Choose the correct sentence:", "Ich komme heute ___ .", ["nicht", "kein", "nein", "nie"], "nicht", "Nicht negates the statement."),
          q("de-nicht-2", "Choose the correct sentence:", "Er ist ___ muede.", ["nicht", "kein", "nein", "ohne"], "nicht", "Nicht negates the adjective."),
          q("de-nicht-3", "Choose the correct sentence:", "Wir lernen ___ Deutsch.", ["nicht", "kein", "nein", "nur"], "nicht", "Nicht negates the verb phrase."),
        ],
      ),
    ]),
    topic("de-grammar-advanced", "ANWENDUNG", "Alltag und Anwendung", "Vận dụng ngữ pháp vào tình huống đời sống.", [
      lesson(
        "de-grammar-moechten",
        "Lektion 3 - moechten",
        "Express wishes politely with moechten.",
        "Trung cấp",
        "Moegchten is often used to express polite wishes or requests.",
        [
          q("de-want-1", "Choose the correct sentence:", "Ich ___ einen Kaffee.", ["moechte", "moechtest", "moechten", "moechteet"], "moechte", "Ich takes moechte."),
          q("de-want-2", "Choose the correct sentence:", "Wir ___ heute frueh gehen.", ["moechte", "moechtest", "moechten", "moechte"], "moechten", "Wir takes moechten."),
          q("de-want-3", "Choose the correct question:", "___ du mitkommen?", ["Moechte", "Moechtest", "Moechten", "Moecht"], "Moechtest", "Du takes moechtest."),
        ],
      ),
    ]),
  ],
};

export function getGrammarTopicsByLanguage(languageCode: string | undefined): GrammarTopic[] {
  if (!languageCode || !(languageCode in grammarTopicsByLanguage)) {
    return grammarTopicsByLanguage.zh;
  }

  return grammarTopicsByLanguage[languageCode as SupportedGrammarLanguageCode];
}

export function getGrammarLessonById(languageCode: string | undefined, lessonId: string | undefined): GrammarLesson | null {
  if (!lessonId) {
    return null;
  }

  const topics = getGrammarTopicsByLanguage(languageCode);
  for (const currentTopic of topics) {
    const foundLesson = currentTopic.lessons.find((item) => item.id === lessonId);
    if (foundLesson) {
      return foundLesson;
    }
  }

  return null;
}
